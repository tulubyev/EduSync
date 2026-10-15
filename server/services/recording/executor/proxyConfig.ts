import { logger } from '../../logger';

/**
 * Необязательный прокси для браузера воркера (Chromium) — для источников, недоступных с IP сервера.
 *
 *   RECORDING_PROXY_URL    http://[user:pass@]host:port | https://... | socks5://host:port
 *                          (Chromium не поддерживает SOCKS5 с логином/паролем — для него используйте HTTP-прокси)
 *   RECORDING_PROXY_BYPASS домены, которые идут напрямую, через запятую; ".ru" — все поддомены и сам домен.
 *                          По умолчанию российские зоны и localhost, т.е. через прокси идёт всё остальное.
 *
 * Прокси применяется только к Chromium: БД и S3 (Node) ходят напрямую.
 */
const DEFAULT_BYPASS = '.ru,.su,.xn--p1ai,localhost,127.0.0.1';

export interface RecordingProxy {
  server: string;
  username?: string;
  password?: string;
  bypass: string;
}

export function getRecordingProxy(): RecordingProxy | null {
  const raw = (process.env.RECORDING_PROXY_URL || '').trim();
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    logger.warn('RECORDING_PROXY_URL задан некорректно — прокси не используется');
    return null;
  }
  if (!['http:', 'https:', 'socks5:'].includes(url.protocol)) {
    logger.warn(`RECORDING_PROXY_URL: протокол ${url.protocol} не поддерживается — прокси не используется`);
    return null;
  }

  return {
    server: `${url.protocol}//${url.host}`,
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    bypass: (process.env.RECORDING_PROXY_BYPASS ?? DEFAULT_BYPASS).trim(),
  };
}

/** Пойдёт ли запрос к hostname через прокси (true) или напрямую (false). */
export function isProxiedHost(hostname: string, proxy: RecordingProxy | null = getRecordingProxy()): boolean {
  if (!proxy) return false;
  const host = hostname.toLowerCase();
  const rules = proxy.bypass.split(',').map(r => r.trim().toLowerCase()).filter(Boolean);
  const direct = rules.some(rule =>
    rule.startsWith('.') ? host === rule.slice(1) || host.endsWith(rule) : host === rule,
  );
  return !direct;
}
