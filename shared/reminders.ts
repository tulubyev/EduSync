/**
 * Напоминания о занятиях и сроках (#18). Чистые правила без базы и почты: какие напоминания пора отправить.
 *
 * - «Скоро начнётся» (start): урок, вебинар или экзамен — за 15 минут до начала.
 *   Вебинар, который записывается, не напоминаем: ученик решил смотреть запись.
 * - «Срок» (due): задание, дедлайн и экзамен — за N часов до срока (настройка ученика, по умолчанию 24).
 * - Только невыполненные и неотменённые; только будущее — прошедшее не догоняем.
 * - Ключ напоминания — событие, вид и время события: перенос события даёт новое напоминание, повтор — нет.
 */

export type ReminderKind = 'start' | 'due';

export const START_MINUTES = 15;
export const DEFAULT_ADVANCE_HOURS = 24;
/** Варианты «за сколько часов до срока» в настройках */
export const ADVANCE_HOURS = [1, 3, 6, 12, 24, 48, 72] as const;
export const MAX_ADVANCE_HOURS = 72;

const START_TYPES = new Set(['lesson', 'webinar', 'exam']);
const DUE_TYPES = new Set(['assignment', 'deadline', 'exam']);

export interface ReminderEvent {
  id: string;
  userId: string;
  type: string;
  status: string;
  startsAt: Date | string;
  recordingTaskId?: string | null;
}

export interface ReminderPrefs {
  enabled: boolean;
  advanceHours: number;
}

export interface DueReminder<E extends ReminderEvent> {
  event: E;
  kind: ReminderKind;
}

export const reminderKey = (eventId: string, kind: ReminderKind, startsAt: Date | string) =>
  `${eventId}:${kind}:${new Date(startsAt).toISOString()}`;

export function dueReminders<E extends ReminderEvent>(
  events: readonly E[],
  prefsOf: (userId: string) => ReminderPrefs,
  now: number,
  sent: ReadonlySet<string>,
): DueReminder<E>[] {
  const out: DueReminder<E>[] = [];
  for (const e of events) {
    if (e.status !== 'pending') continue;
    const prefs = prefsOf(e.userId);
    if (!prefs.enabled) continue;
    const left = new Date(e.startsAt).getTime() - now;
    if (left <= 0) continue;
    const add = (kind: ReminderKind) => {
      if (!sent.has(reminderKey(e.id, kind, e.startsAt))) out.push({ event: e, kind });
    };
    if (START_TYPES.has(e.type) && left <= START_MINUTES * 60_000 && !(e.type === 'webinar' && e.recordingTaskId)) add('start');
    // срок за 15 минут — уже «скоро начнётся» у экзамена; у задания и дедлайна — последнее напоминание
    const advance = Math.min(MAX_ADVANCE_HOURS, Math.max(1, prefs.advanceHours || DEFAULT_ADVANCE_HOURS));
    if (DUE_TYPES.has(e.type) && left <= advance * 3_600_000 && !(e.type === 'exam' && left <= START_MINUTES * 60_000)) add('due');
  }
  return out;
}
