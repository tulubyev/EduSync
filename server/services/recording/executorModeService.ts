/**
 * ExecutorModeService — управляет режимом исполнения записей.
 *
 * Режим 'replit': встроенный pollerController опрашивает БД и запускает Playwright.
 * Режим 'vps': pollerController остановлен; внешний VPS-воркер опрашивает БД сам.
 *
 * Значение хранится в памяти (cache) и персистируется в таблице system_settings.
 * При запуске сервера режим читается из БД (или из env DISABLE_RECORDING_EXECUTOR).
 *
 * PM2-cluster safety:
 *   Runtime side effects (start/stop pollerController) выполняются только в primary
 *   процессе (pm_id === '0' или процесс запущен без PM2). Не-primary процессы пишут
 *   в БД; primary самостоятельно обнаруживает изменение через watchMode().
 *
 *   GET-запросы используют getMode() — авторитативное значение из БД — чтобы
 *   избежать несогласованности кэша между процессами.
 *
 * DISABLE_RECORDING_EXECUTOR=true жёстко фиксирует VPS-режим на уровне env и не
 *   может быть переопределён через БД ни при переключении, ни в watcher-е.
 */

import { db } from '../../db';
import { systemSettings } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { pollerController } from './pollerController';
import { logger } from '../logger';

export type ExecutorMode = 'replit' | 'vps';

const SETTING_KEY = 'executor_mode';

/** True если текущий процесс является первичным (единственным или PM2 primary). */
function isPrimary(): boolean {
  return !process.env.pm_id || process.env.pm_id === '0';
}

/** True если env принудительно фиксирует VPS-режим. */
function isEnvForcedVps(): boolean {
  return process.env.DISABLE_RECORDING_EXECUTOR === 'true';
}

class ExecutorModeService {
  private _mode: ExecutorMode = 'replit';
  private _initialized = false;
  private _watchTimer: ReturnType<typeof setInterval> | null = null;

  /** In-memory snapshot — используется только для быстрых проверок внутри процесса. */
  get mode(): ExecutorMode {
    return this._mode;
  }

  /**
   * Авторитетное значение режима — всегда читает из БД.
   * Используется в GET-эндпоинте чтобы избежать несогласованного кэша в multi-process.
   * Если env принудительно задаёт VPS — возвращает 'vps' без обращения к БД.
   */
  async getMode(): Promise<ExecutorMode> {
    if (isEnvForcedVps()) return 'vps';
    try {
      const rows = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, SETTING_KEY))
        .limit(1);
      if (rows.length > 0 && (rows[0].value === 'replit' || rows[0].value === 'vps')) {
        const dbMode = rows[0].value as ExecutorMode;
        // Sync in-memory cache for this process.
        this._mode = dbMode;
        return dbMode;
      }
    } catch {
      // fall through to in-memory value on transient DB error
    }
    return this._mode;
  }

  /**
   * Читает режим из БД при старте.
   * Если DISABLE_RECORDING_EXECUTOR=true — жёстко фиксирует 'vps', не читает БД.
   */
  async init(): Promise<ExecutorMode> {
    if (isEnvForcedVps()) {
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
   * Запускает периодическую проверку режима из БД (только в primary).
   * Если DISABLE_RECORDING_EXECUTOR=true — watcher не запускается: env-блокировка
   * имеет приоритет и не может быть переопределена ни из БД, ни из HTTP.
   */
  startWatching(intervalMs = 10_000): void {
    if (!isPrimary()) return;
    // Env-forced VPS cannot be overridden via DB — do not start watcher.
    if (isEnvForcedVps()) return;
    if (this._watchTimer) return;

    this._watchTimer = setInterval(async () => {
      try {
        const rows = await db
          .select()
          .from(systemSettings)
          .where(eq(systemSettings.key, SETTING_KEY))
          .limit(1);

        const dbMode: ExecutorMode =
          rows.length > 0 && (rows[0].value === 'replit' || rows[0].value === 'vps')
            ? (rows[0].value as ExecutorMode)
            : 'replit';

        if (dbMode !== this._mode) {
          logger.info(`[ExecutorMode] Watch detected mode change: ${this._mode} → ${dbMode}`);
          await this._applySideEffect(this._mode, dbMode);
          this._mode = dbMode;
        }
      } catch {
        // non-critical, try again next tick
      }
    }, intervalMs);
  }

  stopWatching(): void {
    if (this._watchTimer) {
      clearInterval(this._watchTimer);
      this._watchTimer = null;
    }
  }

  /**
   * Переключает режим.
   * Операция атомарна:
   *   1. Пишем в БД — если ошибка, возвращаем ok:false (in-memory не меняем).
   *   2. Если текущий процесс — primary: немедленно применяем side effect.
   *      Если side effect не удался — откатываем БД и возвращаем ok:false.
   *   3. Если текущий процесс — не primary: сохраняем в памяти как подсказку
   *      и возвращаем успех; primary применит изменение через watchMode().
   */
  async setMode(newMode: ExecutorMode): Promise<{ ok: boolean; message: string }> {
    if (isEnvForcedVps() && newMode === 'replit') {
      return {
        ok: false,
        message: 'Нельзя переключить в Replit: DISABLE_RECORDING_EXECUTOR=true в env',
      };
    }

    // Step 0: Read authoritative mode from DB to avoid stale per-process cache
    // triggering a false early-return in multi-process setups.
    const previous = await this.getMode();
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

    // Step 3: Apply side effect only in primary process.
    if (!isPrimary()) {
      logger.info(
        `[ExecutorMode] Non-primary process (pm_id=${process.env.pm_id}) wrote mode=${newMode} to DB; primary will apply side effect shortly.`,
      );
      return {
        ok: true,
        message: `Режим ${newMode} записан в БД. Основной процесс применит изменение в течение нескольких секунд.`,
      };
    }

    const result = await this._applySideEffect(previous, newMode);
    if (!result.ok) {
      // Side effect failed — rollback in-memory state and DB.
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
      logger.error(`[ExecutorMode] Side effect failed: ${result.message}. Rolled back to ${previous}.`);
      return { ok: false, message: result.message };
    }

    return { ok: true, message: result.message };
  }

  /**
   * Применяет side effect при изменении режима.
   * Всегда вызывается в primary-процессе.
   */
  private async _applySideEffect(
    previous: ExecutorMode,
    newMode: ExecutorMode,
  ): Promise<{ ok: boolean; message: string }> {
    if (newMode === 'vps' && previous === 'replit') {
      const result = pollerController.stop();
      logger.info(`[ExecutorMode] Switched to VPS — executor stopped: ${result.message}`);
      return { ok: true, message: `Переключено в VPS-режим. ${result.message}` };
    }

    if (newMode === 'replit' && previous === 'vps') {
      const result = await pollerController.start();
      if (!result.ok) {
        logger.error(`[ExecutorMode] pollerController.start() failed: ${result.message}`);
        return { ok: false, message: `Не удалось запустить исполнитель: ${result.message}` };
      }
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
