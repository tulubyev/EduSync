/**
 * Файлы записей: список видео задачи, ссылка на скачивание, ключ объекта в S3.
 *
 * Скачивание идёт по подписанной ссылке прямо из хранилища (не через CDN) с заголовком
 * Content-Disposition: attachment — браузер сохраняет файл, а не открывает его во вкладке.
 */
import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/** Все загрузки воркера лежат под этим префиксом (см. BegetStorage.uploadVideo) */
const KEY_PREFIX = 'myepa/recordings/';
/**
 * Срок действия ссылки на скачивание. RECORDING_DOWNLOAD_TTL_HOURS, по умолчанию 12 ч
 * (записи часто идут ночью и скачиваются утром). Предел подписи S3 — 7 суток.
 */
export const DOWNLOAD_URL_TTL_HOURS = Math.min(168, Math.max(1, parseFloat(process.env.RECORDING_DOWNLOAD_TTL_HOURS || '12') || 12));
const DOWNLOAD_URL_TTL_SEC = Math.round(DOWNLOAD_URL_TTL_HOURS * 3600);

export interface TaskVideo {
  /** 'merged' — объединённый файл, иначе номер части */
  id: string;
  label: string;
  url: string;
}

interface TaskLike {
  title: string;
  begetUrl?: string | null;
  parts?: Array<{ partNumber: number; publicUrl?: string }> | null;
  mergedUrl?: string | null;
}

export function listTaskVideos(task: TaskLike): TaskVideo[] {
  const videos: TaskVideo[] = [];
  if (task.mergedUrl) videos.push({ id: 'merged', label: 'Вся запись (объединённая)', url: task.mergedUrl });
  const parts = (task.parts ?? [])
    .filter((p) => p.publicUrl)
    .sort((a, b) => a.partNumber - b.partNumber);
  for (const p of parts) {
    videos.push({ id: String(p.partNumber), label: parts.length > 1 ? `Часть ${p.partNumber}` : 'Запись', url: p.publicUrl! });
  }
  if (videos.length === 0 && task.begetUrl) videos.push({ id: '1', label: 'Запись', url: task.begetUrl });
  return videos;
}

/** Что можно склеивать: сами части записи (объединённый файл задачи — нет, он результат склейки). */
export function mergeableVideos(task: TaskLike): TaskVideo[] {
  return listTaskVideos(task).filter((v) => v.id !== 'merged');
}

/** Одна часть в списке склейки: какая задача, какое видео и откуда его читать. */
export interface MergeSource {
  taskId: string;
  video: string;
  url: string;
}

/** Ключ объекта по публичной ссылке (CDN или прямой адрес хранилища — без разницы). */
export function objectKeyFromUrl(url: string): string | null {
  let path: string;
  try {
    path = decodeURIComponent(new URL(url).pathname);
  } catch {
    return null;
  }
  const i = path.indexOf(`/${KEY_PREFIX}`);
  return i >= 0 ? path.slice(i + 1) : null;
}

/** Имя файла для сохранения: название задачи + часть, без символов, недопустимых в именах файлов. */
export function downloadFileName(title: string, video: TaskVideo): string {
  const base = (title || 'запись').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100) || 'запись';
  const suffix = video.id === 'merged' ? '' : video.label === 'Запись' ? '' : ` — часть ${video.id}`;
  return `${base}${suffix}.mp4`;
}

function contentDisposition(fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]+/g, '_').replace(/"/g, "'");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

let client: S3Client | null = null;
function s3(): S3Client | null {
  const endpoint = process.env.BEGET_S3_ENDPOINT;
  const accessKeyId = process.env.BEGET_S3_ACCESS_KEY || process.env.BEGET_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.BEGET_S3_SECRET_KEY || process.env.BEGET_S3_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey || !process.env.BEGET_S3_BUCKET) return null;
  if (!client) {
    client = new S3Client({
      endpoint,
      region: process.env.BEGET_S3_REGION || 'us-east-1',
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });
  }
  return client;
}

/**
 * Подписанная ссылка на скачивание (по умолчанию действует 12 часов). null — если хранилище не настроено или
 * ссылка не из нашего бакета (например, старые записи) — тогда клиент скачивает по исходной ссылке.
 */
export async function presignDownload(video: TaskVideo, fileName: string): Promise<string | null> {
  const key = objectKeyFromUrl(video.url);
  const c = s3();
  if (!key || !c) return null;
  try {
    await c.send(new HeadObjectCommand({ Bucket: process.env.BEGET_S3_BUCKET!, Key: key }));
  } catch {
    return null; // файла нет в текущем бакете (старая запись) — скачиваем по исходной ссылке
  }
  return getSignedUrl(
    c,
    new GetObjectCommand({
      Bucket: process.env.BEGET_S3_BUCKET!,
      Key: key,
      ResponseContentDisposition: contentDisposition(fileName),
      ResponseContentType: 'video/mp4',
    }),
    { expiresIn: DOWNLOAD_URL_TTL_SEC },
  );
}
