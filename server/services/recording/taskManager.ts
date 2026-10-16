import { db } from '../../db';
import { recordingTasks, recordingWorkerStatus } from '@shared/schema';
import { eq, and, or, lte, gte, lt, desc, sql, isNull, inArray } from 'drizzle-orm';
import { logger } from '../logger';
import { RecordingTaskData, RecordingPart } from './types';
import { recordingLogger } from './logger';
import { readRuntimeSettings } from './runtimeSettings';
import { planRecording, METHOD_LABELS } from './sourceStrategy';
import { buildStartStatus, type WaitingContext, type StartRecord } from './startStatus';
import { randomUUID } from 'crypto';

const TRANSLIT_MAP: Record<string, string> = {
  'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh','з':'z',
  'и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r',
  'с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh',
  'щ':'shch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya',
  'А':'A','Б':'B','В':'V','Г':'G','Д':'D','Е':'E','Ё':'Yo','Ж':'Zh','З':'Z',
  'И':'I','Й':'Y','К':'K','Л':'L','М':'M','Н':'N','О':'O','П':'P','Р':'R',
  'С':'S','Т':'T','У':'U','Ф':'F','Х':'Kh','Ц':'Ts','Ч':'Ch','Ш':'Sh',
  'Щ':'Shch','Ъ':'','Ы':'Y','Ь':'','Э':'E','Ю':'Yu','Я':'Ya',
};

function slugify(text: string): string {
  return text
    .split('')
    .map(c => TRANSLIT_MAP[c] ?? c)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Длина одной части записи, мин (RECORDING_PART_MINUTES, 5–60, по умолчанию 20). Части потом склеиваются. */
const MAX_PART_DURATION_MIN = Math.min(60, Math.max(5, parseInt(process.env.RECORDING_PART_MINUTES || '20', 10) || 20));

class RecordingTaskManager {
  async createTask(data: {
    userId: string;
    title: string;
    description?: string;
    streamUrl: string;
    streamPassword?: string;
    joinName?: string;
    joinEmail?: string;
    joinPhone?: string;
    scheduledTime: Date;
    duration: number;
    saveTarget: 'library' | 'yandex_disk' | 'beget';
  }): Promise<string> {
    const totalParts = Math.ceil(data.duration / MAX_PART_DURATION_MIN);
    const taskId = randomUUID();

    const dateStr = data.scheduledTime.toISOString().slice(0, 10); // YYYY-MM-DD
    const s3Prefix = `myepa/recordings/${data.userId}/${taskId}/`;
    const s3Filename = `${slugify(data.title) || 'recording'}_${dateStr}`;

    const parts: RecordingPart[] = Array.from({ length: totalParts }, (_, i) => ({
      partNumber: i + 1,
      fileName: `${s3Filename}_part${String(i + 1).padStart(3, '0')}.mp4`,
      startTime: new Date(data.scheduledTime.getTime() + i * MAX_PART_DURATION_MIN * 60 * 1000).toISOString(),
      status: 'pending' as const,
    }));

    const READY_ADVANCE_MS = 5 * 60 * 1000; // 5 minutes before scheduled time
    const initialStatus = data.scheduledTime.getTime() - Date.now() > READY_ADVANCE_MS
      ? 'scheduled'
      : 'ready';

    const [task] = await db.insert(recordingTasks).values({
      id: taskId,
      userId: data.userId,
      title: data.title,
      description: data.description,
      streamUrl: data.streamUrl,
      streamPassword: data.streamPassword,
      joinName: data.joinName,
      joinEmail: data.joinEmail,
      joinPhone: data.joinPhone,
      scheduledTime: data.scheduledTime,
      duration: data.duration,
      maxPartDuration: MAX_PART_DURATION_MIN,
      status: initialStatus,
      saveTarget: data.saveTarget,
      currentPart: 0,
      totalParts,
      parts,
      s3Prefix,
      s3Filename,
    }).returning();

    await recordingLogger.logEvent({
      taskId: task.id,
      userId: data.userId,
      eventType: 'task_created',
      message: `Recording task created: ${data.title}`,
      metadata: { 
        streamUrl: data.streamUrl, 
        duration: data.duration, 
        totalParts,
        saveTarget: data.saveTarget 
      }
    });

    logger.info(`Created recording task: ${task.id}, parts: ${totalParts}, target: ${data.saveTarget}`);
    return task.id;
  }

  async getTask(taskId: string): Promise<RecordingTaskData | null> {
    const [task] = await db.select().from(recordingTasks).where(eq(recordingTasks.id, taskId));
    if (!task) return null;

    return this.mapTaskToData(task, await this.loadWaitingContext());
  }

  /** Контекст для диагностики «почему запись не стартует»: живые воркеры и поправка времени. */
  private async loadWaitingContext(): Promise<WaitingContext> {
    let workers: WaitingContext['workers'] = [];
    try {
      workers = await db
        .select({
          workerId: recordingWorkerStatus.workerId,
          isActive: recordingWorkerStatus.isActive,
          lastSeenAt: recordingWorkerStatus.lastSeenAt,
          activeTaskId: recordingWorkerStatus.activeTaskId,
        })
        .from(recordingWorkerStatus);
    } catch (e) {
      logger.warn('loadWaitingContext: cannot read worker status', e);
    }
    let runtime: Awaited<ReturnType<typeof readRuntimeSettings>> | null = null;
    let activeByUser: Record<string, number> = {};
    try {
      runtime = await readRuntimeSettings();
      const active = await db
        .select({ userId: recordingTasks.userId, n: sql<number>`count(*)::int` })
        .from(recordingTasks)
        .where(inArray(recordingTasks.status, ['in_progress', 'uploading']))
        .groupBy(recordingTasks.userId);
      activeByUser = Object.fromEntries(active.map((r) => [r.userId, Number(r.n)]));
    } catch (e) {
      logger.warn('loadWaitingContext: cannot read runtime settings', e);
    }
    // Воркер пишет статус раз в ~6 циклов опроса; считаем живым, если был на связи в пределах 3 таких интервалов
    const pollMs = parseInt(process.env.POLL_INTERVAL_MS || '5000', 10);
    return {
      now: new Date(),
      tzOffsetH: parseInt(process.env.SCHEDULED_TIME_TZ_OFFSET_H || '0', 10),
      workers,
      paused: runtime?.paused,
      concurrency: runtime?.concurrency,
      perUserLimit: runtime?.perUserLimit,
      activeByUser,
      workerAliveMs: Math.max(90_000, pollMs * 6 * 3),
    };
  }

  async getUserTasks(userId: string): Promise<RecordingTaskData[]> {
    const tasks = await db.select()
      .from(recordingTasks)
      .where(eq(recordingTasks.userId, userId))
      .orderBy(desc(recordingTasks.scheduledTime));

    const ctx = await this.loadWaitingContext();
    return tasks.map(task => this.mapTaskToData(task, ctx));
  }

  async getScheduledTasks(): Promise<RecordingTaskData[]> {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const fiveMinutesAhead = new Date(now.getTime() + 5 * 60 * 1000);

    const tasks = await db.select()
      .from(recordingTasks)
      .where(
        and(
          eq(recordingTasks.status, 'ready'),
          lte(recordingTasks.scheduledTime, fiveMinutesAhead),
          gte(recordingTasks.scheduledTime, fiveMinutesAgo)
        )
      );

    return tasks.map(task => this.mapTaskToData(task));
  }

  async getReadyTasks(): Promise<RecordingTaskData[]> {
    const tasks = await db.select()
      .from(recordingTasks)
      .where(eq(recordingTasks.status, 'ready'))
      .orderBy(recordingTasks.scheduledTime);

    return tasks.map(task => this.mapTaskToData(task));
  }

  async updateTaskStatus(
    taskId: string,
    status: RecordingTaskData['status'],
    updates?: Partial<{
      currentPart: number;
      parts: RecordingPart[];
      errorMessage: string;
      playlistUrl: string;
      begetUrl: string;
      startedAt: Date;
      completedAt: Date;
      workerId: string;
      attemptCount: number;
      lastHeartbeat: Date;
    }>
  ): Promise<void> {
    await db.update(recordingTasks)
      .set({
        status,
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(recordingTasks.id, taskId));
  }

  async promoteScheduledTasks(): Promise<number> {
    const now = new Date();
    const readyAt = new Date(now.getTime() + 5 * 60 * 1000); // promote 5 min before scheduled time

    const result = await db
      .update(recordingTasks)
      .set({ status: 'ready', updatedAt: now })
      .where(
        and(
          eq(recordingTasks.status, 'scheduled'),
          lte(recordingTasks.scheduledTime, readyAt)
        )
      )
      .returning({ id: recordingTasks.id, title: recordingTasks.title });

    if (result.length > 0) {
      result.forEach(t => logger.info(`Promoted scheduled task to ready: ${t.id} "${t.title}"`));
    }

    return result.length;
  }

  async findAndAutoRecoverStaleTasks(): Promise<number> {
    const STALE_TIMEOUT_MS = 12 * 60 * 1000; // 12 minutes without heartbeat
    const staleThreshold = new Date(Date.now() - STALE_TIMEOUT_MS);

    // A task is stale if:
    // 1. heartbeat exists but is older than 12 min, OR
    // 2. heartbeat is NULL but the task itself was last updated > 12 min ago
    //    (prevents false positives on freshly-started tasks where worker hasn't sent first heartbeat yet)
    const staleTasks = await db.select()
      .from(recordingTasks)
      .where(
        and(
          or(
            eq(recordingTasks.status, 'in_progress'),
            eq(recordingTasks.status, 'uploading'),
          ),
          or(
            lt(recordingTasks.lastHeartbeat, staleThreshold),
            and(
              isNull(recordingTasks.lastHeartbeat),
              lt(recordingTasks.updatedAt, staleThreshold),
            ),
          ),
        )
      );

    let recovered = 0;
    for (const task of staleTasks) {
      try {
        await this.autoRecoverStaleTask(
          task.id,
          task.userId,
          task.title,
          task.attemptCount ?? 0,
          task.lastHeartbeat ?? null,
        );
        recovered++;
      } catch (err) {
        logger.error(`Error auto-recovering stale task ${task.id}:`, err);
      }
    }

    return recovered;
  }

  private async autoRecoverStaleTask(
    taskId: string,
    userId: string,
    title: string,
    attemptCount: number,
    lastHeartbeat: Date | null,
  ): Promise<void> {
    const MAX_ATTEMPTS = 3;
    const minutesSinceHeartbeat = lastHeartbeat
      ? Math.floor((Date.now() - lastHeartbeat.getTime()) / 60000)
      : null;

    const timeoutMsg = minutesSinceHeartbeat !== null
      ? `Таймаут: нет сигнала от воркера ${minutesSinceHeartbeat} мин`
      : 'Таймаут: сигнал от воркера отсутствовал';

    if (attemptCount < MAX_ATTEMPTS) {
      const nextAttempt = attemptCount + 1;
      await db.update(recordingTasks)
        .set({
          status: 'ready',
          errorMessage: `${timeoutMsg}. Попытка ${nextAttempt} из ${MAX_ATTEMPTS}`,
          workerId: null,
          lastHeartbeat: null,
          attemptCount: nextAttempt,
          updatedAt: new Date(),
        })
        .where(eq(recordingTasks.id, taskId));

      await recordingLogger.logEvent({
        taskId,
        userId,
        eventType: 'auto_recovery',
        message: `Автовосстановление: задача сброшена в ready (попытка ${nextAttempt} из ${MAX_ATTEMPTS}). ${timeoutMsg}`,
      });

      logger.info(`Auto-recovered stale task: ${taskId} "${title}" (attempt ${nextAttempt}/${MAX_ATTEMPTS})`);
    } else {
      await db.update(recordingTasks)
        .set({
          status: 'failed',
          errorMessage: `${timeoutMsg}. Превышено максимальное число попыток (${MAX_ATTEMPTS})`,
          workerId: null,
          lastHeartbeat: null,
          updatedAt: new Date(),
        })
        .where(eq(recordingTasks.id, taskId));

      await recordingLogger.logEvent({
        taskId,
        userId,
        eventType: 'auto_recovery',
        message: `Автовосстановление: задача переведена в failed (исчерпаны ${MAX_ATTEMPTS} попытки). ${timeoutMsg}`,
      });

      logger.warn(`Auto-failed stale task after ${MAX_ATTEMPTS} attempts: ${taskId} "${title}"`);
    }
  }

  async cancelTask(taskId: string): Promise<void> {
    const task = await this.getTask(taskId);
    await this.updateTaskStatus(taskId, 'cancelled');
    logger.info(`Task cancelled: ${taskId}`);
    if (task) {
      await recordingLogger.logEvent({
        taskId,
        userId: task.userId,
        eventType: 'task_cancelled',
        message: `Задача отменена пользователем`,
      });
    }
  }

  async recoverTask(taskId: string): Promise<void> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    if (task.status !== 'failed' && task.status !== 'in_progress') {
      throw new Error('Task cannot be recovered');
    }

    await this.updateTaskStatus(taskId, 'ready', {
      errorMessage: undefined,
      workerId: undefined,
    });
    
    await recordingLogger.logEvent({
      taskId,
      userId: task.userId,
      eventType: 'task_started',
      message: `Task recovered and ready for retry`,
    });
    
    logger.info(`Task recovered and ready: ${taskId}`);
  }

  async deleteTask(taskId: string): Promise<void> {
    await db.delete(recordingTasks).where(eq(recordingTasks.id, taskId));
    logger.info(`Task deleted: ${taskId}`);
  }

  private mapTaskToData(task: any, waitingCtx?: WaitingContext): RecordingTaskData {
    return {
      id: task.id,
      userId: task.userId,
      title: task.title,
      description: task.description || undefined,
      streamUrl: task.streamUrl,
      streamPassword: task.streamPassword || undefined,
      scheduledTime: task.scheduledTime,
      duration: task.duration,
      maxPartDuration: task.maxPartDuration || MAX_PART_DURATION_MIN,
      status: task.status as RecordingTaskData['status'],
      saveTarget: task.saveTarget as RecordingTaskData['saveTarget'],
      currentPart: task.currentPart || 0,
      totalParts: task.totalParts || 1,
      parts: (task.parts as RecordingPart[]) || [],
      playlistUrl: task.playlistUrl || undefined,
      begetUrl: task.begetUrl || undefined,
      s3Prefix: task.s3Prefix || undefined,
      s3Filename: task.s3Filename || undefined,
      libraryNoteId: task.libraryNoteId || undefined,
      errorMessage: task.errorMessage || undefined,
      startedAt: task.startedAt || undefined,
      completedAt: task.completedAt || undefined,
      workerId: task.workerId || undefined,
      attemptCount: task.attemptCount || 0,
      lastHeartbeat: task.lastHeartbeat || undefined,
      urlCheckStatus: (task.urlCheckStatus as RecordingTaskData['urlCheckStatus']) || 'pending',
      urlCheckMessage: task.urlCheckMessage || undefined,
      urlCheckedAt: task.urlCheckedAt || undefined,
      mergeStatus: (task.metadata as any)?.mergeStatus || undefined,
      mergeProgress: (task.metadata as any)?.mergeProgress || undefined,
      mergedUrl: (task.metadata as any)?.mergedUrl || undefined,
      mergeError: (task.metadata as any)?.mergeError || undefined,
      plannedMethod: (() => {
        const forced = (task.metadata as any)?.forceBrowserFor === task.streamUrl || process.env.RECORDING_FAST_PATH === 'false';
        const plan = planRecording(task.streamUrl, { forceBrowser: forced });
        return { method: plan.method, label: METHOD_LABELS[plan.method], platform: plan.platform, note: plan.note };
      })(),
      start: waitingCtx
        ? buildStartStatus(
            {
              id: task.id,
              userId: task.userId,
              status: task.status,
              scheduledTime: task.scheduledTime,
              attemptCount: task.attemptCount,
              errorMessage: task.errorMessage,
              urlCheckStatus: task.urlCheckStatus,
              urlCheckMessage: task.urlCheckMessage,
              start: ((task.metadata as any)?.start as StartRecord | undefined) ?? null,
            },
            waitingCtx,
          )
        : undefined,
    };
  }
}

export const recordingTaskManager = new RecordingTaskManager();
