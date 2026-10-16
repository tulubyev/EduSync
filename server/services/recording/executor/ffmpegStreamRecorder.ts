import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../logger';
import { executorConfig } from './config';
import { getRecordingProxy, proxyUrlForHost } from './proxyConfig';
import type { StreamInput } from './streamResolver';
import type { StartStage } from '../startStatus';

/**
 * Запись потока без браузера и без перекодирования: ffmpeg -c copy с нарезкой на части.
 * Нагрузка — доли ядра на запись (против 1,5–2 ядер у браузерной записи).
 *
 * Части пишутся сегмент-мюксером ffmpeg; готовая часть появляется в segment_list (CSV) только
 * после закрытия файла, поэтому отдаём на загрузку лишь целые файлы.
 */

/** Сколько ждать первых данных от источника, прежде чем считать, что поток не пошёл */
const NO_DATA_ABORT_MS = 90_000;
/** Поток перестал расти столько времени — считаем, что трансляция закончилась/оборвалась */
const STALL_ABORT_MS = 120_000;
const POLL_MS = 2_000;

export interface FfmpegChunk {
  partNumber: number;
  filePath: string;
  frameCount: number;
  durationMs: number;
  isFinal: boolean;
}

export interface FfmpegRecordOptions {
  taskId: string;
  inputs: StreamInput[];
  /** Длительность записи, минуты */
  duration: number;
  chunkDurationMs: number;
  onStage?: (stage: StartStage) => void;
  onChunk: (chunk: FfmpegChunk) => Promise<void>;
}

function headerArg(h?: Record<string, string>): string[] {
  if (!h) return [];
  const lines = Object.entries(h).map(([k, v]) => `${k}: ${v}`).join('\r\n');
  return lines ? ['-headers', `${lines}\r\n`] : [];
}

function inputArgs(input: StreamInput): string[] {
  let u: URL | null = null;
  try { u = new URL(input.url); } catch { /* ffmpeg сам сообщит об ошибке */ }
  const proto = u?.protocol ?? '';
  const args: string[] = ['-thread_queue_size', '1024'];

  if (proto === 'http:' || proto === 'https:') {
    args.push(
      '-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_on_network_error', '1',
      '-reconnect_delay_max', '30', '-rw_timeout', '30000000',
      ...headerArg(input.headers),
    );
    // ffmpeg умеет только HTTP-прокси
    const proxy = u ? proxyUrlForHost(u.hostname) : null;
    if (proxy && /^https?:/i.test(proxy)) args.push('-http_proxy', proxy);
    else if (proxy && getRecordingProxy()) logger.warn('[FFREC] SOCKS-прокси ffmpeg не поддерживает — поток пойдёт напрямую');
  } else if (proto === 'rtsp:' || proto === 'rtsps:') {
    args.push('-rtsp_transport', 'tcp', '-timeout', '30000000');
  } else if (proto === 'rtmp:' || proto === 'rtmps:') {
    args.push('-rw_timeout', '30000000');
  }
  args.push('-i', input.url);
  return args;
}

export class FfmpegStreamRecorder {
  private proc: ChildProcess | null = null;

  /** Возвращает число записанных частей. Бросает ошибку, если данных не было совсем. */
  async record(opts: FfmpegRecordOptions): Promise<number> {
    const dir = path.join(executorConfig.recording.outputDir, 'ffrec', opts.taskId.replace(/[^a-zA-Z0-9_-]/g, '_'), String(Date.now()));
    fs.mkdirSync(dir, { recursive: true });
    const listFile = path.join(dir, 'parts.csv');
    const pattern = path.join(dir, 'part%03d.mp4');

    const totalSec = Math.max(1, Math.round(opts.duration * 60));
    const segSec = Math.max(30, Math.round(opts.chunkDurationMs / 1000));

    const maps = opts.inputs.length > 1
      ? ['-map', '0:v:0?', '-map', '1:a:0?']
      : ['-map', '0:v:0?', '-map', '0:a:0?'];

    const args = [
      '-hide_banner', '-nostdin', '-loglevel', 'warning',
      ...opts.inputs.flatMap(inputArgs),
      '-t', String(totalSec),
      ...maps,
      '-c', 'copy',
      '-f', 'segment', '-segment_time', String(segSec), '-reset_timestamps', '1',
      '-segment_format', 'mp4', '-segment_format_options', 'movflags=+faststart',
      '-segment_list', listFile, '-segment_list_type', 'csv',
      pattern,
    ];
    logger.info(`[FFREC] Старт: ${opts.inputs.length} вход(а), ${totalSec}s, части по ${segSec}s → ${dir}`);

    opts.onStage?.('capturing');
    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    this.proc = proc;

    const errLines: string[] = [];
    proc.stderr?.on('data', (d) => {
      for (const line of d.toString().split('\n')) {
        const l = line.trim();
        if (!l) continue;
        if (/error|invalid|failed|refused|forbidden|not found|timed out/i.test(l)) {
          errLines.push(l);
          if (errLines.length > 20) errLines.shift();
          logger.warn(`[FFREC] ${l}`);
        }
      }
    });

    let exitCode: number | null = null;
    let exited = false;
    const exitPromise = new Promise<void>((resolve) => {
      proc.on('close', (code) => { exitCode = code; exited = true; resolve(); });
      proc.on('error', (e) => { errLines.push(e.message); exited = true; resolve(); });
    });

    // Отдаём части по мере закрытия, строго по порядку и по одной
    let delivered = 0;
    let uploadChain: Promise<void> = Promise.resolve();
    let failedUploads = 0;
    let confirmed = false;
    const startedAt = Date.now();
    let lastBytes = 0;
    let lastGrowthAt = Date.now();
    let stopReason = '';

    const listedParts = (): Array<{ file: string; durMs: number }> => {
      if (!fs.existsSync(listFile)) return [];
      return fs.readFileSync(listFile, 'utf-8').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
        const [file, start, end] = l.split(',');
        return { file: path.join(dir, file), durMs: Math.round((parseFloat(end) - parseFloat(start)) * 1000) || 0 };
      });
    };
    const bytesOnDisk = (): number => {
      try {
        return fs.readdirSync(dir).filter((f) => f.endsWith('.mp4')).reduce((s, f) => s + fs.statSync(path.join(dir, f)).size, 0);
      } catch { return 0; }
    };
    const deliverNew = (isFinal: boolean) => {
      const parts = listedParts();
      while (delivered < parts.length) {
        const idx = delivered++;
        const part = parts[idx];
        const last = isFinal && idx === parts.length - 1;
        uploadChain = uploadChain.then(async () => {
          try {
            await opts.onChunk({ partNumber: idx + 1, filePath: part.file, frameCount: 0, durationMs: part.durMs, isFinal: last });
            fs.promises.unlink(part.file).catch(() => {});
          } catch (e) {
            // как и у браузерной записи: часть не загрузилась — пишем дальше, файл остаётся на диске
            logger.error(`[FFREC] Часть ${idx + 1} не загружена: ${(e as Error).message}`);
            failedUploads++;
          }
        });
      }
    };
    const stop = async (reason: string) => {
      if (exited || stopReason) return;
      stopReason = reason;
      logger.warn(`[FFREC] Останавливаем ffmpeg: ${reason}`);
      proc.kill('SIGINT'); // корректно закрывает текущую часть и дописывает её в список
      setTimeout(() => { if (!exited) proc.kill('SIGKILL'); }, 20_000);
    };

    while (!exited) {
      await Promise.race([exitPromise, new Promise((r) => setTimeout(r, POLL_MS))]);
      const bytes = bytesOnDisk();
      if (bytes > lastBytes) {
        lastBytes = bytes;
        lastGrowthAt = Date.now();
        if (!confirmed) {
          confirmed = true;
          logger.info('[FFREC] ✅ Данные пошли — запись подтверждена');
          opts.onStage?.('recording');
        }
      }
      if (exited) break; // последние части отдаст deliverNew(true) с пометкой isFinal
      deliverNew(false);
      if (!confirmed && Date.now() - startedAt > NO_DATA_ABORT_MS) {
        await stop(`источник не прислал данных за ${NO_DATA_ABORT_MS / 1000} с`);
      } else if (confirmed && Date.now() - lastGrowthAt > STALL_ABORT_MS) {
        await stop(`поток не растёт ${STALL_ABORT_MS / 1000} с — трансляция закончилась или оборвалась`);
      }
    }
    await exitPromise;
    deliverNew(true);
    await uploadChain;
    this.proc = null;

    const parts = listedParts().length;
    const detail = errLines.slice(-3).join('; ');
    if (parts === 0) {
      fs.promises.rm(dir, { recursive: true, force: true }).catch(() => {});
      throw new Error(`ffmpeg: поток не дал данных (${stopReason || `код ${exitCode}`})${detail ? `: ${detail}` : ''}`);
    }
    if (exitCode !== 0 && !stopReason) {
      logger.warn(`[FFREC] ffmpeg завершился с кодом ${exitCode}, но ${parts} част(ей) записано${detail ? `: ${detail}` : ''}`);
    }
    logger.info(`[FFREC] Готово: ${parts} част(ей), ${Math.round(lastBytes / 1024 / 1024)} МБ`);
    // незагруженные части оставляем на диске для ручного восстановления
    if (failedUploads === 0) fs.promises.rm(dir, { recursive: true, force: true }).catch(() => {});
    return parts;
  }

  /** Аварийная остановка (например, при остановке воркера). */
  abort(): void {
    if (this.proc && this.proc.exitCode === null) this.proc.kill('SIGINT');
  }
}
