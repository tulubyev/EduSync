/**
 * Рассылка напоминаний о занятиях и сроках (#18, docs/REMINDERS.md). Запускается раз в минуту из server/index.ts.
 * Какие напоминания пора отправить — shared/reminders.ts; текст письма — reminderEmail.ts.
 * Каждое напоминание сначала «захватывается» вставкой в event_reminders (уникальный ключ), потом уходит письмо —
 * второй процесс или повтор после сбоя дубль не отправит.
 *
 *   REMINDERS_EMAIL=false — не отправлять напоминания
 */
import { and, eq, gt, inArray, lte } from 'drizzle-orm';
import { db } from '../../db';
import { eventReminders, learningEvents, userSettings, users } from '@shared/schema';
import { DEFAULT_ADVANCE_HOURS, MAX_ADVANCE_HOURS, dueReminders, reminderKey, type ReminderKind, type ReminderPrefs } from '@shared/reminders';
import { emailService } from '../emailService';
import { logger } from '../logger';
import { buildReminderEmail } from './reminderEmail';

const ENABLED = process.env.REMINDERS_EMAIL !== 'false';
/** Писем за один проход — защита от лавины после долгого простоя */
const MAX_PER_RUN = 200;

function appUrl(): string {
  const explicit = (process.env.APP_URL || '').replace(/\/+$/, '');
  return explicit || `https://${process.env.APP_DOMAIN || 'myepa.ru'}`;
}

export async function runReminders(now: Date = new Date()): Promise<number> {
  if (!ENABLED) return 0;
  const events = await db
    .select()
    .from(learningEvents)
    .where(and(
      eq(learningEvents.status, 'pending'),
      gt(learningEvents.startsAt, now),
      lte(learningEvents.startsAt, new Date(now.getTime() + MAX_ADVANCE_HOURS * 3_600_000)),
    ))
    .limit(5000);
  if (events.length === 0) return 0;

  const userIds = Array.from(new Set(events.map((e) => e.userId)));
  const settings = await db
    .select({ userId: userSettings.userId, enabled: userSettings.deadlineReminders, advance: userSettings.reminderAdvance })
    .from(userSettings)
    .where(inArray(userSettings.userId, userIds));
  const prefs = new Map<string, ReminderPrefs>(settings.map((s) => [s.userId, { enabled: s.enabled !== false, advanceHours: s.advance ?? DEFAULT_ADVANCE_HOURS }]));
  const prefsOf = (userId: string): ReminderPrefs => prefs.get(userId) ?? { enabled: true, advanceHours: DEFAULT_ADVANCE_HOURS };

  const sentRows = await db
    .select({ eventId: eventReminders.eventId, kind: eventReminders.kind, startsAt: eventReminders.startsAt })
    .from(eventReminders)
    .where(and(inArray(eventReminders.eventId, events.map((e) => e.id)), eq(eventReminders.channel, 'email')));
  const sent = new Set(sentRows.map((r) => reminderKey(r.eventId, r.kind as ReminderKind, r.startsAt)));

  const due = dueReminders(events, prefsOf, now.getTime(), sent).slice(0, MAX_PER_RUN);
  if (due.length === 0) return 0;

  const people = await db
    .select({ id: users.id, email: users.email, language: users.language, timezone: users.timezone })
    .from(users)
    .where(inArray(users.id, Array.from(new Set(due.map((d) => d.event.userId)))));
  const byId = new Map(people.map((p) => [p.id, p]));

  let count = 0;
  for (const { event, kind } of due) {
    const person = byId.get(event.userId);
    if (!person?.email) continue;
    const claimed = await db
      .insert(eventReminders)
      .values({ eventId: event.id, userId: event.userId, kind, startsAt: event.startsAt, channel: 'email' })
      .onConflictDoNothing()
      .returning({ id: eventReminders.id });
    if (claimed.length === 0) continue;
    const mail = buildReminderEmail({ event, kind, lang: person.language, timeZone: person.timezone, appUrl: appUrl() });
    const result = await emailService.sendEmail({ to: person.email, subject: mail.subject, html: mail.html, text: mail.text });
    if (result.success) count += 1;
    else logger.warn(`Reminder email failed for event ${event.id} (${kind}): ${result.error}`);
  }
  if (count > 0) logger.info(`Reminders: sent ${count} email(s)`);
  return count;
}
