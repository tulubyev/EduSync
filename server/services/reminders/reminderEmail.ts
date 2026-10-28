/**
 * Письмо-напоминание (#18): тема, HTML и текст на языке ученика, время — в его часовом поясе.
 * Чистая функция без базы и почты — её проверяют тесты.
 */
import { isLang, type Lang } from '@shared/languages';
import type { ReminderKind } from '@shared/reminders';

export interface ReminderEmailEvent {
  type: string;
  title: string;
  startsAt: Date | string;
  durationMinutes?: number | null;
  programTitle?: string | null;
  joinUrl?: string | null;
  lessonUrl?: string | null;
  materialsUrl?: string | null;
}

type Texts = {
  types: Record<string, string>;
  start: (type: string, title: string) => string;
  due: (type: string, title: string, when: string) => string;
  startsAt: string;
  dueAt: string;
  duration: (min: number) => string;
  join: string;
  lesson: string;
  materials: string;
  calendar: string;
  record: string;
  footer: string;
  settings: string;
};

const TEXTS: Record<Lang, Texts> = {
  ru: {
    types: { lesson: 'Урок', webinar: 'Вебинар', assignment: 'Задание', exam: 'Экзамен', deadline: 'Дедлайн' },
    start: (type, title) => `${type} «${title}» через 15 минут`,
    due: (type, title, when) => `${type} «${title}»: срок ${when}`,
    startsAt: 'Начало',
    dueAt: 'Срок',
    duration: (min) => `${min} мин`,
    join: 'Войти на вебинар',
    lesson: 'Открыть урок',
    materials: 'Материалы',
    calendar: 'Календарь My EPA',
    record: 'Не успеваете? Запишите вебинар в кабинете — посмотрите, когда удобно.',
    footer: 'Напоминания можно выключить или изменить в настройках кабинета:',
    settings: 'Настройки → Уведомления',
  },
  en: {
    types: { lesson: 'Lesson', webinar: 'Webinar', assignment: 'Assignment', exam: 'Exam', deadline: 'Deadline' },
    start: (type, title) => `${type} “${title}” starts in 15 minutes`,
    due: (type, title, when) => `${type} “${title}”: due ${when}`,
    startsAt: 'Starts',
    dueAt: 'Due',
    duration: (min) => `${min} min`,
    join: 'Join the webinar',
    lesson: 'Open the lesson',
    materials: 'Materials',
    calendar: 'My EPA calendar',
    record: 'Can’t make it? Record the webinar in your account and watch it when convenient.',
    footer: 'You can turn off or adjust reminders in your account settings:',
    settings: 'Settings → Notifications',
  },
  fr: {
    types: { lesson: 'Cours', webinar: 'Webinaire', assignment: 'Devoir', exam: 'Examen', deadline: 'Échéance' },
    start: (type, title) => `${type} « ${title} » dans 15 minutes`,
    due: (type, title, when) => `${type} « ${title} » : à rendre ${when}`,
    startsAt: 'Début',
    dueAt: 'Échéance',
    duration: (min) => `${min} min`,
    join: 'Rejoindre le webinaire',
    lesson: 'Ouvrir le cours',
    materials: 'Supports',
    calendar: 'Calendrier My EPA',
    record: 'Vous ne pourrez pas y être ? Enregistrez le webinaire depuis votre compte et regardez-le quand vous voulez.',
    footer: 'Vous pouvez désactiver ou modifier les rappels dans les paramètres de votre compte :',
    settings: 'Paramètres → Notifications',
  },
  de: {
    types: { lesson: 'Unterricht', webinar: 'Webinar', assignment: 'Aufgabe', exam: 'Prüfung', deadline: 'Frist' },
    start: (type, title) => `${type} „${title}“ beginnt in 15 Minuten`,
    due: (type, title, when) => `${type} „${title}“: fällig ${when}`,
    startsAt: 'Beginn',
    dueAt: 'Fällig',
    duration: (min) => `${min} Min.`,
    join: 'Am Webinar teilnehmen',
    lesson: 'Lektion öffnen',
    materials: 'Materialien',
    calendar: 'My EPA Kalender',
    record: 'Schaffen Sie es nicht? Zeichnen Sie das Webinar in Ihrem Konto auf und sehen Sie es sich später an.',
    footer: 'Erinnerungen können Sie in den Kontoeinstellungen ausschalten oder ändern:',
    settings: 'Einstellungen → Benachrichtigungen',
  },
  es: {
    types: { lesson: 'Clase', webinar: 'Webinar', assignment: 'Tarea', exam: 'Examen', deadline: 'Plazo' },
    start: (type, title) => `${type} «${title}» empieza en 15 minutos`,
    due: (type, title, when) => `${type} «${title}»: vence ${when}`,
    startsAt: 'Inicio',
    dueAt: 'Plazo',
    duration: (min) => `${min} min`,
    join: 'Entrar al webinar',
    lesson: 'Abrir la clase',
    materials: 'Materiales',
    calendar: 'Calendario de My EPA',
    record: '¿No llegas? Graba el webinar desde tu cuenta y míralo cuando te venga bien.',
    footer: 'Puedes desactivar o cambiar los recordatorios en los ajustes de tu cuenta:',
    settings: 'Ajustes → Notificaciones',
  },
  it: {
    types: { lesson: 'Lezione', webinar: 'Webinar', assignment: 'Compito', exam: 'Esame', deadline: 'Scadenza' },
    start: (type, title) => `${type} «${title}» tra 15 minuti`,
    due: (type, title, when) => `${type} «${title}»: scadenza ${when}`,
    startsAt: 'Inizio',
    dueAt: 'Scadenza',
    duration: (min) => `${min} min`,
    join: 'Entra nel webinar',
    lesson: 'Apri la lezione',
    materials: 'Materiali',
    calendar: 'Calendario My EPA',
    record: 'Non ce la fai? Registra il webinar dal tuo account e guardalo quando ti è comodo.',
    footer: 'Puoi disattivare o modificare i promemoria nelle impostazioni dell’account:',
    settings: 'Impostazioni → Notifiche',
  },
};

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Только http(s): ссылка из события не должна стать javascript: в письме */
const safeUrl = (u?: string | null) => (u && /^https?:\/\//i.test(u) ? u : null);

const LOCALES: Record<Lang, string> = { ru: 'ru-RU', en: 'en-GB', fr: 'fr-FR', de: 'de-DE', es: 'es-ES', it: 'it-IT' };

export function formatWhen(at: Date | string, lang: Lang, timeZone: string): string {
  const opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' };
  try {
    return new Date(at).toLocaleString(LOCALES[lang], { ...opts, timeZone });
  } catch {
    return new Date(at).toLocaleString(LOCALES[lang], { ...opts, timeZone: 'Europe/Moscow' });
  }
}

export function buildReminderEmail(opts: {
  event: ReminderEmailEvent;
  kind: ReminderKind;
  lang: string | null | undefined;
  timeZone: string | null | undefined;
  appUrl: string;
}): { subject: string; html: string; text: string } {
  const lang: Lang = isLang(opts.lang) ? opts.lang : 'ru';
  const t = TEXTS[lang];
  const e = opts.event;
  const tz = opts.timeZone || 'Europe/Moscow';
  const when = formatWhen(e.startsAt, lang, tz);
  const type = t.types[e.type] ?? e.type;
  const subject = opts.kind === 'start' ? t.start(type, e.title) : t.due(type, e.title, when);

  const rows: Array<[string, string]> = [[opts.kind === 'start' || e.type === 'lesson' || e.type === 'webinar' ? t.startsAt : t.dueAt, when]];
  if (e.durationMinutes && e.durationMinutes > 0 && opts.kind === 'start') rows.push(['', t.duration(e.durationMinutes)]);
  if (e.programTitle) rows.push(['', e.programTitle]);

  const links: Array<[string, string]> = [];
  const join = safeUrl(e.joinUrl);
  const lesson = safeUrl(e.lessonUrl);
  const materials = safeUrl(e.materialsUrl);
  if (join) links.push([t.join, join]);
  if (lesson) links.push([t.lesson, lesson]);
  if (materials) links.push([t.materials, materials]);
  links.push([t.calendar, `${opts.appUrl}/calendar`]);
  const offerRecording = opts.kind === 'start' && e.type === 'webinar' && !!join;

  const html = `<!doctype html><html lang="${lang}"><body style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.5">
<h2 style="margin:0 0 12px;font-size:18px">${esc(subject)}</h2>
<p style="margin:0 0 12px">${rows.map(([k, v]) => (k ? `<strong>${esc(k)}:</strong> ${esc(v)}` : esc(v))).join('<br>')}</p>
<p style="margin:0 0 12px">${links.map(([label, url]) => `<a href="${esc(url)}" style="color:#7c3aed">${esc(label)}</a>`).join(' · ')}</p>
${offerRecording ? `<p style="margin:0 0 12px"><a href="${esc(opts.appUrl)}/home" style="color:#7c3aed">${esc(t.record)}</a></p>` : ''}
<p style="margin:16px 0 0;font-size:12px;color:#6b7280">${esc(t.footer)} <a href="${esc(opts.appUrl)}/settings" style="color:#6b7280">${esc(t.settings)}</a></p>
</body></html>`;

  const text = [
    subject,
    '',
    ...rows.map(([k, v]) => (k ? `${k}: ${v}` : v)),
    '',
    ...links.map(([label, url]) => `${label}: ${url}`),
    ...(offerRecording ? ['', `${t.record} ${opts.appUrl}/home`] : []),
    '',
    `${t.footer} ${opts.appUrl}/settings`,
  ].join('\n');

  return { subject, html, text };
}
