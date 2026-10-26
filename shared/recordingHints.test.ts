/** Подсказка записать вебинар в неудобное время (#48, npm test) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SCHEDULE_PREFS, recordingHint, recordingHints, wallClock, type HintEvent } from './recordingHints';

const TZ = 'Europe/Moscow'; // UTC+3 круглый год
const now = Date.parse('2026-10-26T06:00:00Z'); // пн, 09:00 МСК
const web = (id: string, startsAt: string, extra: Partial<HintEvent> = {}): HintEvent => ({
  id, type: 'webinar', title: id, startsAt, durationMinutes: 60, status: 'pending', joinUrl: 'https://zoom.us/j/1', ...extra,
});
const prefs = { ...DEFAULT_SCHEDULE_PREFS };

test('часы и день недели в поясе ученика', () => {
  assert.deepEqual(wallClock(Date.parse('2026-10-26T20:30:00Z'), TZ), { minutes: 23 * 60 + 30, weekday: 1, dayKey: '2026-10-26' });
  assert.equal(wallClock(Date.parse('2026-10-26T21:30:00Z'), TZ).weekday, 2);
});

test('ночью и рано утром — «вне удобных часов», днём — подсказки нет', () => {
  assert.deepEqual(recordingHint(web('a', '2026-10-27T00:00:00Z'), [], prefs, TZ, now), { kind: 'night' }); // 03:00
  assert.deepEqual(recordingHint(web('b', '2026-10-27T18:30:00Z'), [], prefs, TZ, now), { kind: 'night' }); // 21:30–22:30
  assert.equal(recordingHint(web('c', '2026-10-27T15:00:00Z'), [], prefs, TZ, now), null); // 18:00
  assert.equal(recordingHint(web('d', '2026-10-27T18:00:00Z'), [], prefs, TZ, now), null); // 21:00–22:00 ровно в окне
  assert.deepEqual(recordingHint(web('e', '2026-10-27T20:30:00Z'), [], prefs, TZ, now), { kind: 'night' }); // через полночь
});

test('удобные часы ученика учитываются', () => {
  const owl = { ...prefs, comfortFrom: 12 * 60, comfortTo: 24 * 60 };
  assert.equal(recordingHint(web('a', '2026-10-27T19:00:00Z'), [], owl, TZ, now), null); // 22:00
  assert.deepEqual(recordingHint(web('b', '2026-10-27T07:00:00Z'), [], owl, TZ, now), { kind: 'night' }); // 10:00
});

test('пересечение с уроком или экзаменом — с названием, дедлайны и отменённое не мешают', () => {
  const w = web('w', '2026-10-27T15:00:00Z', { durationMinutes: 90 });
  const lesson: HintEvent = { id: 'l', type: 'lesson', title: 'Математика', startsAt: '2026-10-27T16:00:00Z', durationMinutes: 45, status: 'pending' };
  const deadline: HintEvent = { id: 'd', type: 'deadline', title: 'Эссе', startsAt: '2026-10-27T15:30:00Z', status: 'pending' };
  const cancelled: HintEvent = { ...lesson, id: 'x', status: 'cancelled' };
  assert.deepEqual(recordingHint(w, [w, lesson], prefs, TZ, now), { kind: 'conflict', withTitle: 'Математика', withType: 'lesson' });
  assert.equal(recordingHint(w, [w, deadline, cancelled], prefs, TZ, now), null);
  // встык — не пересечение
  const after: HintEvent = { ...lesson, startsAt: '2026-10-27T16:30:00Z' };
  assert.equal(recordingHint(w, [w, after], prefs, TZ, now), null);
});

test('рабочее время — только в рабочие дни', () => {
  const worker = { ...prefs, workFrom: 9 * 60, workTo: 18 * 60 };
  assert.deepEqual(recordingHint(web('a', '2026-10-27T11:00:00Z'), [], worker, TZ, now), { kind: 'work' }); // вт 14:00
  assert.equal(recordingHint(web('b', '2026-10-31T11:00:00Z'), [], worker, TZ, now), null); // сб 14:00
  assert.equal(recordingHint(web('c', '2026-10-27T15:00:00Z'), [], worker, TZ, now), null); // вт 18:00 — после работы
});

test('подсказки нет: прошедшее, без ссылки, уже записывается, не вебинар, подсказки выключены', () => {
  const night = '2026-10-27T00:00:00Z';
  assert.equal(recordingHint(web('a', '2026-10-25T00:00:00Z'), [], prefs, TZ, now), null);
  assert.equal(recordingHint(web('b', night, { joinUrl: null }), [], prefs, TZ, now), null);
  assert.equal(recordingHint(web('c', night, { recordingTaskId: 'r1' }), [], prefs, TZ, now), null);
  assert.equal(recordingHint(web('d', night, { type: 'lesson' }), [], prefs, TZ, now), null);
  assert.equal(recordingHint(web('e', night, { status: 'completed' }), [], prefs, TZ, now), null);
  assert.equal(recordingHint(web('f', night), [], { ...prefs, recordingHints: false }, TZ, now), null);
});

test('список: подсказки только у неудобных вебинаров', () => {
  const list = [web('night', '2026-10-27T00:00:00Z'), web('ok', '2026-10-27T15:00:00Z')];
  assert.deepEqual([...recordingHints(list, prefs, TZ, now).keys()], ['night']);
});
