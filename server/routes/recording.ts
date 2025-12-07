import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { authenticateToken } from "../middleware/auth";
import { z } from "zod";
import { v4 as uuidv4 } from 'uuid';
import { yandexDiskService } from "../services/yandexDiskService";
import { logger } from "../services/logger";

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
  duration: z.number().int().min(1).max(1440).optional().default(60),
  platform: z.enum(['yandex_disk', 'library']).default('library'),
});

type RecordingData = z.infer<typeof recordingSchema>;

// Schedule recording
router.post('/schedule', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    
    // Validate request body
    const validData = recordingSchema.parse(req.body);
    
    // Create recording task ID
    const taskId = uuidv4();

    // Save to storage as a library note with recording metadata
    const note = await storage.createNote({
      title: `📹 ${validData.title}`,
      content: `Запись трансляции\n\nСтруй: ${validData.streamUrl}\nВремя: ${validData.scheduledTime}\nДлительность: ${validData.duration} мин\nПлатформа: ${validData.platform === 'yandex_disk' ? 'Яндекс.Диск' : 'Библиотека'}\n\nОписание: ${validData.description || ''}`,
      userId,
      resourceUrl: undefined,
      tags: ['recording', validData.platform],
    });

    // TODO: In production, this would trigger a background job to handle the actual recording
    // For now, we'll just schedule it for later processing
    console.log('[Recording Scheduler] Task scheduled:', {
      taskId,
      userId,
      title: validData.title,
      scheduledTime: validData.scheduledTime,
      platform: validData.platform,
    });

    res.status(201).json({
      success: true,
      message: 'Запись запланирована успешно',
      taskId,
      noteId: note.id,
      scheduledTime: validData.scheduledTime,
      platform: validData.platform,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors[0]?.message || 'Ошибка валидации';
      return res.status(400).json({ message });
    }

    console.error('Error scheduling recording:', error);
    res.status(500).json({ message: 'Ошибка при планировании записи' });
  }
});

// Get recording status
router.get('/status/:taskId', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = req.user!.id;

    // In production, fetch from database/cache
    // For now, return placeholder status
    res.json({
      taskId,
      status: 'scheduled',
      scheduledTime: new Date(),
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Error fetching recording status:', error);
    res.status(500).json({ message: 'Ошибка получения статуса записи' });
  }
});

// Get Yandex.Disk connection status
router.get('/yandex-disk/status', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const status = await yandexDiskService.getStatus();
    res.json(status);
  } catch (error) {
    logger.error('Error getting Yandex.Disk status:', error);
    res.status(500).json({ message: 'Ошибка получения статуса Яндекс.Диска' });
  }
});

// List recordings from Yandex.Disk
router.get('/yandex-disk/files', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const files = await yandexDiskService.listFiles();
    res.json(files);
  } catch (error) {
    logger.error('Error listing Yandex.Disk files:', error);
    res.status(500).json({ message: 'Ошибка получения списка файлов' });
  }
});

export default router;
