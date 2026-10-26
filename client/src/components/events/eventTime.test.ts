import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayKeyOf, dayStartUtc, monthGridKeys, timeOf, weekKeys, weekStartKey, dayTitle, weekTitle, monthTitle, weekdaysShort } from './eventTime';

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

test('подписи дней, недель и месяцев на языке ученика', () => {
  assert.equal(dayTitle('2026-10-26', 'ru'), 'пн, 26 октября');
  assert.match(dayTitle('2026-10-26', 'en'), /Mon.*October 26/);
  assert.match(dayTitle('2026-10-26', 'de'), /Mo.*26\. Oktober/);
  assert.match(weekTitle('2026-10-28', 'ru'), /26 октября.*1 ноября 2026/);
  assert.match(weekTitle('2026-10-28', 'fr'), /26 octobre.*1er novembre 2026|26 octobre.*1 novembre 2026/);
  assert.equal(monthTitle('2026-11-15', 'ru'), 'Ноябрь 2026');
  assert.equal(monthTitle('2026-11-15', 'es'), 'Noviembre 2026');
  assert.equal(weekdaysShort('ru')[0], 'пн');
  assert.equal(weekdaysShort('it').length, 7);
});
