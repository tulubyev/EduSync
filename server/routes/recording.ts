import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { authenticateToken } from "../middleware/auth";
import { z } from "zod";
import { yandexDiskService } from "../services/yandexDiskService";
import { recordingTaskManager, recordingLogger, pollerController } from "../services/recording";
import { logger } from "../services/logger";
import { db } from "../db";
import { recordingTasks, recordingWorkerStatus, recordingLogs } from "@shared/schema";
import { eq, and, or, desc, sql, gte, count } from "drizzle-orm";
import { S3Client, HeadBucketCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

const router = Router();

interface AuthRequest extends Request {
  user?: { id: string; role?: string | null; adminRole?: string | null };
}

const recordingSchema = z.object({
  title: z.string().min(1, "Название обязательно"),
  description: z.string().optional(),
  streamUrl: z.string().url("Некорректная ссылка"),
  streamPassword: z.string().optional(),
  scheduledTime: z.string().datetime("Некорректное время"),
  duration: z.number().int().min(1).max(1440).default(60),
  saveTarget: z.enum(['yandex_disk', 'library', 'beget']).default('beget'),
});

router.post('/schedule', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const validData = recordingSchema.parse(req.body);

    const taskId = await recordingTaskManager.createTask({
      userId,
      title: validData.title,
      description: validData.description,
      streamUrl: validData.streamUrl,
      streamPassword: validData.streamPassword,
      scheduledTime: new Date(validData.scheduledTime),
      duration: validData.duration,
      saveTarget: validData.saveTarget,
    });

    logger.info(`Recording task created: ${taskId} for user ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Запись запланирована успешно',
      taskId,
      scheduledTime: validData.scheduledTime,
      saveTarget: validData.saveTarget,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors[0]?.message || 'Ошибка валидации';
      return res.status(400).json({ message });
    }

    logger.error('Error scheduling recording:', error);
    res.status(500).json({ message: 'Ошибка при планировании записи' });
  }
});

router.get('/tasks', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const tasks = await recordingTaskManager.getUserTasks(userId);
    res.json(tasks);
  } catch (error) {
    logger.error('Error fetching recording tasks:', error);
    res.status(500).json({ message: 'Ошибка получения задач записи' });
  }
});

router.get('/tasks/:taskId', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = req.user!.id;

    const task = await recordingTaskManager.getTask(taskId);
    
    if (!task) {
      return res.status(404).json({ message: 'Задача не найдена' });
    }

    if (task.userId !== userId) {
      return res.status(403).json({ message: 'Нет доступа к этой задаче' });
    }

    res.json(task);
  } catch (error) {
    logger.error('Error fetching recording task:', error);
    res.status(500).json({ message: 'Ошибка получения задачи' });
  }
});

router.post('/tasks/:taskId/cancel', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = req.user!.id;

    const task = await recordingTaskManager.getTask(taskId);
    
    if (!task) {
      return res.status(404).json({ message: 'Задача не найдена' });
    }

    if (task.userId !== userId) {
      return res.status(403).json({ message: 'Нет доступа к этой задаче' });
    }

    if (!['scheduled', 'ready', 'in_progress', 'uploading'].includes(task.status)) {
      return res.status(400).json({ message: 'Нельзя отменить завершённую или уже отменённую задачу' });
    }

    await recordingTaskManager.cancelTask(taskId);
    res.json({ success: true, message: 'Задача отменена' });
  } catch (error) {
    logger.error('Error cancelling recording task:', error);
    res.status(500).json({ message: 'Ошибка отмены задачи' });
  }
});

router.post('/tasks/:taskId/recover', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = req.user!.id;

    const task = await recordingTaskManager.getTask(taskId);
    
    if (!task) {
      return res.status(404).json({ message: 'Задача не найдена' });
    }

    if (task.userId !== userId) {
      return res.status(403).json({ message: 'Нет доступа к этой задаче' });
    }

    await recordingTaskManager.recoverTask(taskId);
    res.json({ success: true, message: 'Задача восстановлена и перезапланирована' });
  } catch (error: any) {
    logger.error('Error recovering recording task:', error);
    res.status(500).json({ message: error.message || 'Ошибка восстановления задачи' });
  }
});

router.put('/tasks/:taskId', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = req.user!.id;
    const { title, description, streamUrl, streamPassword, scheduledTime, duration } = req.body;

    const task = await recordingTaskManager.getTask(taskId);
    
    if (!task) {
      return res.status(404).json({ message: 'Задача не найдена' });
    }

    if (task.userId !== userId) {
      return res.status(403).json({ message: 'Нет доступа к этой задаче' });
    }

    if (task.status !== 'ready' && task.status !== 'failed') {
      return res.status(400).json({ message: 'Редактировать можно только задачи в статусе «Готова к записи» или «Ошибка»' });
    }

    // Validate input
    if (!title?.trim() || !streamUrl?.trim() || !scheduledTime || !duration) {
      return res.status(400).json({ message: 'Все обязательные поля должны быть заполнены' });
    }

    const durationNum = Number(duration);
    if (isNaN(durationNum) || durationNum < 1 || durationNum > 1440) {
      return res.status(400).json({ message: 'Длительность должна быть от 1 до 1440 минут' });
    }

    const updateData: Record<string, any> = {
      title: title.trim(),
      description: description?.trim() || null,
      streamUrl: streamUrl.trim(),
      streamPassword: streamPassword?.trim() || null,
      scheduledTime: new Date(scheduledTime),
      duration: durationNum,
      updatedAt: new Date(),
    };

    // Если задача была с ошибкой — сбрасываем в статус "готова к записи"
    if (task.status === 'failed') {
      updateData.status = 'ready';
      updateData.errorMessage = null;
      updateData.workerId = null;
      updateData.startedAt = null;
      updateData.completedAt = null;
    }

    await db.update(recordingTasks)
      .set(updateData)
      .where(eq(recordingTasks.id, taskId));

    const action = task.status === 'failed' ? 'перезапущена' : 'обновлена';
    logger.info(`Recording task ${taskId} ${action} by user ${userId}`);
    res.json({ success: true, message: `Задача ${action}` });
  } catch (error) {
    logger.error('Error updating recording task:', error);
    res.status(500).json({ message: 'Ошибка обновления задачи' });
  }
});

router.post('/tasks/:taskId/recheck', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = req.user!.id;

    const task = await recordingTaskManager.getTask(taskId);
    if (!task) return res.status(404).json({ message: 'Задача не найдена' });
    if (task.userId !== userId) return res.status(403).json({ message: 'Нет доступа к этой задаче' });
    if (!['ready', 'failed'].includes(task.status!)) {
      return res.status(400).json({ message: 'Перепроверка возможна только для ожидающих или неудавшихся задач' });
    }

    await db.update(recordingTasks)
      .set({
        urlCheckStatus: 'pending',
        urlCheckMessage: null,
        urlCheckedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(recordingTasks.id, taskId));

    logger.info(`URL recheck requested for task ${taskId} by user ${userId}`);
    res.json({ success: true, message: 'Проверка запущена, результат появится в течение 5 секунд' });
  } catch (error) {
    logger.error('Error requesting recheck:', error);
    res.status(500).json({ message: 'Ошибка запуска перепроверки' });
  }
});

router.get('/scheduler/status', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const readyTasks = await recordingTaskManager.getReadyTasks();
    res.json({
      readyTasksCount: readyTasks.length,
      message: 'Recording Worker выполняет задачи в отдельном проекте',
    });
  } catch (error) {
    logger.error('Error getting scheduler status:', error);
    res.status(500).json({ message: 'Ошибка получения статуса планировщика' });
  }
});

router.get('/yandex-disk/status', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const status = await yandexDiskService.getStatus();
    res.json(status);
  } catch (error) {
    logger.error('Error getting Yandex.Disk status:', error);
    res.status(500).json({ message: 'Ошибка получения статуса Яндекс.Диска' });
  }
});

router.get('/yandex-disk/files', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const files = await yandexDiskService.listFiles();
    res.json(files);
  } catch (error) {
    logger.error('Error listing Yandex.Disk files:', error);
    res.status(500).json({ message: 'Ошибка получения списка файлов' });
  }
});

router.post('/tasks/clear-queue', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    await db.delete(recordingTasks)
      .where(
        and(
          eq(recordingTasks.userId, userId),
          or(
            eq(recordingTasks.status, 'scheduled'),
            eq(recordingTasks.status, 'failed')
          )
        )
      );
    
    logger.info(`Cleared recording queue for user ${userId}`);
    res.json({ success: true, message: 'Очередь записей очищена' });
  } catch (error) {
    logger.error('Error clearing recording queue:', error);
    res.status(500).json({ message: 'Ошибка очистки очереди' });
  }
});

router.delete('/tasks/:taskId', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = req.user!.id;

    const task = await recordingTaskManager.getTask(taskId);
    
    if (!task) {
      return res.status(404).json({ message: 'Задача не найдена' });
    }

    if (task.userId !== userId) {
      return res.status(403).json({ message: 'Нет доступа к этой задаче' });
    }

    // Delete the task from database
    await db.delete(recordingTasks).where(eq(recordingTasks.id, taskId));

    logger.info(`Deleted recording task: ${taskId} for user ${userId}`);
    res.json({ success: true, message: 'Задача удалена' });
  } catch (error) {
    logger.error('Error deleting recording task:', error);
    res.status(500).json({ message: 'Ошибка удаления задачи' });
  }
});

router.get('/tasks/:taskId/logs', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = req.user!.id;

    const task = await recordingTaskManager.getTask(taskId);
    
    if (!task) {
      return res.status(404).json({ message: 'Задача не найдена' });
    }

    if (task.userId !== userId && !req.user?.adminRole) {
      return res.status(403).json({ message: 'Нет доступа к этой задаче' });
    }

    const logs = await recordingLogger.getTaskLogs(taskId);
    res.json({
      taskId,
      title: task.title,
      status: task.status,
      logsCount: logs.length,
      logs: logs.map((log: any) => ({
        id: log.id,
        timestamp: log.createdAt,
        event: log.eventType,
        part: log.partNumber,
        message: log.message,
        error: log.errorDetails,
        fileSize: log.fileSize,
        duration: log.duration,
      }))
    });
  } catch (error) {
    logger.error('Error fetching recording logs:', error);
    res.status(500).json({ message: 'Ошибка получения логов' });
  }
});

router.get('/logs/timeline/:taskId', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = req.user!.id;

    const task = await recordingTaskManager.getTask(taskId);
    
    if (!task) {
      return res.status(404).json({ message: 'Задача не найдена' });
    }

    if (task.userId !== userId) {
      return res.status(403).json({ message: 'Нет доступа к этой задаче' });
    }

    const timeline = await recordingLogger.getTaskEventTimeline(taskId);
    res.json({
      taskId,
      title: task.title,
      status: task.status,
      scheduledTime: task.scheduledTime,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      timeline
    });
  } catch (error) {
    logger.error('Error fetching timeline:', error);
    res.status(500).json({ message: 'Ошибка получения timeline' });
  }
});

router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Recording Worker выполняет задачи в отдельном проекте',
    timestamp: new Date().toISOString(),
  });
});

// ===========================================
// MONITORING ENDPOINTS
// ===========================================

const API_SECRET = process.env.API_SECRET;

// Middleware to verify worker/n8n requests
const verifyInternalRequest = (req: Request, res: Response, next: any) => {
  const authHeader = req.headers.authorization;
  if (API_SECRET && authHeader !== `Bearer ${API_SECRET}`) {
    return res.status(401).json({ message: 'Unauthorized internal request' });
  }
  next();
};

router.get('/logs/:taskId', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = req.user!.id;

    const task = await recordingTaskManager.getTask(taskId);
    if (!task) return res.status(404).json({ message: 'Задача не найдена' });
    if (task.userId !== userId && !req.user?.adminRole) {
      return res.status(403).json({ message: 'Нет доступа к этой задаче' });
    }

    const logs = await db
      .select()
      .from(recordingLogs)
      .where(eq(recordingLogs.taskId, taskId))
      .orderBy(recordingLogs.createdAt);

    res.json({
      taskId,
      title: task.title,
      status: task.status,
      logsCount: logs.length,
      logs: logs.map(log => ({
        id: log.id,
        timestamp: log.createdAt,
        event: log.eventType,
        part: log.partNumber,
        message: log.message,
        error: log.errorDetails,
        fileSize: log.fileSize,
        duration: log.duration,
        metadata: log.metadata,
      })),
    });
  } catch (error) {
    logger.error('Error fetching recording logs:', error);
    res.status(500).json({ message: 'Ошибка получения логов задачи' });
  }
});

router.get('/monitor/dashboard', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  if (!requireAdminRole(req, res)) return;
  try {
    const statusCounts = await db
      .select({
        status: recordingTasks.status,
        count: count(),
      })
      .from(recordingTasks)
      .groupBy(recordingTasks.status);

    const stats = {
      ready: 0,
      in_progress: 0,
      uploading: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      total: 0,
    };

    statusCounts.forEach((row) => {
      const status = row.status as keyof typeof stats;
      if (status in stats) {
        stats[status] = Number(row.count);
      }
      stats.total += Number(row.count);
    });

    const recentTasks = await db
      .select()
      .from(recordingTasks)
      .orderBy(desc(recordingTasks.createdAt))
      .limit(10);

    res.json({
      stats,
      recentTasks,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching monitor dashboard:', error);
    res.status(500).json({ message: 'Ошибка получения дашборда' });
  }
});

router.get('/monitor/worker-status', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  if (!requireAdminRole(req, res)) return;
  try {
    const workers = await db
      .select()
      .from(recordingWorkerStatus)
      .orderBy(desc(recordingWorkerStatus.lastSeenAt));

    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const workersWithHealth = workers.map((worker) => {
      const lastSeen = worker.lastSeenAt ? new Date(worker.lastSeenAt) : null;
      const isOnline = lastSeen && lastSeen > fiveMinutesAgo;
      const secondsAgo = lastSeen ? Math.floor((now.getTime() - lastSeen.getTime()) / 1000) : null;

      return {
        ...worker,
        isOnline,
        secondsAgo,
        healthStatus: isOnline ? 'healthy' : (lastSeen ? 'offline' : 'unknown'),
      };
    });

    const activeWorkers = workersWithHealth.filter(w => w.isOnline).length;
    const totalWorkers = workers.length;

    res.json({
      workers: workersWithHealth,
      summary: {
        activeWorkers,
        totalWorkers,
        allHealthy: activeWorkers === totalWorkers && totalWorkers > 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching worker status:', error);
    res.status(500).json({ message: 'Ошибка получения статуса воркеров' });
  }
});

router.get('/monitor/sync-check', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  if (!requireAdminRole(req, res)) return;
  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const staleTasks = await db
      .select()
      .from(recordingTasks)
      .where(
        and(
          eq(recordingTasks.status, 'in_progress'),
          sql`${recordingTasks.lastHeartbeat} < ${tenMinutesAgo} OR ${recordingTasks.lastHeartbeat} IS NULL`
        )
      );

    const orphanedTasks = await db
      .select()
      .from(recordingTasks)
      .where(
        and(
          eq(recordingTasks.status, 'in_progress'),
          sql`${recordingTasks.workerId} IS NOT NULL`
        )
      );

    const activeWorkers = await db
      .select({ workerId: recordingWorkerStatus.workerId })
      .from(recordingWorkerStatus)
      .where(gte(recordingWorkerStatus.lastSeenAt, tenMinutesAgo));

    const activeWorkerIds = new Set(activeWorkers.map(w => w.workerId));
    const orphaned = orphanedTasks.filter(t => t.workerId && !activeWorkerIds.has(t.workerId));

    const issues: Array<{ type: string; message: string; taskId?: string; workerId?: string }> = [];

    staleTasks.forEach(task => {
      issues.push({
        type: 'stale_heartbeat',
        message: `Задача "${task.title}" без heartbeat более 10 минут`,
        taskId: task.id,
        workerId: task.workerId || undefined,
      });
    });

    orphaned.forEach(task => {
      issues.push({
        type: 'orphaned_task',
        message: `Задача "${task.title}" привязана к неактивному воркеру`,
        taskId: task.id,
        workerId: task.workerId || undefined,
      });
    });

    res.json({
      healthy: issues.length === 0,
      issueCount: issues.length,
      issues,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error checking sync:', error);
    res.status(500).json({ message: 'Ошибка проверки синхронизации' });
  }
});

router.get('/monitor/recent-logs', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  if (!requireAdminRole(req, res)) return;
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const taskId = req.query.taskId as string | undefined;

    const logs = await db
      .select({
        log: recordingLogs,
        taskTitle: recordingTasks.title,
      })
      .from(recordingLogs)
      .leftJoin(recordingTasks, eq(recordingLogs.taskId, recordingTasks.id))
      .where(taskId ? eq(recordingLogs.taskId, taskId) : undefined)
      .orderBy(desc(recordingLogs.createdAt))
      .limit(limit);

    res.json({
      logs: logs.map(({ log, taskTitle }) => ({
        ...log,
        taskTitle: taskTitle ?? null,
      })),
      count: logs.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching recent logs:', error);
    res.status(500).json({ message: 'Ошибка получения логов' });
  }
});

router.post('/monitor/worker-heartbeat', verifyInternalRequest, async (req: Request, res: Response) => {
  try {
    const { workerId, dbConnected, s3Connected, activeTaskId, currentTaskTitle, buildVersion } = req.body;

    if (!workerId) {
      return res.status(400).json({ message: 'workerId обязателен' });
    }

    await db
      .insert(recordingWorkerStatus)
      .values({
        workerId,
        isActive: true,
        dbConnected: dbConnected ?? true,
        s3Connected: s3Connected ?? false,
        activeTaskId: activeTaskId || null,
        currentTaskTitle: currentTaskTitle || null,
        buildVersion: buildVersion || null,
        lastSeenAt: new Date(),
      })
      .onConflictDoUpdate({
        target: recordingWorkerStatus.workerId,
        set: {
          isActive: true,
          dbConnected: dbConnected ?? true,
          s3Connected: s3Connected ?? false,
          activeTaskId: activeTaskId || null,
          currentTaskTitle: currentTaskTitle || null,
          buildVersion: buildVersion || null,
          lastSeenAt: new Date(),
        },
      });

    res.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Error processing worker heartbeat:', error);
    res.status(500).json({ message: 'Ошибка обработки heartbeat' });
  }
});

router.post('/monitor/worker-task-complete', verifyInternalRequest, async (req: Request, res: Response) => {
  try {
    const { workerId, taskId, success: successRaw, error: errorMessage, actualDurationSeconds } = req.body;

    if (!workerId) {
      return res.status(400).json({ message: 'workerId обязателен' });
    }

    // Effective success flag — can be overridden to false if recording is too short
    let effectiveSuccess = successRaw;
    let effectiveErrorMessage = errorMessage;
    let completionLogged = false;

    // Validate actual recording duration — mark as failed if too short (< 10% of expected)
    if (successRaw && taskId && actualDurationSeconds !== undefined) {
      const task = await db
        .select({ duration: recordingTasks.duration, title: recordingTasks.title, userId: recordingTasks.userId })
        .from(recordingTasks)
        .where(eq(recordingTasks.id, taskId))
        .limit(1);

      if (task.length > 0) {
        const expectedSeconds = task[0].duration * 60;
        const minAcceptableSeconds = expectedSeconds * 0.1;

        if (actualDurationSeconds < minAcceptableSeconds) {
          const shortMsg = `Запись слишком короткая: ${actualDurationSeconds} сек из ${task[0].duration} мин запланировано`;
          await db.update(recordingTasks)
            .set({
              status: 'failed',
              errorMessage: shortMsg,
              updatedAt: new Date(),
            })
            .where(eq(recordingTasks.id, taskId));

          await recordingLogger.logEvent({
            taskId,
            userId: task[0].userId,
            eventType: 'upload_failed',
            message: shortMsg,
            duration: actualDurationSeconds,
          });

          logger.warn(`Short recording detected for task ${taskId}: ${actualDurationSeconds}s of ${expectedSeconds}s expected`);

          // Override success so worker metrics correctly count this as a failure
          effectiveSuccess = false;
          effectiveErrorMessage = shortMsg;
          completionLogged = true;
        } else {
          // Normal successful completion — log it from EPA side
          await recordingLogger.logEvent({
            taskId,
            userId: task[0].userId,
            eventType: 'recording_completed',
            message: `Запись завершена воркером ${workerId}: ${actualDurationSeconds} сек`,
            duration: actualDurationSeconds,
          });
          completionLogged = true;
        }
      }
    }

    // If taskId present but not yet logged — look up task for failure/success log
    if (taskId && !completionLogged) {
      const task = await db
        .select({ userId: recordingTasks.userId })
        .from(recordingTasks)
        .where(eq(recordingTasks.id, taskId))
        .limit(1);

      if (task.length > 0) {
        if (effectiveSuccess) {
          await recordingLogger.logEvent({
            taskId,
            userId: task[0].userId,
            eventType: 'recording_completed',
            message: `Запись завершена воркером ${workerId}`,
          });
        } else {
          await recordingLogger.logEvent({
            taskId,
            userId: task[0].userId,
            eventType: 'task_failed',
            message: `Воркер ${workerId} сообщил об ошибке`,
            errorDetails: effectiveErrorMessage,
          });
        }
      }
    }

    const worker = await db
      .select()
      .from(recordingWorkerStatus)
      .where(eq(recordingWorkerStatus.workerId, workerId))
      .limit(1);

    if (worker.length === 0) {
      return res.status(404).json({ message: 'Воркер не найден' });
    }

    const updates: any = {
      tasksProcessed: sql`${recordingWorkerStatus.tasksProcessed} + 1`,
      activeTaskId: null,
      currentTaskTitle: null,
      lastSeenAt: new Date(),
    };

    if (effectiveSuccess) {
      updates.tasksSuccessful = sql`${recordingWorkerStatus.tasksSuccessful} + 1`;
    } else {
      updates.tasksFailed = sql`${recordingWorkerStatus.tasksFailed} + 1`;
      updates.lastError = effectiveErrorMessage || 'Unknown error';
      updates.lastErrorAt = new Date();
    }

    await db
      .update(recordingWorkerStatus)
      .set(updates)
      .where(eq(recordingWorkerStatus.workerId, workerId));

    res.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Error processing task completion:', error);
    res.status(500).json({ message: 'Ошибка обработки завершения задачи' });
  }
});

// ===========================================
// ADMIN ENDPOINTS (adminRole required)
// ===========================================

function getS3Client(): { client: S3Client; bucket: string; publicUrl: string } | null {
  const endpoint = process.env.BEGET_S3_ENDPOINT;
  const accessKeyId = process.env.BEGET_S3_ACCESS_KEY;
  const secretAccessKey = process.env.BEGET_S3_SECRET_KEY;
  const bucket = process.env.BEGET_S3_BUCKET;
  const publicUrl = process.env.BEGET_S3_PUBLIC_URL || '';
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) return null;
  const region = process.env.BEGET_S3_REGION || 'ru-1';
  const client = new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  client.middlewareStack.add(
    (next: any) => async (args: any) => {
      const req = args.request;
      if (req && req.headers) {
        const headersToRemove = Object.keys(req.headers).filter(
          (h) =>
            h.toLowerCase().startsWith('x-amz-checksum') ||
            h.toLowerCase() === 'x-amz-sdk-checksum-algorithm' ||
            h.toLowerCase() === 'x-amz-trailer'
        );
        headersToRemove.forEach((h) => delete req.headers[h]);
      }
      return next(args);
    },
    { step: 'build', priority: 'low', name: 'removeBegetIncompatibleHeaders' }
  );
  return { client, bucket, publicUrl };
}

const requireAdminRole = (req: AuthRequest, res: Response): boolean => {
  if (!req.user?.adminRole) {
    res.status(403).json({ message: 'Доступ разрешён только администраторам' });
    return false;
  }
  return true;
};

router.get('/admin/stats', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  if (!requireAdminRole(req, res)) return;
  try {
    const stats = await db
      .select({ status: recordingTasks.status, count: sql<number>`count(*)::int` })
      .from(recordingTasks)
      .groupBy(recordingTasks.status);
    res.json({ success: true, stats });
  } catch (error) {
    logger.error('Admin stats error:', error);
    res.status(500).json({ message: 'Ошибка получения статистики' });
  }
});

router.get('/admin/health', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  if (!requireAdminRole(req, res)) return;
  const health: any = { timestamp: new Date().toISOString(), services: {} };
  try {
    await db.select({ id: recordingTasks.id }).from(recordingTasks).limit(1);
    health.services.database = { status: 'ok' };
  } catch (e) {
    health.services.database = { status: 'error', error: (e as Error).message };
  }
  const s3 = getS3Client();
  if (!s3) {
    health.services.s3 = { status: 'not_configured', error: 'Переменные BEGET_S3_* не установлены' };
  } else {
    try {
      await s3.client.send(new HeadBucketCommand({ Bucket: s3.bucket }));
      health.services.s3 = { status: 'ok', bucket: s3.bucket };
    } catch (e) {
      health.services.s3 = { status: 'error', error: (e as Error).message };
    }
  }

  // Playwright / browser health — живые данные из StreamingRecorder (все воркеры)
  try {
    const executorStatus = pollerController.getStatus();
    const allWorkers = pollerController.getBrowserStatusAll();

    const toPlaywrightStatus = (bs: ReturnType<typeof pollerController.getBrowserStatus>, running: boolean) => {
      if (!running) return 'executor_stopped';
      if (bs.isRecording) return 'recording';
      if (bs.browserAlive) return 'idle';
      return 'not_launched';
    };

    if (allWorkers.length === 0) {
      health.services.playwright = { status: 'executor_stopped' };
    } else if (allWorkers.length === 1) {
      const bs = allWorkers[0];
      health.services.playwright = {
        status: toPlaywrightStatus(bs, executorStatus.isRunning),
        browserAlive: bs.browserAlive,
        pageAlive: bs.pageAlive,
        isRecording: bs.isRecording,
        frameCount: bs.frameCount,
        elapsedMs: bs.elapsedMs,
        currentUrl: bs.currentUrl,
        taskId: bs.taskId,
        workers: allWorkers.map(w => ({
          workerId: w.workerId,
          status: toPlaywrightStatus(w, executorStatus.isRunning),
          browserAlive: w.browserAlive,
          isRecording: w.isRecording,
          frameCount: w.frameCount,
          elapsedMs: w.elapsedMs,
          currentUrl: w.currentUrl,
          taskId: w.taskId,
        })),
      };
    } else {
      // Multi-worker: aggregate
      const anyRecording = allWorkers.some(w => w.isRecording);
      const anyBrowserAlive = allWorkers.some(w => w.browserAlive);
      const aggStatus = anyRecording ? 'recording' : anyBrowserAlive ? 'idle' : 'not_launched';
      const totalFrames = allWorkers.reduce((s, w) => s + w.frameCount, 0);
      health.services.playwright = {
        status: aggStatus,
        browserAlive: anyBrowserAlive,
        pageAlive: allWorkers.some(w => w.pageAlive),
        isRecording: anyRecording,
        frameCount: totalFrames,
        elapsedMs: null,
        currentUrl: null,
        taskId: null,
        workers: allWorkers.map(w => ({
          workerId: w.workerId,
          status: toPlaywrightStatus(w, executorStatus.isRunning),
          browserAlive: w.browserAlive,
          isRecording: w.isRecording,
          frameCount: w.frameCount,
          elapsedMs: w.elapsedMs,
          currentUrl: w.currentUrl,
          taskId: w.taskId,
        })),
      };
    }
  } catch (e) {
    health.services.playwright = { status: 'error', error: (e as Error).message };
  }

  res.json(health);
});

router.get('/admin/s3-files', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  if (!requireAdminRole(req, res)) return;
  const s3 = getS3Client();
  if (!s3) {
    return res.json({ success: true, files: [], folders: [], configured: false, message: 'S3 не настроен (BEGET_S3_* переменные отсутствуют)' });
  }
  const prefix = typeof req.query.prefix === 'string' ? req.query.prefix : 'myepa/';
  try {
    const result = await s3.client.send(new ListObjectsV2Command({
      Bucket: s3.bucket,
      Prefix: prefix,
      Delimiter: '/',
      MaxKeys: 500,
    }));
    const folders = (result.CommonPrefixes || []).map(cp => cp.Prefix!).filter(Boolean);
    const files = (result.Contents || [])
      .filter(obj => obj.Key && obj.Key !== prefix)
      .map(obj => ({
        key: obj.Key!,
        size: obj.Size ?? 0,
        lastModified: obj.LastModified?.toISOString() ?? null,
        url: s3.publicUrl ? `${s3.publicUrl}/${obj.Key}` : obj.Key!,
      }));
    res.json({ success: true, prefix, folders, files, total: files.length, configured: true });
  } catch (error) {
    logger.error('Admin S3 files error:', error);
    res.status(500).json({ message: 'Ошибка получения файлов S3', error: (error as Error).message });
  }
});

router.get('/admin/tasks', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  if (!requireAdminRole(req, res)) return;
  try {
    const status = req.query.status as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string || '100', 10), 500);
    const [tasks, totalRow] = await Promise.all([
      status
        ? db.select().from(recordingTasks).where(eq(recordingTasks.status, status)).orderBy(desc(recordingTasks.createdAt)).limit(limit)
        : db.select().from(recordingTasks).orderBy(desc(recordingTasks.createdAt)).limit(limit),
      status
        ? db.select({ total: sql<number>`count(*)::int` }).from(recordingTasks).where(eq(recordingTasks.status, status))
        : db.select({ total: sql<number>`count(*)::int` }).from(recordingTasks),
    ]);
    res.json({ success: true, tasks, total: totalRow[0]?.total ?? tasks.length });
  } catch (error) {
    logger.error('Admin tasks error:', error);
    res.status(500).json({ message: 'Ошибка получения задач' });
  }
});

router.get('/admin/tasks/:taskId', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  if (!requireAdminRole(req, res)) return;
  try {
    const rows = await db.select().from(recordingTasks).where(eq(recordingTasks.id, req.params.taskId)).limit(1);
    if (!rows.length) return res.status(404).json({ message: 'Задача не найдена' });
    res.json({ success: true, task: rows[0] });
  } catch (error) {
    logger.error('Admin get task error:', error);
    res.status(500).json({ message: 'Ошибка получения задачи' });
  }
});

router.patch('/admin/tasks/:taskId', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  if (!requireAdminRole(req, res)) return;
  try {
    const body = req.body;
    const allowed = ['title', 'description', 'streamUrl', 'streamPassword', 'duration', 'scheduledTime', 'saveTarget', 'status', 'begetUrl', 'errorMessage'] as const;
    const update: Record<string, any> = { updatedAt: new Date() };
    for (const key of allowed) {
      if (key in body) {
        if (key === 'scheduledTime') {
          update[key] = body[key] ? new Date(body[key]) : null;
        } else if (key === 'duration') {
          update[key] = parseInt(body[key], 10) || null;
        } else {
          update[key] = body[key] ?? null;
        }
      }
    }
    if (update.status === 'ready') {
      update.workerId = null;
      update.lastHeartbeat = null;
    }
    await db.update(recordingTasks).set(update).where(eq(recordingTasks.id, req.params.taskId));
    logger.info(`Admin updated task ${req.params.taskId}: ${JSON.stringify(Object.keys(update))} by ${req.user!.id}`);
    res.json({ success: true });
  } catch (error) {
    logger.error('Admin patch task error:', error);
    res.status(500).json({ message: 'Ошибка обновления задачи' });
  }
});

router.patch('/admin/tasks/:taskId/reset', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  if (!requireAdminRole(req, res)) return;
  try {
    await db.update(recordingTasks)
      .set({ status: 'ready', errorMessage: null, workerId: null, lastHeartbeat: null, updatedAt: new Date() })
      .where(eq(recordingTasks.id, req.params.taskId));
    logger.info(`Admin reset task ${req.params.taskId} to ready by ${req.user!.id}`);
    res.json({ success: true });
  } catch (error) {
    logger.error('Admin reset task error:', error);
    res.status(500).json({ message: 'Ошибка сброса задачи' });
  }
});

router.patch('/admin/tasks/:taskId/cancel', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  if (!requireAdminRole(req, res)) return;
  try {
    await db.update(recordingTasks)
      .set({ status: 'cancelled', errorMessage: 'Отменено администратором', updatedAt: new Date() })
      .where(eq(recordingTasks.id, req.params.taskId));
    logger.info(`Admin cancelled task ${req.params.taskId} by ${req.user!.id}`);
    res.json({ success: true });
  } catch (error) {
    logger.error('Admin cancel task error:', error);
    res.status(500).json({ message: 'Ошибка отмены задачи' });
  }
});

router.delete('/admin/tasks/failed/clear', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  if (!requireAdminRole(req, res)) return;
  try {
    const result = await db.delete(recordingTasks)
      .where(eq(recordingTasks.status, 'failed'))
      .returning({ id: recordingTasks.id });
    logger.info(`Admin cleared ${result.length} failed tasks, by ${req.user!.id}`);
    res.json({ success: true, deleted: result.length });
  } catch (error) {
    logger.error('Admin clear failed tasks error:', error);
    res.status(500).json({ message: 'Ошибка очистки failed задач' });
  }
});

router.delete('/admin/tasks/:taskId', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  if (!requireAdminRole(req, res)) return;
  try {
    await db.delete(recordingTasks).where(eq(recordingTasks.id, req.params.taskId));
    logger.info(`Admin deleted task ${req.params.taskId} by ${req.user!.id}`);
    res.json({ success: true });
  } catch (error) {
    logger.error('Admin delete task error:', error);
    res.status(500).json({ message: 'Ошибка удаления задачи' });
  }
});

router.get('/admin/tasks/:taskId/logs', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  if (!requireAdminRole(req, res)) return;
  try {
    const logs = await db
      .select()
      .from(recordingLogs)
      .where(eq(recordingLogs.taskId, req.params.taskId))
      .orderBy(recordingLogs.createdAt);
    res.json({
      success: true,
      logs: logs.map(log => ({
        id: log.id,
        timestamp: log.createdAt,
        event: log.eventType,
        part: log.partNumber,
        message: log.message,
        error: log.errorDetails,
        fileSize: log.fileSize,
        duration: log.duration,
        metadata: log.metadata,
      })),
    });
  } catch (error) {
    logger.error('Admin task logs error:', error);
    res.status(500).json({ message: 'Ошибка получения логов задачи' });
  }
});

// ── Executor (Recording Poller) Controls ─────────────────────────────────────

router.get('/admin/executor/status', authenticateToken as any, (req: AuthRequest, res: Response) => {
  if (!requireAdminRole(req, res)) return;
  res.json({ success: true, executor: pollerController.getStatus() });
});

router.post('/admin/executor/start', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  if (!requireAdminRole(req, res)) return;
  const adminId = req.user!.id;
  const count = typeof req.body?.count === 'number' ? req.body.count : undefined;
  logger.info(`Admin ${adminId} requested executor START (count=${count ?? 'default'})`);
  const result = await pollerController.start(count);
  res.status(result.ok ? 200 : 409).json({ success: result.ok, message: result.message, executor: pollerController.getStatus() });
});

router.post('/admin/executor/stop', authenticateToken as any, (req: AuthRequest, res: Response) => {
  if (!requireAdminRole(req, res)) return;
  const adminId = req.user!.id;
  logger.info(`Admin ${adminId} requested executor STOP ALL`);
  const result = pollerController.stop();
  res.status(result.ok ? 200 : 409).json({ success: result.ok, message: result.message, executor: pollerController.getStatus() });
});

router.post('/admin/executor/scale-up', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  if (!requireAdminRole(req, res)) return;
  const adminId = req.user!.id;
  logger.info(`Admin ${adminId} requested executor SCALE UP`);
  const result = await pollerController.scaleUp();
  res.status(result.ok ? 200 : 409).json({ success: result.ok, message: result.message, executor: pollerController.getStatus() });
});

router.post('/admin/executor/worker/:workerId/stop', authenticateToken as any, (req: AuthRequest, res: Response) => {
  if (!requireAdminRole(req, res)) return;
  const adminId = req.user!.id;
  const { workerId } = req.params;
  logger.info(`Admin ${adminId} requested STOP worker ${workerId}`);
  const result = pollerController.stopWorker(workerId);
  res.status(result.ok ? 200 : 404).json({ success: result.ok, message: result.message, executor: pollerController.getStatus() });
});

export default router;
