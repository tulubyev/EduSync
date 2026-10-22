/**
 * Перевод данных Help Recorder в поля зеркала recording_tasks и обратно. Модуль чистый (без БД и сети) — его проверяют тесты.
 */
import type { RecordingPart } from '../recording/types';

/** Карточка записи Help Recorder (GET /partner/v1/tasks/:id → task) — поля, которые читает My EPA */
export interface HrCard {
  id: string;
  title: string;
  stream_url: string;
  scheduled_time: string;
  duration: number;
  status: string;
  parts?: { current?: number; total?: number };
  started_at?: string | null;
  completed_at?: string | null;
  error?: { reason?: string; hint?: string } | null;
  saved_parts?: number;
  url_check?: { status?: string | null; message?: string | null };
  start?: { state?: string; stage_label?: string; severity?: string; reason?: string; hint?: string; method_label?: string; note?: string } | null;
  method?: { label?: string; platform?: string; note?: string } | null;
  has_files?: boolean;
  files_deleted_at?: string | null;
  expires_at?: string | null;
  merge?: { status?: string; available?: boolean; has_merged?: boolean; error_code?: string | null; error_detail?: string | null };
}

export interface HrFile { id: string; label: string; file_name: string; url: string | null }

const STATUSES = ['scheduled', 'ready', 'in_progress', 'uploading', 'completed', 'failed', 'cancelled'];
export const FINAL_STATUSES = ['completed', 'failed', 'cancelled'];
export const MERGE_PENDING = ['queued', 'merging'];

const MERGE_ERRORS: Record<string, string> = {
  format_mismatch: 'Части записаны в разном формате — склеить их нельзя',
  too_few: 'Для склейки нужно минимум две части',
  failed: 'Склейка не удалась',
};

const date = (v: unknown) => (typeof v === 'string' && v ? new Date(v) : null);

/** Ссылка-метка на файл Help Recorder в зеркале: настоящая (временная) ссылка берётся при открытии — files.ts */
export const hrFileRef = (videoId: string) => `hr:${videoId}`;

/** Поля зеркала по карточке: колонки и то, что дописывается в metadata */
export function cardToLocal(card: HrCard, now = new Date()): { set: Record<string, unknown>; meta: Record<string, unknown> } {
  const status = STATUSES.includes(card.status) ? card.status : 'failed';
  const merge = card.merge ?? {};
  const mergeStatus = typeof merge.status === 'string' ? merge.status : 'idle';
  const mergeError = mergeStatus === 'failed'
    ? [MERGE_ERRORS[merge.error_code ?? 'failed'] ?? MERGE_ERRORS.failed, merge.error_detail].filter(Boolean).join(': ')
    : null;
  return {
    set: {
      title: card.title,
      streamUrl: card.stream_url,
      scheduledTime: new Date(card.scheduled_time),
      duration: card.duration,
      status,
      currentPart: card.parts?.current ?? 0,
      totalParts: card.parts?.total ?? 1,
      startedAt: date(card.started_at),
      completedAt: date(card.completed_at),
      errorMessage: status === 'failed' ? (card.error?.reason || 'Не удалось записать событие') : null,
      urlCheckStatus: card.url_check?.status ?? 'pending',
      urlCheckMessage: card.url_check?.message ?? null,
    },
    meta: {
      mergeStatus,
      mergeError,
      mergeProgress: mergeStatus === 'queued' ? 'В очереди на склейку' : mergeStatus === 'merging' ? 'Склеиваем части' : null,
      hr: {
        start: card.start ?? null,
        method: card.method ?? null,
        error: card.error ?? null,
        hasFiles: !!card.has_files,
        hasMerged: !!merge.has_merged,
        savedParts: card.saved_parts ?? 0,
        filesDeletedAt: card.files_deleted_at ?? null,
        expiresAt: card.expires_at ?? null,
        syncedAt: now.toISOString(),
      },
    },
  };
}

/** Что изменилось в файлах записи — тогда список файлов перечитывается */
export const filesKey = (card: HrCard) =>
  `${card.status}:${!!card.has_files}:${!!card.merge?.has_merged}:${card.saved_parts ?? 0}:${card.files_deleted_at ?? ''}`;

/** Части и объединённый файл зеркала по списку файлов (ссылки — метки hr:<id>) */
export function filesToLocal(files: HrFile[], scheduledTime: Date): { parts: RecordingPart[]; begetUrl: string | null; mergedUrl: string | null } {
  const parts: RecordingPart[] = files
    .filter((f) => /^\d+$/.test(f.id))
    .map((f) => ({ partNumber: Number(f.id), fileName: f.file_name, startTime: scheduledTime.toISOString(), status: 'completed' as const, publicUrl: hrFileRef(f.id) }))
    .sort((a, b) => a.partNumber - b.partNumber);
  const merged = files.some((f) => f.id === 'merged');
  return { parts, begetUrl: parts[0]?.publicUrl ?? (merged ? hrFileRef('merged') : null), mergedUrl: merged ? hrFileRef('merged') : null };
}

/** Статус старта для кабинета (как StartStatus своего воркера) по данным Help Recorder */
export function hrStartStatus(meta: any, status: string): any {
  const s = meta?.hr?.start;
  if (!s) {
    if (status === 'failed' && meta?.hr?.error) return { state: 'failed', severity: 'error', reason: meta.hr.error.reason, hint: meta.hr.error.hint, updatedAt: meta.hr.syncedAt };
    return undefined;
  }
  return {
    state: s.state,
    stageLabel: s.stage_label,
    severity: s.severity ?? (status === 'failed' ? 'error' : 'info'),
    reason: s.reason,
    hint: s.hint,
    methodLabel: s.method_label,
    note: s.note,
    recordingConfirmed: status === 'uploading' || status === 'completed' || undefined,
    updatedAt: meta.hr.syncedAt,
  };
}

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

/** Тело новой записи для Help Recorder */
export function createBody(d: {
  title: string; streamUrl: string; scheduledTime: string; duration: number;
  streamPassword?: string; joinName?: string; joinEmail?: string; joinPhone?: string;
}): Record<string, unknown> {
  return {
    title: d.title.trim(),
    stream_url: d.streamUrl.trim(),
    scheduled_time: new Date(d.scheduledTime).toISOString(),
    duration: d.duration,
    ...(str(d.streamPassword) ? { stream_password: str(d.streamPassword) } : {}),
    ...(str(d.joinName) ? { join_name: str(d.joinName) } : {}),
    ...(str(d.joinEmail) ? { join_email: str(d.joinEmail) } : {}),
    ...(str(d.joinPhone) ? { join_phone: str(d.joinPhone) } : {}),
    rights_confirmed: true,
  };
}

/**
 * Тело правки (PATCH) по форме кабинета. Форма не получает пароль и данные входа (пароль не отдаётся в браузер),
 * поэтому пустое поле — «не менять», а не «стереть».
 */
export function editBody(b: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (str(b.title)) out.title = str(b.title);
  if (str(b.streamUrl)) out.stream_url = str(b.streamUrl);
  if (str(b.scheduledTime)) out.scheduled_time = new Date(String(b.scheduledTime)).toISOString();
  if (b.duration !== undefined && b.duration !== null && b.duration !== '') out.duration = Number(b.duration);
  if (str(b.streamPassword)) out.stream_password = str(b.streamPassword);
  if (str(b.joinName)) out.join_name = str(b.joinName);
  if (str(b.joinEmail)) out.join_email = str(b.joinEmail);
  if (str(b.joinPhone)) out.join_phone = str(b.joinPhone);
  return out;
}

/** Подпись части в списках кабинета */
export const partLabel = (video: string, count: number) => (video === 'merged' ? 'Вся запись (объединённая)' : count > 1 ? `Часть ${video}` : 'Запись');
