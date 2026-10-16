import { executorConfig } from './config';

/**
 * Лимит одновременных записей через браузер на одном воркере (процессе).
 * Браузерная запись дорогая (≈1–2 ядра и ~1 ГБ RAM), запись потока без браузера — дешёвая,
 * поэтому слотов воркера (MAX_WORKERS) может быть больше, чем браузеров.
 *
 *   MAX_BROWSER_RECORDINGS — по умолчанию равен MAX_WORKERS (как было раньше)
 */
const limit = Math.max(
  1,
  Math.min(
    executorConfig.worker.maxWorkers,
    parseInt(process.env.MAX_BROWSER_RECORDINGS || String(executorConfig.worker.maxWorkers), 10) || 1,
  ),
);
let inUse = 0;

export const browserSlots = {
  limit,
  get inUse() { return inUse; },
  available(): boolean { return inUse < limit; },
  /** Синхронно: между проверкой и захватом нет await, гонки между слотами одного процесса нет. */
  tryAcquire(): boolean {
    if (inUse >= limit) return false;
    inUse++;
    return true;
  },
  release(): void {
    if (inUse > 0) inUse--;
  },
};
