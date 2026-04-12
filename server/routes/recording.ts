import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { authenticateToken } from "../middleware/auth";
import { z } from "zod";
import { yandexDiskService } from "../services/yandexDiskService";
import { recordingTaskManager, recordingLogger } from "../services/recording";
import { logger } from "../services/logger";
import { db } from "../db";
import { recordingTasks, recordingWorkerStatus, recordingLogs } from "@shared/schema";
import { eq, and, or, desc, sql, gte, count } from "drizzle-orm";

const router = Router();

interface AuthRequest extends Request {
  user?: { id: string; role?: string | null };
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

    if (task.status !== 'ready') {
      return res.status(400).json({ message: 'Можно отменить только готовые к записи задачи' });
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

    if (task.userId !== userId) {
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

router.get('/monitor/dashboard', authenticateToken as any, async (req: AuthRequest, res: Response) => {
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
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const logs = await db
      .select()
      .from(recordingLogs)
      .orderBy(desc(recordingLogs.createdAt))
      .limit(limit);

    res.json({
      logs,
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
    const { workerId, success, error: errorMessage } = req.body;

    if (!workerId) {
      return res.status(400).json({ message: 'workerId обязателен' });
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

    if (success) {
      updates.tasksSuccessful = sql`${recordingWorkerStatus.tasksSuccessful} + 1`;
    } else {
      updates.tasksFailed = sql`${recordingWorkerStatus.tasksFailed} + 1`;
      updates.lastError = errorMessage || 'Unknown error';
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

export default router;
