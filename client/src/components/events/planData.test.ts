/** События календаря → план недели (#20, npm test) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SCHEDULE_PREFS } from '@shared/recordingHints';
import type { LearningEventDto } from './eventsApi';
import { planFromEvents } from './planData';

const TZ = 'Europe/Moscow' as const; // UTC+3
const NOW = new Date('2026-10-26T05:00:00Z'); // пн 08:00 МСК
let n = 0;
const ev = (type: LearningEventDto['type'], startsAt: string, extra: Partial<LearningEventDto> = {}): LearningEventDto => ({
  id: `e${++n}`, type, title: `${type}${n}`, description: null, startsAt, durationMinutes: null, timeZone: null,
  programTitle: null, moduleTitle: null, courseId: null, lessonUrl: null, materialsUrl: null, joinUrl: null,
  source: 'manual', status: 'pending', priority: 'medium', recordingTaskId: null, ...extra,
});
const prefs = { ...DEFAULT_SCHEDULE_PREFS, studyMinutes: 240 };

test('задачи: задание и подготовка к экзамену; выполненное, прошедшее и слишком далёкое — нет', () => {
  const exam = ev('exam', '2026-10-29T07:00:00Z', { durationMinutes: 120 });
  const { items } = planFromEvents([
    ev('assignment', '2026-10-27T20:59:00Z'),
    exam,
    ev('assignment', '2026-10-27T20:59:00Z', { status: 'completed' }),
    ev('deadline', '2026-10-25T20:59:00Z'), // прошёл
    ev('deadline', '2026-11-20T20:59:00Z'), // дальше двух недель
    ev('lesson', '2026-10-27T07:00:00Z', { durationMinutes: 60 }),
  ], prefs, TZ, NOW);
  assert.deepEqual(Array.from(items.values()).map((i) => [i.type, i.prep, i.minutes]), [['assignment', false, 60], ['exam', true, 120]]);
  assert.equal(items.get(`prep:${exam.id}`)!.dueMinutes, 10 * 60); // экзамен в 10:00 МСК
});

test('срок за пределами недели — мягкий, раскладывается без предупреждения', () => {
  const { items, plan } = planFromEvents([ev('deadline', '2026-11-04T20:59:00Z')], prefs, TZ, NOW);
  const item = Array.from(items.values())[0];
  assert.equal(item.soft, true);
  assert.equal(item.dueDay, '2026-11-01');
  assert.equal(plan.warnings.length, 0);
});

test('урок занимает время, записываемый вебинар — нет', () => {
  const dayFull = { ...prefs, comfortFrom: 18 * 60, comfortTo: 19 * 60 };
  const task = ev('assignment', '2026-10-26T20:59:00Z');
  const busy = planFromEvents([task, ev('lesson', '2026-10-26T15:00:00Z', { durationMinutes: 60 })], dayFull, TZ, NOW);
  assert.deepEqual(busy.plan.warnings, [{ taskId: task.id, shortMinutes: 60 }]);
  const recorded = planFromEvents([task, ev('webinar', '2026-10-26T15:00:00Z', { durationMinutes: 60, recordingTaskId: 't1' })], dayFull, TZ, NOW);
  assert.deepEqual(recorded.plan.blocks, [{ taskId: task.id, day: '2026-10-26', from: 18 * 60, to: 19 * 60 }]);
});
