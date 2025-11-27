import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { 
  AsyncMiddleware, 
  ErrorCodes,
  HttpStatus,
  RequestLogEntry
} from './types';
import { AppError, asyncHandler } from './errorHandler';

// ===========================================
// SECURITY MIDDLEWARE СИСТЕМА
// ===========================================

/**
 * Конфигурация rate limiting
 */
export interface RateLimitConfig {
  windowMs: number; // время окна в миллисекундах
  max: number; // максимум запросов за окно
  message?: string; // кастомное сообщение
  standardHeaders?: boolean; // отправлять rate limit info в headers
  legacyHeaders?: boolean; // поддержка старых headers
  skipSuccessfulRequests?: boolean; // не считать успешные запросы
  skipFailedRequests?: boolean; // не считать неудачные запросы
  keyGenerator?: (req: Request) => string; // функция генерации ключа
  skip?: (req: Request) => boolean; // функция пропуска
}

/**
 * Конфигурация CORS
 */
export interface CorsConfig {
  origin?: string | string[] | boolean | ((origin: string | undefined, callback: Function) => void);
  credentials?: boolean;
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  maxAge?: number;
  preflightContinue?: boolean;
  optionsSuccessStatus?: number;
}

/**
 * Конфигурация Helmet (безопасность headers)
 */
export interface HelmetConfig {
  contentSecurityPolicy?: boolean | object;
  crossOriginEmbedderPolicy?: boolean | object;
  crossOriginOpenerPolicy?: boolean | object;
  crossOriginResourcePolicy?: boolean | object;
  dnsPrefetchControl?: boolean | object;
  frameguard?: boolean | object;
  hidePoweredBy?: boolean | object;
  hsts?: boolean | object;
  ieNoOpen?: boolean | object;
  noSniff?: boolean | object;
  originAgentCluster?: boolean | object;
  permittedCrossDomainPolicies?: boolean | object;
  referrerPolicy?: boolean | object;
  xssFilter?: boolean | object;
}

// ===========================================
// RATE LIMITING MIDDLEWARE
// ===========================================

/**
 * Создание rate limiter с конфигурацией
 */
export const createRateLimit = (config: RateLimitConfig) => {
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    message: {
      error: config.message || 'Слишком много запросов. Попробуйте позже.',
      errorCode: ErrorCodes.TOO_MANY_REQUESTS,
      retryAfter: Math.ceil(config.windowMs / 1000)
    },
    standardHeaders: config.standardHeaders ?? true,
    legacyHeaders: config.legacyHeaders ?? false,
    skipSuccessfulRequests: config.skipSuccessfulRequests ?? false,
    skipFailedRequests: config.skipFailedRequests ?? false,
    keyGenerator: config.keyGenerator || ((req: Request) => req.ip || 'unknown'),
    skip: config.skip || (() => false),
    handler: (req: Request, res: Response) => {
      const retryAfter = Math.ceil(config.windowMs / 1000);
      res.status(HttpStatus.TOO_MANY_REQUESTS).json({
        success: false,
        error: {
          message: config.message || 'Слишком много запросов. Попробуйте позже.',
          errorCode: ErrorCodes.TOO_MANY_REQUESTS,
          status: HttpStatus.TOO_MANY_REQUESTS,
          retryAfter,
          timestamp: new Date().toISOString(),
          path: req.path,
          method: req.method
        }
      });
    }
  });
};

/**
 * Предустановленные rate limiters
 */
export const rateLimiters = {
  // Общий лимит для API
  general: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 1000, // 1000 запросов за 15 минут
    message: 'Слишком много запросов. Максимум 1000 запросов за 15 минут.'
  }),

  // Строгий лимит для auth endpoints
  auth: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 5, // 5 попыток за 15 минут
    message: 'Слишком много попыток входа. Попробуйте через 15 минут.',
    skipSuccessfulRequests: true
  }),

  // Лимит для API с высокой нагрузкой
  strict: createRateLimit({
    windowMs: 1 * 60 * 1000, // 1 минута
    max: 30, // 30 запросов за минуту
    message: 'Превышен лимит запросов. Максимум 30 запросов в минуту.'
  }),

  // Мягкий лимит для обычных операций
  moderate: createRateLimit({
    windowMs: 1 * 60 * 1000, // 1 минута
    max: 100, // 100 запросов за минуту
    message: 'Превышен лимит запросов. Максимум 100 запросов в минуту.'
  }),

  // Лимит для upload операций
  upload: createRateLimit({
    windowMs: 1 * 60 * 1000, // 1 минута
    max: 10, // 10 загрузок за минуту
    message: 'Слишком много загрузок. Максимум 10 файлов в минуту.'
  })
};

// ===========================================
// CORS MIDDLEWARE
// ===========================================

/**
 * Создание CORS middleware с конфигурацией
 */
export const createCors = (config?: CorsConfig) => {
  const defaultConfig: CorsConfig = {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL?.split(',') || false
      : true, // в dev режиме разрешаем все
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With', 
      'Content-Type',
      'Accept',
      'Authorization',
      'X-API-Key',
      'X-Request-ID'
    ],
    exposedHeaders: [
      'X-Total-Count',
      'X-Page-Count', 
      'X-Rate-Limit-Limit',
      'X-Rate-Limit-Remaining',
      'X-Rate-Limit-Reset'
    ],
    maxAge: 86400, // 24 часа
    optionsSuccessStatus: 200
  };

  // Простая реализация CORS middleware
  return (req: Request, res: Response, next: NextFunction) => {
    const mergedConfig = { ...defaultConfig, ...config };
    
    // Установка CORS headers
    if (mergedConfig.origin === true) {
      res.header('Access-Control-Allow-Origin', '*');
    } else if (typeof mergedConfig.origin === 'string') {
      res.header('Access-Control-Allow-Origin', mergedConfig.origin);
    } else if (Array.isArray(mergedConfig.origin)) {
      const requestOrigin = req.header('Origin');
      if (requestOrigin && mergedConfig.origin.includes(requestOrigin)) {
        res.header('Access-Control-Allow-Origin', requestOrigin);
      }
    }

    if (mergedConfig.credentials) {
      res.header('Access-Control-Allow-Credentials', 'true');
    }

    if (mergedConfig.methods) {
      res.header('Access-Control-Allow-Methods', mergedConfig.methods.join(', '));
    }

    if (mergedConfig.allowedHeaders) {
      res.header('Access-Control-Allow-Headers', mergedConfig.allowedHeaders.join(', '));
    }

    if (mergedConfig.exposedHeaders) {
      res.header('Access-Control-Expose-Headers', mergedConfig.exposedHeaders.join(', '));
    }

    if (mergedConfig.maxAge) {
      res.header('Access-Control-Max-Age', mergedConfig.maxAge.toString());
    }

    // Обработка preflight OPTIONS запросов
    if (req.method === 'OPTIONS') {
      return res.status(mergedConfig.optionsSuccessStatus || 200).end();
    }

    next();
  };
};

// ===========================================
// HELMET MIDDLEWARE (Security Headers)
// ===========================================

/**
 * Создание Helmet middleware с конфигурацией
 */
export const createHelmet = (config?: HelmetConfig) => {
  const defaultConfig: HelmetConfig = {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", "https://api.openai.com", "https://api.sberbank.ru"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false, // отключено для совместимости
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    frameguard: { action: 'deny' },
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  };

  return helmet(defaultConfig);
};

// ===========================================
// IP & GEOGRAPHIC RESTRICTIONS
// ===========================================

/**
 * Блокировка IP адресов
 */
export const blockIPs = (blockedIPs: string[]) => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress || '';
    
    if (blockedIPs.includes(clientIP)) {
      throw new AppError(
        'Доступ запрещен с данного IP адреса',
        ErrorCodes.ACCESS_DENIED,
        HttpStatus.FORBIDDEN
      );
    }

    next();
  });
};

/**
 * Разрешение только определенных IP адресов
 */
export const allowOnlyIPs = (allowedIPs: string[]) => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress || '';
    
    if (!allowedIPs.includes(clientIP)) {
      throw new AppError(
        'Доступ разрешен только с авторизованных IP адресов',
        ErrorCodes.ACCESS_DENIED,
        HttpStatus.FORBIDDEN
      );
    }

    next();
  });
};

/**
 * Проверка User-Agent для блокировки ботов
 */
export const blockBots = (options: {
  blockedUserAgents?: string[];
  allowOnlyBrowsers?: boolean;
  requireUserAgent?: boolean;
} = {}) => {
  const { 
    blockedUserAgents = [],
    allowOnlyBrowsers = false,
    requireUserAgent = true 
  } = options;

  const botPatterns = [
    /bot/i, /spider/i, /crawler/i, /scraper/i, /harvester/i,
    /curl/i, /wget/i, /python/i, /java/i, /php/i
  ];

  const browserPatterns = [
    /Mozilla/i, /Chrome/i, /Safari/i, /Firefox/i, /Edge/i, /Opera/i
  ];

  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userAgent = req.get('user-agent') || '';

    // Проверка обязательности User-Agent
    if (requireUserAgent && !userAgent) {
      throw new AppError(
        'User-Agent header обязателен',
        ErrorCodes.VALIDATION_ERROR,
        HttpStatus.BAD_REQUEST
      );
    }

    // Проверка заблокированных User-Agent
    if (blockedUserAgents.some(blocked => userAgent.includes(blocked))) {
      throw new AppError(
        'Доступ запрещен для данного User-Agent',
        ErrorCodes.ACCESS_DENIED,
        HttpStatus.FORBIDDEN
      );
    }

    // Проверка ботов
    if (botPatterns.some(pattern => pattern.test(userAgent))) {
      throw new AppError(
        'Доступ запрещен для автоматических запросов',
        ErrorCodes.ACCESS_DENIED,
        HttpStatus.FORBIDDEN
      );
    }

    // Проверка браузеров (если включено)
    if (allowOnlyBrowsers && !browserPatterns.some(pattern => pattern.test(userAgent))) {
      throw new AppError(
        'Доступ разрешен только из браузеров',
        ErrorCodes.ACCESS_DENIED,
        HttpStatus.FORBIDDEN
      );
    }

    next();
  });
};

// ===========================================
// COMPOSITE SECURITY MIDDLEWARE
// ===========================================

/**
 * Базовая безопасность для всех routes
 */
export const basicSecurity = [
  createHelmet(),
  createCors()
];

/**
 * Усиленная безопасность для критичных endpoints
 */
export const strictSecurity = [
  createHelmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'none'"],
        frameSrc: ["'none'"],
      },
    },
  }),
  createCors({
    origin: false, // блокируем все cross-origin запросы
    credentials: false
  }),
  rateLimiters.strict,
  blockBots({ allowOnlyBrowsers: true })
];

/**
 * Middleware для API endpoints
 */
export const apiSecurity = [
  createHelmet({
    contentSecurityPolicy: false // отключаем CSP для API
  }),
  createCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || true
  }),
  rateLimiters.moderate
];

/**
 * Middleware для публичных endpoints
 */
export const publicSecurity = [
  createHelmet(),
  createCors(),
  rateLimiters.general
];

// ===========================================
// MONITORING & ANALYTICS
// ===========================================

/**
 * Сбор метрик безопасности
 */
export const securityMetrics = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    // Логируем подозрительную активность
    const suspiciousPatterns = [
      /\.\./,  // path traversal
      /<script/i, // XSS attempts  
      /union.*select/i, // SQL injection
      /exec|eval|system/i, // code injection
    ];

    const fullUrl = req.originalUrl || req.url;
    const userAgent = req.get('user-agent') || '';
    
    if (suspiciousPatterns.some(pattern => 
      pattern.test(fullUrl) || pattern.test(userAgent)
    )) {
      console.warn('🚨 Подозрительная активность:', {
        ip: req.ip,
        userAgent,
        url: fullUrl,
        timestamp: new Date().toISOString()
      });
    }

    // Продолжаем обработку
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      
      // Логируем медленные запросы
      if (responseTime > 5000) {
        console.warn('🐌 Медленный запрос:', {
          method: req.method,
          url: fullUrl,
          responseTime: `${responseTime}ms`,
          statusCode: res.statusCode
        });
      }
    });

    next();
  }
);