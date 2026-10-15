/**
 * EPA Recording Worker — standalone entry point.
 *
 * Запускается отдельно от основного веб-приложения.
 * Подключается к той же PostgreSQL БД, берёт задачи из recording_tasks,
 * пишет видео через Playwright + FFmpeg, загружает на Beget S3.
 *
 * Переменные окружения (минимум):
 *   DATABASE_URL              — PostgreSQL connection string
 *   BEGET_S3_ENDPOINT         — S3 endpoint
 *   BEGET_S3_ACCESS_KEY       — S3 access key
 *   BEGET_S3_SECRET_KEY       — S3 secret key
 *   BEGET_S3_BUCKET           — bucket name
 *   BEGET_S3_REGION           — region (default: ru-1)
 *   WORKER_ID                 — уникальный ID воркера (default: epa-worker-1)
 *   MAX_WORKERS               — кол-во параллельных записей (default: 1)
 *   RECORDINGS_DIR            — куда писать MP4 (default: /tmp/recordings)
 *
 * Запуск:
 *   npx tsx server/recording-worker.ts
 *   node --loader ts-node/esm server/recording-worker.ts
 *   (после сборки) node dist/recording-worker.js
 */

import { pollerController } from './services/recording/pollerController';
import { recordingTaskManager } from './services/recording/taskManager';
import { logger } from './services/logger';
import { executorConfig } from './services/recording/executor/config';

const SCHEDULER_INTERVAL_MS = 60_000;
const WATCHDOG_INTERVAL_MS  = 2 * 60_000;

async function main() {
  logger.info('═══════════════════════════════════════════════');
  logger.info('  EPA Recording Worker  v2.0');
  logger.info(`  Worker ID  : ${executorConfig.worker.id}`);
  logger.info(`  Max workers: ${executorConfig.worker.maxWorkers}`);
  logger.info(`  Output dir : ${executorConfig.recording.outputDir}`);
  logger.info(`  Poll every : ${executorConfig.worker.pollIntervalMs} ms`);
  logger.info('═══════════════════════════════════════════════');

  // ── Task scheduler: promoted 'scheduled' → 'ready' 5 min before start ──
  const runScheduler = async () => {
    try {
      const n = await recordingTaskManager.promoteScheduledTasks();
      if (n > 0) logger.info(`[scheduler] Promoted ${n} task(s) to ready`);
    } catch (e) {
      logger.error('[scheduler] Error:', e);
    }
  };
  await runScheduler();
  const schedulerTimer = setInterval(runScheduler, SCHEDULER_INTERVAL_MS);
  logger.info(`[scheduler] Started (every ${SCHEDULER_INTERVAL_MS / 1000}s)`);

  // ── Watchdog: auto-recover stale in_progress/uploading tasks ────────────
  const runWatchdog = async () => {
    try {
      const n = await recordingTaskManager.findAndAutoRecoverStaleTasks();
      if (n > 0) logger.info(`[watchdog] Auto-recovered ${n} stale task(s)`);
    } catch (e) {
      logger.error('[watchdog] Error:', e);
    }
  };
  const watchdogTimer = setInterval(runWatchdog, WATCHDOG_INTERVAL_MS);
  logger.info(`[watchdog] Started (every ${WATCHDOG_INTERVAL_MS / 1000}s)`);

  // ── Start executor pool ──────────────────────────────────────────────────
  const result = await pollerController.start();
  if (!result.ok) {
    logger.error(`Failed to start executor: ${result.message}`);
    process.exit(1);
  }
  logger.info(`[executor] ${result.message}`);

  // ── Graceful shutdown ────────────────────────────────────────────────────
  const shutdown = (signal: string) => {
    logger.info(`\n[worker] ${signal} received — shutting down...`);
    clearInterval(schedulerTimer);
    clearInterval(watchdogTimer);
    const { message } = pollerController.stop();
    logger.info(`[executor] ${message}`);
    logger.info('[worker] Shutdown complete. Bye.');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('uncaughtException', (err) => {
    logger.error('[worker] Uncaught exception:', err);
  });
  process.on('unhandledRejection', (reason) => {
    logger.error('[worker] Unhandled rejection:', reason);
  });

  logger.info('[worker] Ready. Waiting for tasks...');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
