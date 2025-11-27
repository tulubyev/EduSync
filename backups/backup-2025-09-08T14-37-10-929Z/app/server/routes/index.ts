import { Router } from "express";
import { collectMetrics, createHelmet, createCors, cache, rateLimiters } from "../middleware";
import authRouter from "./auth.js";
import adminRouter from "./admin.js";
import documentsRouter from "./documents.js";
import verificationRouter from "./verification.js";
import banksRouter from "./banks.js";
import dashboardRouter from "./dashboard.js";
import profileRouter from "./profile.js";
import savingsBudgetsRouter from "./savings-budgets.js";
import aiRouter from "./ai.js";
import esiaRouter from "./esia.js";
import testRouter from "./test.js";

// Создаем главный роутер
const mainRouter = Router();

// Подключаем базовые middleware для всех routes  
mainRouter.use(collectMetrics());
mainRouter.use(createHelmet()); // безопасные security headers
mainRouter.use(createCors()); // CORS для cross-origin запросов

// Подключаем специализированные роутеры  
// Auth с rate limiting для безопасности (5 попыток за 15 минут)
mainRouter.use('/auth', rateLimiters.auth, authRouter);
mainRouter.use('/admin', adminRouter);
mainRouter.use('/documents', documentsRouter);
mainRouter.use('/verification', verificationRouter);
mainRouter.use('/banks', banksRouter);

// Dashboard с кэшированием для GET запросов (5 минут TTL)
mainRouter.use('/dashboard', cache({ ttl: 300000, cacheMethods: ['GET'] }), dashboardRouter);

mainRouter.use('/profile', profileRouter);
mainRouter.use('/', savingsBudgetsRouter);
mainRouter.use('/ai', aiRouter);
mainRouter.use('/auth/esia', esiaRouter);
mainRouter.use('/test', testRouter);

export default mainRouter;