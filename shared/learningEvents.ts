/**
 * События обучения (#17): типы и быстрый ввод одной строкой.
 * Общий код клиента и сервера: «Вебинар по Python завтра в 19:00 1ч https://zoom.us/j/1» → черновик события.
 * Дата и время в черновике — на часах ученика; в UTC переводит вызывающий код (часовой пояс знает только он).
 */

export const EVENT_TYPES = ['lesson', 'webinar', 'assignment', 'exam', 'deadline'] as const;
export type EventType = typeof EVENT_TYPES[number];

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  lesson: 'Урок',
  webinar: 'Вебинар',
  assignment: 'Задание',
  exam: 'Экзамен',
  deadline: 'Дедлайн',
};

/** Типы со сроком сдачи: показываются в «Дедлайнах», без времени — до конца дня */
export const DUE_TYPES: readonly EventType[] = ['assignment', 'exam', 'deadline'];

export const EVENT_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type EventPriority = typeof EVENT_PRIORITIES[number];

export interface WallDate { year: number; month: number; day: number } // month — 1..12
export interface WallTime { hour: number; minute: number }

export interface QuickEventDraft {
  type: EventType;
  title: string;
  date: WallDate | null;
  time: WallTime | null;
  durationMinutes: number | null;
  url: string | null;
  priority: EventPriority;
}

// Границы слова для кириллицы и латиницы: \b в JS кириллицу не понимает
const B = '(?<![\\p{L}\\d])';
const E = '(?![\\p{L}\\d])';
const re = (body: string) => new RegExp(B + body + E, 'iu');

// Ключевые слова: русский, английский, французский, немецкий, испанский, итальянский
const TYPE_RULES: Array<[EventType, RegExp]> = [
  ['webinar', re('(?:вебинар\\p{L}*|webinars?|webinaires?|webinarios?|трансляци\\p{L}*|эфир\\p{L}*|stream|zoom|meet|live)')],
  ['exam', re('(?:экзамен\\p{L}*|зач[её]т\\p{L}*|контрольн\\p{L}*|тест\\p{L}*|exams?|tests?|quiz|examens?|exámen(?:es)?|examen|prüfung\\p{L}*|klausur\\p{L}*|esam[ei]|partiel)')],
  ['lesson', re('(?:урок\\p{L}*|заняти\\p{L}*|лекци\\p{L}*|семинар\\p{L}*|lessons?|lectures?|class|seminar|cours|leçons?|lektion\\p{L}*|vorlesung\\p{L}*|unterricht|clases?|lecci[oó]n(?:es)?|lezion[ei]|corso)')],
  ['assignment', re('(?:задани\\p{L}*|дз|домашк\\p{L}*|эссе|проект\\p{L}*|homework|assignments?|hw|essay|project|devoirs?|projet|hausaufgabe\\p{L}*|aufgabe\\p{L}*|projekt|tareas?|deberes|proyecto|compit[oi]|progetto)')],
  ['deadline', re('(?:дедлайн\\p{L}*|сдать|deadline|due|échéance|rendre|frist|abgabe|plazo|entregar|scadenza|consegnare)')],
];

const WEBINAR_HOSTS = /zoom\.us|meet\.google|teams\.microsoft|teams\.live|mts-link|webinar\.ru|ktalk|telemost|jazz\.sber|bbb|webinar/i;

// Месяцы по началу слова; «mai» — май по-французски и по-немецки, «ma[йя]» — по-русски
const MONTHS: Array<[RegExp, number]> = [
  [/^(янв|jan|gen|ene)/i, 1], [/^(фев|feb|fév|fev)/i, 2], [/^(мар|mar|mär)/i, 3], [/^(апр|apr|avr|abr)/i, 4],
  [/^(ма[йя]|may|mai|mag)/i, 5], [/^(июн|jun|juin|giu)/i, 6], [/^(июл|jul|juil|lug)/i, 7], [/^(авг|aug|aoû|aou|ago)/i, 8],
  [/^(сен|sep|set)/i, 9], [/^(окт|oct|okt|ott)/i, 10], [/^(ноя|nov)/i, 11], [/^(дек|dec|déc|dez|dic)/i, 12],
];
const MONTH_WORD = '(янв\\p{L}*|фев\\p{L}*|мар\\p{L}*|апр\\p{L}*|ма[йя]\\p{L}*|июн\\p{L}*|июл\\p{L}*|авг\\p{L}*|сен\\p{L}*|окт\\p{L}*|ноя\\p{L}*|дек\\p{L}*'
  + '|jan\\p{L}*|feb\\p{L}*|mar\\p{L}*|apr\\p{L}*|may|jun\\p{L}*|jul\\p{L}*|aug\\p{L}*|sep\\p{L}*|oct\\p{L}*|nov\\p{L}*|dec\\p{L}*'
  + '|janvier|févr\\p{L}*|fevr\\p{L}*|mars|avril|mai|juin|juil\\p{L}*|août|aout|sept\\p{L}*|octobre|novembre|déc\\p{L}*'
  + '|januar|februar|märz|maerz|april|juni|juli|august|oktober|dezember'
  + '|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre'
  + '|gennaio|febbraio|aprile|maggio|giugno|luglio|settembre|ottobre|dicembre)\\.?';

// 0 — воскресенье, как у Date.getUTCDay(); формы «в пятницу», «до пятницы», «к пятнице»
const WEEKDAYS: Array<[RegExp, number]> = [
  [new RegExp('^(понедельник\\p{L}*|пн|monday|mon|lundi|montag|lunes|luned[iì])$', 'iu'), 1],
  [new RegExp('^(вторник\\p{L}*|вт|tuesday|tues?|mardi|dienstag|martes|marted[iì])$', 'iu'), 2],
  [new RegExp('^(сред\\p{L}*|ср|wednesday|wed|mercredi|mittwoch|mi[eé]rcoles|mercoled[iì])$', 'iu'), 3],
  [new RegExp('^(четверг\\p{L}*|чт|thursday|thu|thurs?|jeudi|donnerstag|jueves|gioved[iì])$', 'iu'), 4],
  [new RegExp('^(пятниц\\p{L}*|пт|friday|fri|vendredi|freitag|viernes|venerd[iì])$', 'iu'), 5],
  [new RegExp('^(суббот\\p{L}*|сб|saturday|sat|samedi|samstag|sonnabend|s[aá]bado|sabato)$', 'iu'), 6],
  [new RegExp('^(воскресень\\p{L}*|вс|sunday|sun|dimanche|sonntag|domingo|domenica)$', 'iu'), 0],
];
const WEEKDAY_WORD = '(понедельник\\p{L}*|пн|вторник\\p{L}*|вт|сред[аыуе]|ср|четверг\\p{L}*|чт|пятниц\\p{L}*|пт|суббот\\p{L}*|сб|воскресень\\p{L}*|вс'
  + '|monday|mon|tuesday|tues?|wednesday|wed|thursday|thu|thurs?|friday|fri|saturday|sat|sunday|sun'
  + '|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche'
  + '|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonnabend|sonntag'
  + '|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo'
  + '|luned[iì]|marted[iì]|mercoled[iì]|gioved[iì]|venerd[iì]|sabato|domenica)';
// предлог перед датой уходит вместе с ней: «в пятницу», «до 25.10», «by friday», «avant vendredi», «am Freitag», «para el lunes», «entro venerdì»
const DATE_PREFIX = '(?:(?:в|во|до|к|ко|на|by|on|until|till|le|pour|avant|d\\x27ici|am|bis|zum|el|para(?:\\s+el)?|hasta(?:\\s+el)?|antes\\s+del|il|per|entro(?:\\s+il)?)\\s+)?';
// «в 19:00», «at 7», «à 19h», «um 19 Uhr», «a las 19», «alle 19»
const AT = '(?:в|at|à|a|um|a\\s+las|alle|ore)';

export function addDays(d: WallDate, days: number): WallDate {
  const t = new Date(Date.UTC(d.year, d.month - 1, d.day + days));
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() };
}

export function weekdayOf(d: WallDate): number {
  return new Date(Date.UTC(d.year, d.month - 1, d.day)).getUTCDay();
}

function isValidDate(d: WallDate): boolean {
  const t = new Date(Date.UTC(d.year, d.month - 1, d.day));
  return t.getUTCFullYear() === d.year && t.getUTCMonth() === d.month - 1 && t.getUTCDate() === d.day;
}

const cmp = (a: WallDate, b: WallDate) => (a.year - b.year) || (a.month - b.month) || (a.day - b.day);

/** День и месяц без года: ближайший такой день, начиная с сегодняшнего */
function nearest(day: number, month: number, today: WallDate): WallDate | null {
  let d: WallDate = { year: today.year, month, day };
  if (!isValidDate(d)) d = { year: today.year + 1, month, day };
  else if (cmp(d, today) < 0) d = { year: today.year + 1, month, day };
  return isValidDate(d) ? d : null;
}

/** Разбор строки быстрого ввода. today — сегодняшняя дата на часах ученика. */
export function parseQuickEvent(text: string, today: WallDate): QuickEventDraft {
  let rest = ` ${text.trim()} `;
  const take = (r: RegExp): RegExpExecArray | null => {
    const m = r.exec(rest);
    if (m) rest = rest.slice(0, m.index) + ' ' + rest.slice(m.index + m[0].length);
    return m;
  };

  const urlMatch = take(/https?:\/\/[^\s<>"]+/i);
  const url = urlMatch ? urlMatch[0].replace(/[),.;]+$/, '') : null;

  let priority: EventPriority = 'medium';
  if (take(/(?<=\s)!!(?=\s)/)) priority = 'urgent';
  else if (take(/(?<=\s)!(?=\s)/) || take(re('(?:важно|срочно|important|urgent|wichtig|dringend|importante|urgente)'))) priority = 'high';

  // время по-французски и по-немецки — раньше длительности, иначе «19h» станет девятнадцатью часами:
  // «à 19h», «à 19h30», «19h30», «um 19 Uhr», «19:30 Uhr»
  let time: WallTime | null = null;
  let m = take(new RegExp(`${B}${AT}\\s+([01]?\\d|2[0-3])(?:[h:]([0-5]\\d)?|\\s*uhr)${E}`, 'iu'))
    ?? take(new RegExp(`${B}([01]?\\d|2[0-3])h([0-5]\\d)${E}`, 'iu'))
    ?? take(new RegExp(`${B}([01]?\\d|2[0-3])(?::([0-5]\\d))?\\s*uhr${E}`, 'iu'));
  if (m) time = { hour: Number(m[1]), minute: Number(m[2] ?? 0) };

  // длительность: «1ч», «1,5 часа», «90 мин», «1h30», «2 hours», «2 heures», «2 Stunden», «2 horas», «2 ore»
  let durationMinutes: number | null = null;
  m = take(new RegExp(`${B}(?:на\\s+)?(\\d+)\\s*(?:ч|h)\\s*(\\d{1,2})\\s*(?:мин\\p{L}*|m|min)?${E}`, 'iu'));
  if (m) durationMinutes = Number(m[1]) * 60 + Number(m[2]);
  if (!m && (m = take(new RegExp(`${B}(?:на\\s+)?(\\d+(?:[.,]\\d+)?)\\s*(?:ч|час\\p{L}*|h|hrs?|hours?|heures?|stunden?|std|horas?|or[ae])${E}`, 'iu')))) {
    durationMinutes = Math.round(Number(m[1].replace(',', '.')) * 60);
  }
  if (!m && (m = take(new RegExp(`${B}(?:на\\s+)?(\\d+)\\s*(?:мин\\p{L}*|m|min|mins|minutes?|minuten?|minutos?|minuti)${E}`, 'iu')))) {
    durationMinutes = Number(m[1]);
  }

  // время: «7pm», «19:00», «в 19:00»; «в 19» — после даты, чтобы не спутать с «в пятницу»
  if (time) { /* уже найдено выше */ } else if ((m = take(new RegExp(`${B}(?:${AT}\\s+)?(\\d{1,2})(?::(\\d{2}))?\\s*(am|pm)${E}`, 'iu')))) {
    let h = Number(m[1]) % 12;
    if (m[3].toLowerCase() === 'pm') h += 12;
    time = { hour: h, minute: Number(m[2] ?? 0) };
  } else if ((m = take(new RegExp(`${B}(?:${AT}\\s+)?([01]?\\d|2[0-3]):([0-5]\\d)${E}`, 'iu')))) {
    time = { hour: Number(m[1]), minute: Number(m[2]) };
  }

  let date: WallDate | null = null;
  if ((m = take(new RegExp(`${B}${DATE_PREFIX}(\\d{4})-(\\d{2})-(\\d{2})${E}`, 'iu')))) {
    const d = { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
    if (isValidDate(d)) date = d;
  } else if ((m = take(new RegExp(`${B}${DATE_PREFIX}(\\d{1,2})\\.(\\d{1,2})(?:\\.(\\d{2}|\\d{4}))?${E}`, 'iu')))) {
    const day = Number(m[1]), month = Number(m[2]);
    if (m[3]) {
      const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
      if (isValidDate({ year, month, day })) date = { year, month, day };
    } else date = nearest(day, month, today);
  } else if ((m = take(new RegExp(`${B}${DATE_PREFIX}(\\d{1,2})\\.?\\s+(?:de\\s+)?${MONTH_WORD}${E}`, 'iu')))) {
    const month = MONTHS.find(([r]) => r.test(m![2]))?.[1];
    if (month) date = nearest(Number(m[1]), month, today);
  } else if ((m = take(new RegExp(`${B}${DATE_PREFIX}${MONTH_WORD}\\s+(\\d{1,2})${E}`, 'iu')))) {
    const month = MONTHS.find(([r]) => r.test(m![1]))?.[1];
    if (month) date = nearest(Number(m[2]), month, today);
  } else if ((m = take(re('(?:послезавтра|day after tomorrow|après-demain|apres-demain|übermorgen|pasado\\s+mañana|dopodomani)')))) {
    date = addDays(today, 2);
  } else if ((m = take(re('(?:на\\s+)?(?:завтра|tomorrow|demain|morgen|mañana|domani)')))) {
    date = addDays(today, 1);
  } else if ((m = take(re('(?:на\\s+)?(?:сегодня|today|tonight|aujourd[\x27’]hui|ce\\s+soir|heute|hoy|oggi|stasera)')))) {
    date = today;
  } else if ((m = take(new RegExp(`${B}(?:через|in|dans|en|tra|fra)\\s+(\\d+)\\s*(?:дн\\p{L}*|день|days?|jours?|tagen?|d[ií]as|giorni)${E}`, 'iu')))) {
    date = addDays(today, Number(m[1]));
  } else if ((m = take(new RegExp(`${B}${DATE_PREFIX}${WEEKDAY_WORD}${E}`, 'iu')))) {
    const wd = WEEKDAYS.find(([r]) => r.test(m![1]))?.[1];
    if (wd !== undefined) date = addDays(today, (wd - weekdayOf(today) + 7) % 7);
  }

  if (!time && (m = take(new RegExp(`${B}${AT}\\s+([01]?\\d|2[0-3])${E}(?!\\s*[.:])`, 'iu')))) {
    time = { hour: Number(m[1]), minute: 0 };
  }

  const typeSource = text.replace(/https?:\/\/[^\s<>"]+/gi, ' ');
  let type: EventType = TYPE_RULES.find(([, r]) => r.test(typeSource))?.[0] ?? 'deadline';
  if (url && WEBINAR_HOSTS.test(url) && type === 'deadline') type = 'webinar';

  const title = rest
    .replace(/\s+/g, ' ')
    .replace(new RegExp(`(?:\\s+(?:в|во|до|к|на|by|on|at|until|à|le|pour|avant|am|um|bis|el|para|a|las|hasta|il|per|entro|alle|de))+\\s*$`, 'iu'), '')
    .replace(/^[\s,;:—–-]+|[\s,;:—–-]+$/g, '')
    .trim();

  return { type, title, date, time, durationMinutes, url, priority };
}

/** Время по умолчанию, если в строке его нет: срок сдачи — до конца дня, урок и вебинар — 10:00 */
export function defaultTimeFor(type: EventType): WallTime {
  return DUE_TYPES.includes(type) ? { hour: 23, minute: 59 } : { hour: 10, minute: 0 };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Черновик → «2026-10-25T19:00» на часах ученика (для поля datetime-local и перевода в UTC) */
export function draftWallInput(draft: QuickEventDraft, today: WallDate): string {
  const d = draft.date ?? today;
  const t = draft.time ?? defaultTimeFor(draft.type);
  return `${d.year}-${pad(d.month)}-${pad(d.day)}T${pad(t.hour)}:${pad(t.minute)}`;
}
