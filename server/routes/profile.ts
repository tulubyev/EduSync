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
    const { passwordHash, profileImage, ...profileData } = updatedUser;
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