/** Раскладка недели «дни × часы» (npm test) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayBlocks, dayDue, hourRange, isDueOnly, type LayoutEvent } from './weekLayout';

const TZ = 'Europe/Moscow' as const; // UTC+3
const ev = (id: string, type: LayoutEvent['type'], startsAt: string, durationMinutes?: number): LayoutEvent => ({ id, type, startsAt, durationMinutes });

test('сроки без длительности — в строку сроков, экзамен со временем — в сетку', () => {
  assert.ok(isDueOnly(ev('d', 'deadline', '2026-10-27T20:59:00Z')));
  assert.ok(isDueOnly(ev('a', 'assignment', '2026-10-27T20:59:00Z')));
  assert.ok(!isDueOnly(ev('x', 'exam', '2026-10-27T07:00:00Z', 120)));
  assert.ok(!isDueOnly(ev('l', 'lesson', '2026-10-27T07:00:00Z')));
  const list = [ev('d', 'deadline', '2026-10-27T20:59:00Z'), ev('l', 'lesson', '2026-10-27T07:00:00Z')];
  assert.deepEqual(dayDue(list, '2026-10-27', TZ).map((e) => e.id), ['d']);
  assert.deepEqual(dayBlocks(list, '2026-10-27', TZ).map((b) => b.event.id), ['l']);
});

test('время блока — на часах пояса, без длительности — час, через полночь — до конца дня', () => {
  const [a] = dayBlocks([ev('a', 'webinar', '2026-10-27T16:00:00Z', 90)], '2026-10-27', TZ);
  assert.deepEqual([a.start, a.end], [19 * 60, 20 * 60 + 30]);
  const [b] = dayBlocks([ev('b', 'lesson', '2026-10-27T06:15:00Z')], '2026-10-27', TZ);
  assert.deepEqual([b.start, b.end], [9 * 60 + 15, 10 * 60 + 15]);
  const [c] = dayBlocks([ev('c', 'webinar', '2026-10-27T20:30:00Z', 120)], '2026-10-27', TZ);
  assert.deepEqual([c.start, c.end], [23 * 60 + 30, 24 * 60]);
  // 23:30 UTC — уже следующий день по Москве
  assert.equal(dayBlocks([ev('d', 'lesson', '2026-10-27T21:30:00Z')], '2026-10-27', TZ).length, 0);
});

test('пересекающиеся — рядом, встык и раздельные — во всю ширину', () => {
  const blocks = dayBlocks([
    ev('a', 'lesson', '2026-10-27T07:00:00Z', 60), // 10:00–11:00
    ev('b', 'webinar', '2026-10-27T07:30:00Z', 60), // 10:30–11:30
    ev('c', 'exam', '2026-10-27T08:00:00Z', 30), // 11:00–11:30 — встык с a, рядом с b
    ev('d', 'lesson', '2026-10-27T12:00:00Z', 60), // 15:00 — отдельно
  ], '2026-10-27', TZ);
  const by = Object.fromEntries(blocks.map((b) => [b.event.id, [b.lane, b.lanes]]));
  assert.deepEqual(by.a, [0, 2]);
  assert.deepEqual(by.b, [1, 2]);
  assert.deepEqual(by.c, [0, 2]);
  assert.deepEqual(by.d, [0, 1]);
});

test('часы сетки: 8–20 по умолчанию, шире — по событиям', () => {
  assert.deepEqual(hourRange([]), { from: 8, to: 20 });
  const blocks = dayBlocks([ev('a', 'webinar', '2026-10-27T03:30:00Z'), ev('b', 'webinar', '2026-10-27T19:00:00Z', 90)], '2026-10-27', TZ);
  assert.deepEqual(hourRange(blocks), { from: 6, to: 24 });
});
