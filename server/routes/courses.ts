import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { authenticateToken } from "../middleware/auth";
import { z } from "zod";

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
  externalCourseId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const updateCourseSchema = courseSchema.partial().extend({
  progress: z.number().min(0).max(100).optional(),
  status: z.enum(['not_started', 'in_progress', 'completed', 'paused']).optional(),
  isFavorite: z.boolean().optional(),
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
