/** Письмо-напоминание (#18, npm test) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReminderEmail } from './reminderEmail';

const APP = 'https://myepa.ru';
const webinar = {
  type: 'webinar', title: 'SQL <основы>', startsAt: '2026-10-28T16:00:00Z', durationMinutes: 90,
  joinUrl: 'https://zoom.us/j/1', lessonUrl: 'javascript:alert(1)', materialsUrl: null,
};

test('вебинар через 15 минут: время в поясе ученика, ссылка входа, предложение записать', () => {
  const mail = buildReminderEmail({ event: webinar, kind: 'start', lang: 'ru', timeZone: 'Europe/Moscow', appUrl: APP });
  assert.equal(mail.subject, 'Вебинар «SQL <основы>» через 15 минут');
  assert.match(mail.html, /19:00/); // 16:00 UTC → 19:00 МСК
  assert.match(mail.html, /SQL &lt;основы&gt;/); // название экранировано
  assert.match(mail.html, /href="https:\/\/zoom\.us\/j\/1"/);
  assert.doesNotMatch(mail.html, /javascript:/); // небезопасная ссылка отброшена
  assert.match(mail.text, /Запишите вебинар/);
  assert.match(mail.text, /https:\/\/myepa\.ru\/settings/);
});

test('срок задания — на языке ученика, в его поясе; неизвестный язык — русский', () => {
  const task = { type: 'assignment', title: 'Essay', startsAt: '2026-10-29T20:59:00Z' };
  const en = buildReminderEmail({ event: task, kind: 'due', lang: 'en', timeZone: 'America/New_York', appUrl: APP });
  assert.match(en.subject, /^Assignment “Essay”: due /);
  assert.match(en.subject, /16:59/); // 20:59 UTC → 16:59 в Нью-Йорке
  assert.doesNotMatch(en.text, /record the webinar/i);
  const fallback = buildReminderEmail({ event: task, kind: 'due', lang: 'xx', timeZone: 'Not/AZone', appUrl: APP });
  assert.match(fallback.subject, /^Задание «Essay»: срок /);
});
