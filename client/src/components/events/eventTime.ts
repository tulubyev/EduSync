/**
 * Дни календаря в поясе ученика. Событие хранится в UTC; день, в который оно попадает, зависит от пояса:
 * 23:30 UTC — это ещё «сегодня» в Лондоне и уже «завтра» в Москве.
 */
import { addDays, weekdayOf, type WallDate } from '@shared/learningEvents';
import { utcToZonedInput, zonedInputToUtcIso, type TimeZoneChoice } from '../recording/timezones';

export type DayKey = string; // «2026-10-25»

const pad = (n: number) => String(n).padStart(2, '0');

export const toKey = (d: WallDate): DayKey => `${d.year}-${pad(d.month)}-${pad(d.day)}`;

export function fromKey(key: DayKey): WallDate {
  const [year, month, day] = key.split('-').map(Number);
  return { year, month, day };
}

/** День события на часах выбранного пояса */
export const dayKeyOf = (utcIso: string | Date, tz: TimeZoneChoice): DayKey => utcToZonedInput(utcIso, tz).slice(0, 10);

/** Время события «19:00» в поясе */
export const timeOf = (utcIso: string | Date, tz: TimeZoneChoice): string => utcToZonedInput(utcIso, tz).slice(11, 16);

export const todayIn = (tz: TimeZoneChoice, now: Date = new Date()): WallDate => fromKey(dayKeyOf(now, tz));

/** Начало дня в поясе → ISO в UTC (для запроса периода) */
export const dayStartUtc = (key: DayKey, tz: TimeZoneChoice): string => zonedInputToUtcIso(`${key}T00:00`, tz)!;

export const shiftKey = (key: DayKey, days: number): DayKey => toKey(addDays(fromKey(key), days));

/** Понедельник недели, в которую входит день */
export function weekStartKey(key: DayKey): DayKey {
  const wd = weekdayOf(fromKey(key));
  return shiftKey(key, -((wd + 6) % 7));
}

export const weekKeys = (key: DayKey): DayKey[] => {
  const start = weekStartKey(key);
  return Array.from({ length: 7 }, (_, i) => shiftKey(start, i));
};

/** Сетка месяца: 6 недель с понедельника, включая дни соседних месяцев */
export function monthGridKeys(key: DayKey): DayKey[] {
  const { year, month } = fromKey(key);
  const start = weekStartKey(toKey({ year, month, day: 1 }));
  return Array.from({ length: 42 }, (_, i) => shiftKey(start, i));
}

const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTHS_NOM = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
export const WEEKDAYS_SHORT = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];

/** «пн, 26 октября» */
export function dayTitle(key: DayKey): string {
  const d = fromKey(key);
  return `${WEEKDAYS_SHORT[(weekdayOf(d) + 6) % 7]}, ${d.day} ${MONTHS_GEN[d.month - 1]}`;
}

/** «Октябрь 2026» */
export const monthTitle = (key: DayKey): string => {
  const d = fromKey(key);
  return `${MONTHS_NOM[d.month - 1]} ${d.year}`;
};

/** «26 октября — 1 ноября» */
export function weekTitle(key: DayKey): string {
  const days = weekKeys(key);
  const a = fromKey(days[0]), b = fromKey(days[6]);
  return a.month === b.month
    ? `${a.day} — ${b.day} ${MONTHS_GEN[b.month - 1]} ${b.year}`
    : `${a.day} ${MONTHS_GEN[a.month - 1]} — ${b.day} ${MONTHS_GEN[b.month - 1]} ${b.year}`;
}

