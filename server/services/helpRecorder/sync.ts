/**
 * Синхронизация зеркала записи с Help Recorder: статус, части, склейка, причина сбоя.
 *
 * Карточку читает цикл веб-процесса (syncDueHrTasks, каждые 30 с — идущие и скоро начинающиеся записи, склейки в очереди)
 * и вебхук task.finished (сразу по окончании). По переходу в «готово»/«ошибка» и по окончании склейки уходит то же письмо,
 * что и при записи своим воркером (recordingNotify.ts).
 */
import { eq, sql } from 'drizzle-orm';
import { db } from '../../db';
import { recordingTasks } from '@shared/schema';
import { logger } from '../logger';
import { HrError, hrFetch } from './client';
import { HR_SAVE_TARGET, hrEnabled, hrTaskIdOf } from './config';
import { hrFiles } from './files';
import { FINAL_STATUSES, MERGE_PENDING, cardToLocal, filesKey, filesToLocal, type HrCard } from './mapping';

type TaskRow = typeof recordingTasks.$inferSelect;

/** Перечитать карточку и обновить зеркало. Возвращает новый статус (null — запись не из Help Recorder). */
export async function syncHrTask(row: TaskRow): Promise<string | null> {
  const hrId = hrTaskIdOf(row);
  if (!hrId) return null;
  const meta: any = row.metadata ?? {};

  let card: HrCard;
  try {
    card = (await hrFetch<{ task: HrCard }>(`/tasks/${encodeURIComponent(hrId)}`, { user: row.userId })).task;
  } catch (e) {
    if (e instanceof HrError && e.status === 404) {
      // запись удалили в Help Recorder (например, вместе с пользователем) — дальше не синхронизируем
      await db.update(recordingTasks).set({
        status: FINAL_STATUSES.includes(row.status ?? '') ? row.status : 'failed',
        errorMessage: row.status === 'completed' ? row.errorMessage : 'Запись не найдена в сервисе записи',
        metadata: sql`coalesce(${recordingTasks.metadata}, '{}'::jsonb) || ${JSON.stringify({ hr: { ...meta.hr, missing: true, filesPending: false } })}::jsonb`,
        updatedAt: new Date(),
      }).where(eq(recordingTasks.id, row.id));
      return 'failed';
    }
    throw e;
  }

  const { set, meta: newMeta } = cardToLocal(card);
  const hr: any = newMeta.hr;
  const key = filesKey(card);
  const files: Record<string, unknown> = {};
  if (meta.hr?.filesKey !== key) {
    if (card.has_files) {
      try {
        Object.assign(files, filesToLocal(await hrFiles(row.userId, hrId), new Date(card.scheduled_time)));
        hr.filesKey = key;
        hr.filesPending = false;
      } catch (e) {
        hr.filesPending = true; // перечитаем в следующем цикле
        logger.warn(`[HR] Файлы записи ${row.id} не получены: ${(e as Error).message}`);
      }
    } else {
      Object.assign(files, { parts: [], begetUrl: null, mergedUrl: null });
      hr.filesKey = key;
      hr.filesPending = false;
    }
  } else {
    hr.filesKey = key;
    hr.filesPending = !!meta.hr?.filesPending;
  }
  const { mergedUrl, ...cols } = files as { mergedUrl?: string | null };
  const metaPatch = { ...newMeta, ...(mergedUrl !== undefined ? { mergedUrl } : {}) };

  await db.update(recordingTasks).set({
    ...(set as any),
    ...(cols as any),
    metadata: sql`coalesce(${recordingTasks.metadata}, '{}'::jsonb) || ${JSON.stringify(metaPatch)}::jsonb`,
    updatedAt: new Date(),
  }).where(eq(recordingTasks.id, row.id));

  // Письмо — как у своего воркера: по окончании записи (и после автосклейки, если она идёт)
  const wasFinal = FINAL_STATUSES.includes(row.status ?? '');
  const isFinal = set.status === 'completed' || set.status === 'failed';
  const wasMerging = MERGE_PENDING.includes(meta.mergeStatus);
  const isMerging = MERGE_PENDING.includes(String(newMeta.mergeStatus));
  if ((!wasFinal && isFinal) || (wasMerging && !isMerging)) {
    const { notifyRecordingResult } = await import('../recording/recordingNotify');
    await notifyRecordingResult(row.id, { afterMerge: wasFinal && wasMerging && !isMerging });
  }
  return String(set.status);
}

export async function syncHrTaskById(localId: string): Promise<void> {
  const [row] = await db.select().from(recordingTasks).where(eq(recordingTasks.id, localId));
  if (row) await syncHrTask(row);
}

let running = false;

/**
 * Записи, которые пора перечитать: идущие и «ждут старта», запланированные — за 15 минут до начала и раз в 10 минут,
 * склейки в очереди, а также завершённые, файлы которых не удалось получить.
 */
export async function syncDueHrTasks(): Promise<number> {
  if (!hrEnabled() || running) return 0;
  running = true;
  try {
    const soon = new Date(Date.now() + 15 * 60_000);
    const stale = new Date(Date.now() - 10 * 60_000).toISOString();
    const rows = await db.select().from(recordingTasks).where(sql`
      ${recordingTasks.saveTarget} = ${HR_SAVE_TARGET} AND ${recordingTasks.metadata}->>'hrTaskId' IS NOT NULL
      AND coalesce(${recordingTasks.metadata}->'hr'->>'missing', '') <> 'true'
      AND (
        ${recordingTasks.status} IN ('ready', 'in_progress', 'uploading')
        OR (${recordingTasks.status} = 'scheduled' AND (${recordingTasks.scheduledTime} <= ${soon}
            OR coalesce(${recordingTasks.metadata}->'hr'->>'syncedAt', '') < ${stale}))
        OR ${recordingTasks.metadata}->>'mergeStatus' IN ('queued', 'merging')
        OR ${recordingTasks.metadata}->'hr'->>'filesPending' = 'true'
      )`).limit(200);
    let n = 0;
    for (const row of rows) {
      try {
        await syncHrTask(row);
        n++;
      } catch (e) {
        logger.warn(`[HR] Синхронизация записи ${row.id}: ${(e as Error).message}`);
      }
    }
    return n;
  } finally {
    running = false;
  }
}
