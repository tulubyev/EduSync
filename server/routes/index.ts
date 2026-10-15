import { Router } from "express";
import { collectMetrics, createHelmet, createCors, rateLimiters } from "../middleware";
import { queryOptimizationMiddleware } from "../middleware/queryOptimization";
import authRouter from "./auth.js";
import profileRouter from "./profile.js";
import configRouter from "./config.js";
import coursesRouter from "./courses.js";
import deadlinesRouter from "./deadlines.js";
import libraryRouter from "./library.js";
import platformsRouter from "./platforms.js";
import usersRouter from "./users.js";
import adminRouter from "./admin.js";
import subscriptionsRouter from "./subscriptions.js";
import stepikRouter from "./stepik.js";
import recordingRouter from "./recording.js";
import aiRouter from "./ai.js";

const mainRouter = Router();

mainRouter.use(collectMetrics());
mainRouter.use(createHelmet());
mainRouter.use(createCors());
mainRouter.use(queryOptimizationMiddleware);

mainRouter.use('/auth', rateLimiters.auth, authRouter);
mainRouter.use('/config', rateLimiters.general, configRouter);
mainRouter.use('/profile', rateLimiters.general, profileRouter);
mainRouter.use('/users', rateLimiters.general, usersRouter);

mainRouter.use('/courses', rateLimiters.general, coursesRouter);
mainRouter.use('/deadlines', rateLimiters.general, deadlinesRouter);
mainRouter.use('/library', rateLimiters.general, libraryRouter);
mainRouter.use('/recording', rateLimiters.general, recordingRouter);
mainRouter.use('/platforms', rateLimiters.general, platformsRouter);

mainRouter.use('/admin', rateLimiters.general, adminRouter);
mainRouter.use('/subscriptions', rateLimiters.general, subscriptionsRouter);
mainRouter.use('/stepik', rateLimiters.general, stepikRouter);
// ИИ-помощник: платные вызовы OpenRouter — жёсткий лимит запросов
mainRouter.use('/ai', rateLimiters.strict, aiRouter);

export default mainRouter;