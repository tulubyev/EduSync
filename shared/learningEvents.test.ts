import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseQuickEvent, draftWallInput, addDays, weekdayOf } from './learningEvents';

// суббота, 24 октября 2026
const today = { year: 2026, month: 10, day: 24 };

test('вебинар завтра в 19:00 на час со ссылкой', () => {
  const d = parseQuickEvent('Вебинар по Python завтра в 19:00 1ч https://zoom.us/j/123', today);
  assert.equal(d.type, 'webinar');
  assert.equal(d.title, 'Вебинар по Python');
  assert.deepEqual(d.date, { year: 2026, month: 10, day: 25 });
  assert.deepEqual(d.time, { hour: 19, minute: 0 });
  assert.equal(d.durationMinutes, 60);
  assert.equal(d.url, 'https://zoom.us/j/123');
  assert.equal(draftWallInput(d, today), '2026-10-25T19:00');
});

test('сдать эссе до пятницы — дедлайн до конца дня', () => {
  const d = parseQuickEvent('Сдать эссе до пятницы', today);
  assert.equal(d.type, 'assignment');
  assert.equal(d.title, 'Сдать эссе');
  assert.deepEqual(d.date, { year: 2026, month: 10, day: 30 });
  assert.equal(d.time, null);
  assert.equal(draftWallInput(d, today), '2026-10-30T23:59');
});

test('дата числом, месяц словом, год по ближайшему дню', () => {
  assert.deepEqual(parseQuickEvent('Экзамен 12.11', today).date, { year: 2026, month: 11, day: 12 });
  assert.deepEqual(parseQuickEvent('Экзамен 12.01', today).date, { year: 2027, month: 1, day: 12 });
  assert.deepEqual(parseQuickEvent('Экзамен 5 декабря в 10', today).date, { year: 2026, month: 12, day: 5 });
  assert.deepEqual(parseQuickEvent('Экзамен 5 декабря в 10', today).time, { hour: 10, minute: 0 });
  assert.deepEqual(parseQuickEvent('Exam 2026-12-01 9am', today).time, { hour: 9, minute: 0 });
  assert.deepEqual(parseQuickEvent('Exam Dec 3', today).date, { year: 2026, month: 12, day: 3 });
  assert.equal(parseQuickEvent('Экзамен 31.02', today).date, null);
});

test('английский ввод и длительность в минутах', () => {
  const d = parseQuickEvent('Lecture on Monday at 6:30pm 90 min', today);
  assert.equal(d.type, 'lesson');
  assert.equal(d.title, 'Lecture');
  assert.deepEqual(d.date, { year: 2026, month: 10, day: 26 });
  assert.deepEqual(d.time, { hour: 18, minute: 30 });
  assert.equal(d.durationMinutes, 90);
});

test('день недели — ближайший, сегодняшний считается', () => {
  assert.deepEqual(parseQuickEvent('Урок в субботу', today).date, today);
  assert.deepEqual(parseQuickEvent('Урок в вс', today).date, { year: 2026, month: 10, day: 25 });
  assert.deepEqual(parseQuickEvent('Урок через 3 дня', today).date, { year: 2026, month: 10, day: 27 });
});

test('без типа — дедлайн; ссылка на площадку вебинаров делает вебинаром', () => {
  assert.equal(parseQuickEvent('Отчёт по практике сегодня', today).type, 'deadline');
  assert.equal(parseQuickEvent('Встреча группы 20:00 https://meet.google.com/abc', today).type, 'webinar');
});

test('важность и полтора часа', () => {
  const d = parseQuickEvent('Контрольная !! завтра 1,5 часа', today);
  assert.equal(d.type, 'exam');
  assert.equal(d.priority, 'urgent');
  assert.equal(d.durationMinutes, 90);
  assert.equal(d.title, 'Контрольная');
});

test('календарные помощники', () => {
  assert.deepEqual(addDays({ year: 2026, month: 12, day: 31 }, 1), { year: 2027, month: 1, day: 1 });
  assert.equal(weekdayOf(today), 6);
});
