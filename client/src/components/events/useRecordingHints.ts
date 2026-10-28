import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_SCHEDULE_PREFS, recordingHints, type RecordingHint, type SchedulePrefs } from '@shared/recordingHints';
import { authService } from '@/services/authService';
import { resolveTimeZone, type TimeZoneChoice } from '../recording/timezones';
import type { LearningEventDto } from './eventsApi';

/**
 * Подсказки «вебинар в неудобное время — запишите» (#48) для списка событий.
 * Удобные и рабочие часы — из профиля (GET /api/profile/schedule, один запрос на вкладку);
 * «Не предлагать» для отдельного вебинара запоминается в браузере.
 */
const DISMISSED_KEY = 'recordingHints.dismissed';
const listeners = new Set<() => void>();
let prefs: SchedulePrefs | null = null;
let loading: Promise<void> | null = null;

const notify = () => listeners.forEach((fn) => fn());

function loadPrefs() {
  if (!loading) {
    loading = authService
      .authenticatedFetch('/api/profile/schedule')
      .then(async (r) => { prefs = r.ok ? await r.json() : DEFAULT_SCHEDULE_PREFS; })
      .catch(() => { prefs = DEFAULT_SCHEDULE_PREFS; })
      .finally(notify);
  }
  return loading;
}

/** Новые настройки после сохранения в «Настройках» — подсказки пересчитываются сразу */
export function setSchedulePrefs(next: SchedulePrefs) {
  prefs = next;
  notify();
}

function readDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function dismissHint(id: string) {
  const set = readDismissed();
  set.add(id);
  // храним последние 500 — список не растёт бесконечно
  try { localStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(set).slice(-500))); } catch { /* приватный режим */ }
  notify();
}

/** Ученик ответил «Не предлагать» или «Приду» для этого вебинара */
export const isHintDismissed = (id: string) => readDismissed().has(id);

export function useSchedulePrefs(): SchedulePrefs | null {
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    listeners.add(fn);
    loadPrefs();
    return () => { listeners.delete(fn); };
  }, []);
  return prefs;
}

export function useRecordingHints(events: LearningEventDto[], timeZone: TimeZoneChoice) {
  const current = useSchedulePrefs();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);

  const hints = useMemo(() => {
    if (!current) return new Map<string, RecordingHint>();
    const all = recordingHints(events, current, resolveTimeZone(timeZone));
    const dismissed = readDismissed();
    for (const id of Array.from(all.keys())) if (dismissed.has(id)) all.delete(id);
    return all;
  }, [events, current, timeZone, tick]);

  return { hints, dismiss: dismissHint };
}
