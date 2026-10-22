/**
 * Действия кабинета My EPA над записями Help Recorder (маршруты — server/routes/recording.ts).
 * Ошибки Help Recorder — HrError; маршрут превращает её в ответ с понятным текстом (messages.ts).
 */
import { randomUUID } from 'crypto';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../db';
import { recordingTasks } from '@shared/schema';
import { logger } from '../logger';
import { recordingTaskManager } from '../recording/taskManager';
import { HrError, hrFetch } from './client';
import { HR_SAVE_TARGET, hrTaskIdOf } from './config';
import { hrFiles } from './files';
import { createBody, editBody, partLabel, type HrFile } from './mapping';
import { syncHrTask, syncHrTaskById } from './sync';

type TaskRow = typeof recordingTasks.$inferSelect;

const path = (hrId: string, tail = '') => `/tasks/${encodeURIComponent(hrId)}${tail}`;

async function row(localId: string): Promise<TaskRow> {
  const [r] = await db.select().from(recordingTasks).where(eq(recordingTasks.id, localId));
  if (!r) throw new HrError(404, 'not_found', 'Запись не найдена');
  return r;
}

function hrIdOf(r: TaskRow): string {
  const id = hrTaskIdOf(r);
  if (!id) throw new HrError(409, 'not_found', 'Запись не связана с сервисом записи');
  return id;
}

export interface NewRecording {
  title: string; description?: string; streamUrl: string; streamPassword?: string;
  joinName?: string; joinEmail?: string; joinPhone?: string; scheduledTime: string; duration: number;
}

/**
 * Новая запись: сначала в Help Recorder (Idempotency-Key = id зеркала — повтор после сбоя сети не создаст вторую),
 * потом зеркало. Пароль страницы хранит только Help Recorder (зашифрованным), в зеркало он не пишется.
 */
export async function createHrRecording(userId: string, d: NewRecording): Promise<string> {
  const localId = randomUUID();
  const created = await hrFetch<{ id: string }>('/tasks', { method: 'POST', user: userId, idempotencyKey: localId, body: createBody(d) });
  await recordingTaskManager.createTask({
    id: localId,
    userId,
    title: d.title,
    description: d.description,
    streamUrl: d.streamUrl,
    joinName: d.joinName || undefined,
    joinEmail: d.joinEmail || undefined,
    joinPhone: d.joinPhone || undefined,
    scheduledTime: new Date(d.scheduledTime),
    duration: d.duration,
    saveTarget: HR_SAVE_TARGET,
    metadata: { hrTaskId: created.id, rightsConfirmedAt: new Date().toISOString() },
  });
  await syncHrTaskById(localId).catch((e) => logger.warn(`[HR] Первая синхронизация ${localId}: ${(e as Error).message}`));
  return localId;
}

export async function cancelHrRecording(localId: string): Promise<void> {
  const r = await row(localId);
  await hrFetch(path(hrIdOf(r), '/cancel'), { method: 'POST', user: r.userId });
  await syncHrTask(r);
}

/**
 * Повтор: у прерванной записи с сохранёнными частями Help Recorder создаёт новую запись на оставшееся время —
 * для неё появляется своё зеркало. Возвращает id записи, которая теперь пишется.
 */
export async function retryHrRecording(localId: string): Promise<string> {
  const r = await row(localId);
  const hrId = hrIdOf(r);
  const res = await hrFetch<{ id: string }>(path(hrId, '/retry'), { method: 'POST', user: r.userId });
  if (!res?.id || res.id === hrId) {
    await syncHrTask(r);
    return localId;
  }
  const contId = await recordingTaskManager.createTask({
    userId: r.userId,
    title: r.title,
    description: r.description ?? undefined,
    streamUrl: r.streamUrl,
    joinName: r.joinName ?? undefined,
    joinEmail: r.joinEmail ?? undefined,
    joinPhone: r.joinPhone ?? undefined,
    scheduledTime: new Date(),
    duration: Math.max(1, Math.ceil((new Date(r.scheduledTime).getTime() + r.duration * 60_000 - Date.now()) / 60_000)),
    saveTarget: HR_SAVE_TARGET,
    metadata: { hrTaskId: res.id, continuationOf: localId },
  });
  await syncHrTaskById(contId).catch(() => {});
  return contId;
}

export async function editHrRecording(localId: string, body: Record<string, unknown>): Promise<void> {
  const r = await row(localId);
  const patch = editBody(body);
  if (Object.keys(patch).length) await hrFetch(path(hrIdOf(r), ''), { method: 'PATCH', user: r.userId, body: patch });
  // описание есть только в My EPA
  if (body.description !== undefined) {
    await db.update(recordingTasks).set({ description: String(body.description ?? '').trim() || null, updatedAt: new Date() })
      .where(eq(recordingTasks.id, localId));
  }
  for (const k of ['joinName', 'joinEmail', 'joinPhone'] as const) {
    const v = typeof body[k] === 'string' ? (body[k] as string).trim() : '';
    if (v) await db.update(recordingTasks).set({ [k]: v }).where(eq(recordingTasks.id, localId));
  }
  await syncHrTask(await row(localId));
}

export async function recheckHrRecording(localId: string): Promise<void> {
  const r = await row(localId);
  await hrFetch(path(hrIdOf(r), '/recheck'), { method: 'POST', user: r.userId });
  await syncHrTask(r);
}

/** Удалить запись и её файлы в Help Recorder, потом зеркало. Уже удалённая там — просто удаляем зеркало. */
export async function deleteHrRecording(localId: string): Promise<void> {
  const r = await row(localId);
  const hrId = hrTaskIdOf(r);
  if (hrId) {
    try {
      await hrFetch(path(hrId, ''), { method: 'DELETE', user: r.userId });
    } catch (e) {
      if (!(e instanceof HrError && e.status === 404)) throw e;
    }
  }
  await db.delete(recordingTasks).where(eq(recordingTasks.id, localId));
}

/** Файлы для плеера и скачивания: id, подпись, имя файла, временная ссылка */
export async function hrVideos(r: TaskRow): Promise<HrFile[]> {
  return (await hrFiles(r.userId, hrIdOf(r))).filter((f) => f.url);
}

// ── Склейка ──────────────────────────────────────────────────────────────────

interface HrMergeTask { task_id: string; title: string; scheduled_time: string; parts: Array<{ video: string; duration_ms: number | null }> }

/** Варианты склейки в формате кабинета My EPA: id зеркал вместо id Help Recorder, ссылки для просмотра частей */
export async function hrMergeOptions(localId: string): Promise<unknown> {
  const r = await row(localId);
  const opts = await hrFetch<{ current: HrMergeTask; others: HrMergeTask[]; last_selection: Array<{ task_id: string; video: string }> | null }>(
    path(hrIdOf(r), '/merge-options'), { user: r.userId });
  const hrIds = [opts.current.task_id, ...opts.others.map((o) => o.task_id)];
  const mirrors = await db.select().from(recordingTasks).where(and(eq(recordingTasks.userId, r.userId),
    sql`${recordingTasks.metadata}->>'hrTaskId' IN (${sql.join(hrIds.map((id) => sql`${id}`), sql`, `)})`));
  const byHr = new Map(mirrors.map((m) => [hrTaskIdOf(m)!, m]));
  const urls = new Map<string, Map<string, string>>();
  await Promise.all(hrIds.filter((id) => byHr.has(id)).map(async (id) => {
    try {
      urls.set(id, new Map((await hrFiles(r.userId, id)).filter((f) => f.url).map((f) => [f.id, f.url!])));
    } catch { /* без просмотра части */ }
  }));
  const describe = (t: HrMergeTask) => {
    const m = byHr.get(t.task_id);
    if (!m) return null;
    return {
      taskId: m.id, title: m.title, scheduledTime: m.scheduledTime, status: m.status,
      parts: t.parts.map((p) => ({ video: p.video, label: partLabel(p.video, t.parts.length), url: urls.get(t.task_id)?.get(p.video) ?? '', durationMs: p.duration_ms ?? undefined })),
    };
  };
  return {
    current: describe(opts.current),
    others: opts.others.map(describe).filter(Boolean),
    lastSelection: opts.last_selection
      ? opts.last_selection.map((s) => ({ taskId: byHr.get(s.task_id)?.id, video: s.video })).filter((s) => s.taskId)
      : null,
  };
}

/** Склеить: без sources — все части записи; с sources — выбранные части (id зеркал этого же пользователя) */
export async function hrMerge(localId: string, sources?: Array<{ taskId: string; video: string }>): Promise<number | null> {
  const r = await row(localId);
  let body: unknown = {};
  if (sources) {
    const ids = Array.from(new Set(sources.map((s) => s.taskId)));
    const mirrors = await db.select().from(recordingTasks).where(and(eq(recordingTasks.userId, r.userId), inArray(recordingTasks.id, ids)));
    const hrOf = new Map(mirrors.map((m) => [m.id, hrTaskIdOf(m)]));
    if (sources.some((s) => !hrOf.get(s.taskId))) throw new HrError(400, 'invalid_sources', 'Часть из чужой, удалённой или записанной не через сервис записи записи');
    body = { sources: sources.map((s) => ({ task_id: hrOf.get(s.taskId), video: s.video })) };
  }
  const res = await hrFetch<{ parts?: number }>(path(hrIdOf(r), '/merge'), { method: 'POST', user: r.userId, body });
  await syncHrTask(r);
  return res?.parts ?? null;
}

export async function hrMergeCancel(localId: string): Promise<void> {
  const r = await row(localId);
  await hrFetch(path(hrIdOf(r), '/merge/cancel'), { method: 'POST', user: r.userId });
  await syncHrTask(r);
}

/** Удалить в Help Recorder записи из списка (очистка очереди). Возвращает id зеркал, которые можно удалить у себя. */
export async function deleteHrRecordings(rows: TaskRow[]): Promise<Set<string>> {
  const ok = new Set<string>();
  for (const r of rows) {
    const hrId = hrTaskIdOf(r);
    if (!hrId) { ok.add(r.id); continue; }
    try {
      await hrFetch(path(hrId, ''), { method: 'DELETE', user: r.userId });
      ok.add(r.id);
    } catch (e) {
      if (e instanceof HrError && e.status === 404) ok.add(r.id);
      else logger.warn(`[HR] Удаление ${r.id}: ${(e as Error).message}`);
    }
  }
  return ok;
}
