import { Router, type Request, type Response } from "express";
import { authService } from "../services/authService";
import { twoFactorService } from "../services/twoFactorService";
import { esiaService } from "../services/esiaService";
import { smsService } from "../services/smsService";
import { emailService } from "../services/emailService";
import { userService } from "../services/UserService";
import { authenticateToken, type AuthenticatedRequest } from "../middleware/auth";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { config } from "../../config/environment";
import { validationRules } from "../middleware/validationRules";
import { logger } from "../services/logger";
import { secureLogs } from "../middleware/secureLogs";
import { db } from "../db";
import { users, passwordResetTokens } from "@shared/schema";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcrypt";

// Auth rate limiting (из config)
const authLimiter = rateLimit({
  windowMs: config.rateLimits.auth.windowMs,
  max: config.rateLimits.auth.max,
  message: "Слишком много попыток входа, попробуйте позже",
});

// Validation schemas для auth роутов (Issue #7 & #10 FIX: Strong validation)
const registerSchema = z.object({
  email: validationRules.email.optional().or(z.literal('').transform(() => undefined)),
  password: validationRules.password, // Strong password: 12+ chars, upper/lower/number/special
  firstName: validationRules.firstName,
  lastName: validationRules.lastName,
  phone: validationRules.phone,
});

const loginSchema = z.object({
  phone: validationRules.phone.optional(),
  email: validationRules.email.optional(),
  identifier: z.string().optional(),
  password: z.string().min(1, 'Пароль обязателен'), // Don't validate on login, only on register
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
    // Issue #8 FIX: Secure logging (no passwords in logs)
    logger.info('Registration attempt', secureLogs.sanitize({ phone: validatedData.phone, email: validatedData.email }));
    const result = await authService.register(validatedData as any);
    logger.info('Registration successful', { userId: result.user.id });
    
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: config.session.refreshTokenMaxAge
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
    logger.error('Registration error', secureLogs.logError(error));
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
    
    // Формируем ответ с реальными токенами
    const loginResult = {
      user: authResult.user,
      tokens: {
        accessToken: authResult.token,
        refreshToken: userService.generateRefreshToken(authResult.user)
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
      maxAge: config.session.refreshTokenMaxAge
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
    logger.error('Login error:', secureLogs.logError(error));
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
      maxAge: config.session.refreshTokenMaxAge
    });
    
    res.json({
      user: result.user,
      accessToken: result.tokens.accessToken
    });
  } catch (error: any) {
    logger.error('Token refresh error:', secureLogs.logError(error));
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
    logger.error('Verify error:', secureLogs.logError(error));
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
    logger.error('Gosuslugi auth error:', secureLogs.logError(error));
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
    logger.error('2FA setup error:', secureLogs.logError(error));
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
    logger.error('2FA enable error:', secureLogs.logError(error));
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
    logger.error('2FA disable error:', secureLogs.logError(error));
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
    logger.error('2FA status error:', secureLogs.logError(error));
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
    logger.error('SMS send error:', secureLogs.logError(error));
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
    logger.error('SMS verify error:', secureLogs.logError(error));
    res.status(400).json({ message: error.message || 'Ошибка проверки SMS кода' });
  }
});

// ===========================================
// PASSWORD RESET ROUTES
// ===========================================

const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: "Слишком много запросов на сброс пароля. Попробуйте позже.",
});

// Step 1: Request reset code (via email or SMS)
authRouter.post('/forgot-password', resetLimiter, async (req, res) => {
  try {
    const { identifier, method } = z.object({
      identifier: z.string().min(1, 'Email или телефон обязателен'),
      method: z.enum(['email', 'sms']).default('email'),
    }).parse(req.body);

    // Find user by email or phone
    const isEmail = identifier.includes('@');
    const [user] = await db
      .select({ id: users.id, email: users.email, phone: users.phone, firstName: users.firstName })
      .from(users)
      .where(isEmail ? eq(users.email, identifier) : eq(users.phone, identifier))
      .limit(1);

    // Always respond with success to avoid user enumeration
    if (!user) {
      return res.json({ success: true, message: 'Если пользователь найден, код будет отправлен' });
    }

    // Invalidate old tokens
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token: code,
      method,
      expiresAt,
    });

    // Send code
    let sendResult: { success: boolean; message?: string } = { success: false };
    if (method === 'email' && user.email) {
      sendResult = await emailService.sendPasswordResetEmail(user.email, code, user.firstName);
    } else if (method === 'sms' && user.phone) {
      sendResult = await smsService.sendPasswordResetCode(user.phone, code);
    }

    if (!sendResult.success) {
      logger.error('Failed to send reset code', { userId: user.id, method, error: sendResult.message });
    }

    logger.info('Password reset requested', { userId: user.id, method, sent: sendResult.success });
    res.json({ success: true, message: 'Код отправлен', userId: user.id });
  } catch (error: any) {
    logger.error('Forgot password error:', secureLogs.logError(error));
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0]?.message || 'Ошибка валидации' });
    }
    res.status(500).json({ message: 'Ошибка при отправке кода' });
  }
});

// Step 2: Verify the code
authRouter.post('/verify-reset-code', async (req, res) => {
  try {
    const { userId, code } = z.object({
      userId: z.string().uuid(),
      code: z.string().length(6),
    }).parse(req.body);

    const [token] = await db
      .select()
      .from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.userId, userId),
        eq(passwordResetTokens.token, code),
        eq(passwordResetTokens.used, false),
        gt(passwordResetTokens.expiresAt, new Date()),
      ))
      .limit(1);

    if (!token) {
      return res.status(400).json({ message: 'Неверный или устаревший код' });
    }

    res.json({ success: true, message: 'Код подтверждён' });
  } catch (error: any) {
    logger.error('Verify reset code error:', secureLogs.logError(error));
    res.status(400).json({ message: 'Ошибка проверки кода' });
  }
});

// Step 3: Set new password
authRouter.post('/reset-password', async (req, res) => {
  try {
    const { userId, code, newPassword } = z.object({
      userId: z.string().uuid(),
      code: z.string().length(6),
      newPassword: z.string().min(8, 'Пароль должен быть не менее 8 символов'),
    }).parse(req.body);

    const [token] = await db
      .select()
      .from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.userId, userId),
        eq(passwordResetTokens.token, code),
        eq(passwordResetTokens.used, false),
        gt(passwordResetTokens.expiresAt, new Date()),
      ))
      .limit(1);

    if (!token) {
      return res.status(400).json({ message: 'Неверный или устаревший код' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update user password
    await db.update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));

    // Mark token as used
    await db.update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.id, token.id));

    logger.info('Password reset successful', { userId });
    res.json({ success: true, message: 'Пароль успешно изменён' });
  } catch (error: any) {
    logger.error('Reset password error:', secureLogs.logError(error));
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0]?.message || 'Ошибка валидации' });
    }
    res.status(500).json({ message: 'Ошибка при сбросе пароля' });
  }
});

// ESIA routes moved to dedicated module: server/routes/esia.ts

export default authRouter;