/** План недели (#20, npm test) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWeekPlan, MAX_BLOCK, type PlanInput, type PlanTask } from './weekPlan';

// пн 26 — вс 1 ноября
const DAYS = ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01'].map((day, i) => ({ day, weekday: i + 1 }));
const base = (patch: Partial<PlanInput> = {}): PlanInput => ({
  days: DAYS, nowMinutes: 8 * 60, comfortFrom: 8 * 60, comfortTo: 22 * 60,
  workFrom: null, workTo: null, workDays: [1, 2, 3, 4, 5],
  studyMinutes: 120, studyDays: [1, 2, 3, 4, 5, 6, 7], preferred: null, busy: [], tasks: [], ...patch,
});
const task = (id: string, dueDay: string, minutes: number, extra: Partial<PlanTask> = {}): PlanTask => ({
  id, title: id, type: 'assignment', dueDay, dueMinutes: 23 * 60 + 59, minutes, priority: 'medium', ...extra,
});
const total = (plan: ReturnType<typeof buildWeekPlan>, id: string) => plan.blocks.filter((b) => b.taskId === id).reduce((s, b) => s + b.to - b.from, 0);

test('работа только до срока; в день срока — до его времени', () => {
  const plan = buildWeekPlan(base({ tasks: [task('a', '2026-10-27', 300, { dueMinutes: 12 * 60 })] }));
  for (const b of plan.blocks.filter((x) => x.taskId === 'a')) {
    assert.ok(b.day < '2026-10-27' || (b.day === '2026-10-27' && b.to <= 12 * 60), JSON.stringify(b));
  }
  // пн 120 + вт до полудня 120 = 240 из 300
  assert.equal(total(plan, 'a'), 240);
  assert.deepEqual(plan.warnings, [{ taskId: 'a', shortMinutes: 60 }]);
});

test('не больше времени на учёбу в день, только в дни учёбы, блоки не длиннее 90 минут', () => {
  const plan = buildWeekPlan(base({ studyMinutes: 60, studyDays: [1, 3, 5], tasks: [task('a', '2026-11-01', 600, { soft: true })] }));
  for (const d of plan.days) assert.ok(d.planned <= d.budget, JSON.stringify(d));
  assert.deepEqual(plan.days.filter((d) => d.planned > 0).map((d) => d.day), ['2026-10-26', '2026-10-28', '2026-10-30']);
  assert.ok(plan.blocks.every((b) => b.to - b.from <= MAX_BLOCK));
  assert.deepEqual(plan.warnings, []); // срок за пределами плана — без предупреждения
});

test('фиксированные события и рабочие часы не перекрываются', () => {
  const plan = buildWeekPlan(base({
    comfortFrom: 9 * 60, comfortTo: 13 * 60, workFrom: 10 * 60, workTo: 12 * 60,
    busy: [{ day: '2026-10-26', from: 9 * 60, to: 10 * 60 }],
    tasks: [task('a', '2026-10-26', 60)],
  }));
  // свободно в пн только 12:00–13:00
  assert.deepEqual(plan.blocks, [{ taskId: 'a', day: '2026-10-26', from: 12 * 60, to: 13 * 60 }]);
  assert.deepEqual(plan.warnings, []);
});

test('сегодня — не раньше текущего времени', () => {
  const plan = buildWeekPlan(base({ nowMinutes: 15 * 60 + 2, tasks: [task('a', '2026-10-26', 30)] }));
  assert.equal(plan.blocks[0].from, 15 * 60 + 5);
});

test('любимое время суток — сначала оно', () => {
  const plan = buildWeekPlan(base({ preferred: 'evening', tasks: [task('a', '2026-10-26', 60)] }));
  assert.deepEqual(plan.blocks, [{ taskId: 'a', day: '2026-10-26', from: 17 * 60, to: 18 * 60 }]);
  // вечер занят — берётся другое время того же дня, а не следующий вечер
  const busy = buildWeekPlan(base({ preferred: 'evening', busy: [{ day: '2026-10-26', from: 17 * 60, to: 22 * 60 }], tasks: [task('a', '2026-10-26', 60)] }));
  assert.deepEqual(busy.blocks, [{ taskId: 'a', day: '2026-10-26', from: 8 * 60, to: 9 * 60 }]);
});

test('раньше срок — раньше место; при равном сроке важнее — раньше', () => {
  const plan = buildWeekPlan(base({
    studyMinutes: 60,
    tasks: [task('late', '2026-10-28', 60), task('low', '2026-10-26', 30, { priority: 'low' }), task('urgent', '2026-10-26', 30, { priority: 'urgent' })],
  }));
  assert.deepEqual(plan.blocks.filter((b) => b.day === '2026-10-26').map((b) => b.taskId), ['urgent', 'low']);
  assert.equal(plan.blocks.find((b) => b.taskId === 'late')!.day, '2026-10-27');
});

test('детерминированность и скорость: 50 задач < 1 с, одинаковый результат', () => {
  const tasks = Array.from({ length: 50 }, (_, i) => task(`t${i}`, DAYS[i % 7].day, 30 + (i % 4) * 30, { priority: ['low', 'medium', 'high', 'urgent'][i % 4] }));
  const busy = DAYS.flatMap(({ day }) => [{ day, from: 19 * 60, to: 20 * 60 }]);
  const started = performance.now();
  const a = buildWeekPlan(base({ studyMinutes: 240, busy, tasks }));
  assert.ok(performance.now() - started < 1000);
  assert.deepEqual(buildWeekPlan(base({ studyMinutes: 240, busy, tasks: [...tasks].reverse() })), a);
  // ни один блок не после срока своей задачи и не на занятом времени
  const due = new Map(tasks.map((t) => [t.id, t]));
  for (const b of a.blocks) {
    const t = due.get(b.taskId)!;
    assert.ok(b.day < t.dueDay || (b.day === t.dueDay && b.to <= t.dueMinutes));
    assert.ok(b.to <= 19 * 60 || b.from >= 20 * 60);
  }
});
