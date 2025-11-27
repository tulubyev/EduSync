import { Router, type Request, type Response } from "express";
import { authService } from "../services/authService";
import { twoFactorService } from "../services/twoFactorService";
import { esiaService } from "../services/esiaService";
import { smsService } from "../services/smsService";
import { userService } from "../services/UserService";
import { authenticateToken, type AuthenticatedRequest } from "../middleware/auth";
import { z } from "zod";
import rateLimit from "express-rate-limit";

// Auth rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: "Слишком много попыток входа, попробуйте позже",
});

// Validation schemas для auth роутов
const registerSchema = z.object({
  email: z.string().email('Неверный формат email').optional().or(z.literal('').transform(() => undefined)),
  password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
  firstName: z.string().min(1, 'Имя обязательно'),
  lastName: z.string().min(1, 'Фамилия обязательна'),
  phone: z.string().min(10, 'Номер телефона обязателен (минимум 10 цифр)').regex(/^\+?[1-9]\d{9,14}$/, 'Неверный формат номера телефона'),
});

const loginSchema = z.object({
  phone: z.string().optional(),
  email: z.string().email('Неверный формат email').optional(),
  identifier: z.string().optional(),
  password: z.string().min(1, 'Пароль обязателен'),
  twoFactorCode: z.string().optional(),
}).refine(data => data.phone || data.email || data.identifier, {
  message: "Укажите телефон, email или identifier для входа",
  path: ["phone"]
});

const twoFactorVerifySchema = z.object({
  code: z.string().min(6, 'Код должен содержать минимум 6 символов'),
});

const enableTwoFactorSchema = z.object({
  secret: z.string().min(1, 'Секретный ключ обязателен'),
  verificationCode: z.string().length(6, 'Код должен содержать 6 цифр'),
  backupCodes: z.array(z.string()),
});

// Создаем роутер
const authRouter = Router();

// Authentication routes
authRouter.post('/register', authLimiter, async (req, res) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    // Очищаем пустой email, заменяя на undefined
    if (validatedData.email === '') {
      validatedData.email = undefined;
    }
    console.log('Validated registration data:', validatedData);
    console.log('Attempting registration...');
    const result = await authService.register(validatedData as any);
    console.log('Registration successful for user:', result.user.id);
    
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    res.json({
      user: {
        id: result.user.id,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        email: result.user.email,
        phone: result.user.phone,
        role: result.user.role,
        isEmailVerified: result.user.isEmailVerified,
        isPhoneVerified: result.user.isPhoneVerified
      },
      accessToken: result.tokens.accessToken,
      message: 'Регистрация успешна'
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(400).json({ 
      message: error.message || 'Ошибка регистрации' 
    });
  }
});

authRouter.post('/login', authLimiter, async (req, res) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const { phone, email, identifier, password, twoFactorCode } = validatedData;
    // Используем phone, email или identifier как логин
    const loginIdentifier = phone || email || identifier;
    
    if (!loginIdentifier) {
      return res.status(400).json({ message: 'Укажите телефон, email или identifier для входа' });
    }
    
    // Первый этап - проверяем логин и пароль через UserService
    const authResult = await userService.verifyUserCredentials(loginIdentifier, password);
    
    // Формируем ответ в формате как раньше
    const loginResult = {
      user: authResult.user,
      tokens: {
        accessToken: authResult.token,
        refreshToken: 'mock_refresh_token' // TODO: добавить refresh token в UserService
      }
    };
    
    // Проверяем нужна ли 2FA
    const requiresTwoFactor = await twoFactorService.requiresTwoFactor(loginResult.user.id);
    
    if (requiresTwoFactor && !twoFactorCode) {
      // Возвращаем частичный ответ - нужен 2FA код
      return res.status(206).json({ 
        requiresTwoFactor: true,
        message: 'Требуется код двухфакторной аутентификации',
        partialToken: loginResult.tokens.accessToken // временный токен для 2FA
      });
    }
    
    if (requiresTwoFactor && twoFactorCode) {
      // Проверяем 2FA код
      const isValidTwoFactor = await twoFactorService.verifyTwoFactor(loginResult.user.id, twoFactorCode);
      if (!isValidTwoFactor) {
        return res.status(400).json({
          message: 'Неверный код двухфакторной аутентификации'
        });
      }
    }
    
    // Устанавливаем refresh token в cookie
    res.cookie('refreshToken', loginResult.tokens.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    res.json({
      user: {
        id: loginResult.user.id,
        firstName: loginResult.user.firstName,
        lastName: loginResult.user.lastName,
        email: loginResult.user.email,
        phone: loginResult.user.phone,
        role: loginResult.user.role,
        adminRole: loginResult.user.adminRole, // КРИТИЧНО для админ-панели
        isEmailVerified: loginResult.user.isEmailVerified,
        isPhoneVerified: loginResult.user.isPhoneVerified,
        isVerified: loginResult.user.isVerified,
        verificationLevel2: loginResult.user.verificationLevel2,
        verificationLevel3: loginResult.user.verificationLevel3,
        profileImageUrl: loginResult.user.profileImageUrl
      },
      accessToken: loginResult.tokens.accessToken,
      message: 'Успешный вход'
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(400).json({ 
      message: error.message || 'Ошибка авторизации' 
    });
  }
});

authRouter.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token отсутствует' });
    }

    const result = await authService.refreshToken(refreshToken);
    
    // Обновляем refresh token cookie
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    
    res.json({
      user: result.user,
      accessToken: result.tokens.accessToken
    });
  } catch (error: any) {
    console.error('Token refresh error:', error);
    res.status(401).json({ message: error.message || 'Ошибка обновления токена' });
  }
});

authRouter.post('/logout', (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ message: 'Успешный выход' });
});

// Проверка статуса авторизации
authRouter.get('/verify', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    res.json({
      user: {
        id: req.user.id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email,
        phone: req.user.phone,
        role: req.user.role,
        adminRole: req.user.adminRole, // КРИТИЧНО для админ-панели
        isEmailVerified: req.user.isEmailVerified,
        isPhoneVerified: req.user.isPhoneVerified,
        isVerified: req.user.isVerified,
        isEsiaVerified: req.user.isEsiaVerified,
        verificationLevel1: req.user.verificationLevel1,
        verificationLevel2: req.user.verificationLevel2,
        verificationLevel3: req.user.verificationLevel3,
        profileImageUrl: req.user.profileImageUrl,
        twoFactorEnabled: req.user.twoFactorEnabled
      }
    });
  } catch (error: any) {
    console.error('Verify error:', error);
    res.status(500).json({ message: 'Ошибка проверки пользователя' });
  }
});

// Mock Gosuslugi OAuth
authRouter.post('/gosuslugi', async (req, res) => {
  try {
    const { code } = req.body;
    // Mock implementation - в реальности здесь будет реальная интеграция с Госуслугами
    const mockUser = {
      id: 'gosuslugi_' + Math.random().toString(36).substr(2, 9),
      email: 'user@gosuslugi.ru',
      firstName: 'Иван',
      lastName: 'Иванов',
      phone: '+79999999999',
      role: 'personal',
      isEmailVerified: true,
      isPhoneVerified: true,
      isEsiaVerified: true
    };
    
    res.json({ user: mockUser, message: 'Успешная авторизация через Госуслуги' });
  } catch (error: any) {
    console.error('Gosuslugi auth error:', error);
    res.status(400).json({ message: error.message || 'Ошибка авторизации через Госуслуги' });
  }
});

// Two-Factor Authentication Routes
authRouter.post('/2fa/setup', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user.id;
    // Simplified 2FA setup - заглушка для тестирования
    const secret = 'MOCK_SECRET_' + userId;
    res.json({ secret, message: '2FA setup - временная заглушка' });
  } catch (error: any) {
    console.error('2FA setup error:', error);
    res.status(400).json({ message: error.message || 'Ошибка настройки 2FA' });
  }
});

authRouter.post('/2fa/enable', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { secret, verificationCode, backupCodes } = enableTwoFactorSchema.parse(req.body);
    const userId = req.user.id;
    
    await twoFactorService.enableTwoFactor(userId, secret, verificationCode, backupCodes);
    res.json({ message: 'Двухфакторная аутентификация включена' });
  } catch (error: any) {
    console.error('2FA enable error:', error);
    res.status(400).json({ message: error.message || 'Ошибка включения 2FA' });
  }
});

authRouter.post('/2fa/disable', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { code } = twoFactorVerifySchema.parse(req.body);
    const userId = req.user.id;
    
    await twoFactorService.disableTwoFactor(userId, code);
    res.json({ message: 'Двухфакторная аутентификация отключена' });
  } catch (error: any) {
    console.error('2FA disable error:', error);
    res.status(400).json({ message: error.message || 'Ошибка отключения 2FA' });
  }
});

authRouter.get('/2fa/status', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user.id;
    // Simplified 2FA status check
    const twoFactorEnabled = req.user.twoFactorEnabled || false;
    res.json({ twoFactorEnabled });
  } catch (error: any) {
    console.error('2FA status error:', error);
    res.status(400).json({ message: error.message || 'Ошибка проверки статуса 2FA' });
  }
});

authRouter.post('/sms/send', authLimiter, async (req, res) => {
  try {
    const { phone } = z.object({ phone: z.string() }).parse(req.body);
    // Генерируем случайный код для тестирования
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await smsService.sendVerificationCode(phone, code);
    res.json({ message: 'SMS код отправлен' });
  } catch (error: any) {
    console.error('SMS send error:', error);
    res.status(400).json({ message: error.message || 'Ошибка отправки SMS' });
  }
});

authRouter.post('/sms/verify', authLimiter, async (req, res) => {
  try {
    const { phone, code } = z.object({ 
      phone: z.string(), 
      code: z.string() 
    }).parse(req.body);
    
    // Simplified SMS verification - заглушка для тестирования
    const isValid = code === '123456'; // тестовый код
    if (!isValid) {
      return res.status(400).json({ message: 'Неверный SMS код' });
    }
    
    res.json({ message: 'SMS код подтвержден', verified: true });
  } catch (error: any) {
    console.error('SMS verify error:', error);
    res.status(400).json({ message: error.message || 'Ошибка проверки SMS кода' });
  }
});

// ESIA routes moved to dedicated module: server/routes/esia.ts

export default authRouter;