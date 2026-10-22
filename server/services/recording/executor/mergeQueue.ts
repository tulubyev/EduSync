import { sql, eq } from 'drizzle-orm';
import { db } from '../../../db';
import { recordingTasks } from '@shared/schema';
import { logger } from '../../logger';
import type { MergeSource } from '../recordingFiles';
import { notifyRecordingResult } from '../recordingNotify';
import { NOT_HR_TASK } from '../../helpRecorder/config';

/**
 * Очередь склейки частей записи в один файл.
 *
 * Склейку делает воркер (там есть ffmpeg и диск под записи), веб-приложение только ставит задачу
 * в очередь: metadata.mergeStatus = 'queued'. Воркер забирает задачи по одной
 * (FOR UPDATE SKIP LOCKED — несколько воркеров не возьмут одну и ту же).
 *
 *   RECORDING_AUTO_MERGE=false — не склеивать автоматически после записи (только по кнопке)
 */

export const AUTO_MERGE = process.env.RECORDING_AUTO_MERGE !== 'false';
const POLL_MS = 20_000;

/**
 * Поставить склейку в очередь (вызывается и из веб-приложения, и из воркера).
 * @param sources выбранные части в порядке склейки (в том числе из других записей); без них —
 *                все части задачи по номерам (автосклейка после записи)
 */
export async function queueMerge(taskId: string, reason: string, sources?: MergeSource[] | null): Promise<void> {
  await db
    .update(recordingTasks)
    .set({
      metadata: sql`coalesce(${recordingTasks.metadata}, '{}'::jsonb) || jsonb_build_object('mergeStatus', 'queued', 'mergeProgress', ${reason}::text, 'mergeError', null, 'mergeSources', ${JSON.stringify(sources ?? null)}::jsonb)`,
      updatedAt: new Date(),
    })
    .where(eq(recordingTasks.id, taskId));
}

/** Убрать склейку из очереди, пока воркер её не взял. false — уже идёт или не стояла в очереди. */
export async function cancelQueuedMerge(taskId: string): Promise<boolean> {
  const res: any = await db.execute(sql`
    UPDATE recording_tasks
       SET metadata = metadata || jsonb_build_object(
             'mergeStatus', CASE WHEN metadata->>'mergedUrl' IS NOT NULL THEN 'completed' ELSE 'idle' END,
             'mergeProgress', 'Склейка отменена'),
           updated_at = now()
     WHERE id = ${taskId} AND metadata->>'mergeStatus' = 'queued'
    RETURNING id`);
  return (res?.rows?.length ?? 0) > 0;
}

interface ClaimedMerge {
  id: string;
  title: string;
  parts: Array<{ partNumber: number; publicUrl?: string }> | null;
  sources: MergeSource[] | null;
}

async function claimNextMerge(workerId: string): Promise<ClaimedMerge | null> {
  const res: any = await db.execute(sql`
    UPDATE recording_tasks
       SET metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
             'mergeStatus', 'merging',
             'mergeProgress', 'Подготовка к слиянию...',
             'mergeWorker', ${workerId}::text,
             'mergeStartedAt', ${new Date().toISOString()}::text),
           updated_at = now()
     WHERE id = (
       SELECT id FROM recording_tasks
        WHERE metadata->>'mergeStatus' = 'queued' AND ${NOT_HR_TASK} -- записи Help Recorder склеивает он
        ORDER BY updated_at
        LIMIT 1
        FOR UPDATE SKIP LOCKED)
    RETURNING id, title, parts, metadata->'mergeSources' AS sources`);
  const row = res?.rows?.[0];
  return row
    ? { id: row.id, title: row.title, parts: row.parts, sources: Array.isArray(row.sources) ? row.sources : null }
    : null;
}

/** После перезапуска воркера его недоделанные склейки возвращаются в очередь. */
async function requeueOwnStaleMerges(workerId: string): Promise<void> {
  const res: any = await db.execute(sql`
    UPDATE recording_tasks
       SET metadata = metadata || jsonb_build_object('mergeStatus', 'queued', 'mergeProgress', 'Воркер перезапустился — слияние повторится'),
           updated_at = now()
     WHERE metadata->>'mergeStatus' = 'merging' AND metadata->>'mergeWorker' = ${workerId}
    RETURNING id`);
  const n = res?.rows?.length ?? 0;
  if (n > 0) logger.warn(`[MERGE] ${n} незавершённых слияний возвращено в очередь`);
}

let busy = false;

async function tick(workerId: string): Promise<void> {
  if (busy) return;
  busy = true;
  try {
    const task = await claimNextMerge(workerId);
    if (!task) return;
    // Выбранные пользователем части (в его порядке) или все части задачи по номерам
    const urls = task.sources
      ? task.sources.map((s) => s.url).filter(Boolean)
      : (task.parts ?? [])
          .filter((p) => p.publicUrl)
          .sort((a, b) => a.partNumber - b.partNumber)
          .map((p) => p.publicUrl!);
    // ленивый импорт: ChunkMerger создаёт BegetStorage, нужен только в воркере
    const { chunkMerger } = await import('./mergeChunks');
    if (urls.length < 2) {
      await chunkMerger.markFailed(task.id, `Нечего объединять: частей ${urls.length}`);
      await notifyRecordingResult(task.id, { afterMerge: true });
      return;
    }
    const recordings = task.sources ? new Set(task.sources.map((s) => s.taskId)).size : 1;
    logger.info(`[MERGE] Слияние задачи ${task.id} "${task.title}": ${urls.length} частей из ${recordings} записей`);
    await chunkMerger.merge(task.id, urls, task.title).catch(() => {
      /* статус failed уже записан в merge() */
    });
    // Письмо, отложенное до окончания автосклейки (после ручной склейки не отправляется)
    await notifyRecordingResult(task.id, { afterMerge: true });
  } catch (e) {
    logger.error('[MERGE] Ошибка очереди слияния:', e);
  } finally {
    busy = false;
  }
}

export function startMergeLoop(workerId: string): () => void {
  requeueOwnStaleMerges(workerId).catch((e) => logger.warn('[MERGE] requeue error:', e));
  const timer = setInterval(() => void tick(workerId), POLL_MS);
  logger.info(`[MERGE] Очередь слияния запущена (каждые ${POLL_MS / 1000} с, автослияние: ${AUTO_MERGE ? 'да' : 'нет'})`);
  return () => clearInterval(timer);
}
