/** Перевод времени записи между поясами (npm test) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fmtZoned, utcToZonedInput, zonedInputToUtcIso } from './timezones';

test('время на часах в поясе → UTC: Москва, UTC, тихоокеанское (лето и зима)', () => {
  assert.equal(zonedInputToUtcIso('2026-10-22T10:00', 'Europe/Moscow'), '2026-10-22T07:00:00.000Z');
  assert.equal(zonedInputToUtcIso('2026-10-22T10:00', 'UTC'), '2026-10-22T10:00:00.000Z');
  assert.equal(zonedInputToUtcIso('2026-10-22T10:00', 'America/Los_Angeles'), '2026-10-22T17:00:00.000Z', 'летом PDT, UTC−7');
  assert.equal(zonedInputToUtcIso('2026-12-15T10:00', 'America/Los_Angeles'), '2026-12-15T18:00:00.000Z', 'зимой PST, UTC−8');
  assert.equal(zonedInputToUtcIso('2026-11-01T01:30', 'America/Los_Angeles') !== null, true, 'ночь перехода на зимнее время не ломается');
  assert.equal(zonedInputToUtcIso('2026-03-08T12:00', 'America/Los_Angeles'), '2026-03-08T19:00:00.000Z', 'день перехода на летнее время');
  assert.equal(zonedInputToUtcIso('', 'UTC'), null);
  assert.equal(zonedInputToUtcIso('завтра', 'UTC'), null);
});

test('UTC → время на часах в поясе и обратно', () => {
  for (const tz of ['Europe/Moscow', 'UTC', 'America/Los_Angeles'] as const) {
    for (const iso of ['2026-10-22T07:00:00.000Z', '2026-12-15T18:30:00.000Z', '2027-03-14T12:15:00.000Z']) {
      assert.equal(zonedInputToUtcIso(utcToZonedInput(iso, tz), tz), iso, `${tz} ${iso}`);
    }
  }
  assert.equal(utcToZonedInput('2026-10-22T07:00:00.000Z', 'Europe/Moscow'), '2026-10-22T10:00');
  assert.deepEqual(fmtZoned('2026-10-22T17:05:00.000Z', 'America/Los_Angeles'), { date: '22.10.2026', time: '10:05' });
});
