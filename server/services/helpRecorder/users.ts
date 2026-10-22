/**
 * Удаление пользователя My EPA вместе с записями: в Help Recorder (учётная запись пользователя, его записи и файлы —
 * DELETE /partner/v1/users/:id) и у себя (зеркала записей и журнал записи). Вызывается до удаления строки users.
 */
import { eq, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { recordingLogs, recordingTasks, recordingWorkerStatus } from '@shared/schema';
import { HrError, hrFetch } from './client';
import { HR_SAVE_TARGET, hrEnabled, hrTaskIdOf } from './config';

/**
 * Удалить записи пользователя. Если у него ещё идёт запись или склейка в Help Recorder — HrError 409 task_busy
 * (Help Recorder уже не принимает запросы от его имени и сам закончит удаление в течение часа; повторите позже).
 */
export async function deleteUserRecordings(userId: string): Promise<void> {
  const tasks = await db.select({ id: recordingTasks.id, saveTarget: recordingTasks.saveTarget, metadata: recordingTasks.metadata })
    .from(recordingTasks).where(eq(recordingTasks.userId, userId));
  const hasHr = tasks.some((t) => t.saveTarget === HR_SAVE_TARGET || hrTaskIdOf(t));

  if (hrEnabled()) {
    try {
      const r = await hrFetch<{ deleted?: boolean }>(`/users/${encodeURIComponent(userId)}`, { method: 'DELETE', user: null });
      if (r?.deleted === false) throw new HrError(409, 'task_busy', 'У пользователя ещё идёт запись или склейка в Help Recorder — удаление закончится само, повторите через час');
    } catch (e) {
      if (!(e instanceof HrError && e.status === 404)) throw e; // 404 — в Help Recorder у пользователя ничего нет
    }
  } else if (hasHr) {
    throw new HrError(0, 'network', 'Help Recorder не настроен (HR_API_URL, HR_PARTNER_KEY): записи пользователя в нём не удалить');
  }

  const ids = tasks.map((t) => t.id);
  if (ids.length) {
    await db.update(recordingWorkerStatus).set({ activeTaskId: null }).where(inArray(recordingWorkerStatus.activeTaskId, ids));
  }
  await db.delete(recordingLogs).where(eq(recordingLogs.userId, userId));
  await db.delete(recordingTasks).where(eq(recordingTasks.userId, userId));
}
