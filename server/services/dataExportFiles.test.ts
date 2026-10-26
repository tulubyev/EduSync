/** Выгрузка данных ученика (#44, npm test) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildExportEntries, toCsv } from './dataExportFiles';

const now = new Date('2026-10-26T10:00:00Z');
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]).toString('base64');

const bundle = {
  language: 'de',
  profileImage: png,
  profile: { id: 'u1', email: 'a@b.c', firstName: 'Anna', passwordHash: '$2b$12$secret', calendarToken: 'tok-secret', profileImage: png },
  settings: { theme: 'dark' },
  courses: [{ id: 'c1', title: '=HYPERLINK("http://evil")', status: 'in_progress', tags: ['a', 'b'] }],
  events: [{ id: 'e1', type: 'webinar', title: 'Python, Teil 2', startsAt: new Date('2026-10-27T16:00:00Z'), durationMinutes: 60, status: 'pending', joinUrl: 'https://zoom.us/j/1', courseTitle: null }],
  library: [{ id: 'n1', content: 'Notiz' }],
  studySessions: [],
  recordings: [{ id: 'r1', title: 'Webinar', streamUrl: 'https://x', streamPassword: 'pw-secret', workerId: 'w1' }],
  platformConnections: [{ id: 'p1', platformName: 'Stepik', accessTokenEncrypted: 'enc-secret', refreshTokenEncrypted: 'enc2-secret' }],
  subscriptions: [{ id: 's1', planName: 'Pro', yoomoneyPaymentMethodId: 'pm-secret' }],
  payments: [{ id: 'pay1', amount: '990.00', alfabankOrderId: 'o1' }],
  legacyPlatformDeadlines: [{ id: 'cd1', title: 'Old deadline' }],
};

test('в архиве все разделы, README на языке ученика, фото — файлом', () => {
  const entries = buildExportEntries(bundle, now);
  const names = entries.map((e) => e.name);
  for (const n of ['README.txt', 'profile.json', 'settings.json', 'courses.json', 'courses.csv', 'events.json', 'events.csv', 'calendar.ics',
    'library.json', 'study-sessions.json', 'recordings.json', 'platforms.json', 'subscriptions.json', 'payments.json', 'platform-deadlines-legacy.json', 'profile-image.png']) {
    assert.ok(names.includes(n), n);
  }
  const readme = String(entries.find((e) => e.name === 'README.txt')!.data);
  assert.match(readme, /Ihre My-EPA-Daten, Stand 2026-10-26/);
  assert.match(String(entries.find((e) => e.name === 'calendar.ics')!.data), /SUMMARY:Webinar: Python\\, Teil 2/);
});

test('секреты не попадают ни в один файл', () => {
  const all = buildExportEntries(bundle, now).map((e) => (typeof e.data === 'string' ? e.data : e.data.toString('latin1'))).join('\n');
  for (const secret of ['$2b$12$secret', 'tok-secret', 'pw-secret', 'enc-secret', 'enc2-secret', 'pm-secret', 'passwordHash', 'calendarToken', 'workerId']) {
    assert.ok(!all.includes(secret), secret);
  }
  // фото не дублируется base64-строкой в profile.json
  assert.ok(!String(buildExportEntries(bundle, now).find((e) => e.name === 'profile.json')!.data).includes(png));
});

test('CSV: BOM, кавычки, массивы и защита от формул', () => {
  const csv = toCsv([{ a: '=1+1', b: 'x, "y"', c: ['t1', 't2'], d: null, e: new Date('2026-01-01T00:00:00Z') }], ['a', 'b', 'c', 'd', 'e']);
  assert.ok(csv.startsWith('﻿a,b,c,d,e\r\n'));
  assert.equal(csv.split('\r\n')[1], `'=1+1,"x, ""y""","t1; t2",,2026-01-01T00:00:00.000Z`);
});
