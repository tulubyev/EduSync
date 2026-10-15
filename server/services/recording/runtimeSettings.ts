/**
 * Рабочие настройки записи, которые админ меняет из панели без перезапуска воркера.
 * Хранятся в system_settings; воркер перечитывает их каждые несколько секунд.
 *
 *  recording_paused         'true' | 'false'  — не брать новые задачи (текущие дописываются)
 *  recording_concurrency    число             — сколько записей одновременно (≤ MAX_WORKERS воркера)
 *  recording_per_user_limit число             — сколько записей одновременно у одного пользователя (0 = без лимита)
 */
import { eq, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { systemSettings } from '@shared/schema';

export const KEY_PAUSED = 'recording_paused';
export const KEY_CONCURRENCY = 'recording_concurrency';
export const KEY_PER_USER = 'recording_per_user_limit';

export const DEFAULT_PER_USER_LIMIT = 2;
export const HARD_MAX_CONCURRENCY = 8;

export interface RuntimeSettings {
  paused: boolean;
  /** Сколько записей одновременно разрешено; null — не задано, действует MAX_WORKERS */
  concurrency: number | null;
  /** 0 — без лимита */
  perUserLimit: number;
}

const CACHE_TTL_MS = 5_000;
let cache: { at: number; value: RuntimeSettings } | null = null;

function toInt(raw: string | undefined, fallback: number | null): number | null {
  if (raw === undefined) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export async function readRuntimeSettings(): Promise<RuntimeSettings> {
  const rows = await db
    .select()
    .from(systemSettings)
    .where(inArray(systemSettings.key, [KEY_PAUSED, KEY_CONCURRENCY, KEY_PER_USER]));
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    paused: map.get(KEY_PAUSED) === 'true',
    concurrency: toInt(map.get(KEY_CONCURRENCY), null),
    perUserLimit: toInt(map.get(KEY_PER_USER), DEFAULT_PER_USER_LIMIT) ?? DEFAULT_PER_USER_LIMIT,
  };
}

/** Для воркера: короткий кэш; при ошибке БД возвращает последнее известное значение (или безопасные значения по умолчанию). */
export async function getRuntimeSettings(): Promise<RuntimeSettings> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;
  try {
    const value = await readRuntimeSettings();
    cache = { at: Date.now(), value };
    return value;
  } catch {
    return cache?.value ?? { paused: false, concurrency: null, perUserLimit: DEFAULT_PER_USER_LIMIT };
  }
}

export function invalidateRuntimeSettingsCache(): void {
  cache = null;
}

async function upsert(key: string, value: string): Promise<void> {
  await db
    .insert(systemSettings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: systemSettings.key, set: { value, updatedAt: new Date() } });
}

export async function writeRuntimeSettings(patch: Partial<RuntimeSettings>): Promise<RuntimeSettings> {
  if (patch.paused !== undefined) await upsert(KEY_PAUSED, patch.paused ? 'true' : 'false');
  if (patch.concurrency !== undefined && patch.concurrency !== null) {
    const n = Math.max(1, Math.min(HARD_MAX_CONCURRENCY, Math.floor(patch.concurrency)));
    await upsert(KEY_CONCURRENCY, String(n));
  }
  if (patch.perUserLimit !== undefined) {
    const n = Math.max(0, Math.min(HARD_MAX_CONCURRENCY, Math.floor(patch.perUserLimit)));
    await upsert(KEY_PER_USER, String(n));
  }
  invalidateRuntimeSettingsCache();
  return readRuntimeSettings();
}

/** Слот воркера (1..N) из его ID вида 'vps-worker-2'. */
export function slotFromWorkerId(workerId: string): number {
  const m = /-(\d+)$/.exec(workerId);
  return m ? parseInt(m[1], 10) : 1;
}
