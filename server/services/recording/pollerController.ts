import { TaskPoller } from './executor/taskPoller';
import { logger } from '../logger';

export type ExecutorState = 'running' | 'stopped' | 'starting' | 'stopping';

class PollerController {
  private poller: TaskPoller | null = null;
  private state: ExecutorState = 'stopped';
  private startedAt: Date | null = null;
  private stoppedAt: Date | null = null;
  private restartCount = 0;

  getStatus() {
    return {
      state: this.state,
      isRunning: this.state === 'running',
      startedAt: this.startedAt?.toISOString() ?? null,
      stoppedAt: this.stoppedAt?.toISOString() ?? null,
      restartCount: this.restartCount,
      workerId: process.env.WORKER_ID || 'epa-worker-1',
    };
  }

  async start(): Promise<{ ok: boolean; message: string }> {
    if (this.state === 'running' || this.state === 'starting') {
      return { ok: false, message: `Executor уже ${this.state === 'running' ? 'запущен' : 'запускается'}` };
    }

    this.state = 'starting';
    logger.info('Recording executor: starting by admin request...');

    try {
      this.poller = new TaskPoller();
      this.state = 'running';
      this.startedAt = new Date();
      this.stoppedAt = null;
      this.restartCount++;

      // Запускаем асинхронно — поллер работает в бесконечном цикле
      this.poller.start().catch((err) => {
        logger.error('Recording executor crashed:', err);
        this.state = 'stopped';
        this.stoppedAt = new Date();
        this.poller = null;
      });

      logger.info(`Recording executor started (restart #${this.restartCount})`);
      return { ok: true, message: 'Executor запущен' };
    } catch (err) {
      this.state = 'stopped';
      this.poller = null;
      const message = err instanceof Error ? err.message : String(err);
      logger.error('Recording executor failed to start:', err);
      return { ok: false, message: `Ошибка запуска: ${message}` };
    }
  }

  stop(): { ok: boolean; message: string } {
    if (this.state === 'stopped' || this.state === 'stopping') {
      return { ok: false, message: `Executor уже ${this.state === 'stopped' ? 'остановлен' : 'останавливается'}` };
    }

    this.state = 'stopping';
    logger.info('Recording executor: stopping by admin request...');

    if (this.poller) {
      this.poller.stop();
      this.poller = null;
    }

    this.state = 'stopped';
    this.stoppedAt = new Date();
    logger.info('Recording executor stopped');
    return { ok: true, message: 'Executor остановлен' };
  }
}

// Singleton — единственный экземпляр на процесс
export const pollerController = new PollerController();
