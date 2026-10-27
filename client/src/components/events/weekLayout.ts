/**
 * Раскладка недели «дни × часы» для календаря: какие события — блоки по времени, какие — в строке сроков,
 * диапазон часов и колонки для пересекающихся событий. Чистые функции — их проверяют тесты.
 */
import { DUE_TYPES, type EventType } from '@shared/learningEvents';
import { utcToZonedInput, type TimeZoneChoice } from '../recording/timezones';
import type { DayKey } from './eventTime';

export interface LayoutEvent {
  id: string;
  type: EventType;
  startsAt: string;
  durationMinutes?: number | null;
}

export interface Block<E extends LayoutEvent> {
  event: E;
  /** Минуты от полуночи на часах пояса */
  start: number;
  end: number;
  /** Колонка среди пересекающихся и их число */
  lane: number;
  lanes: number;
}

const DEFAULT_MINUTES = 60;
/** Короче получаса блок не читается — растягиваем только отрисовку */
export const MIN_BLOCK_MINUTES = 30;

/** Срок без длительности (задание, дедлайн, экзамен без времени проведения) — в строку сроков, а не в сетку */
export const isDueOnly = (e: LayoutEvent) => DUE_TYPES.includes(e.type) && !(e.durationMinutes && e.durationMinutes > 0);

const wall = (iso: string, tz: TimeZoneChoice) => {
  const s = utcToZonedInput(iso, tz);
  return { day: s.slice(0, 10), minutes: Number(s.slice(11, 13)) * 60 + Number(s.slice(14, 16)) };
};

/** Блоки одного дня с колонками; событие через полночь обрезается концом дня */
export function dayBlocks<E extends LayoutEvent>(events: readonly E[], day: DayKey, tz: TimeZoneChoice): Block<E>[] {
  const items = events
    .filter((e) => !isDueOnly(e))
    .map((e) => {
      const from = wall(e.startsAt, tz);
      if (from.day !== day) return null;
      const end = Math.min(24 * 60, from.minutes + (e.durationMinutes && e.durationMinutes > 0 ? e.durationMinutes : DEFAULT_MINUTES));
      return { event: e, start: from.minutes, end, lane: 0, lanes: 1 };
    })
    .filter((b): b is Block<E> => b !== null)
    .sort((a, b) => a.start - b.start || b.end - a.end);

  // группы пересекающихся; внутри группы — первая свободная колонка
  let group: Block<E>[] = [];
  let groupEnd = -1;
  const flush = () => {
    const lanes = Math.max(1, ...group.map((b) => b.lane + 1));
    group.forEach((b) => { b.lanes = lanes; });
    group = [];
  };
  for (const b of items) {
    const visualEnd = (x: Block<E>) => Math.max(x.end, x.start + MIN_BLOCK_MINUTES);
    if (group.length && b.start >= groupEnd) flush();
    const laneEnds: number[] = [];
    group.forEach((g) => { laneEnds[g.lane] = Math.max(laneEnds[g.lane] ?? 0, visualEnd(g)); });
    let lane = laneEnds.findIndex((end) => end <= b.start);
    if (lane === -1) lane = laneEnds.length;
    b.lane = lane;
    group.push(b);
    groupEnd = Math.max(groupEnd, visualEnd(b));
  }
  if (group.length) flush();
  return items;
}

/** Сроки дня (без длительности) по времени */
export function dayDue<E extends LayoutEvent>(events: readonly E[], day: DayKey, tz: TimeZoneChoice): E[] {
  return events
    .filter((e) => isDueOnly(e) && wall(e.startsAt, tz).day === day)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
}

/** Часы сетки: по умолчанию 8–20, шире — если события раньше или позже */
export function hourRange(blocks: readonly Block<LayoutEvent>[], from = 8, to = 20): { from: number; to: number } {
  let lo = from;
  let hi = to;
  for (const b of blocks) {
    lo = Math.min(lo, Math.floor(b.start / 60));
    hi = Math.max(hi, Math.ceil(Math.max(b.end, b.start + MIN_BLOCK_MINUTES) / 60));
  }
  return { from: Math.max(0, lo), to: Math.min(24, hi) };
}
