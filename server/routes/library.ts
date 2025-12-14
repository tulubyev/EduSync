import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { authenticateToken } from "../middleware/auth";
import { z } from "zod";

const router = Router();

interface AuthRequest extends Request {
  user?: { id: string; role?: string | null };
}

const noteSchema = z.object({
  title: z.string().optional(),
  content: z.string().min(1, "Содержание материала обязательно"),
  resourceUrl: z.string().refine(
    (url) => !url || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:'),
    "URL должен начинаться с http://, https:// или быть base64 данными"
  ).optional(),
  platformId: z.string().uuid().nullable().optional(),
  courseId: z.string().uuid().nullable().optional(),
  lessonNumber: z.number().int().positive().optional(),
  lessonTitle: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isPinned: z.boolean().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

const updateNoteSchema = noteSchema.partial();

router.get('/', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const notes = await storage.getNotes(userId);
    
    const sortedNotes = notes.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime();
    });
    
    res.json(sortedNotes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ message: 'Ошибка получения заметок' });
  }
});

router.get('/course/:courseId', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    
    const course = await storage.getCourse(courseId);
    if (!course || course.userId !== req.user!.id) {
      return res.status(403).json({ message: 'Доступ запрещён' });
    }
    
    const notes = await storage.getNotesByCourse(courseId);
    res.json(notes);
  } catch (error) {
    console.error('Error fetching course notes:', error);
    res.status(500).json({ message: 'Ошибка получения заметок курса' });
  }
});

router.get('/search', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const query = (req.query.q as string || '').toLowerCase().trim();
    
    if (!query) {
      return res.status(400).json({ message: 'Поисковый запрос обязателен' });
    }
    
    const notes = await storage.getNotes(userId);
    const filteredNotes = notes.filter(note => 
      note.content.toLowerCase().includes(query) ||
      (note.title && note.title.toLowerCase().includes(query)) ||
      (note.tags && note.tags.some(tag => tag.toLowerCase().includes(query)))
    );
    
    res.json(filteredNotes);
  } catch (error) {
    console.error('Error searching notes:', error);
    res.status(500).json({ message: 'Ошибка поиска заметок' });
  }
});

router.get('/:id', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const note = await storage.getNote(id);
    
    if (!note) {
      return res.status(404).json({ message: 'Заметка не найдена' });
    }
    
    if (note.userId !== req.user!.id) {
      return res.status(403).json({ message: 'Доступ запрещён' });
    }
    
    res.json(note);
  } catch (error) {
    console.error('Error fetching note:', error);
    res.status(500).json({ message: 'Ошибка получения заметки' });
  }
});

router.post('/', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    console.log('📝 Creating library material:', JSON.stringify(req.body, null, 2));
    const validation = noteSchema.safeParse(req.body);
    if (!validation.success) {
      console.error('❌ Validation failed:', JSON.stringify(validation.error.errors, null, 2));
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
    
    const noteData = {
      ...validation.data,
      userId: req.user!.id,
    };
    
    const note = await storage.createNote(noteData);
    res.status(201).json(note);
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ message: 'Ошибка создания заметки' });
  }
});

router.put('/:id', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existingNote = await storage.getNote(id);
    
    if (!existingNote) {
      return res.status(404).json({ message: 'Заметка не найдена' });
    }
    
    if (existingNote.userId !== req.user!.id) {
      return res.status(403).json({ message: 'Доступ запрещён' });
    }
    
    const validation = updateNoteSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        message: 'Ошибка валидации',
        errors: validation.error.errors 
      });
    }
    
    const note = await storage.updateNote(id, validation.data);
    res.json(note);
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ message: 'Ошибка обновления заметки' });
  }
});

router.patch('/:id/pin', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existingNote = await storage.getNote(id);
    
    if (!existingNote) {
      return res.status(404).json({ message: 'Заметка не найдена' });
    }
    
    if (existingNote.userId !== req.user!.id) {
      return res.status(403).json({ message: 'Доступ запрещён' });
    }
    
    const note = await storage.updateNote(id, { 
      isPinned: !existingNote.isPinned 
    });
    res.json(note);
  } catch (error) {
    console.error('Error toggling pin:', error);
    res.status(500).json({ message: 'Ошибка закрепления заметки' });
  }
});

router.delete('/:id', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existingNote = await storage.getNote(id);
    
    if (!existingNote) {
      return res.status(404).json({ message: 'Заметка не найдена' });
    }
    
    if (existingNote.userId !== req.user!.id) {
      return res.status(403).json({ message: 'Доступ запрещён' });
    }
    
    await storage.deleteNote(id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ message: 'Ошибка удаления заметки' });
  }
});

export default router;
