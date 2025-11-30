import { Router } from "express";
import { collectMetrics, createHelmet, createCors, cache, rateLimiters } from "../middleware";
import { queryOptimizationMiddleware } from "../middleware/queryOptimization";
import { config } from "../../config/environment";
import authRouter from "./auth.js";
import adminRouter from "./admin.js";
import profileRouter from "./profile.js";
import configRouter from "./config.js";
import coursesRouter from "./courses.js";
import deadlinesRouter from "./deadlines.js";
import notesRouter from "./notes.js";
import platformsRouter from "./platforms.js";

const mainRouter = Router();

mainRouter.use(collectMetrics());
mainRouter.use(createHelmet());
mainRouter.use(createCors());
mainRouter.use(queryOptimizationMiddleware);

mainRouter.use('/auth', rateLimiters.auth, authRouter);
mainRouter.use('/admin', rateLimiters.auth, adminRouter);
mainRouter.use('/config', rateLimiters.general, configRouter);
mainRouter.use('/profile', rateLimiters.general, profileRouter);

mainRouter.use('/courses', rateLimiters.general, coursesRouter);
mainRouter.use('/deadlines', rateLimiters.general, deadlinesRouter);
mainRouter.use('/notes', rateLimiters.general, notesRouter);
mainRouter.use('/platforms', rateLimiters.general, platformsRouter);

export default mainRouter;