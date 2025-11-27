import jwt from "jsonwebtoken";
import { storage } from "../storage";
import { 
  AuthenticatedRequest, 
  OptionalAuthRequest,
  AsyncMiddleware,
  ErrorCodes
} from "./types";
import { 
  AuthenticationError, 
  asyncHandler 
} from "./errorHandler";

/**
 * Проверка JWT токена и получение пользователя
 */
const verifyToken = async (token: string) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AuthenticationError('JWT_SECRET не настроен', ErrorCodes.INTERNAL_SERVER_ERROR);
  }

  try {
    const decoded = jwt.verify(token, secret) as any;
    return decoded;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new AuthenticationError('Токен истек', ErrorCodes.TOKEN_EXPIRED);
    }
    if (error.name === 'JsonWebTokenError') {
      throw new AuthenticationError('Недействительный токен', ErrorCodes.TOKEN_INVALID);
    }
    throw new AuthenticationError('Ошибка верификации токена', ErrorCodes.TOKEN_INVALID);
  }
};

/**
 * Основной authentication middleware
 * Требует наличие валидного JWT токена
 */
export const authenticateToken: AsyncMiddleware<AuthenticatedRequest> = asyncHandler(
  async (req: AuthenticatedRequest, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      throw new AuthenticationError('Токен доступа отсутствует', ErrorCodes.TOKEN_MISSING);
    }

    // Верификация токена
    const decoded = await verifyToken(token);
    
    // Получаем актуальные данные пользователя
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      throw new AuthenticationError('Пользователь не найден', ErrorCodes.USER_NOT_FOUND);
    }

    // Добавляем пользователя в request
    req.user = user;
    req.isAuthenticated = () => true;

    next();
  }
);

/**
 * Опциональный authentication middleware
 * Не требует токена, но если есть - проверяет его
 */
export const optionalAuth: AsyncMiddleware<OptionalAuthRequest> = asyncHandler(
  async (req: OptionalAuthRequest, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = undefined;
      return next();
    }

    try {
      const decoded = await verifyToken(token);
      const user = await storage.getUser(decoded.userId);
      req.user = user || undefined;
    } catch (error) {
      // При опциональной аутентификации игнорируем ошибки токена
      req.user = undefined;
    }

    next();
  }
);