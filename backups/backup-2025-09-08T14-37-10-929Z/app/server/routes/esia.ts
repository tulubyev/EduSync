import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { esiaService } from '../services/esiaService.js';
import { authService } from '../services/authService.js';

const router = Router();

/**
 * ESIA (ГОСУСЛУГИ) INTEGRATION ROUTES MODULE
 * Extracted from main routes.ts for modular architecture
 * 
 * Routes:
 * - POST /mock - Mock authorization via Госуслуги (development only)
 * - GET /status - Get ESIA integration status
 * - GET /authorize - Initiate OAuth2 authorization via Госуслуги
 * - GET /callback - Handle OAuth2 callback from Госуслуги
 */

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: { message: 'Слишком много попыток входа. Попробуйте снова через 15 минут.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Mock авторизация через Госуслуги (только для разработки и тестов)
router.post('/mock', authLimiter, async (req: Request, res: Response) => {
  try {
    const { mockUser } = req.body;
    
    if (!mockUser) {
      return res.status(400).json({ message: 'Mock пользователь не предоставлен' });
    }

    // Проверяем, что мы в режиме разработки или mock режиме
    if (process.env.NODE_ENV === 'production' && process.env.ESIA_MOCK_MODE !== 'true') {
      return res.status(403).json({ 
        message: 'Mock авторизация недоступна в production без ESIA_MOCK_MODE' 
      });
    }

    const user = await esiaService.createOrUpdateUser(mockUser);
    const tokens = authService.generateTokens(user);
    
    res.json({
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        isVerified: user.isVerified,
        verificationMethod: user.verificationMethod,
      },
      accessToken: tokens.accessToken,
      message: 'Mock авторизация ЕСИА успешна'
    });
  } catch (error) {
    console.error('ЕСИА mock error:', error);
    res.status(400).json({ message: error instanceof Error ? error.message : 'Ошибка mock авторизации' });
  }
});

// Получение статуса интеграции с ЕСИА
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = esiaService.getIntegrationStatus();
    res.json(status);
  } catch (error) {
    console.error('Ошибка получения статуса ЕСИА:', error);
    res.status(500).json({ message: 'Ошибка получения статуса' });
  }
});

// Инициация OAuth2 авторизации через Госуслуги
router.get('/authorize', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'development' || process.env.ESIA_MOCK_MODE === 'true') {
      // В режиме разработки перенаправляем на страницу с объяснением
      return res.redirect('/?esia_info=mock_mode');
    }
    
    const authUrl = await esiaService.generateAuthUrl();
    res.redirect(authUrl);
  } catch (error) {
    console.error('Ошибка создания URL авторизации ЕСИА:', error);
    res.status(500).json({ message: error instanceof Error ? error.message : 'Ошибка создания URL авторизации' });
  }
});

// Обработка OAuth2 callback от Госуслуг
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.status(400).json({ message: 'Код авторизации отсутствует' });
    }

    const result = await esiaService.handleCallback(code as string, state as string);
    const user = await esiaService.createOrUpdateUser(result.userInfo);
    const tokens = authService.generateTokens(user);
    
    // Перенаправляем на фронтенд с токеном
    res.redirect(`${process.env.BASE_URL || 'http://localhost:5000'}/?esia_token=${tokens.accessToken}`);
  } catch (error) {
    console.error('Ошибка обработки callback ЕСИА:', error);
    const errorMessage = error instanceof Error ? error.message : 'Ошибка авторизации';
    res.redirect(`${process.env.BASE_URL || 'http://localhost:5000'}/?esia_error=${encodeURIComponent(errorMessage)}`);
  }
});

export default router;