import { Router, Request, Response } from 'express';
import { logger } from "../services/logger";
import { authenticateToken } from '../middleware/auth.js';
import { storage } from '../storage';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../config/environment';
import { isLang } from '@shared/languages';
import { DEFAULT_THEME, isTheme } from '@shared/themes';
import { collectUserData } from '../services/dataExport';
import { buildExportEntries } from '../services/dataExportFiles';
import { buildZip } from '../services/zip';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { userSettings } from '@shared/schema';
import { DEFAULT_SCHEDULE_PREFS, type SchedulePrefs } from '@shared/recordingHints';
import { DAY_PERIODS, isDayPeriod } from '@shared/weekPlan';

interface AuthRequest extends Request {
  user?: { id: string; role?: string | null };
}

const router = Router();

// Multer configuration for profile images
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.uploads.maxFileSize,
  },
  fileFilter: (req, file, cb) => {
    if (req.url === '/upload-image') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Только изображения разрешены'));
      }
    } else {
      cb(null, true);
    }
  },
});

/**
 * PROFILE ROUTES MODULE
 * Extracted from main routes.ts for modular architecture
 * 
 * Routes:
 * - PUT /update - Update user profile information
 * - POST /upload-image - Upload and process profile image
 * - GET /images/:filename - Serve uploaded profile images
 */

// Язык кабинета ученика (shared/languages.ts)
// Удобные и рабочие часы ученика (#48): по ним кабинет предлагает записать вебинар в неудобное время
const minutes = z.number().int().min(0).max(24 * 60);
const schedulePrefsSchema = z
  .object({
    comfortFrom: minutes,
    comfortTo: minutes,
    workFrom: minutes.nullable(),
    workTo: minutes.nullable(),
    workDays: z.array(z.number().int().min(1).max(7)).max(7),
    recordingHints: z.boolean(),
    // план недели (#20); старые клиенты их не присылают — тогда остаются прежние значения
    studyMinutes: z.number().int().min(0).max(16 * 60).optional(),
    studyDays: z.array(z.number().int().min(1).max(7)).max(7).optional(),
    preferredStudyTime: z.enum(DAY_PERIODS).nullable().optional(),
  })
  .refine((p) => p.comfortFrom < p.comfortTo, { message: 'Удобное время: начало должно быть раньше конца' })
  .refine((p) => (p.workFrom === null) === (p.workTo === null), { message: 'Рабочее время: укажите начало и конец' })
  .refine((p) => p.workFrom === null || p.workTo === null || p.workFrom < p.workTo, { message: 'Рабочее время: начало должно быть раньше конца' });

router.get('/schedule', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const [row] = await db.select().from(userSettings).where(eq(userSettings.userId, req.user!.id));
    const prefs: SchedulePrefs = row
      ? {
        comfortFrom: row.comfortFrom, comfortTo: row.comfortTo, workFrom: row.workFrom, workTo: row.workTo, workDays: row.workDays,
        recordingHints: row.recordingHints,
        studyMinutes: row.studyGoalMinutes ?? DEFAULT_SCHEDULE_PREFS.studyMinutes,
        studyDays: row.studyDays,
        preferredStudyTime: isDayPeriod(row.preferredStudyTime) ? row.preferredStudyTime : null,
      }
      : DEFAULT_SCHEDULE_PREFS;
    res.json(prefs);
  } catch (error) {
    logger.error('Schedule prefs load error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ message: 'Не удалось загрузить настройки времени' });
  }
});

router.put('/schedule', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const parsed = schedulePrefsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message || 'Неверные настройки времени' });
  const { studyMinutes, studyDays, preferredStudyTime, ...hintPrefs } = parsed.data;
  const sortDays = (days: number[]) => Array.from(new Set(days)).sort((a, b) => a - b);
  const columns = {
    ...hintPrefs,
    workDays: sortDays(hintPrefs.workDays),
    ...(studyMinutes !== undefined && { studyGoalMinutes: studyMinutes }),
    ...(studyDays !== undefined && { studyDays: sortDays(studyDays) }),
    ...(preferredStudyTime !== undefined && { preferredStudyTime }),
  };
  try {
    const [row] = await db
      .insert(userSettings)
      .values({ userId: req.user!.id, ...columns })
      .onConflictDoUpdate({ target: userSettings.userId, set: { ...columns, updatedAt: new Date() } })
      .returning();
    const prefs: SchedulePrefs = {
      comfortFrom: row.comfortFrom, comfortTo: row.comfortTo, workFrom: row.workFrom, workTo: row.workTo, workDays: row.workDays,
      recordingHints: row.recordingHints,
      studyMinutes: row.studyGoalMinutes ?? DEFAULT_SCHEDULE_PREFS.studyMinutes,
      studyDays: row.studyDays,
      preferredStudyTime: isDayPeriod(row.preferredStudyTime) ? row.preferredStudyTime : null,
    };
    res.json(prefs);
  } catch (error) {
    logger.error('Schedule prefs save error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ message: 'Не удалось сохранить настройки времени' });
  }
});

// Выгрузка всех данных ученика одним ZIP-архивом (#44): только свои данные, не чаще раза в 10 минут.
// Счётчик в памяти процесса: при нескольких процессах — раз в 10 минут на каждый; это защита от лишней нагрузки, не квота
const EXPORT_INTERVAL_MS = 10 * 60 * 1000;
const lastExport = new Map<string, number>();

router.get('/export', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const now = Date.now();
  const last = lastExport.get(userId);
  if (last && now - last < EXPORT_INTERVAL_MS) {
    const retryAfter = Math.ceil((EXPORT_INTERVAL_MS - (now - last)) / 1000);
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({ message: 'Архив можно скачивать не чаще раза в 10 минут', retryAfter });
  }
  try {
    const date = new Date();
    const zip = buildZip(buildExportEntries(await collectUserData(userId), date), date);
    lastExport.set(userId, now);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="myepa-data-${date.toISOString().slice(0, 10)}.zip"`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(zip);
  } catch (error) {
    logger.error('Data export error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ message: 'Не удалось собрать архив' });
  }
});

router.put('/language', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const { language } = req.body ?? {};
    if (!isLang(language)) {
      return res.status(400).json({ message: 'Неизвестный язык' });
    }
    await storage.updateUser(req.user!.id, { language });
    res.json({ language });
  } catch (error) {
    logger.error('Error updating language:', error);
    res.status(500).json({ message: 'Ошибка сохранения языка' });
  }
});

// Тема оформления (#45): хранится в user_settings.theme, чтобы выбор переходил между устройствами
router.get('/theme', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const [row] = await db.select({ theme: userSettings.theme }).from(userSettings).where(eq(userSettings.userId, req.user!.id));
    res.json({ theme: isTheme(row?.theme) ? row.theme : DEFAULT_THEME });
  } catch (error) {
    logger.error('Theme load error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ message: 'Не удалось загрузить тему' });
  }
});

router.put('/theme', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const { theme } = req.body ?? {};
  if (!isTheme(theme)) return res.status(400).json({ message: 'Неизвестная тема' });
  try {
    await db
      .insert(userSettings)
      .values({ userId: req.user!.id, theme })
      .onConflictDoUpdate({ target: userSettings.userId, set: { theme, updatedAt: new Date() } });
    res.json({ theme });
  } catch (error) {
    logger.error('Theme save error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ message: 'Не удалось сохранить тему' });
  }
});

// Update user profile
router.put('/update', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const { firstName, lastName, email, phone } = req.body;
    const userId = req.user!.id;

    // Validate input
    if (!firstName || !lastName) {
      return res.status(400).json({ message: 'Имя и фамилия обязательны' });
    }

    // Update user profile
    const updatedUser = await storage.updateUser(userId, {
      firstName,
      lastName,
      email: email || null,
      phone
    });

    if (!updatedUser) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    // хэш пароля наружу не отдаём; фото — как в /api/users
    const { passwordHash, calendarToken, profileImage, ...profileData } = updatedUser;
    res.json({ ...profileData, profileImage: profileImage ? `data:image/jpeg;base64,${profileImage}` : null });
  } catch (error) {
    logger.error('Profile update error:', error);
    res.status(500).json({ message: 'Ошибка обновления профиля' });
  }
});

// Upload and process profile image
router.post('/upload-image', 
  authenticateToken as any, 
  upload.single('profileImage'), 
  async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Файл не загружен' });
    }

    const userId = req.user!.id;
    
    // Convert to base64 for storage
    const base64Image = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype || 'image/jpeg';

    // Update user profile with base64 image
    const updatedUser = await storage.updateUser(userId, {
      profileImage: base64Image
    });

    if (!updatedUser) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    res.json({ 
      profileImage: `data:${mimeType};base64,${base64Image}`,
      message: 'Изображение профиля успешно загружено'
    });
  } catch (error) {
    logger.error('Profile image upload error:', error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Ошибка загрузки изображения' 
    });
  }
});

// Serve uploaded profile images
router.get('/images/:filename', (req: Request, res: Response) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '..', 'uploads', 'profile-images', filename);
    
    // Security check: only allow files with safe names
    if (!/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png)$/i.test(filename)) {
      return res.status(400).json({ message: 'Недопустимое имя файла' });
    }

    res.sendFile(filePath, (err) => {
      if (err) {
        res.status(404).json({ message: 'Изображение не найдено' });
      }
    });
  } catch (error) {
    logger.error('Error serving profile image:', error);
    res.status(500).json({ message: 'Ошибка получения изображения' });
  }
});

export default router;