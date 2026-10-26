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

// Подписи дат — через Intl на языке ученика; день берём в полдень UTC, чтобы пояс браузера его не сдвинул
const noon = (key: DayKey) => {
  const d = fromKey(key);
  return new Date(Date.UTC(d.year, d.month - 1, d.day, 12));
};
const fmt = (lang: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(lang, { timeZone: 'UTC', ...opts });
const capitalize = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1);

/** Короткие дни недели с понедельника: «пн», «Mon», «lun.» */
export const weekdaysShort = (lang: string): string[] =>
  weekKeys('2026-10-26').map((k) => fmt(lang, { weekday: 'short' }).format(noon(k)));

/** «пн, 26 октября», «Mon, October 26» */
export const dayTitle = (key: DayKey, lang: string): string =>
  fmt(lang, { weekday: 'short', day: 'numeric', month: 'long' }).format(noon(key));

/** «Октябрь 2026», «October 2026» */
export const monthTitle = (key: DayKey, lang: string): string =>
  `${capitalize(fmt(lang, { month: 'long' }).format(noon(key)))} ${fromKey(key).year}`;

/** «26 октября – 1 ноября 2026 г.», «October 26 – November 1, 2026» */
export function weekTitle(key: DayKey, lang: string): string {
  const days = weekKeys(key);
  return fmt(lang, { day: 'numeric', month: 'long', year: 'numeric' }).formatRange(noon(days[0]), noon(days[6]));
}
