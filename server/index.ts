import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { config, validateConfig } from "../config/environment";
import { logger } from "./services/logger";
import { yookassaService } from "./services/yookassaService";
import { PaymentFactory } from "./services/payments/paymentFactory";
import { courseDiscoveryService } from "./services/courseDiscoveryService";
import { recordingTaskManager, TaskPoller } from "./services/recording";

const app = express();
app.set('trust proxy', 1); // Trust first proxy for rate limiting
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: false, limit: '20mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Валидация конфигурации при запуске
  try {
    validateConfig();
  } catch (error) {
    logger.error('🚨 Ошибка валидации конфигурации:', error);
    process.exit(1);
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  server.listen({
    port: config.port,
    host: config.host,
    reusePort: true,
  }, () => {
    log(`serving on port ${config.port}`);
  });

  // Start background schedulers asynchronously (non-blocking)
  // Defer initialization by 30 seconds to allow server to start and pass health checks
  setTimeout(() => {
    logger.info('🚀 Starting background services...');

    // Start auto payment processing - runs once per day at 00:00 (midnight)
    const scheduleAutoPaymentProcessor = () => {
      const now = new Date();
      const nextRun = new Date(now);
      nextRun.setDate(nextRun.getDate() + 1);
      nextRun.setHours(0, 0, 0, 0);

      const timeUntilNextRun = nextRun.getTime() - now.getTime();

      const runProcessor = async () => {
        logger.info('Running daily auto payment processor for all providers...');

        const gateways = PaymentFactory.getReadyGateways();
        for (const gateway of gateways) {
          try {
            logger.info(`Processing auto payments for ${gateway.providerName}...`);
            await gateway.processAutoPayments();
          } catch (err) {
            logger.error(`Error in auto payment processor for ${gateway.providerName}:`, err);
          }
        }

        logger.info('Daily auto payment processor completed for all providers');
        setTimeout(runProcessor, 24 * 60 * 60 * 1000);
      };

      setTimeout(runProcessor, timeUntilNextRun);
      logger.info(`Auto payment processor scheduled to run daily at 00:00 (next run in ${Math.round(timeUntilNextRun / 1000 / 60)} minutes)`);
    };

    scheduleAutoPaymentProcessor();

    // Start course discovery scheduler - runs every Sunday at 02:00
    const scheduleCourseDiscovery = () => {
      const now = new Date();
      let nextRun = new Date(now);

      // Calculate next Sunday at 02:00
      const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
      nextRun.setDate(nextRun.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
      nextRun.setHours(2, 0, 0, 0);

      const timeUntilNextRun = nextRun.getTime() - now.getTime();

      const runDiscovery = async () => {
        try {
          logger.info('Running weekly course discovery...');
          const result = await courseDiscoveryService.discoverCourses(5);
          logger.info(`Course discovery completed: ${result.totalSaved} courses saved from ${result.platformsWithCourses} platforms`);

          if (result.errors.length > 0) {
            logger.warn(`Course discovery errors: ${JSON.stringify(result.errors)}`);
          }
        } catch (err) {
          logger.error('Error in course discovery scheduler:', err);
        }

        // Schedule next run in 7 days
        setTimeout(runDiscovery, 7 * 24 * 60 * 60 * 1000);
      };

      setTimeout(runDiscovery, timeUntilNextRun);
      logger.info(`Course discovery scheduler scheduled to run weekly on Sunday at 02:00 (next run in ${Math.round(timeUntilNextRun / 1000 / 60)} minutes)`);
    };

    scheduleCourseDiscovery();

    // Recording task scheduler — promotes 'scheduled' → 'ready' 5 min before start
    const runRecordingScheduler = async () => {
      try {
        const promoted = await recordingTaskManager.promoteScheduledTasks();
        if (promoted > 0) {
          logger.info(`Recording scheduler: promoted ${promoted} task(s) to ready`);
        }
      } catch (err) {
        logger.error('Error in recording task scheduler:', err);
      }
    };
    setInterval(runRecordingScheduler, 60 * 1000);
    runRecordingScheduler(); // run immediately on start
    logger.info('Recording task scheduler started (runs every 60s)');

    // Recording watchdog — auto-recovers stale in_progress/uploading tasks (no heartbeat > 12 min)
    const runRecordingWatchdog = async () => {
      try {
        const recovered = await recordingTaskManager.findAndAutoRecoverStaleTasks();
        if (recovered > 0) {
          logger.info(`Recording watchdog: auto-recovered ${recovered} stale task(s)`);
        }
      } catch (err) {
        logger.error('Error in recording watchdog:', err);
      }
    };
    setInterval(runRecordingWatchdog, 2 * 60 * 1000); // every 2 minutes
    runRecordingWatchdog(); // run immediately on start
    logger.info('Recording watchdog started (runs every 2 min, stale threshold: 12 min)');

    // Recording executor poller — runs only in primary process (PM2 cluster safe)
    const isPrimaryWorker = !process.env.pm_id || process.env.pm_id === '0';
    if (isPrimaryWorker) {
      const poller = new TaskPoller();
      poller.start().catch((err) => {
        logger.error('Recording executor poller crashed:', err);
      });
      logger.info(`Recording executor poller started (worker: ${process.env.WORKER_ID || 'epa-worker-1'})`);
    } else {
      logger.info(`Recording executor poller skipped on PM2 worker #${process.env.pm_id}`);
    }

  }, 30000); // Wait 30 seconds before starting background services
})();