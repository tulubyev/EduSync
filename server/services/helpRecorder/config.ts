/**
 * Запись через Help Recorder (партнёрский API, docs/HELP-RECORDER.md).
 *
 * Если заданы HR_API_URL и HR_PARTNER_KEY, новые записи My EPA ставятся в Help Recorder: он записывает, хранит файлы,
 * склеивает части. В recording_tasks остаётся «зеркало» записи (save_target = 'help_recorder', metadata.hrTaskId):
 * его показывает кабинет, его обновляет синхронизация (sync.ts) и вебхук (/api/hr/webhook).
 * Свой воркер, планировщик, сторож и очередь склейки My EPA такие записи не трогают (NOT_HR_TASK) —
 * старый воркер может дописать уже запланированные у себя записи, а потом его можно выключить.
 *
 *   HR_API_URL=https://api.recorder.help   HR_PARTNER_KEY=hrp_…   HR_WEBHOOK_SECRET=whsec_…
 */
import { sql } from 'drizzle-orm';

export const HR_SAVE_TARGET = 'help_recorder';

/** Условие SQL «запись не ведёт Help Recorder» — для циклов своего воркера и веб-процесса */
export const NOT_HR_TASK = sql`coalesce(save_target, '') <> ${HR_SAVE_TARGET}`;

export function hrApiUrl(): string {
  return (process.env.HR_API_URL || '').trim().replace(/\/+$/, '');
}

/** Новые записи — в Help Recorder */
export function hrEnabled(): boolean {
  return !!hrApiUrl() && !!(process.env.HR_PARTNER_KEY || '').trim();
}

export function isHrTask(task: { saveTarget?: string | null; metadata?: unknown } | null | undefined): boolean {
  return !!task && (task.saveTarget === HR_SAVE_TARGET || !!(task.metadata as any)?.hrTaskId);
}

export function hrTaskIdOf(task: { metadata?: unknown }): string | null {
  const id = (task.metadata as any)?.hrTaskId;
  return typeof id === 'string' && id ? id : null;
}
