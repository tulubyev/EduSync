/** Данные «Аналитики» из настоящих записей (npm test) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { costOf, dailyActivity, studyMinutes } from './analyticsData';

// полдень по часам процесса — тест не зависит от часового пояса машины
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).toISOString();
const NOW = new Date(2026, 9, 27, 15);

test('часы дают только пройденные занятия; без длительности — час', () => {
  assert.equal(studyMinutes({ type: 'lesson', status: 'completed', startsAt: at(2026, 10, 27), durationMinutes: 90 }), 90);
  assert.equal(studyMinutes({ type: 'webinar', status: 'completed', startsAt: at(2026, 10, 27) }), 60);
  assert.equal(studyMinutes({ type: 'lesson', status: 'pending', startsAt: at(2026, 10, 27), durationMinutes: 90 }), 0);
  assert.equal(studyMinutes({ type: 'deadline', status: 'completed', startsAt: at(2026, 10, 27) }), 0);
});

test('по дню на каждый день периода, часы и завершённые курсы — в свой день', () => {
  const days = dailyActivity(
    [
      { type: 'lesson', status: 'completed', startsAt: at(2026, 10, 27, 9), durationMinutes: 45 },
      { type: 'webinar', status: 'completed', startsAt: at(2026, 10, 27, 19), durationMinutes: 90 },
      { type: 'lesson', status: 'completed', startsAt: at(2026, 10, 25), durationMinutes: 60 },
      { type: 'lesson', status: 'completed', startsAt: at(2026, 9, 1), durationMinutes: 60 }, // вне периода
      { type: 'assignment', status: 'completed', startsAt: at(2026, 10, 26) },
    ],
    [
      { status: 'completed', completedAt: at(2026, 10, 26) },
      { status: 'in_progress', completedAt: null },
    ],
    7,
    NOW,
  );
  assert.equal(days.length, 8);
  assert.equal(days[0].day, '2026-10-20');
  assert.equal(days[7].day, '2026-10-27');
  assert.deepEqual(days.slice(-3).map((d) => [d.day, d.hours, d.courses]), [
    ['2026-10-25', 1, 0],
    ['2026-10-26', 0, 1],
    ['2026-10-27', 2.3, 0],
  ]);
  assert.equal(days.reduce((s, d) => s + d.hours, 0), 3.3);
});

test('стоимость из базы приходит строкой', () => {
  assert.equal(costOf({ status: 'completed', cost: '4990.00' }), 4990);
  assert.equal(costOf({ status: 'completed', cost: null }), 0);
  assert.equal(costOf({ status: 'completed', cost: 'abc' }), 0);
});
