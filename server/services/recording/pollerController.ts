import * as os from 'os';
import { TaskPoller } from './executor/taskPoller';
import { executorConfig } from './executor/config';
import { logger } from '../logger';

const RAM_PER_WORKER_MB = 600;

function logRamWarning(workerCount: number) {
  const totalMB = Math.round(os.totalmem() / 1024 / 1024);
  const freeMB  = Math.round(os.freemem()  / 1024 / 1024);
  const neededMB = workerCount * RAM_PER_WORKER_MB;
  logger.info(`[RAM] Всего: ${totalMB} МБ, Свободно: ${freeMB} МБ, Нужно для ${workerCount} воркер(ов): ~${neededMB} МБ`);
  if (freeMB < neededMB) {
    logger.warn(`[RAM] ⚠️  Недостаточно RAM для ${workerCount} воркеров! Свободно ${freeMB} МБ, нужно ~${neededMB} МБ. Возможны зависания.`);
  }
}

export type ExecutorState = 'running' | 'stopped' | 'starting' | 'stopping';

interface WorkerEntry {
  poller: TaskPoller;
  workerId: string;
  startedAt: Date;
  restartCount: number;
}

class PollerController {
  private workers: Map<string, WorkerEntry> = new Map();
  private state: ExecutorState = 'stopped';
  private globalStartedAt: Date | null = null;
  private globalStoppedAt: Date | null = null;
  private globalRestartCount = 0;

  private buildWorkerId(index: number): string {
    const base = executorConfig.worker.id; // e.g. 'epa-worker-1'
    const prefix = base.replace(/-\d+$/, '');  // 'epa-worker'
    return `${prefix}-${index}`;
  }

  getStatus() {
    const workers = Array.from(this.workers.values()).map((w) => ({
      workerId: w.workerId,
      startedAt: w.startedAt.toISOString(),
      restartCount: w.restartCount,
      browser: w.poller.getBrowserStatus(),
    }));
    return {
      state: this.state,
      isRunning: this.state === 'running',
      startedAt: this.globalStartedAt?.toISOString() ?? null,
      stoppedAt: this.globalStoppedAt?.toISOString() ?? null,
      restartCount: this.globalRestartCount,
      workerCount: this.workers.size,
      maxWorkers: executorConfig.worker.maxWorkers,
      workers,
    };
  }

  getBrowserStatus() {
    if (this.workers.size === 0) {
      return {
        browserAlive: false,
        pageAlive: false,
        currentUrl: null,
        isRecording: false,
        frameCount: 0,
        elapsedMs: null,
        taskId: null,
      };
    }
    // Return status of first active (recording) worker, or first worker
    const entries = Array.from(this.workers.values());
    for (const w of entries) {
      const s = w.poller.getBrowserStatus();
      if (s.isRecording) return s;
    }
    return entries[0].poller.getBrowserStatus();
  }

  getBrowserStatusAll(): Array<ReturnType<TaskPoller['getBrowserStatus']> & { workerId: string }> {
    return Array.from(this.workers.values()).map((w) => ({
      workerId: w.workerId,
      ...w.poller.getBrowserStatus(),
    }));
  }

  private launchWorker(workerId: string): WorkerEntry {
    const poller = new TaskPoller(workerId);
    const entry: WorkerEntry = { poller, workerId, startedAt: new Date(), restartCount: 1 };
    this.workers.set(workerId, entry);

    poller.start().catch((err) => {
      logger.error(`Worker ${workerId} crashed:`, err);
      this.workers.delete(workerId);
      if (this.workers.size === 0) {
        this.state = 'stopped';
        this.globalStoppedAt = new Date();
      }
    });

    logger.info(`Worker ${workerId} started`);
    return entry;
  }

  async start(count?: number): Promise<{ ok: boolean; message: string }> {
    const desired = count ?? executorConfig.worker.maxWorkers;

    if (this.state === 'running') {
      // Already running — scale up if needed
      const current = this.workers.size;
      if (current >= desired) {
        return { ok: false, message: `Уже запущено ${current} воркер(ов)` };
      }
      // Start additional workers
      const toAdd = desired - current;
      let added = 0;
      for (let i = 1; i <= desired && added < toAdd; i++) {
        const wid = this.buildWorkerId(i);
        if (!this.workers.has(wid)) {
          this.launchWorker(wid);
          added++;
        }
      }
      return { ok: true, message: `Запущено ${added} дополнительных воркеров. Итого: ${this.workers.size}` };
    }

    if (this.state === 'starting') {
      return { ok: false, message: 'Executor уже запускается' };
    }

    this.state = 'starting';
    logger.info(`Recording executor: starting ${desired} worker(s) by admin request...`);
    logRamWarning(desired);

    try {
      for (let i = 1; i <= desired; i++) {
        this.launchWorker(this.buildWorkerId(i));
      }

      this.state = 'running';
      this.globalStartedAt = new Date();
      this.globalStoppedAt = null;
      this.globalRestartCount++;

      logger.info(`Recording executor started (${desired} workers, restart #${this.globalRestartCount})`);
      return { ok: true, message: `Запущено ${desired} воркер(ов)` };
    } catch (err) {
      this.state = 'stopped';
      const message = err instanceof Error ? err.message : String(err);
      logger.error('Recording executor failed to start:', err);
      return { ok: false, message: `Ошибка запуска: ${message}` };
    }
  }

  async scaleUp(): Promise<{ ok: boolean; message: string }> {
    const max = executorConfig.worker.maxWorkers;
    const current = this.workers.size;
    if (current >= max) {
      return { ok: false, message: `Достигнут максимум воркеров (${max})` };
    }
    if (this.state !== 'running') {
      return this.start(1);
    }
    // Find next free slot
    logRamWarning(current + 1);
    for (let i = 1; i <= max + current; i++) {
      const wid = this.buildWorkerId(i);
      if (!this.workers.has(wid)) {
        this.launchWorker(wid);
        return { ok: true, message: `Воркер ${wid} запущен. Итого: ${this.workers.size}` };
      }
    }
    return { ok: false, message: 'Нет свободных слотов' };
  }

  stopWorker(workerId: string): { ok: boolean; message: string } {
    const entry = this.workers.get(workerId);
    if (!entry) {
      return { ok: false, message: `Воркер ${workerId} не найден` };
    }
    entry.poller.stop();
    this.workers.delete(workerId);
    logger.info(`Worker ${workerId} stopped by admin`);
    if (this.workers.size === 0) {
      this.state = 'stopped';
      this.globalStoppedAt = new Date();
    }
    return { ok: true, message: `Воркер ${workerId} остановлен` };
  }

  stop(): { ok: boolean; message: string } {
    if (this.state === 'stopped' || this.state === 'stopping') {
      return { ok: false, message: `Executor уже ${this.state === 'stopped' ? 'остановлен' : 'останавливается'}` };
    }

    this.state = 'stopping';
    logger.info('Recording executor: stopping all workers by admin request...');

    Array.from(this.workers.values()).forEach(entry => entry.poller.stop());
    this.workers.clear();

    this.state = 'stopped';
    this.globalStoppedAt = new Date();
    logger.info('Recording executor stopped (all workers)');
    return { ok: true, message: `Все воркеры остановлены` };
  }
}

export const pollerController = new PollerController();
