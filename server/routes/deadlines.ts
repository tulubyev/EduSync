import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { authenticateToken } from "../middleware/auth";
import { z } from "zod";

const router = Router();

interface AuthRequest extends Request {
  user?: { id: string; role?: string | null };
}

const deadlineSchema = z.object({
  title: z.string().min(1, "Название дедлайна обязательно"),
  description: z.string().optional(),
  dueDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Неверный формат даты"
  }),
  reminderDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Неверный формат даты напоминания"
  }).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  courseId: z.string().uuid().optional(),
  isRecurring: z.boolean().optional(),
  recurringPattern: z.object({
    type: z.enum(['daily', 'weekly', 'monthly']),
    interval: z.number().int().positive().optional(),
    days: z.array(z.number().int().min(0).max(6)).optional()
  }).optional(),
});

const updateDeadlineSchema = deadlineSchema.partial().extend({
  status: z.enum(['pending', 'completed', 'overdue', 'cancelled']).optional(),
});

router.get('/', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const deadlines = await storage.getDeadlines(userId);
    
    const now = new Date();
    const processedDeadlines = deadlines.map(deadline => {
      if (deadline.status === 'pending' && new Date(deadline.dueDate) < now) {
        return { ...deadline, status: 'overdue' as const };
      }
      return deadline;
    });
    
    res.json(processedDeadlines);
  } catch (error) {
    console.error('Error fetching deadlines:', error);
    res.status(500).json({ message: 'Ошибка получения дедлайнов' });
  }
});

router.get('/upcoming', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const days = parseInt(req.query.days as string) || 7;
    
    const deadlines = await storage.getDeadlines(userId);
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    const upcomingDeadlines = deadlines.filter(deadline => {
      const dueDate = new Date(deadline.dueDate);
      return deadline.status === 'pending' && dueDate >= now && dueDate <= futureDate;
    });
    
    res.json(upcomingDeadlines);
  } catch (error) {
    console.error('Error fetching upcoming deadlines:', error);
    res.status(500).json({ message: 'Ошибка получения предстоящих дедлайнов' });
  }
});

router.get('/course/:courseId', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    
    const course = await storage.getCourse(courseId);
    if (!course || course.userId !== req.user!.id) {
      return res.status(403).json({ message: 'Доступ запрещён' });
    }
    
    const deadlines = await storage.getDeadlinesByCourse(courseId);
    res.json(deadlines);
  } catch (error) {
    console.error('Error fetching course deadlines:', error);
    res.status(500).json({ message: 'Ошибка получения дедлайнов курса' });
  }
});

router.get('/:id', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const deadline = await storage.getDeadline(id);
    
    if (!deadline) {
      return res.status(404).json({ message: 'Дедлайн не найден' });
    }
    
    if (deadline.userId !== req.user!.id) {
      return res.status(403).json({ message: 'Доступ запрещён' });
    }
    
    res.json(deadline);
  } catch (error) {
    console.error('Error fetching deadline:', error);
    res.status(500).json({ message: 'Ошибка получения дедлайна' });
  }
});

router.post('/', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const validation = deadlineSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        message: 'Ошибка валидации',
        errors: validation.error.errors 
      });
    }
    
    if (validation.data.courseId) {
      const course = await storage.getCourse(validation.data.courseId);
      if (!course || course.userId !== req.user!.id) {
        return res.status(400).json({ message: 'Курс не найден или недоступен' });
      }
    }
    
    const deadlineData = {
      ...validation.data,
      userId: req.user!.id,
      dueDate: new Date(validation.data.dueDate),
      reminderDate: validation.data.reminderDate ? new Date(validation.data.reminderDate) : null,
    };
    
    const deadline = await storage.createDeadline(deadlineData);
    res.status(201).json(deadline);
  } catch (error) {
    console.error('Error creating deadline:', error);
    res.status(500).json({ message: 'Ошибка создания дедлайна' });
  }
});

router.put('/:id', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existingDeadline = await storage.getDeadline(id);
    
    if (!existingDeadline) {
      return res.status(404).json({ message: 'Дедлайн не найден' });
    }
    
    if (existingDeadline.userId !== req.user!.id) {
      return res.status(403).json({ message: 'Доступ запрещён' });
    }
    
    const validation = updateDeadlineSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        message: 'Ошибка валидации',
        errors: validation.error.errors 
      });
    }
    
    const updates: any = { ...validation.data };
    
    if (validation.data.dueDate) {
      updates.dueDate = new Date(validation.data.dueDate);
    }
    if (validation.data.reminderDate) {
      updates.reminderDate = new Date(validation.data.reminderDate);
    }
    if (validation.data.status === 'completed' && existingDeadline.status !== 'completed') {
      updates.completedAt = new Date();
    }
    
    const deadline = await storage.updateDeadline(id, updates);
    res.json(deadline);
  } catch (error) {
    console.error('Error updating deadline:', error);
    res.status(500).json({ message: 'Ошибка обновления дедлайна' });
  }
});

router.patch('/:id/complete', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existingDeadline = await storage.getDeadline(id);
    
    if (!existingDeadline) {
      return res.status(404).json({ message: 'Дедлайн не найден' });
    }
    
    if (existingDeadline.userId !== req.user!.id) {
      return res.status(403).json({ message: 'Доступ запрещён' });
    }
    
    const deadline = await storage.updateDeadline(id, { 
      status: 'completed',
      completedAt: new Date()
    });
    res.json(deadline);
  } catch (error) {
    console.error('Error completing deadline:', error);
    res.status(500).json({ message: 'Ошибка завершения дедлайна' });
  }
});

router.delete('/:id', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existingDeadline = await storage.getDeadline(id);
    
    if (!existingDeadline) {
      return res.status(404).json({ message: 'Дедлайн не найден' });
    }
    
    if (existingDeadline.userId !== req.user!.id) {
      return res.status(403).json({ message: 'Доступ запрещён' });
    }
    
    await storage.deleteDeadline(id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting deadline:', error);
    res.status(500).json({ message: 'Ошибка удаления дедлайна' });
  }
});

export default router;
