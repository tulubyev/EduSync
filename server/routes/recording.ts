import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { authenticateToken } from "../middleware/auth";
import { z } from "zod";
import { yandexDiskService } from "../services/yandexDiskService";
import { recordingTaskManager, recordingScheduler, recordingLogger } from "../services/recording";
import { logger } from "../services/logger";
import { db } from "../db";
import { recordingTasks } from "@shared/schema";
import { eq, and, or } from "drizzle-orm";

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
  saveTarget: z.enum(['yandex_disk', 'library']).default('yandex_disk'),
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

    if (task.status !== 'scheduled') {
      return res.status(400).json({ message: 'Можно отменить только запланированные задачи' });
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

    if (task.status !== 'scheduled') {
      return res.status(400).json({ message: 'Можно редактировать только запланированные задачи' });
    }

    // Validate input
    if (!title?.trim() || !streamUrl?.trim() || !scheduledTime || !duration) {
      return res.status(400).json({ message: 'Все обязательные поля должны быть заполнены' });
    }

    await db.update(recordingTasks)
      .set({
        title,
        description: description || null,
        streamUrl,
        streamPassword: streamPassword || null,
        scheduledTime: new Date(scheduledTime),
        duration,
        updatedAt: new Date(),
      })
      .where(eq(recordingTasks.id, taskId));

    logger.info(`Updated recording task: ${taskId}`);
    res.json({ success: true, message: 'Задача обновлена' });
  } catch (error) {
    logger.error('Error updating recording task:', error);
    res.status(500).json({ message: 'Ошибка обновления задачи' });
  }
});

router.post('/tasks/:taskId/execute', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = req.user!.id;
    const user = await storage.getUser(userId);

    if (!user || (user.role !== 'admin' && user.adminRole !== 'super_admin')) {
      return res.status(403).json({ message: 'Требуются права администратора' });
    }

    const task = await recordingTaskManager.getTask(taskId);
    
    if (!task) {
      return res.status(404).json({ message: 'Задача не найдена' });
    }

    recordingTaskManager.executeTask(taskId);
    res.json({ success: true, message: 'Запись запущена' });
  } catch (error) {
    logger.error('Error executing recording task:', error);
    res.status(500).json({ message: 'Ошибка запуска записи' });
  }
});

router.get('/scheduler/status', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    res.json({
      isActive: recordingScheduler.isActive(),
      activeTask: recordingTaskManager.getActiveTask(),
      isProcessing: recordingTaskManager.isTaskProcessing(),
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
    schedulerActive: recordingScheduler.isActive(),
    timestamp: new Date().toISOString(),
  });
});

export default router;
