import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import rateLimit from "express-rate-limit";
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: "Слишком много запросов, попробуйте позже",
  standardHeaders: true,
  legacyHeaders: false,
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply rate limiting to all API routes
  app.use('/api', apiLimiter);
  
  // Подключаем модульные роутеры
  const mainRouter = await import('./routes/index.js');
  app.use('/api', mainRouter.default);

  // ALL AUTH ROUTES NOW IN MODULAR ROUTER: server/routes/auth.ts 
  // (удалены дублированные auth роуты для предотвращения конфликтов)

  // ALL VERIFICATION ROUTES NOW IN MODULAR ROUTER: server/routes/verification.ts 
  // (удалены дублированные verification роуты для предотвращения конфликтов)

  // ALL DASHBOARD ROUTES NOW IN MODULAR ROUTER: server/routes/dashboard.ts 
  // (удалены дублированные dashboard роуты для предотвращения конфликтов)

  // ALL BANK CONNECTION, PAYMENT, ACCOUNT & TRANSACTION ROUTES NOW IN MODULAR ROUTER: server/routes/banks.ts 
  // (удалены дублированные banks/payments роуты для предотвращения конфликтов)

  // ALL PROFILE ROUTES NOW IN MODULAR ROUTER: server/routes/profile.ts 
  // (удалены profile роуты для предотвращения конфликтов)

  // Legacy support for old profile images path (backward compatibility)
  app.get('/uploads/profile-images/:filename', (req: Request, res: Response) => {
    try {
      const filename = req.params.filename;
      const filePath = path.join(__dirname, 'uploads', 'profile-images', filename);
      
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
      console.error('Error serving profile image:', error);
      res.status(500).json({ message: 'Ошибка получения изображения' });
    }
  });

  // My EPA - All routes now in modular routers:
  // - /api/courses - server/routes/courses.ts
  // - /api/deadlines - server/routes/deadlines.ts  
  // - /api/notes - server/routes/notes.ts
  // - /api/platforms - server/routes/platforms.ts
  // - /api/admin - server/routes/admin.ts
  // - /api/auth - server/routes/auth.ts
  // - /api/profile - server/routes/profile.ts

  const httpServer = createServer(app);
  return httpServer;
}
