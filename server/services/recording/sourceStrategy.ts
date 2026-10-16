/**
 * Выбор способа записи по ссылке.
 *
 *  direct    — прямой поток (HLS/DASH/RTMP/RTSP/файл): ffmpeg -c copy, без браузера и перекодирования;
 *  extractor — видеохостинг/стриминг: адрес потока достаёт yt-dlp или streamlink, дальше ffmpeg -c copy;
 *  browser   — вебинарные платформы и всё остальное: Chromium + захват экрана (дорого).
 *
 * Конференции (Zoom, Jitsi, BigBlueButton, Teams, Meet, Webex) пишутся через браузер; для них лучше
 * штатная запись платформы — это отмечается в note. Записи Zoom, которые уже сохранены облаком
 * (zoom.us/rec/…), — это готовый файл, его берёт yt-dlp.
 *
 * Модуль чистый (без ввода-вывода): используется и воркером, и веб-сервером, проверяется скриптом.
 */

export type RecordingMethod = 'direct' | 'extractor' | 'browser';
export type ExtractorTool = 'yt-dlp' | 'streamlink';
export type Conference = 'zoom' | 'jitsi' | 'bigbluebutton' | 'teams' | 'meet' | 'webex';

export interface SourcePlan {
  method: RecordingMethod;
  /** Порядок инструментов для extractor: первый основной, второй — запасной */
  tools?: ExtractorTool[];
  /** Короткое имя площадки для логов и интерфейса */
  platform: string;
  conference?: Conference;
  note?: string;
}

export const METHOD_LABELS: Record<RecordingMethod, string> = {
  direct: 'Прямая запись потока (без браузера)',
  extractor: 'Запись потока площадки (без браузера)',
  browser: 'Запись через браузер',
};

interface Rule {
  test: RegExp;
  platform: string;
  tools: ExtractorTool[];
}

// Площадки, где поток надёжно достаётся без браузера.
// twitch/goodgame — streamlink в приоритете (он для live-стриминга), остальное — yt-dlp.
const EXTRACTOR_RULES: Rule[] = [
  { test: /(^|\.)youtube\.com\/(watch|live\/|shorts\/|@[^/]+\/live|embed\/)|(^|\/\/)youtu\.be\//i, platform: 'YouTube', tools: ['yt-dlp', 'streamlink'] },
  { test: /(^|\.)rutube\.ru\/(video|live|play\/embed|shorts)\//i, platform: 'Rutube', tools: ['yt-dlp', 'streamlink'] },
  { test: /(^|\.)(vk\.com|vk\.ru)\/(video|clip|video_ext\.php)|(^|\.)vkvideo\.ru\//i, platform: 'VK Видео', tools: ['yt-dlp', 'streamlink'] },
  { test: /(^|\.)twitch\.tv\//i, platform: 'Twitch', tools: ['streamlink', 'yt-dlp'] },
  { test: /(^|\.)ok\.ru\/(video|live)/i, platform: 'OK', tools: ['yt-dlp', 'streamlink'] },
  { test: /(^|\.)vimeo\.com\/\d|player\.vimeo\.com\/video\//i, platform: 'Vimeo', tools: ['yt-dlp'] },
  { test: /(^|\.)dailymotion\.com\/video\//i, platform: 'Dailymotion', tools: ['yt-dlp', 'streamlink'] },
  { test: /(^|\.)kick\.com\//i, platform: 'Kick', tools: ['yt-dlp', 'streamlink'] },
  { test: /(^|\.)goodgame\.ru\//i, platform: 'GoodGame', tools: ['streamlink'] },
  { test: /(^|\.)zoom\.us\/rec\/(share|play)\//i, platform: 'Zoom (запись в облаке)', tools: ['yt-dlp'] },
];

const CONFERENCE_RULES: Array<{ test: RegExp; conference: Conference; platform: string }> = [
  { test: /(^|\.)zoom\.(us|com)\/(j|w|wc|s|my)\//i, conference: 'zoom', platform: 'Zoom' },
  { test: /(^|\.)meet\.jit\.si\/|jitsi/i, conference: 'jitsi', platform: 'Jitsi' },
  { test: /bigbluebutton|\/b\/[a-z0-9]{3}-[a-z0-9]{3}-[a-z0-9]{3}/i, conference: 'bigbluebutton', platform: 'BigBlueButton' },
  { test: /(^|\.)teams\.(microsoft|live)\.com\//i, conference: 'teams', platform: 'Microsoft Teams' },
  { test: /(^|\.)meet\.google\.com\//i, conference: 'meet', platform: 'Google Meet' },
  { test: /(^|\.)webex\.com\//i, conference: 'webex', platform: 'Webex' },
];

const CONFERENCE_NOTE: Record<Conference, string> = {
  zoom: 'Zoom: надёжнее штатная облачная запись организатора (ссылка zoom.us/rec/… пишется без браузера) или бот через Zoom Meeting SDK/RTMS.',
  jitsi: 'Jitsi: надёжнее штатная запись через Jibri на стороне сервера Jitsi.',
  bigbluebutton: 'BigBlueButton: надёжнее встроенная запись BBB (включается организатором).',
  teams: 'Teams: надёжнее запись самой платформой (делает организатор).',
  meet: 'Google Meet: надёжнее запись самой платформой (делает организатор).',
  webex: 'Webex: надёжнее облачная запись Webex (делает организатор).',
};

const DIRECT_PROTOCOL = /^(rtmps?|rtsp|rtsps|srt|udp|rtp):\/\//i;
// Путь без query: .m3u8/.mpd — плейлисты; остальное — прямые файлы/потоки
const DIRECT_PATH = /\.(m3u8|mpd|flv|ts|mp4|m4v|mkv|webm|mov|mp3|aac|m4a)$/i;

export function planRecording(rawUrl: string, opts: { forceBrowser?: boolean } = {}): SourcePlan {
  let url: URL | null = null;
  try {
    url = new URL(rawUrl);
  } catch {
    // некорректную ссылку отсеет urlValidator; здесь — безопасный вариант по умолчанию
  }

  const href = url ? url.href : rawUrl;
  const hostAndPath = url ? `${url.hostname}${url.pathname}` : rawUrl;

  if (!opts.forceBrowser) {
    if (DIRECT_PROTOCOL.test(href)) {
      return { method: 'direct', platform: href.split(':')[0].toUpperCase() };
    }
    if (url && DIRECT_PATH.test(url.pathname)) {
      const ext = url.pathname.split('.').pop()!.toLowerCase();
      return { method: 'direct', platform: ext === 'm3u8' ? 'HLS' : ext === 'mpd' ? 'DASH' : ext.toUpperCase() };
    }
    for (const r of EXTRACTOR_RULES) {
      if (r.test.test(hostAndPath)) return { method: 'extractor', tools: r.tools, platform: r.platform };
    }
  }

  for (const c of CONFERENCE_RULES) {
    if (c.test.test(hostAndPath)) {
      return { method: 'browser', platform: c.platform, conference: c.conference, note: CONFERENCE_NOTE[c.conference] };
    }
  }

  return { method: 'browser', platform: url ? url.hostname.replace(/^www\./, '') : 'неизвестно' };
}
