/**
 * ExecutorModeService — управляет режимом исполнения записей.
 *
 * Режим 'replit': встроенный pollerController опрашивает БД и запускает Playwright.
 * Режим 'vps': pollerController остановлен; внешний VPS-воркер опрашивает БД сам.
 *
 * Значение хранится в памяти (cache) и персистируется в таблице system_settings.
 * При запуске сервера режим читается из БД (или из env DISABLE_RECORDING_EXECUTOR).
 */

import { db } from '../../db';
import { systemSettings } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { pollerController } from './pollerController';
import { logger } from '../logger';

export type ExecutorMode = 'replit' | 'vps';

const SETTING_KEY = 'executor_mode';

class ExecutorModeService {
  private _mode: ExecutorMode = 'replit';
  private _initialized = false;

  get mode(): ExecutorMode {
    return this._mode;
  }

  /**
   * Читает режим из БД при старте.
   * Если DISABLE_RECORDING_EXECUTOR=true — всегда vps, независимо от БД.
   */
  async init(): Promise<ExecutorMode> {
    if (process.env.DISABLE_RECORDING_EXECUTOR === 'true') {
      this._mode = 'vps';
      this._initialized = true;
      logger.info('[ExecutorMode] Init: vps (env DISABLE_RECORDING_EXECUTOR=true)');
      return this._mode;
    }

    try {
      const rows = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, SETTING_KEY))
        .limit(1);

      if (rows.length > 0 && (rows[0].value === 'replit' || rows[0].value === 'vps')) {
        this._mode = rows[0].value as ExecutorMode;
      } else {
        this._mode = 'replit';
      }
    } catch {
      this._mode = 'replit';
    }

    this._initialized = true;
    logger.info(`[ExecutorMode] Init: ${this._mode}`);
    return this._mode;
  }

  /**
   * Переключает режим.
   * Операция транзакционна по смыслу:
   *   1. Пишем в БД — если ошибка, возвращаем ok:false (in-memory не меняем).
   *   2. Применяем side effect (старт/стоп pollerController).
   *      Если side effect не удался — возвращаем ok:false, откатываем БД к предыдущему значению.
   * 'replit' → запускает pollerController
   * 'vps'    → останавливает pollerController
   */
  async setMode(newMode: ExecutorMode): Promise<{ ok: boolean; message: string }> {
    if (process.env.DISABLE_RECORDING_EXECUTOR === 'true' && newMode === 'replit') {
      return {
        ok: false,
        message: 'Нельзя переключить в Replit: DISABLE_RECORDING_EXECUTOR=true в env',
      };
    }

    const previous = this._mode;
    if (previous === newMode) {
      return { ok: true, message: `Режим уже ${newMode}` };
    }

    // Step 1: Persist to DB first. If it fails — abort without changing memory state.
    try {
      await db
        .insert(systemSettings)
        .values({ key: SETTING_KEY, value: newMode, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: systemSettings.key,
          set: { value: newMode, updatedAt: new Date() },
        });
    } catch (e) {
      logger.error('[ExecutorMode] Failed to persist mode to DB — aborting switch:', e);
      return {
        ok: false,
        message: 'Ошибка сохранения режима в БД. Переключение отменено.',
      };
    }

    // Step 2: Update in-memory state.
    this._mode = newMode;

    // Step 3: Apply runtime side effect.
    if (newMode === 'vps') {
      const result = pollerController.stop();
      logger.info(`[ExecutorMode] Switched to VPS — executor stopped: ${result.message}`);
      return { ok: true, message: `Переключено в VPS-режим. ${result.message}` };
    }

    // newMode === 'replit'
    const result = await pollerController.start();
    if (!result.ok) {
      // Executor failed to start — rollback in-memory state and DB.
      this._mode = previous;
      try {
        await db
          .insert(systemSettings)
          .values({ key: SETTING_KEY, value: previous, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: systemSettings.key,
            set: { value: previous, updatedAt: new Date() },
          });
      } catch (rollbackErr) {
        logger.error('[ExecutorMode] Rollback DB write also failed:', rollbackErr);
      }
      logger.error(`[ExecutorMode] pollerController.start() failed: ${result.message}. Rolled back to ${previous}.`);
      return {
        ok: false,
        message: `Не удалось запустить исполнитель: ${result.message}`,
      };
    }

    logger.info(`[ExecutorMode] Switched to Replit — executor started: ${result.message}`);
    return { ok: true, message: `Переключено в Replit-режим. ${result.message}` };
  }

  isInitialized(): boolean {
    return this._initialized;
  }
}

export const executorModeService = new ExecutorModeService();
