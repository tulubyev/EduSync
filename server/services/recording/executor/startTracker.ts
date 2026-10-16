import { sql, eq } from 'drizzle-orm';
import { db } from '../../../db';
import { recordingTasks } from '@shared/schema';
import { logger } from '../../logger';
import { recordingLogger } from '../logger';
import {
  classifyRecordingError,
  STAGE_LABELS,
  type StartRecord,
  type StartStage,
  type Classified,
} from '../startStatus';

/** Записывает StartRecord в recording_tasks.metadata.start, не затирая остальные ключи metadata. */
export async function writeStartRecord(taskId: string, rec: StartRecord): Promise<void> {
  try {
    await db
      .update(recordingTasks)
      .set({
        metadata: sql`coalesce(${recordingTasks.metadata}, '{}'::jsonb) || jsonb_build_object('start', ${JSON.stringify(rec)}::jsonb)`,
        updatedAt: new Date(),
      })
      .where(eq(recordingTasks.id, taskId));
  } catch (e) {
    // статус — вспомогательная информация, он не должен ронять запись
    logger.warn(`writeStartRecord failed for ${taskId}: ${(e as Error).message}`);
  }
}

/** Фиксирует итог без объекта-трекера (для stale/orphan-обработчиков поллера). */
export async function recordStartFailure(
  task: { id: string; userId?: string | null },
  message: string,
  opts: { attempt?: number; maxAttempts?: number; willRetry: boolean },
): Promise<Classified> {
  const c = classifyRecordingError(new Error(message));
  const now = new Date().toISOString();
  await writeStartRecord(task.id, {
    state: opts.willRetry ? 'retrying' : 'failed',
    attempt: opts.attempt,
    maxAttempts: opts.maxAttempts,
    recordingConfirmed: false,
    updatedAt: now,
    code: c.code,
    reason: c.reason,
    hint: c.hint,
    detail: message.slice(0, 500),
  });
  if (task.userId) {
    await recordingLogger.logEvent({
      taskId: task.id,
      userId: task.userId,
      eventType: 'task_failed',
      message: `${c.reason}${opts.willRetry ? ' (будет повтор)' : ''}`,
      errorDetails: message.slice(0, 1000),
      metadata: { code: c.code, willRetry: opts.willRetry, attempt: opts.attempt },
    });
  }
  return c;
}

/**
 * Следит за запуском одной попытки записи: этапы → metadata.start и recording_logs,
 * подтверждение старта по первому кадру, итоговая причина отказа.
 */
export class StartTracker {
  private stage: StartStage = 'validating_url';
  private confirmed = false;
  private readonly startedAt = new Date().toISOString();
  private recordingStartedAt?: string;
  private chain: Promise<void> = Promise.resolve();
  private methodInfo: Pick<StartRecord, 'method' | 'methodLabel' | 'platform' | 'tool' | 'note' | 'fallback'> = {};

  constructor(
    private readonly task: { id: string; userId: string },
    private readonly attempt: number,
    private readonly maxAttempts: number,
  ) {}

  /** Какой способ записи выбран (пишется в metadata.start вместе со следующим этапом). */
  setMethod(info: Pick<StartRecord, 'method' | 'methodLabel' | 'platform' | 'tool' | 'note' | 'fallback'>): void {
    this.methodInfo = { ...this.methodInfo, ...info };
  }

  /** Событие в журнал задачи (например, переход на браузер). */
  log(message: string, metadata?: Record<string, unknown>): void {
    this.chain = this.chain.then(() =>
      recordingLogger.logEvent({ taskId: this.task.id, userId: this.task.userId, eventType: 'start_stage', message, metadata }),
    );
  }

  get currentStage(): StartStage {
    return this.stage;
  }

  get recordingConfirmed(): boolean {
    return this.confirmed;
  }

  /** Синхронный вызов из рекордера; записи в БД выстраиваются в очередь, чтобы не перегоняли друг друга. */
  enter(stage: StartStage): void {
    this.stage = stage;
    if (stage === 'recording') {
      this.confirmed = true;
      this.recordingStartedAt = new Date().toISOString();
    }
    this.chain = this.chain.then(() => this.persist(stage));
  }

  private async persist(stage: StartStage): Promise<void> {
    const now = new Date().toISOString();
    await writeStartRecord(this.task.id, {
      ...this.methodInfo,
      state: stage === 'recording' ? 'recording' : 'starting',
      stage,
      attempt: this.attempt,
      maxAttempts: this.maxAttempts,
      recordingConfirmed: this.confirmed,
      startedAt: this.startedAt,
      recordingStartedAt: this.recordingStartedAt,
      updatedAt: now,
    });
    await recordingLogger.logEvent({
      taskId: this.task.id,
      userId: this.task.userId,
      eventType: stage === 'recording' ? 'recording_started' : 'start_stage',
      message:
        stage === 'recording'
          ? `Запись началась: получен первый кадр (попытка ${this.attempt}/${this.maxAttempts})`
          : `${STAGE_LABELS[stage]} (попытка ${this.attempt}/${this.maxAttempts})`,
      metadata: { stage, attempt: this.attempt },
    });
  }

  /** Попытка завершилась ошибкой: классифицируем, пишем причину и событие. */
  async fail(error: unknown, willRetry: boolean): Promise<Classified> {
    await this.chain.catch(() => {});
    const c = classifyRecordingError(error, this.stage);
    const raw = error instanceof Error ? error.message : String(error);
    await writeStartRecord(this.task.id, {
      ...this.methodInfo,
      state: willRetry ? 'retrying' : 'failed',
      stage: this.stage,
      attempt: this.attempt,
      maxAttempts: this.maxAttempts,
      recordingConfirmed: this.confirmed,
      startedAt: this.startedAt,
      recordingStartedAt: this.recordingStartedAt,
      updatedAt: new Date().toISOString(),
      code: c.code,
      reason: c.reason,
      hint: c.hint,
      detail: raw.slice(0, 500),
    });
    await recordingLogger.logEvent({
      taskId: this.task.id,
      userId: this.task.userId,
      eventType: this.confirmed ? 'task_failed' : 'start_failed',
      message: `${this.confirmed ? 'Запись прервалась' : 'Запись не стартовала'} на этапе «${STAGE_LABELS[this.stage]}»: ${c.reason}${willRetry ? ' — будет повтор' : ''}`,
      errorDetails: raw.slice(0, 1000),
      metadata: { code: c.code, stage: this.stage, attempt: this.attempt, willRetry, recordingConfirmed: this.confirmed },
    });
    return c;
  }

  /** Дожидаемся записи статусов (перед финальной записью задачи). */
  async flush(): Promise<void> {
    await this.chain.catch(() => {});
  }
}
