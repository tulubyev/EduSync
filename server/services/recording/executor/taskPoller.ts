import { db } from '../../../db';
import { recordingTasks, recordingWorkerStatus } from '@shared/schema';
import { eq, and, lt, sql } from 'drizzle-orm';
import { StreamingRecorder } from './streamingRecorder';
import { BegetStorage } from './begetStorage';
import { logger } from '../../logger';
import { executorConfig } from './config';
import { validateStreamUrl } from './urlValidator';

export class TaskPoller {
  private recorder: StreamingRecorder;
  private storage: BegetStorage;
  private workerId: string;
  private pollIntervalMs: number;
  private heartbeatTimeoutMs: number;
  private tasksProcessed = 0;
  private tasksSuccessful = 0;
  private tasksFailed = 0;
  private activeTaskId: string | null = null;
  private activeTaskTitle: string | null = null;
  private dbOk = false;
  private s3Ok = false;
  private running = false;

  constructor(workerId?: string) {
    this.workerId = workerId ?? executorConfig.worker.id;
    this.pollIntervalMs = executorConfig.worker.pollIntervalMs;
    this.heartbeatTimeoutMs = executorConfig.worker.heartbeatTimeoutMs;
    this.recorder = new StreamingRecorder();
    this.storage = new BegetStorage();
  }

  private async reportStatus() {
    try {
      const now = new Date();
      await db
        .insert(recordingWorkerStatus)
        .values({
          workerId: this.workerId,
          isActive: true,
          dbConnected: this.dbOk,
          s3Connected: this.s3Ok,
          activeTaskId: this.activeTaskId,
          currentTaskTitle: this.activeTaskTitle,
          tasksProcessed: this.tasksProcessed,
          tasksSuccessful: this.tasksSuccessful,
          tasksFailed: this.tasksFailed,
          lastSeenAt: now,
          startedAt: now,
          buildVersion: '2.0.0',
        })
        .onConflictDoUpdate({
          target: recordingWorkerStatus.workerId,
          set: {
            isActive: true,
            dbConnected: this.dbOk,
            s3Connected: this.s3Ok,
            activeTaskId: this.activeTaskId,
            currentTaskTitle: this.activeTaskTitle,
            tasksProcessed: this.tasksProcessed,
            tasksSuccessful: this.tasksSuccessful,
            tasksFailed: this.tasksFailed,
            lastSeenAt: now,
          },
        });
    } catch (_e) {
      // не критично — не прерываем основной цикл
    }
  }

  async start() {
    if (this.running) {
      logger.warn('TaskPoller is already running');
      return;
    }
    this.running = true;
    logger.info(`Recording poller started (worker: ${this.workerId}, interval: ${this.pollIntervalMs}ms)`);

    this.s3Ok = await this.storage.ping();
    logger.info(`S3 connectivity: ${this.s3Ok ? 'OK' : 'FAILED'}`);

    await this.handleOrphanedTasks();

    let statusTick = 0;

    while (this.running) {
      try {
        await this.activateScheduledTasks();
        this.dbOk = true;

        await this.checkScheduledTaskUrls();

        const task = await this.claimNextTask();

        if (task) {
          await this.executeTask(task);
        }

        await this.failStaleTasks();

        statusTick++;
        if (statusTick >= 6) {
          await this.reportStatus();
          statusTick = 0;
        }

        await this.sleep(this.pollIntervalMs);
      } catch (error) {
        logger.error('Task poller error:', error);
        this.dbOk = false;
        await this.sleep(this.pollIntervalMs);
      }
    }
  }

  stop() {
    this.running = false;
    logger.info('Recording poller stopped');
  }

  getBrowserStatus() {
    return this.recorder.getBrowserStatus();
  }

  /**
   * Вызывается один раз при старте.
   * Находит задачи в статусе in_progress, которые были назначены на ЭТОТ воркер
   * в предыдущем сеансе (воркер перезапустился во время записи).
   */
  private async handleOrphanedTasks() {
    try {
      const orphans = await db
        .select({
          id: recordingTasks.id,
          title: recordingTasks.title,
          attemptCount: recordingTasks.attemptCount,
        })
        .from(recordingTasks)
        .where(
          and(
            eq(recordingTasks.status, 'in_progress'),
            eq(recordingTasks.workerId, this.workerId)
          )
        );

      if (orphans.length === 0) return;

      logger.warn(`Found ${orphans.length} orphaned task(s) from previous session`);

      for (const task of orphans) {
        const attempts = task.attemptCount ?? 0;
        const now = new Date();

        if (attempts < 3) {
          await db
            .update(recordingTasks)
            .set({
              status: 'ready',
              workerId: null,
              errorMessage: `Воркер перезапустился во время записи (попытка ${attempts})`,
              lastHeartbeat: null,
              updatedAt: now,
            })
            .where(eq(recordingTasks.id, task.id));

          logger.info(`Orphaned task ${task.id} "${task.title}" → reset to 'ready' for retry (attempt ${attempts})`);
        } else {
          await db
            .update(recordingTasks)
            .set({
              status: 'failed',
              errorMessage: `Воркер перезапускался ${attempts} раз во время записи — задача отменена`,
              completedAt: now,
              updatedAt: now,
            })
            .where(eq(recordingTasks.id, task.id));

          logger.warn(`Orphaned task ${task.id} "${task.title}" → failed (too many attempts: ${attempts})`);
        }
      }
    } catch (err) {
      logger.warn('handleOrphanedTasks error:', err);
    }
  }

  /**
   * Фоновая проверка URL для запланированных задач (не более 3 за цикл).
   */
  private async checkScheduledTaskUrls() {
    const reCheckThreshold = new Date(Date.now() - 30 * 60 * 1000);

    const tasks = await db
      .select({
        id: recordingTasks.id,
        title: recordingTasks.title,
        streamUrl: recordingTasks.streamUrl,
        urlCheckStatus: recordingTasks.urlCheckStatus,
        urlCheckedAt: recordingTasks.urlCheckedAt,
      })
      .from(recordingTasks)
      .where(
        and(
          sql`${recordingTasks.status} IN ('scheduled', 'ready')`,
          sql`(
            ${recordingTasks.urlCheckStatus} IS NULL
            OR ${recordingTasks.urlCheckStatus} = 'pending'
            OR (
              ${recordingTasks.urlCheckStatus} = 'failed'
              AND (${recordingTasks.urlCheckedAt} IS NULL OR ${recordingTasks.urlCheckedAt} < ${reCheckThreshold})
            )
          )`
        )
      )
      .limit(3);

    for (const task of tasks) {
      try {
        const result = await validateStreamUrl(task.streamUrl);

        let checkStatus: string;
        let checkMessage: string;

        if (!result.accessible) {
          checkStatus = 'failed';
          checkMessage = result.error ?? 'URL недоступен';
          logger.warn(`URL check [${task.id}] "${task.title}": FAILED — ${checkMessage}`);
        } else if (result.warning) {
          checkStatus = 'warning';
          checkMessage = result.warning;
          logger.info(`URL check [${task.id}] "${task.title}": WARNING — ${checkMessage}`);
        } else {
          checkStatus = 'ok';
          checkMessage = `Доступен (HTTP ${result.statusCode ?? '?'}, тип: ${result.sourceType})`;
          logger.info(`URL check [${task.id}] "${task.title}": OK`);
        }

        await db
          .update(recordingTasks)
          .set({
            urlCheckStatus: checkStatus,
            urlCheckMessage: checkMessage,
            urlCheckedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(recordingTasks.id, task.id));
      } catch (err) {
        logger.warn(`URL check failed for task ${task.id}:`, err);
      }
    }
  }

  /**
   * Переводит scheduled → ready, если scheduled_time уже наступило.
   */
  private async activateScheduledTasks() {
    const nowUtc = new Date();
    const offsetMs = executorConfig.worker.scheduledTimeTzOffsetH * 60 * 60 * 1000;
    const nowLocal = new Date(nowUtc.getTime() + offsetMs);

    const result = await db
      .update(recordingTasks)
      .set({ status: 'ready', updatedAt: nowUtc })
      .where(
        and(
          eq(recordingTasks.status, 'scheduled'),
          sql`(${recordingTasks.scheduledTime} IS NULL OR ${recordingTasks.scheduledTime} <= ${nowLocal})`
        )
      )
      .returning({ id: recordingTasks.id, title: recordingTasks.title });

    for (const t of result) {
      logger.info(`Task ${t.id} "${t.title}" activated: scheduled_time reached`);
    }
  }

  /**
   * Атомарный захват задачи: UPDATE ... WHERE status='ready' ... RETURNING id.
   * Защита от дублирования при нескольких воркерах.
   */
  private async claimNextTask(): Promise<any | null> {
    const now = new Date();
    const offsetMs = executorConfig.worker.scheduledTimeTzOffsetH * 60 * 60 * 1000;
    const nowLocal = new Date(now.getTime() + offsetMs);

    const candidates = await db
      .select({ id: recordingTasks.id, title: recordingTasks.title, scheduledTime: recordingTasks.scheduledTime })
      .from(recordingTasks)
      .where(
        and(
          eq(recordingTasks.status, 'ready'),
          sql`(${recordingTasks.scheduledTime} IS NULL OR ${recordingTasks.scheduledTime} <= ${nowLocal})`
        )
      )
      .limit(1);

    if (candidates.length === 0) {
      const pending = await db
        .select({ id: recordingTasks.id, title: recordingTasks.title, scheduledTime: recordingTasks.scheduledTime })
        .from(recordingTasks)
        .where(
          and(
            eq(recordingTasks.status, 'ready'),
            sql`${recordingTasks.scheduledTime} > ${nowLocal}`
          )
        )
        .limit(3);

      for (const t of pending) {
        const diff = Math.round((new Date(t.scheduledTime!).getTime() - nowLocal.getTime()) / 60000);
        logger.info(`[SCHED] Task "${t.title}" waiting — starts in ${diff} min`);
      }
    }

    if (candidates.length === 0) return null;

    const taskId = candidates[0].id;

    const claimed = await db
      .update(recordingTasks)
      .set({
        status: 'in_progress',
        workerId: this.workerId,
        startedAt: now,
        lastHeartbeat: now,
        attemptCount: sql`${recordingTasks.attemptCount} + 1`,
        updatedAt: now,
      })
      .where(
        and(
          eq(recordingTasks.id, taskId),
          eq(recordingTasks.status, 'ready')
        )
      )
      .returning();

    if (claimed.length === 0) {
      logger.warn(`Task ${taskId} was already claimed by another worker`);
      return null;
    }

    logger.info(`Worker ${this.workerId} claimed task ${taskId}`);
    return claimed[0];
  }

  /**
   * Помечает зависшие задачи как failed (heartbeat timeout).
   */
  private async failStaleTasks() {
    const timeoutThreshold = new Date(Date.now() - this.heartbeatTimeoutMs);
    const timeoutMinutes = Math.round(this.heartbeatTimeoutMs / 60000);

    const result = await db
      .update(recordingTasks)
      .set({
        status: 'failed',
        errorMessage: `Воркер не отвечал более ${timeoutMinutes} минут — задача прервана (heartbeat timeout)`,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(recordingTasks.status, 'in_progress'),
          lt(recordingTasks.lastHeartbeat, timeoutThreshold)
        )
      )
      .returning({ id: recordingTasks.id, workerId: recordingTasks.workerId });

    for (const t of result) {
      logger.warn(`Task ${t.id} failed: heartbeat timeout (worker: ${t.workerId ?? 'unknown'})`);
    }
  }

  private async executeTask(task: any) {
    logger.info(`Started recording task ${task.id} "${task.title}"`);
    this.activeTaskId = task.id;
    this.activeTaskTitle = task.title;
    this.tasksProcessed++;
    await this.reportStatus();

    const heartbeatInterval = setInterval(async () => {
      try {
        await db
          .update(recordingTasks)
          .set({ lastHeartbeat: new Date(), updatedAt: new Date() })
          .where(eq(recordingTasks.id, task.id));
      } catch (_e) {
        logger.warn('Failed to update heartbeat:', _e);
      }
    }, executorConfig.worker.heartbeatIntervalMs);

    try {
      logger.info(`Validating URL: ${task.streamUrl}`);
      const urlCheck = await validateStreamUrl(task.streamUrl);

      const sourceLabel: Record<string, string> = {
        'video-hosting':  'Видеохостинг',
        'webinar':        'Вебинарная платформа',
        'live-streaming': 'Стриминг-платформа',
        'direct-stream':  'Прямой поток (HLS/RTSP/RTMP)',
        'website':        'Сайт с плеером',
        'unknown':        'Неизвестный тип',
      };
      logger.info(`URL type: ${sourceLabel[urlCheck.sourceType] ?? urlCheck.sourceType}` +
        (urlCheck.statusCode ? `, HTTP ${urlCheck.statusCode}` : '') +
        (urlCheck.contentType ? `, ${urlCheck.contentType.split(';')[0]}` : ''));

      if (urlCheck.warning) {
        logger.warn(`URL warning: ${urlCheck.warning}`);
      }

      if (!urlCheck.accessible) {
        throw new Error(`URL недоступен: ${urlCheck.error ?? 'неизвестная ошибка'}`);
      }

      const recordingPath = await this.recorder.recordStream({
        url: task.streamUrl,
        duration: task.duration,
        title: task.title,
        taskId: task.id,
        password: task.streamPassword,
      });

      clearInterval(heartbeatInterval);

      await db
        .update(recordingTasks)
        .set({ status: 'uploading', lastHeartbeat: new Date(), updatedAt: new Date() })
        .where(eq(recordingTasks.id, task.id));

      const begetUrl = await this.storage.uploadVideo(
        recordingPath,
        `${task.id}_${task.title}.mp4`
      );

      await db
        .update(recordingTasks)
        .set({
          status: 'completed',
          begetUrl,
          completedAt: new Date(),
          lastHeartbeat: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(recordingTasks.id, task.id));

      this.tasksSuccessful++;
      logger.info(`Completed task ${task.id}: ${begetUrl}`);
    } catch (error) {
      clearInterval(heartbeatInterval);
      this.tasksFailed++;

      logger.error(`Failed task ${task.id}:`, error);
      await db
        .update(recordingTasks)
        .set({
          status: 'failed',
          errorMessage: (error as Error).message,
          completedAt: new Date(),
          lastHeartbeat: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(recordingTasks.id, task.id));
    } finally {
      this.activeTaskId = null;
      this.activeTaskTitle = null;
      await this.reportStatus();
    }
  }

  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
