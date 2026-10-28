/** Напоминания о занятиях и сроках (#18, npm test) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dueReminders, reminderKey, type ReminderEvent } from './reminders';

const NOW = Date.parse('2026-10-28T10:00:00Z');
const at = (min: number) => new Date(NOW + min * 60_000).toISOString();
const ev = (id: string, type: string, startsInMin: number, extra: Partial<ReminderEvent> = {}): ReminderEvent => ({
  id, userId: 'u1', type, status: 'pending', startsAt: at(startsInMin), ...extra,
});
const on = () => ({ enabled: true, advanceHours: 24 });
const kinds = (list: ReturnType<typeof dueReminders>) => list.map((r) => `${r.event.id}:${r.kind}`);

test('урок и вебинар — за 15 минут до начала, раньше — нет', () => {
  const list = dueReminders([ev('l', 'lesson', 10), ev('w', 'webinar', 15), ev('far', 'lesson', 16), ev('past', 'lesson', -1)], on, NOW, new Set());
  assert.deepEqual(kinds(list), ['l:start', 'w:start']);
});

test('записываемый вебинар не напоминаем', () => {
  assert.deepEqual(dueReminders([ev('w', 'webinar', 5, { recordingTaskId: 't1' })], on, NOW, new Set()), []);
});

test('срок — за N часов из настроек; экзамен — и за N часов, и за 15 минут, но не оба сразу', () => {
  const prefs = () => ({ enabled: true, advanceHours: 3 });
  const list = dueReminders([
    ev('a', 'assignment', 170), ev('late', 'assignment', 200), ev('d', 'deadline', 5),
    ev('x', 'exam', 120), ev('xs', 'exam', 10),
  ], prefs, NOW, new Set());
  assert.deepEqual(kinds(list), ['a:due', 'd:due', 'x:due', 'xs:start']);
});

test('выполненное, отменённое и выключенные напоминания — без писем', () => {
  const list = dueReminders([
    ev('c', 'assignment', 60, { status: 'completed' }),
    ev('x', 'lesson', 5, { status: 'cancelled' }),
    ev('off', 'lesson', 5, { userId: 'u2' }),
  ], (u) => ({ enabled: u !== 'u2', advanceHours: 24 }), NOW, new Set());
  assert.deepEqual(list, []);
});

test('без дублей; перенос события — новое напоминание', () => {
  const lesson = ev('l', 'lesson', 10);
  const sent = new Set([reminderKey('l', 'start', lesson.startsAt)]);
  assert.deepEqual(dueReminders([lesson], on, NOW, sent), []);
  const moved = { ...lesson, startsAt: at(12) };
  assert.deepEqual(kinds(dueReminders([moved], on, NOW, sent)), ['l:start']);
});
