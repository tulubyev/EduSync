import * as https from 'https';
import * as http from 'http';
import { getRecordingProxy, isProxiedHost } from './proxyConfig';
import { logger } from '../../logger';

export interface UrlValidationResult {
  accessible: boolean;
  statusCode?: number;
  contentType?: string;
  sourceType: SourceType;
  redirectUrl?: string;
  warning?: string;
  error?: string;
}

export type SourceType =
  | 'video-hosting'
  | 'webinar'
  | 'live-streaming'
  | 'direct-stream'
  | 'website'
  | 'unknown';

const VIDEO_HOSTING: RegExp[] = [
  /youtube\.com\/watch|youtu\.be\//i,
  /youtube\.com\/shorts\//i,
  /vk\.com\/video/i,
  /rutube\.ru\/video\//i,
  /ok\.ru\/video/i,
  /vimeo\.com\/\d/i,
  /dailymotion\.com\/video/i,
  /kinescope\.io/i,
];

const WEBINAR_PLATFORMS: RegExp[] = [
  /zoom\.us\/j\//i,
  /webex\.com\/meet/i,
  /bigbluebutton/i,
  /meet\.google\.com\//i,
  /teams\.microsoft\.com/i,
  /bizon365\.ru/i,
  /webinar\.ru/i,
  /pruffme\.com/i,
  /clickmeeting\.com/i,
  /getcourse\.ru/i,
  /ispring\.ru/i,
  /miro\.com/i,
  /mirapolis\.ru/i,
];

const LIVE_STREAMING: RegExp[] = [
  /twitch\.tv\//i,
  /youtube\.com\/live/i,
  /youtube\.com\/@.+\/live/i,
  /kick\.com\//i,
  /boosty\.to\//i,
  /goodgame\.ru\/channel/i,
  /trovo\.live\//i,
  /vk\.com\/live/i,
  /vk\.com\/video_ext/i,
];

const DIRECT_STREAM: RegExp[] = [
  /\.m3u8(\?.*)?$/i,
  /\.mp4(\?.*)?$/i,
  /\.webm(\?.*)?$/i,
  /\.flv(\?.*)?$/i,
  /^rtsp:\/\//i,
  /^rtmp:\/\//i,
];

const LIKELY_BLOCKED_IN_RF: RegExp[] = [
  /youtube\.com|youtu\.be/i,
  /twitch\.tv/i,
  /instagram\.com/i,
  /facebook\.com/i,
  /twitter\.com|x\.com/i,
  /tiktok\.com/i,
  /linkedin\.com/i,
];

function detectSourceType(href: string): SourceType {
  if (DIRECT_STREAM.some(p => p.test(href))) return 'direct-stream';
  if (VIDEO_HOSTING.some(p => p.test(href))) return 'video-hosting';
  if (WEBINAR_PLATFORMS.some(p => p.test(href))) return 'webinar';
  if (LIVE_STREAMING.some(p => p.test(href))) return 'live-streaming';
  return 'website';
}

function isLikelyBlockedInRF(href: string): boolean {
  return LIKELY_BLOCKED_IN_RF.some(p => p.test(href));
}

export async function validateStreamUrl(
  streamUrl: string,
  timeoutMs = 12000
): Promise<UrlValidationResult> {
  let parsed: URL;
  try {
    parsed = new URL(streamUrl);
  } catch {
    return {
      accessible: false,
      sourceType: 'unknown',
      error: `Некорректный URL: "${streamUrl}"`,
    };
  }

  const { protocol, hostname } = parsed;

  if (!['http:', 'https:', 'rtsp:', 'rtmp:'].includes(protocol)) {
    return {
      accessible: false,
      sourceType: 'unknown',
      error: `Неподдерживаемый протокол: ${protocol} — ожидается http/https/rtsp/rtmp`,
    };
  }

  const sourceType = detectSourceType(streamUrl);
  const blockedInRF = isLikelyBlockedInRF(streamUrl);

  if (protocol === 'rtsp:' || protocol === 'rtmp:') {
    logger.info(`URL check [${sourceType}]: ${streamUrl} — RTSP/RTMP, HTTP check skipped`);
    return {
      accessible: true,
      sourceType: 'direct-stream',
      warning: 'RTSP/RTMP поток — доступность проверяется только в момент записи',
    };
  }

  logger.info(`URL check [${sourceType}]: HEAD ${hostname} ...`);

  try {
    const head = await httpHead(streamUrl, timeoutMs);

    const status = head.statusCode ?? 0;
    logger.info(`URL check: ${status} ${head.contentType ?? ''} ${head.redirectUrl ? `→ ${head.redirectUrl}` : ''}`);

    let warning: string | undefined;

    if (status === 404) {
      warning = 'Ресурс не найден (404) — трансляция могла быть удалена или ещё не началась';
    } else if (status === 403) {
      warning = 'Доступ запрещён (403) — трансляция приватная или требует авторизации';
    } else if (status === 451) {
      warning = 'Доступ ограничён по юридическим причинам (451) — вероятна блокировка в РФ';
    } else if (status >= 500) {
      warning = `Сервер вернул ошибку ${status} — сервис временно недоступен`;
    } else if (blockedInRF) {
      warning = `Домен ${hostname} из списка заблокированных в РФ — запись запустится, но может потребоваться VPN/прокси`;
    } else if (sourceType === 'video-hosting') {
      warning = 'Видеохостинг: убедитесь что видео публично доступно и не требует авторизации';
    }

    return {
      accessible: status > 0 && status < 500,
      statusCode: status,
      contentType: head.contentType,
      sourceType,
      redirectUrl: head.redirectUrl,
      warning,
    };
  } catch (err: any) {
    const msg = err.message || String(err);
    let error: string;

    if (msg.includes('ENOTFOUND') || msg.includes('getaddrinfo')) {
      error = `DNS не разрешается: хост "${hostname}" не найден`;
      if (blockedInRF) error += ' — вероятно заблокирован в РФ (требуется VPN/прокси)';
    } else if (msg.includes('ECONNREFUSED')) {
      error = `Соединение отклонено: ${hostname}`;
    } else if (msg.includes('ETIMEDOUT') || msg.includes('timeout')) {
      error = `Таймаут подключения к ${hostname}`;
      if (blockedInRF) error += ' — вероятно заблокирован в РФ (требуется VPN/прокси)';
    } else if (msg.includes('ECONNRESET')) {
      error = `Соединение сброшено сервером ${hostname}`;
    } else {
      error = msg;
    }

    // Источник пойдёт через прокси браузера, а эта проверка из Node идёт напрямую и его не видит:
    // не срываем задачу, доступность проверится при открытии страницы в Chromium.
    if (getRecordingProxy() && isProxiedHost(hostname)) {
      logger.warn(`URL check (напрямую) не прошла: ${error} — запись пойдёт через прокси`);
      return {
        accessible: true,
        sourceType,
        warning: `Прямая проверка не прошла (${error}); запись пойдёт через прокси`,
      };
    }

    logger.warn(`URL check failed: ${error}`);
    return {
      accessible: false,
      sourceType,
      error,
      warning: blockedInRF ? `${hostname} в списке заблокированных в РФ` : undefined,
    };
  }
}

interface HeadResult {
  statusCode?: number;
  contentType?: string;
  redirectUrl?: string;
}

function httpHead(targetUrl: string, timeoutMs: number): Promise<HeadResult> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const lib = parsed.protocol === 'https:' ? https : http;

    const req = lib.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: 'HEAD',
        timeout: timeoutMs,
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.7,en;q=0.5',
        },
        rejectUnauthorized: false,
      },
      (res) => {
        res.resume();
        resolve({
          statusCode: res.statusCode,
          contentType: res.headers['content-type'],
          redirectUrl: res.headers['location'],
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error(`Connection timeout after ${timeoutMs}ms`));
    });

    req.on('error', reject);
    req.end();
  });
}
