/**
 * Часовой пояс времени записи: в форме, в окне правки и в списке записей.
 * Время уходит на сервер в UTC (ISO); здесь — только перевод «время на часах в поясе» ↔ UTC. Летнее время учитывает Intl.
 * Выбор пользователя запоминается в браузере (localStorage) и общий для всех экранов записи.
 */
import { useEffect, useState } from 'react';

export type TimeZoneChoice = 'Europe/Moscow' | 'UTC' | 'America/Los_Angeles' | 'local';

export const DEFAULT_TIME_ZONE: TimeZoneChoice = 'Europe/Moscow';
const STORAGE_KEY = 'recording.timeZone';
const CHANGE_EVENT = 'recording-time-zone';

/** Пояс браузера (IANA), например Asia/Irkutsk */
export const browserTimeZone = (): string => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; }
};

export const resolveTimeZone = (tz: TimeZoneChoice): string => (tz === 'local' ? browserTimeZone() : tz);

export const TIME_ZONE_OPTIONS: Array<{ value: TimeZoneChoice; label: string }> = [
  { value: 'Europe/Moscow', label: 'Москва (МСК, UTC+3)' },
  { value: 'UTC', label: 'UTC (по Гринвичу)' },
  { value: 'America/Los_Angeles', label: 'Тихоокеанское время США (PT)' },
  { value: 'local', label: 'Местное время' },
];

/** Короткая подпись пояса: МСК, UTC, PT или название местного пояса */
export function timeZoneShort(tz: TimeZoneChoice): string {
  if (tz === 'Europe/Moscow') return 'МСК';
  if (tz === 'UTC') return 'UTC';
  if (tz === 'America/Los_Angeles') return 'PT';
  return `местное, ${browserTimeZone()}`;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Смещение пояса относительно UTC в момент instant, мс (Москва — +3 ч, Лос-Анджелес — −7 или −8 ч) */
export function timeZoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** «2026-10-22T10:00» на часах в поясе → ISO в UTC. Пустая или неверная строка — null. */
export function zonedInputToUtcIso(input: string, tz: TimeZoneChoice): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(input || '');
  if (!m) return null;
  const zone = resolveTimeZone(tz);
  const wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  // смещение берём в найденный момент, а не в «наивный»: иначе в день перехода на летнее время ошибка на час
  let utc = wall - timeZoneOffsetMs(new Date(wall), zone);
  utc = wall - timeZoneOffsetMs(new Date(utc), zone);
  return new Date(utc).toISOString();
}

/** ISO в UTC → «2026-10-22T10:00» для поля datetime-local в поясе */
export function utcToZonedInput(utcIso: string | Date, tz: TimeZoneChoice): string {
  const d = new Date(utcIso);
  const w = new Date(d.getTime() + timeZoneOffsetMs(d, resolveTimeZone(tz)));
  return `${w.getUTCFullYear()}-${pad(w.getUTCMonth() + 1)}-${pad(w.getUTCDate())}T${pad(w.getUTCHours())}:${pad(w.getUTCMinutes())}`;
}

/** Дата «22.10.2026» и время «10:00» в поясе */
export function fmtZoned(utcIso: string | Date, tz: TimeZoneChoice): { date: string; time: string } {
  const [d, t] = utcToZonedInput(utcIso, tz).split('T');
  const [y, mo, day] = d.split('-');
  return { date: `${day}.${mo}.${y}`, time: t };
}

function readChoice(): TimeZoneChoice {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && TIME_ZONE_OPTIONS.some((o) => o.value === v)) return v as TimeZoneChoice;
  } catch { /* приватный режим */ }
  return DEFAULT_TIME_ZONE;
}

/** Выбранный пояс (общий для формы, правки и списка) и смена выбора */
export function useRecordingTimeZone(): [TimeZoneChoice, (tz: TimeZoneChoice) => void] {
  const [tz, setTz] = useState<TimeZoneChoice>(readChoice);
  useEffect(() => {
    const sync = () => setTz(readChoice());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(CHANGE_EVENT, sync); window.removeEventListener('storage', sync); };
  }, []);
  const choose = (next: TimeZoneChoice) => {
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* приватный режим */ }
    setTz(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };
  return [tz, choose];
}
