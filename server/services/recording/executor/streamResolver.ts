import { spawn } from 'child_process';
import { logger } from '../../logger';
import { proxyUrlForHost } from './proxyConfig';
import type { ExtractorTool } from '../sourceStrategy';

/**
 * Достаёт прямой адрес потока со страницы видеохостинга/стриминга через yt-dlp или streamlink,
 * чтобы дальше писать его ffmpeg-ом без браузера.
 *
 *   YTDLP_PATH / STREAMLINK_PATH — путь к утилите (по умолчанию из PATH)
 *   YTDLP_EXTRA_ARGS             — доп. аргументы yt-dlp через пробел (например, `--js-runtimes node` для YouTube)
 *   RECORDING_MAX_HEIGHT         — максимальная высота кадра (по умолчанию 1080)
 */

export interface StreamInput {
  url: string;
  headers?: Record<string, string>;
}

export interface ResolvedStream {
  /** 1 вход (видео+звук) или 2 (отдельно видео и звук, как у YouTube) */
  inputs: StreamInput[];
  isLive: boolean;
  tool: ExtractorTool;
  title?: string;
}

/** Ошибка «трансляция ещё не началась»: в браузер переходить бессмысленно, нужен повтор позже. */
export class StreamNotStartedError extends Error {}

interface RunResult { code: number | null; stdout: string; stderr: string; timedOut: boolean }

function run(cmd: string, args: string[], timeoutMs: number): Promise<RunResult> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let child;
    try {
      child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
      resolve({ code: -1, stdout: '', stderr: (e as Error).message, timedOut: false });
      return;
    }
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); if (stderr.length > 20000) stderr = stderr.slice(-20000); });
    child.on('error', (e) => { stderr += `\n${e.message}`; });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    });
  });
}

function lastError(stderr: string): string {
  const lines = stderr.split('\n').map((l) => l.trim()).filter(Boolean);
  const err = [...lines].reverse().find((l) => /error/i.test(l)) ?? lines[lines.length - 1] ?? '';
  return err.replace(/^ERROR:\s*/i, '').slice(0, 400);
}

function hostOf(url: string): string {
  try { return new URL(url).hostname; } catch { return ''; }
}

function cleanHeaders(h: unknown): Record<string, string> | undefined {
  if (!h || typeof h !== 'object') return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(h as Record<string, unknown>)) {
    if (typeof v === 'string' && v && !/^(accept-encoding|cookie)$/i.test(k)) out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

async function resolveWithYtDlp(pageUrl: string, waitMs: number): Promise<ResolvedStream> {
  const maxH = parseInt(process.env.RECORDING_MAX_HEIGHT || '1080', 10) || 1080;
  const proxy = proxyUrlForHost(hostOf(pageUrl));
  const extra = (process.env.YTDLP_EXTRA_ARGS || '').split(/\s+/).filter(Boolean);
  const args = [
    '-J', '--no-playlist', '--no-warnings',
    // сначала один поток с видео и звуком (HLS у live), иначе лучшие отдельные видео+звук
    '-f', `b[height<=${maxH}][vcodec!=none][acodec!=none]/bv*[height<=${maxH}]+ba/b`,
    ...(waitMs > 0 ? ['--wait-for-video', '30-60'] : []),
    ...(proxy ? ['--proxy', proxy] : []),
    ...extra,
    pageUrl,
  ];
  const res = await run(process.env.YTDLP_PATH || 'yt-dlp', args, Math.max(60_000, waitMs));
  if (res.timedOut) {
    throw new StreamNotStartedError(`yt-dlp: трансляция не началась за ${Math.round(waitMs / 60000)} мин ожидания`);
  }
  if (res.code !== 0) {
    const msg = lastError(res.stderr) || `код ${res.code}`;
    if (/will begin|premieres in|is_upcoming|scheduled|not started|has not started/i.test(msg)) {
      throw new StreamNotStartedError(`yt-dlp: трансляция ещё не началась (${msg})`);
    }
    throw new Error(`yt-dlp: ${msg}`);
  }

  let info: any;
  try {
    info = JSON.parse(res.stdout);
  } catch {
    throw new Error('yt-dlp: не удалось разобрать ответ');
  }
  if (info.live_status === 'is_upcoming') {
    throw new StreamNotStartedError('yt-dlp: трансляция ещё не началась');
  }

  const formats: any[] = Array.isArray(info.requested_formats) && info.requested_formats.length > 0
    ? info.requested_formats
    : [info];
  const inputs = formats
    .filter((f) => typeof f.url === 'string' && f.url)
    .map((f) => ({ url: f.url as string, headers: cleanHeaders(f.http_headers ?? info.http_headers) }));
  if (inputs.length === 0) throw new Error('yt-dlp: площадка не отдала адрес потока');

  return { inputs, isLive: info.is_live === true || info.live_status === 'is_live', tool: 'yt-dlp', title: info.title };
}

async function resolveWithStreamlink(pageUrl: string): Promise<ResolvedStream> {
  const proxy = proxyUrlForHost(hostOf(pageUrl));
  const args = ['--json', ...(proxy ? ['--http-proxy', proxy] : []), pageUrl, 'best'];
  const res = await run(process.env.STREAMLINK_PATH || 'streamlink', args, 60_000);
  let info: any = null;
  try { info = JSON.parse(res.stdout); } catch { /* разберём ниже */ }
  if (!info || info.error || !info.url) {
    const msg = (info && info.error) || lastError(res.stderr) || `код ${res.code}`;
    if (/no playable streams|offline|not live|is not live/i.test(String(msg))) {
      throw new StreamNotStartedError(`streamlink: трансляция не идёт (${msg})`);
    }
    throw new Error(`streamlink: ${msg}`);
  }
  // streamlink отдаёт адрес только для живого потока
  return { inputs: [{ url: info.url, headers: cleanHeaders(info.headers) }], isLive: true, tool: 'streamlink' };
}

/**
 * Пробует инструменты по порядку. StreamNotStartedError пробрасывается сразу (запасной инструмент
 * не поможет, если трансляция ещё не началась).
 * @param waitMs сколько ждать начала запланированной трансляции (yt-dlp --wait-for-video)
 */
export async function resolveStream(pageUrl: string, tools: ExtractorTool[], waitMs: number): Promise<ResolvedStream> {
  const errors: string[] = [];
  const deadline = Date.now() + waitMs;
  for (const tool of tools) {
    try {
      logger.info(`[RESOLVE] ${tool}: ${pageUrl}`);
      let r: ResolvedStream;
      if (tool === 'yt-dlp') {
        r = await resolveWithYtDlp(pageUrl, Math.max(0, deadline - Date.now()));
      } else {
        // streamlink не умеет ждать сам: опрашиваем, пока трансляция не начнётся или не выйдет время
        for (;;) {
          try {
            r = await resolveWithStreamlink(pageUrl);
            break;
          } catch (e) {
            if (!(e instanceof StreamNotStartedError) || Date.now() + 30_000 > deadline) throw e;
            logger.info(`[RESOLVE] streamlink: трансляция ещё не идёт — ждём 30 с`);
            await new Promise((res) => setTimeout(res, 30_000));
          }
        }
      }
      logger.info(`[RESOLVE] ✅ ${tool}: ${r.inputs.length} вход(а), live=${r.isLive}${r.title ? `, "${r.title.slice(0, 80)}"` : ''}`);
      return r;
    } catch (e) {
      if (e instanceof StreamNotStartedError) throw e;
      const msg = (e as Error).message;
      logger.warn(`[RESOLVE] ${tool} не смог: ${msg}`);
      errors.push(msg);
    }
  }
  throw new Error(`Не удалось получить адрес потока: ${errors.join('; ')}`);
}
