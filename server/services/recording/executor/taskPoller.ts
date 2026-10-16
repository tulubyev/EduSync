import { db } from '../../../db';
import { recordingTasks, recordingWorkerStatus } from '@shared/schema';
import { eq, and, lt, sql, inArray, asc } from 'drizzle-orm';
import { StreamingRecorder } from './streamingRecorder';
import { BegetStorage } from './begetStorage';
import { logger } from '../../logger';
import { executorConfig } from './config';
import { validateStreamUrl } from './urlValidator';
import { StartTracker, recordStartFailure } from './startTracker';
import { getRuntimeSettings, slotFromWorkerId } from '../runtimeSettings';

const MAX_ATTEMPTS = 3;

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
  /** Номер слота воркера (1..MAX_WORKERS): слот работает, только если он ≤ разрешённой админом параллельности */
  private slot: number;
  private slotEnabled = true;
  private paused = false;

  constructor(workerId?: string) {
    this.workerId = workerId ?? executorConfig.worker.id;
    this.slot = slotFromWorkerId(this.workerId);
    this.pollIntervalMs = executorConfig.worker.pollIntervalMs;
    this.heartbeatTimeoutMs = executorConfig.worker.heartbeatTimeoutMs;
    this.recorder = new StreamingRecorder(this.workerId);
    this.storage = new BegetStorage();
  }

  private statusMetadata() {
    return {
      slot: this.slot,
      maxWorkers: executorConfig.worker.maxWorkers,
      slotEnabled: this.slotEnabled,
      paused: this.paused,
    };
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
          metadata: this.statusMetadata(),
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
            metadata: this.statusMetadata(),
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

        // Админ может поставить приём на паузу или ограничить число одновременных записей
        const rs = await getRuntimeSettings();
        this.paused = rs.paused;
        this.slotEnabled = !rs.paused && this.slot <= (rs.concurrency ?? executorConfig.worker.maxWorkers);

        const task = this.slotEnabled ? await this.claimNextTask(rs.perUserLimit) : null;

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
          userId: recordingTasks.userId,
          title: recordingTasks.title,
          attemptCount: recordingTasks.attemptCount,
          currentPart: recordingTasks.currentPart,
          totalParts: recordingTasks.totalParts,
        })
        .from(recordingTasks)
        .where(
          and(
            inArray(recordingTasks.status, ['in_progress', 'uploading']),
            eq(recordingTasks.workerId, this.workerId)
          )
        );

      if (orphans.length === 0) return;

      logger.warn(`Found ${orphans.length} orphaned task(s) from previous session`);

      for (const task of orphans) {
        const attempts = task.attemptCount ?? 0;
        const now = new Date();
        const chunkNumber = (task.currentPart ?? 0) + 1;
        const chunkLabel = `чанк ${chunkNumber}${task.totalParts ? `/${task.totalParts}` : ''}`;

        if (attempts < 3) {
          await db
            .update(recordingTasks)
            .set({
              status: 'ready',
              workerId: null,
              errorMessage: `Воркер перезапустился во время записи ${chunkLabel} (попытка ${attempts})`,
              lastHeartbeat: null,
              updatedAt: now,
            })
            .where(eq(recordingTasks.id, task.id));

          await recordStartFailure(task, `Воркер перезапустился во время записи ${chunkLabel}`, { attempt: attempts, maxAttempts: MAX_ATTEMPTS, willRetry: true });
          logger.info(`Orphaned task ${task.id} "${task.title}" → reset to 'ready' for retry (attempt ${attempts}, ${chunkLabel})`);
        } else {
          await db
            .update(recordingTasks)
            .set({
              status: 'failed',
              errorMessage: `Воркер перезапускался ${attempts} раз во время записи ${chunkLabel} — задача отменена`,
              completedAt: now,
              updatedAt: now,
            })
            .where(eq(recordingTasks.id, task.id));

          await recordStartFailure(task, `Воркер перезапускался ${attempts} раз во время записи ${chunkLabel}`, { attempt: attempts, maxAttempts: MAX_ATTEMPTS, willRetry: false });
          logger.warn(`Orphaned task ${task.id} "${task.title}" → failed (too many attempts: ${attempts}, ${chunkLabel})`);
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
  private async claimNextTask(perUserLimit = 0): Promise<any | null> {
    const now = new Date();
    const offsetMs = executorConfig.worker.scheduledTimeTzOffsetH * 60 * 60 * 1000;
    const nowLocal = new Date(now.getTime() + offsetMs);

    // Очередь по времени: раньше запланированная — раньше стартует.
    // Лимит на пользователя: не берём задачу, если у него уже идёт perUserLimit записей
    // (его задачи ждут, остальные клиенты не блокируются).
    const userLimitCond = perUserLimit > 0
      ? sql`(SELECT count(*) FROM recording_tasks rt2 WHERE rt2.user_id = ${recordingTasks.userId} AND rt2.status IN ('in_progress', 'uploading')) < ${perUserLimit}`
      : sql`true`;

    const candidates = await db
      .select({ id: recordingTasks.id, title: recordingTasks.title, scheduledTime: recordingTasks.scheduledTime })
      .from(recordingTasks)
      .where(
        and(
          eq(recordingTasks.status, 'ready'),
          sql`(${recordingTasks.scheduledTime} IS NULL OR ${recordingTasks.scheduledTime} <= ${nowLocal})`,
          userLimitCond
        )
      )
      .orderBy(asc(recordingTasks.scheduledTime), asc(recordingTasks.createdAt))
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
      .returning({ id: recordingTasks.id, userId: recordingTasks.userId, workerId: recordingTasks.workerId, attemptCount: recordingTasks.attemptCount });

    for (const t of result) {
      await recordStartFailure(t, `Воркер не отвечал более ${timeoutMinutes} минут — heartbeat timeout`, { attempt: t.attemptCount ?? undefined, maxAttempts: MAX_ATTEMPTS, willRetry: false });
      logger.warn(`Task ${t.id} failed: heartbeat timeout (worker: ${t.workerId ?? 'unknown'})`);
    }
  }

  private async executeTask(task: any) {
    logger.info(`Started recording task ${task.id} "${task.title}"`);
    this.activeTaskId = task.id;
    this.activeTaskTitle = task.title;
    this.tasksProcessed++;
    await this.reportStatus();

    // Set totalParts upfront based on the planned schedule so it stays authoritative
    // and currentPart can track progress without overwriting the total.
    const maxPartMin: number = task.maxPartDuration ?? 20;
    const expectedParts = task.duration > 0 ? Math.ceil(task.duration / maxPartMin) : 1;
    await db
      .update(recordingTasks)
      .set({ totalParts: expectedParts, currentPart: 0, updatedAt: new Date() })
      .where(eq(recordingTasks.id, task.id));

    const HEARTBEAT_DB_TIMEOUT_MS = 5000;
    const heartbeatInterval = setInterval(() => {
      const updatePromise = db
        .update(recordingTasks)
        .set({ lastHeartbeat: new Date(), updatedAt: new Date() })
        .where(eq(recordingTasks.id, task.id))
        .then(() => {});
      const timeoutPromise = new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error(`heartbeat DB timeout (${HEARTBEAT_DB_TIMEOUT_MS}ms)`)), HEARTBEAT_DB_TIMEOUT_MS)
      );
      Promise.race([updatePromise, timeoutPromise]).catch((_e) => {
        logger.warn(`Heartbeat update failed for task ${task.id}: ${(_e as Error).message}`);
      });
    }, executorConfig.worker.heartbeatIntervalMs);

    // Накапливаем загруженные чанки
    const uploadedChunks: Array<{
      partNumber: number;
      publicUrl: string;
      durationMs: number;
      frameCount: number;
      status: 'completed';
    }> = [];

    const safeTitle = (task.title as string).replace(/[^a-zA-Z0-9а-яА-ЯёЁ._-]/g, '_').slice(0, 60);

    // Статус старта: этапы, подтверждение по первому кадру, причина отказа
    const tracker = new StartTracker({ id: task.id, userId: task.userId }, task.attemptCount ?? 1, MAX_ATTEMPTS);
    tracker.enter('validating_url');
    let uploadError: Error | null = null;

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

      await this.recorder.recordStream({
        url: task.streamUrl,
        duration: task.duration,
        title: task.title,
        taskId: task.id,
        password: task.streamPassword,
        joinName: task.joinName ?? undefined,
        joinEmail: task.joinEmail ?? undefined,
        joinPhone: task.joinPhone ?? undefined,
        // Respect the task-level part duration (minutes) instead of always
        // falling back to the global MAX_PART_DURATION_MS default — otherwise
        // the totalParts computed above (based on task.maxPartDuration) and
        // the actual chunk boundaries used during recording disagree.
        chunkDurationMs: maxPartMin * 60 * 1000,
        onStage: (stage) => tracker.enter(stage),

        onChunk: async (chunk) => {
          logger.info(`[CHUNK] Part ${chunk.partNumber} ready (${chunk.frameCount} frames, ${Math.round(chunk.durationMs / 1000)}s) — uploading to S3...`);

          // Переходим в статус uploading при первом чанке
          if (uploadedChunks.length === 0) {
            await db
              .update(recordingTasks)
              .set({ status: 'uploading', lastHeartbeat: new Date(), updatedAt: new Date() })
              .where(eq(recordingTasks.id, task.id));
          }

          const partFileName = `${task.id}_part${chunk.partNumber}_${safeTitle}.mp4`;
          let publicUrl: string;
          try {
            publicUrl = await this.storage.uploadVideo(chunk.filePath, partFileName);
          } catch (uploadErr) {
            uploadError = uploadErr as Error;
            throw uploadErr;
          }

          uploadedChunks.push({
            partNumber: chunk.partNumber,
            publicUrl,
            durationMs: chunk.durationMs,
            frameCount: chunk.frameCount,
            status: 'completed',
          });

          // Сохраняем прогресс в БД после каждого чанка
          const partsPayload = uploadedChunks.map((c) => ({
            partNumber: c.partNumber,
            fileName: `${task.id}_part${c.partNumber}_${safeTitle}.mp4`,
            startTime: new Date().toISOString(),
            duration: c.durationMs,
            status: 'completed' as const,
            publicUrl: c.publicUrl,
          }));

          await db
            .update(recordingTasks)
            .set({
              parts: partsPayload,
              currentPart: uploadedChunks.length,
              // begetUrl — первый загруженный чанк (обратная совместимость)
              begetUrl: uploadedChunks[0].publicUrl,
              lastHeartbeat: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(recordingTasks.id, task.id));

          logger.info(`[CHUNK] ✅ Part ${chunk.partNumber} uploaded: ${publicUrl} (total saved: ${uploadedChunks.length})`);
        },
      });

      clearInterval(heartbeatInterval);

      if (uploadedChunks.length === 0) {
        throw new Error(
          uploadError
            ? `Запись завершена, но ни один чанк не был загружен в S3: ${(uploadError as Error).message}`
            : 'Запись завершена, но ни один чанк не был загружен в S3'
        );
      }

      await tracker.flush();

      // Все чанки уже в S3 — помечаем задачу выполненной
      await db
        .update(recordingTasks)
        .set({
          status: 'completed',
          begetUrl: uploadedChunks[0].publicUrl,
          totalParts: uploadedChunks.length,
          completedAt: new Date(),
          lastHeartbeat: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(recordingTasks.id, task.id));

      this.tasksSuccessful++;
      logger.info(`✅ Task ${task.id} completed: ${uploadedChunks.length} chunk(s) in S3, first URL: ${uploadedChunks[0].publicUrl}`);
    } catch (error) {
      clearInterval(heartbeatInterval);

      const errMsg = (error as Error).message;
      const attemptsDone = task.attemptCount ?? 1;
      const failedChunkNumber = uploadedChunks.length + 1;
      const chunkLabel = `чанк ${failedChunkNumber}${expectedParts ? `/${expectedParts}` : ''}`;

      logger.error(`Failed task ${task.id} (attempt ${attemptsDone}/${MAX_ATTEMPTS}, ${chunkLabel}): ${errMsg}`);

      // Причина отказа (код + текст + подсказка) и событие в журнале задачи
      const willRetry = uploadedChunks.length === 0 && attemptsDone < MAX_ATTEMPTS;
      const failure = await tracker.fail(error, willRetry);
      logger.warn(`[START] ${tracker.recordingConfirmed ? 'recording was running' : 'recording did not start'} (stage: ${tracker.currentStage}, code: ${failure.code}): ${failure.reason}`);

      // Если хоть один чанк уже загружен — сохраняем частичный результат, не повторяем
      if (uploadedChunks.length > 0) {
        this.tasksFailed++;
        logger.warn(`[CHUNK] Task failed mid-recording but ${uploadedChunks.length} chunk(s) already saved to S3`);
        const partsPayload = uploadedChunks.map((c) => ({
          partNumber: c.partNumber,
          fileName: `${task.id}_part${c.partNumber}_${safeTitle}.mp4`,
          startTime: new Date().toISOString(),
          duration: c.durationMs,
          status: 'completed' as const,
          publicUrl: c.publicUrl,
        }));
        await db
          .update(recordingTasks)
          .set({
            status: 'failed',
            errorMessage: `Частичная запись (${uploadedChunks.length} чанк(ов) сохранено): ${errMsg}`,
            parts: partsPayload,
            currentPart: uploadedChunks.length,
            totalParts: uploadedChunks.length,
            begetUrl: uploadedChunks[0].publicUrl,
            completedAt: new Date(),
            lastHeartbeat: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(recordingTasks.id, task.id));

      } else if (attemptsDone < MAX_ATTEMPTS) {
        // Нет сохранённых чанков + есть ещё попытки — выжидаем паузу (задача остаётся
        // in_progress чтобы другой воркер не подхватил), затем сбрасываем в ready.
        const retryDelayMs = attemptsDone * 60 * 1000; // 1 мин после 1-й, 2 мин после 2-й
        const retryDelaySec = retryDelayMs / 1000;
        logger.warn(`[RETRY] Waiting ${retryDelaySec}s before retry (attempt ${attemptsDone}/${MAX_ATTEMPTS})...`);

        // Обновляем сообщение об ошибке и поддерживаем heartbeat во время паузы
        await db
          .update(recordingTasks)
          .set({
            errorMessage: `Попытка ${attemptsDone}/${MAX_ATTEMPTS} не удалась (${chunkLabel}): ${errMsg}. Повтор через ${retryDelaySec}с...`,
            lastHeartbeat: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(recordingTasks.id, task.id));

        const retryHeartbeat = setInterval(async () => {
          try {
            await db
              .update(recordingTasks)
              .set({ lastHeartbeat: new Date(), updatedAt: new Date() })
              .where(eq(recordingTasks.id, task.id));
          } catch (_e) {}
        }, executorConfig.worker.heartbeatIntervalMs);

        await this.sleep(retryDelayMs);
        clearInterval(retryHeartbeat);

        // Сбрасываем в ready — следующий цикл поллера подберёт задачу
        await db
          .update(recordingTasks)
          .set({
            status: 'ready',
            workerId: null,
            errorMessage: `Попытка ${attemptsDone}/${MAX_ATTEMPTS} не удалась (${chunkLabel}): ${errMsg}`,
            lastHeartbeat: null,
            updatedAt: new Date(),
          })
          .where(eq(recordingTasks.id, task.id));
        logger.warn(`[RETRY] Task ${task.id} reset to 'ready' — attempt ${attemptsDone + 1}/${MAX_ATTEMPTS} will start shortly`);

      } else {
        // Исчерпаны все попытки — окончательный провал
        this.tasksFailed++;
        logger.error(`[RETRY] Task ${task.id} exhausted all ${MAX_ATTEMPTS} attempts — marking failed`);
        await db
          .update(recordingTasks)
          .set({
            status: 'failed',
            errorMessage: `Все ${MAX_ATTEMPTS} попытки не удались. Последняя ошибка: ${errMsg}`,
            completedAt: new Date(),
            lastHeartbeat: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(recordingTasks.id, task.id));
      }
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
