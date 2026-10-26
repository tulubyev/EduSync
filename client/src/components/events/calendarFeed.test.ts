/** Ссылки подписки на ленту .ics (npm test) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { feedUrl, googleAddUrl, webcalUrl } from './calendarFeedLinks';

test('адрес ленты, webcal и «Добавить в Google Calendar»', () => {
  const url = feedUrl('abc_DEF-123', 'https://myepa.ru');
  assert.equal(url, 'https://myepa.ru/api/calendar/abc_DEF-123.ics');
  assert.equal(webcalUrl(url), 'webcal://myepa.ru/api/calendar/abc_DEF-123.ics');
  assert.equal(googleAddUrl(url), 'https://calendar.google.com/calendar/r?cid=webcal%3A%2F%2Fmyepa.ru%2Fapi%2Fcalendar%2Fabc_DEF-123.ics');
});
