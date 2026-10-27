import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { authenticateToken } from "../middleware/auth";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { rateLimiters } from "../middleware";
import { isLang } from "@shared/languages";
import { previewCourse, PreviewError } from "../services/coursePreview";

const router = Router();

interface AuthRequest extends Request {
  user?: { id: string; role?: string | null };
}

const courseSchema = z.object({
  title: z.string().min(1, "Название курса обязательно"),
  description: z.string().optional(),
  instructor: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  courseUrl: z.string().url().optional().or(z.literal('')),
  category: z.string().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  duration: z.number().int().positive().optional(),
  platformId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  // стоимость в рублях; null — бесплатный курс
  cost: z.number().min(0).max(100_000_000).nullable().optional(),
});

/** decimal-колонка cost хранится строкой */
const costColumn = (cost: number | null | undefined) => (cost === undefined ? undefined : cost === null ? null : String(cost));

const updateCourseSchema = courseSchema.partial().extend({
  progress: z.number().min(0).max(100).optional(),
  status: z.enum(['not_started', 'in_progress', 'completed', 'paused']).optional(),
  isFavorite: z.boolean().optional(),
});

// Get all available courses from catalog (public, for all users)
// Каталог курсов: обезличенный справочник (#17) — без id, владельцев, тегов и заметок учеников.
// Только курсы со ссылкой: с площадок или добавленные хотя бы двумя учениками.
router.get('/catalog/all', authenticateToken as any, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await db.execute(sql`
      SELECT DISTINCT ON (c.course_url)
             c.title, c.course_url, c.image_url, c.category, c.difficulty, c.platform_id, c.source
      FROM courses c
      WHERE c.course_url IS NOT NULL
        AND (c.source <> 'manual'
             OR c.course_url IN (SELECT course_url FROM courses WHERE course_url IS NOT NULL
                                 GROUP BY course_url HAVING count(DISTINCT user_id) >= 2))
      ORDER BY c.course_url, c.updated_at DESC
      LIMIT 500`);
    res.json(result.rows.map((r: any) => ({
      id: `catalog:${r.course_url}`,
      title: r.title,
      imageUrl: r.image_url,
      courseUrl: r.course_url,
      category: r.category,
      difficulty: r.difficulty,
      platformId: r.platform_id,
      source: r.source,
      progress: '0',
      status: 'not_started',
      isFavorite: false,
      isFromCatalog: true,
    })));
  } catch (error) {
    console.error('Error fetching course catalog:', error);
    res.status(500).json({ message: 'Ошибка получения каталога курсов' });
  }
});

router.get('/', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const courses = await storage.getCourses(userId);
    res.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ message: 'Ошибка получения курсов' });
  }
});

router.get('/:id', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const course = await storage.getCourse(id);
    
    if (!course) {
      return res.status(404).json({ message: 'Курс не найден' });
    }
    
    if (course.userId !== req.user!.id) {
      return res.status(403).json({ message: 'Доступ запрещён' });
    }
    
    res.json(course);
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ message: 'Ошибка получения курса' });
  }
});

// Курс по ссылке (#19): название, описание, обложка и площадка со страницы курса — для заполнения формы.
// Сервер ходит по ссылке пользователя, поэтому защита от SSRF (coursePreview.ts) и строгий лимит запросов.
const previewSchema = z.object({ url: z.string().trim().min(1).max(2000), lang: z.string().optional() });

router.post('/preview', authenticateToken as any, rateLimiters.strict, async (req: AuthRequest, res: Response) => {
  const parsed = previewSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ code: 'invalid_url', message: 'Нужна ссылка на курс' });
  try {
    const platforms = await storage.getPlatforms();
    const lang = isLang(parsed.data.lang) ? parsed.data.lang : 'en';
    const preview = await previewCourse(
      parsed.data.url,
      platforms.map((p) => ({ id: p.id, code: p.code, name: p.name, websiteUrl: p.websiteUrl })),
      { lang },
    );
    res.json(preview);
  } catch (error) {
    if (error instanceof PreviewError) {
      return res.status(400).json({ code: error.code, message: error.code === 'blocked' ? 'Эта ссылка недоступна' : 'Неверная ссылка' });
    }
    console.error('Course preview error:', error);
    res.status(500).json({ code: 'unavailable', message: 'Не удалось прочитать страницу курса' });
  }
});

router.post('/', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const validation = courseSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        message: 'Ошибка валидации',
        errors: validation.error.errors 
      });
    }
    
    const courseData = {
      ...validation.data,
      userId: req.user!.id,
      imageUrl: validation.data.imageUrl || null,
      courseUrl: validation.data.courseUrl || null,
      cost: costColumn(validation.data.cost),
    };
    
    const course = await storage.createCourse(courseData);
    res.status(201).json(course);
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ message: 'Ошибка создания курса' });
  }
});

router.put('/:id', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existingCourse = await storage.getCourse(id);
    
    if (!existingCourse) {
      return res.status(404).json({ message: 'Курс не найден' });
    }
    
    if (existingCourse.userId !== req.user!.id) {
      return res.status(403).json({ message: 'Доступ запрещён' });
    }
    
    const validation = updateCourseSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        message: 'Ошибка валидации',
        errors: validation.error.errors 
      });
    }
    
    const updates: any = { ...validation.data };
    if ('cost' in validation.data) updates.cost = costColumn(validation.data.cost);
    
    if (validation.data.status === 'completed' && existingCourse.status !== 'completed') {
      updates.completedAt = new Date();
      updates.progress = "100";
    }
    
    if (validation.data.status === 'in_progress' && existingCourse.status === 'not_started') {
      updates.startedAt = new Date();
    }
    
    updates.lastAccessedAt = new Date();
    
    const course = await storage.updateCourse(id, updates);
    res.json(course);
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ message: 'Ошибка обновления курса' });
  }
});

router.delete('/:id', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existingCourse = await storage.getCourse(id);
    
    if (!existingCourse) {
      return res.status(404).json({ message: 'Курс не найден' });
    }
    
    if (existingCourse.userId !== req.user!.id) {
      return res.status(403).json({ message: 'Доступ запрещён' });
    }

    // курс площадки вернулся бы при следующей синхронизации — он уходит вместе с отключением площадки
    if (existingCourse.source !== 'manual') {
      return res.status(409).json({ message: 'Курс получен с площадки. Чтобы убрать его, отключите площадку в настройках.' });
    }
    
    await storage.deleteCourse(id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ message: 'Ошибка удаления курса' });
  }
});

router.patch('/:id/progress', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { progress } = req.body;
    
    if (typeof progress !== 'number' || progress < 0 || progress > 100) {
      return res.status(400).json({ message: 'Прогресс должен быть числом от 0 до 100' });
    }
    
    const existingCourse = await storage.getCourse(id);
    
    if (!existingCourse) {
      return res.status(404).json({ message: 'Курс не найден' });
    }
    
    if (existingCourse.userId !== req.user!.id) {
      return res.status(403).json({ message: 'Доступ запрещён' });
    }
    
    const updates: any = {
      progress: progress.toString(),
      lastAccessedAt: new Date()
    };
    
    if (progress === 100 && existingCourse.status !== 'completed') {
      updates.status = 'completed';
      updates.completedAt = new Date();
    } else if (progress > 0 && existingCourse.status === 'not_started') {
      updates.status = 'in_progress';
      updates.startedAt = new Date();
    }
    
    const course = await storage.updateCourse(id, updates);
    res.json(course);
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ message: 'Ошибка обновления прогресса' });
  }
});

router.patch('/:id/favorite', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existingCourse = await storage.getCourse(id);
    
    if (!existingCourse) {
      return res.status(404).json({ message: 'Курс не найден' });
    }
    
    if (existingCourse.userId !== req.user!.id) {
      return res.status(403).json({ message: 'Доступ запрещён' });
    }
    
    const course = await storage.updateCourse(id, { 
      isFavorite: !existingCourse.isFavorite 
    });
    res.json(course);
  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({ message: 'Ошибка обновления избранного' });
  }
});

export default router;
