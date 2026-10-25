import type { Messages } from '@/locales';
import { browserTimeZone, type TimeZoneChoice } from '../recording/timezones';

/** Подпись пояса в списке выбора на языке ученика */
export function tzOptionLabel(tz: TimeZoneChoice, m: Messages): string {
  if (tz === 'Europe/Moscow') return m.timeZones.moscow;
  if (tz === 'UTC') return m.timeZones.utc;
  if (tz === 'America/Los_Angeles') return m.timeZones.pacific;
  return m.timeZones.local;
}

/** Короткая подпись пояса рядом со временем: МСК / MSK, UTC, PT, местное */
export function tzShort(tz: TimeZoneChoice, m: Messages): string {
  if (tz === 'Europe/Moscow') return m.timeZones.shortMoscow;
  if (tz === 'UTC') return 'UTC';
  if (tz === 'America/Los_Angeles') return 'PT';
  return m.timeZones.shortLocal(browserTimeZone());
}
