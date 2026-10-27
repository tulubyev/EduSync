/**
 * Данные «Аналитики» из настоящих записей ученика (раньше графики заполнялись случайными числами).
 * Часы — пройденные занятия календаря (урок, вебинар, экзамен со статусом «выполнено»),
 * завершённые курсы — по дате завершения курса. Чистые функции — их проверяют тесты.
 */

export interface ActivityEvent {
  type: string;
  status: string;
  startsAt: string;
  durationMinutes?: number | null;
}

export interface ActivityCourse {
  status: string;
  completedAt?: string | null;
  cost?: number | string | null;
}

export interface DayActivity {
  /** YYYY-MM-DD по часам браузера */
  day: string;
  hours: number;
  courses: number;
}

/** Занятия, у которых есть продолжительность; сроки (задания, дедлайны) часов не дают */
const STUDY_TYPES = new Set(['lesson', 'webinar', 'exam']);
/** Длительность занятия без указанной — как в календаре */
const DEFAULT_MINUTES = 60;

const pad = (n: number) => String(n).padStart(2, '0');
export const localDayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Начало периода: сегодня и `days` дней назад */
export function rangeStart(days: number, now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);
}

export const studyMinutes = (e: ActivityEvent) =>
  e.status === 'completed' && STUDY_TYPES.has(e.type) ? (e.durationMinutes && e.durationMinutes > 0 ? e.durationMinutes : DEFAULT_MINUTES) : 0;

/** По дню на каждый день периода, включая сегодня */
export function dailyActivity(events: readonly ActivityEvent[], courses: readonly ActivityCourse[], days: number, now: Date = new Date()): DayActivity[] {
  const start = rangeStart(days, now);
  const out: DayActivity[] = [];
  const index = new Map<string, DayActivity>();
  for (let i = 0; i <= days; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const item = { day: localDayKey(d), hours: 0, courses: 0 };
    out.push(item);
    index.set(item.day, item);
  }
  for (const e of events) {
    const minutes = studyMinutes(e);
    const item = minutes ? index.get(localDayKey(new Date(e.startsAt))) : undefined;
    if (item) item.hours += minutes / 60;
  }
  for (const c of courses) {
    const item = c.status === 'completed' && c.completedAt ? index.get(localDayKey(new Date(c.completedAt))) : undefined;
    if (item) item.courses += 1;
  }
  for (const item of out) item.hours = Math.round(item.hours * 10) / 10;
  return out;
}

/** Стоимость курса числом: из базы decimal приходит строкой */
export const costOf = (c: ActivityCourse) => {
  const n = Number(c.cost);
  return Number.isFinite(n) && n > 0 ? n : 0;
};
