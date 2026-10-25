import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayKeyOf, dayStartUtc, monthGridKeys, timeOf, weekKeys, weekStartKey, dayTitle, weekTitle } from './eventTime';

test('день события зависит от пояса', () => {
  const iso = '2026-10-25T22:30:00.000Z';
  assert.equal(dayKeyOf(iso, 'UTC'), '2026-10-25');
  assert.equal(dayKeyOf(iso, 'Europe/Moscow'), '2026-10-26');
  assert.equal(timeOf(iso, 'Europe/Moscow'), '01:30');
  assert.equal(dayKeyOf(iso, 'America/Los_Angeles'), '2026-10-25');
});

test('начало дня в поясе — в UTC', () => {
  assert.equal(dayStartUtc('2026-10-26', 'Europe/Moscow'), '2026-10-25T21:00:00.000Z');
  assert.equal(dayStartUtc('2026-10-26', 'UTC'), '2026-10-26T00:00:00.000Z');
});

test('неделя с понедельника, сетка месяца — 6 недель', () => {
  assert.equal(weekStartKey('2026-10-24'), '2026-10-19');
  assert.equal(weekStartKey('2026-10-26'), '2026-10-26');
  assert.deepEqual(weekKeys('2026-10-25')[6], '2026-10-25');
  const grid = monthGridKeys('2026-11-15');
  assert.equal(grid.length, 42);
  assert.equal(grid[0], '2026-10-26');
  assert.equal(grid[41], '2026-12-06');
});

test('подписи дней и недель', () => {
  assert.equal(dayTitle('2026-10-26'), 'пн, 26 октября');
  assert.equal(weekTitle('2026-10-28'), '26 октября — 1 ноября 2026');
  assert.equal(weekTitle('2026-10-14'), '12 — 18 октября 2026');
});
