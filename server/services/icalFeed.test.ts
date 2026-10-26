/** Лента .ics для подписки в календарях (npm test) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildIcsFeed, foldLine, icsText } from './icalFeed';

const now = new Date('2026-10-26T10:00:00Z');
const base = { status: 'pending', updatedAt: now };

test('вебинар: время в UTC, ссылка входа — в LOCATION и URL, подписи на языке ученика', () => {
  const ics = buildIcsFeed([{
    ...base, id: 'e1', type: 'webinar', title: 'Python', startsAt: new Date('2026-10-27T16:00:00Z'), durationMinutes: 90,
    courseTitle: 'Python с нуля', joinUrl: 'https://zoom.us/j/1', lessonUrl: 'https://school.example/l/1',
  }], { lang: 'de', now });
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  assert.match(ics, /\r\nDTSTART:20261027T160000Z\r\n/);
  assert.match(ics, /\r\nDTEND:20261027T173000Z\r\n/);
  assert.match(ics, /\r\nSUMMARY:Webinar: Python\r\n/);
  assert.match(ics, /\r\nURL:https:\/\/zoom.us\/j\/1\r\n/);
  assert.match(ics, /\r\nLOCATION:https:\/\/zoom.us\/j\/1\r\n/);
  assert.match(ics, /Kurs: Python с нуля/);
  assert.match(ics, /\r\nTRANSP:OPAQUE\r\n/);
  assert.match(ics, /\r\nUID:e1@myepa.ru\r\n/);
});

test('дедлайн без длительности заканчивается в момент срока и не занимает время', () => {
  const ics = buildIcsFeed([{ ...base, id: 'd1', type: 'deadline', title: 'Эссе', startsAt: new Date('2026-10-30T20:59:00Z') }], { lang: 'ru', now });
  assert.match(ics, /\r\nDTSTART:20261030T202900Z\r\n/);
  assert.match(ics, /\r\nDTEND:20261030T205900Z\r\n/);
  assert.match(ics, /\r\nSUMMARY:Дедлайн: Эссе\r\n/);
  assert.match(ics, /\r\nTRANSP:TRANSPARENT\r\n/);
});

test('выполненное отмечено, отменённое — STATUS:CANCELLED, опасные ссылки не попадают в ленту', () => {
  const ics = buildIcsFeed([
    { ...base, id: 'a', type: 'assignment', title: 'Задача', startsAt: now, status: 'completed' },
    { ...base, id: 'b', type: 'lesson', title: 'Урок', startsAt: now, status: 'cancelled', lessonUrl: 'javascript:alert(1)' },
  ], { lang: 'en', now });
  assert.match(ics, /SUMMARY:✓ Assignment: Задача/);
  assert.match(ics, /\r\nSTATUS:CANCELLED\r\n/);
  assert.doesNotMatch(ics, /javascript/);
});

test('экранирование текста и перенос длинных строк по 75 октетов без разрыва символов', () => {
  assert.equal(icsText('a,b;c\\d\ne'), 'a\\,b\\;c\\\\d\\ne');
  const long = 'SUMMARY:' + 'Длинное название урока '.repeat(10);
  const folded = foldLine(long);
  for (const part of folded.split('\r\n')) assert.ok(Buffer.byteLength(part, 'utf8') <= 75, part);
  assert.equal(folded.split('\r\n').map((p, i) => (i ? p.slice(1) : p)).join(''), long);
});
