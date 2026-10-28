/**
 * Подсказка «вебинар в неудобное время — запишите его» (#48).
 * Чистые правила без базы и интерфейса: на входе вебинар, остальные события ученика, его удобные и рабочие часы
 * и часовой пояс; на выходе причина или null. Порядок причин: пересечение → рабочее время → вне удобных часов.
 */

/** Удобные и рабочие часы ученика; время — минуты от полуночи в его часовом поясе */
export interface SchedulePrefs {
  comfortFrom: number;
  comfortTo: number;
  workFrom: number | null;
  workTo: number | null;
  /** Рабочие дни: 1 — понедельник … 7 — воскресенье */
  workDays: number[];
  /** Предлагать запись (ученик может выключить) */
  recordingHints: boolean;
  /** План недели (#20): минут на учёбу в день, дни учёбы (1 — пн … 7 — вс), любимое время суток */
  studyMinutes: number;
  studyDays: number[];
  preferredStudyTime: 'morning' | 'afternoon' | 'evening' | 'night' | null;
}

export const DEFAULT_SCHEDULE_PREFS: SchedulePrefs = {
  comfortFrom: 8 * 60,
  comfortTo: 22 * 60,
  workFrom: null,
  workTo: null,
  workDays: [1, 2, 3, 4, 5],
  recordingHints: true,
  studyMinutes: 60,
  studyDays: [1, 2, 3, 4, 5, 6, 7],
  preferredStudyTime: null,
};

export interface HintEvent {
  id: string;
  type: string;
  title: string;
  startsAt: string | Date;
  durationMinutes?: number | null;
  status: string;
  joinUrl?: string | null;
  recordingTaskId?: string | null;
}

export type RecordingHint =
  | { kind: 'conflict'; withTitle: string; withType: string }
  | { kind: 'work' }
  | { kind: 'night' };

const DEFAULT_MINUTES = 60;
/** С чем вебинар может пересечься: занятия, у которых есть время начала и длительность */
const TIMED_TYPES = new Set(['lesson', 'webinar', 'exam']);

const span = (e: HintEvent) => {
  const start = new Date(e.startsAt).getTime();
  return { start, end: start + (e.durationMinutes && e.durationMinutes > 0 ? e.durationMinutes : DEFAULT_MINUTES) * 60_000 };
};

/** Время на часах в поясе: минуты от полуночи и день недели (1 — пн … 7 — вс) */
export function wallClock(at: Date | number, timeZone: string): { minutes: number; weekday: number; dayKey: string } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(new Date(at));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const weekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(get('weekday')) + 1;
  return { minutes: Number(get('hour')) * 60 + Number(get('minute')), weekday, dayKey: `${get('year')}-${get('month')}-${get('day')}` };
}

/** Вебинар, который ещё можно записать: со ссылкой входа, будущий, не отменён и не записывается */
export function canSuggestRecording(e: HintEvent, now: number): boolean {
  return e.type === 'webinar' && !!e.joinUrl && e.status === 'pending' && !e.recordingTaskId && new Date(e.startsAt).getTime() > now;
}

/** Отрезок [from, to) на часах пересекается с [a, b) — оба в минутах одного дня */
const overlaps = (a: number, b: number, from: number, to: number) => a < to && from < b;

export function recordingHint(
  event: HintEvent,
  others: readonly HintEvent[],
  prefs: SchedulePrefs,
  timeZone: string,
  now = Date.now(),
): RecordingHint | null {
  if (!prefs.recordingHints || !canSuggestRecording(event, now)) return null;
  const { start, end } = span(event);

  const clash = others.find((o) => {
    if (o.id === event.id || o.status === 'cancelled' || !TIMED_TYPES.has(o.type)) return false;
    const s = span(o);
    return s.start < end && start < s.end;
  });
  if (clash) return { kind: 'conflict', withTitle: clash.title, withType: clash.type };

  const from = wallClock(start, timeZone);
  const to = wallClock(end - 1, timeZone);
  // вебинар через полночь на часах ученика — заведомо вне удобных часов
  const crossesMidnight = from.dayKey !== to.dayKey;
  const startMin = from.minutes;
  const endMin = crossesMidnight ? 24 * 60 : to.minutes + 1;

  if (prefs.workFrom !== null && prefs.workTo !== null && prefs.workDays.includes(from.weekday)
    && overlaps(startMin, endMin, prefs.workFrom, prefs.workTo)) {
    return { kind: 'work' };
  }
  if (crossesMidnight || startMin < prefs.comfortFrom || endMin > prefs.comfortTo) return { kind: 'night' };
  return null;
}

/** Подсказки для списка событий: id события → причина (только у тех, где она есть) */
export function recordingHints(events: readonly HintEvent[], prefs: SchedulePrefs, timeZone: string, now = Date.now()): Map<string, RecordingHint> {
  const out = new Map<string, RecordingHint>();
  for (const e of events) {
    const hint = recordingHint(e, events, prefs, timeZone, now);
    if (hint) out.set(e.id, hint);
  }
  return out;
}
