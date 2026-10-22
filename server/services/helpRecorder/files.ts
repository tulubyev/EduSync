/**
 * Файлы записи Help Recorder: временные подписанные ссылки (срок — RECORDING_DOWNLOAD_TTL_HOURS на стороне Help Recorder).
 * Ссылки не хранятся: в зеркале — метки hr:<id>, настоящая ссылка запрашивается при открытии плеера, скачивании и в письме.
 */
import { hrFetch } from './client';
import type { HrFile } from './mapping';

export async function hrFiles(userId: string, hrTaskId: string): Promise<HrFile[]> {
  const r = await hrFetch<{ files: HrFile[] }>(`/tasks/${encodeURIComponent(hrTaskId)}/files`, { user: userId });
  return Array.isArray(r?.files) ? r.files : [];
}

/** id видео ('merged' или номер части) → ссылка */
export async function hrFileUrls(userId: string, hrTaskId: string): Promise<Map<string, string>> {
  const files = await hrFiles(userId, hrTaskId);
  return new Map(files.filter((f) => f.url).map((f) => [f.id, f.url as string]));
}
