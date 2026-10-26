/**
 * Лента событий ученика в формате iCalendar (RFC 5545) — для подписки в Google, Яндекс, Apple и Outlook (#18).
 * Чистая функция: на входе события из learning_events, на выходе текст .ics. Время — в UTC (…Z).
 */
import type { EventType } from "@shared/learningEvents";
import { pickLang, type Lang } from "@shared/languages";

export interface FeedEvent {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  startsAt: Date;
  durationMinutes?: number | null;
  status: string;
  courseTitle?: string | null;
  programTitle?: string | null;
  moduleTitle?: string | null;
  lessonUrl?: string | null;
  materialsUrl?: string | null;
  joinUrl?: string | null;
  updatedAt?: Date | null;
}

const LABELS: Record<Lang, Record<EventType, string> & { course: string; lesson: string; materials: string; join: string; calendar: string }> = {
  ru: { lesson: 'Урок', webinar: 'Вебинар', assignment: 'Задание', exam: 'Экзамен', deadline: 'Дедлайн', course: 'Курс', materials: 'Материалы', join: 'Вход на вебинар', calendar: 'My EPA — учёба' },
  en: { lesson: 'Lesson', webinar: 'Webinar', assignment: 'Assignment', exam: 'Exam', deadline: 'Deadline', course: 'Course', materials: 'Materials', join: 'Join the webinar', calendar: 'My EPA — learning' },
  fr: { lesson: 'Leçon', webinar: 'Webinaire', assignment: 'Devoir', exam: 'Examen', deadline: 'Échéance', course: 'Cours', materials: 'Ressources', join: 'Rejoindre le webinaire', calendar: 'My EPA — formation' },
  de: { lesson: 'Lektion', webinar: 'Webinar', assignment: 'Aufgabe', exam: 'Prüfung', deadline: 'Frist', course: 'Kurs', materials: 'Materialien', join: 'Zum Webinar', calendar: 'My EPA — Lernen' },
  es: { lesson: 'Clase', webinar: 'Webinar', assignment: 'Tarea', exam: 'Examen', deadline: 'Plazo', course: 'Curso', materials: 'Materiales', join: 'Entrar al webinar', calendar: 'My EPA — estudio' },
  it: { lesson: 'Lezione', webinar: 'Webinar', assignment: 'Compito', exam: 'Esame', deadline: 'Scadenza', course: 'Corso', materials: 'Materiali', join: 'Entra nel webinar', calendar: 'My EPA — studio' },
};

/** Без своей длительности: уроки и вебинары — час, сроки — 30 минут до срока (событие заканчивается в момент дедлайна) */
const DEFAULT_MINUTES = 60;
const DUE_MINUTES = 30;
const DUE_TYPES = new Set(['assignment', 'exam', 'deadline']);

const pad = (n: number) => String(n).padStart(2, '0');
export const icsDate = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

/** Экранирование текста (RFC 5545, 3.3.11) */
export const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Перенос строк длиннее 75 октетов (RFC 5545, 3.1): продолжение начинается с пробела, символы UTF-8 не режутся */
export function foldLine(line: string): string {
  const out: string[] = [];
  let current = '';
  let bytes = 0;
  for (const ch of line) {
    const size = Buffer.byteLength(ch, 'utf8');
    const limit = out.length === 0 ? 75 : 74; // у продолжения первый октет — пробел
    if (bytes + size > limit) {
      out.push(current);
      current = '';
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  out.push(current);
  return out.join('\r\n ');
}

/** Только http(s): в ленту не попадают javascript: и прочие схемы */
const safeUrl = (u?: string | null) => (u && /^https?:\/\/\S+$/i.test(u) ? u : null);

export function buildIcsFeed(events: FeedEvent[], opts: { lang?: string | null; now?: Date; host?: string } = {}): string {
  const lang = pickLang([opts.lang ?? '']);
  const t = LABELS[lang];
  const stamp = icsDate(opts.now ?? new Date());
  const host = opts.host ?? 'myepa.ru';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//My EPA//Learning calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsText(t.calendar)}`,
    'X-WR-TIMEZONE:UTC',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
  ];

  for (const e of events) {
    const due = DUE_TYPES.has(e.type);
    const minutes = e.durationMinutes && e.durationMinutes > 0 ? e.durationMinutes : due ? DUE_MINUTES : DEFAULT_MINUTES;
    // у срока без длительности событие заканчивается в момент дедлайна
    const start = due && !e.durationMinutes ? new Date(e.startsAt.getTime() - minutes * 60_000) : e.startsAt;
    const end = new Date(start.getTime() + minutes * 60_000);
    const label = (t as Record<string, string>)[e.type] ?? t.deadline;
    const summary = `${e.status === 'completed' ? '✓ ' : ''}${label}: ${e.title}`;

    const lesson = safeUrl(e.lessonUrl);
    const materials = safeUrl(e.materialsUrl);
    const join = safeUrl(e.joinUrl);
    const course = [e.courseTitle ?? e.programTitle, e.moduleTitle].filter(Boolean).join(' / ');
    const details = [
      course && `${t.course}: ${course}`,
      join && `${t.join}: ${join}`,
      lesson && `${t.lesson}: ${lesson}`,
      materials && `${t.materials}: ${materials}`,
      e.description?.trim(),
    ].filter(Boolean).join('\n');

    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.id}@${host}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsDate(start)}`,
      `DTEND:${icsDate(end)}`,
      `SUMMARY:${icsText(summary)}`,
    );
    if (details) lines.push(`DESCRIPTION:${icsText(details)}`);
    const url = join ?? lesson ?? materials;
    if (url) lines.push(`URL:${url}`);
    if (join) lines.push(`LOCATION:${icsText(join)}`);
    if (e.updatedAt) lines.push(`LAST-MODIFIED:${icsDate(e.updatedAt)}`);
    // уроки и вебинары занимают время в календаре, сроки — нет
    lines.push(`STATUS:${e.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}`, `TRANSP:${due ? 'TRANSPARENT' : 'OPAQUE'}`, 'END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
