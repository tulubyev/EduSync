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
    this._mode = newMode;

    // Persist to DB
    try {
      await db
        .insert(systemSettings)
        .values({ key: SETTING_KEY, value: newMode, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: systemSettings.key,
          set: { value: newMode, updatedAt: new Date() },
        });
    } catch (e) {
      logger.error('[ExecutorMode] Failed to persist mode to DB:', e);
    }

    // Apply side effect
    if (newMode === 'vps' && previous === 'replit') {
      const result = pollerController.stop();
      logger.info(`[ExecutorMode] Switched to VPS — executor stopped: ${result.message}`);
      return { ok: true, message: `Переключено в VPS-режим. ${result.message}` };
    }

    if (newMode === 'replit' && previous === 'vps') {
      const result = await pollerController.start();
      logger.info(`[ExecutorMode] Switched to Replit — executor started: ${result.message}`);
      return { ok: true, message: `Переключено в Replit-режим. ${result.message}` };
    }

    return { ok: true, message: `Режим уже ${newMode}` };
  }

  isInitialized(): boolean {
    return this._initialized;
  }
}

export const executorModeService = new ExecutorModeService();
