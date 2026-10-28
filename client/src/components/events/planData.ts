/**
 * Данные для плана недели (#20): события календаря → вход планировщика (shared/weekPlan.ts) в часах ученика.
 * Занято: уроки, вебинары и экзамены (вебинар, который записывается, не занимает время — ученик его не смотрит вживую),
 * а также задание со временем и длительностью. Задачи: задания и сроки без длительности, подготовка к экзамену.
 */
import { buildWeekPlan, type PlanBusy, type PlanTask, type WeekPlan } from '@shared/weekPlan';
import { weekdayOf } from '@shared/learningEvents';
import { wallClock, type SchedulePrefs } from '@shared/recordingHints';
import { resolveTimeZone, type TimeZoneChoice } from '../recording/timezones';
import type { LearningEventDto } from './eventsApi';
import { fromKey, shiftKey, toKey, todayIn, type DayKey } from './eventTime';
import { isDueOnly } from './weekLayout';

/** Дней в плане и на сколько вперёд смотрим сроки (срок дальше плана — работа раскладывается, без предупреждения) */
export const PLAN_DAYS = 7;
export const PLAN_LOOKAHEAD_DAYS = 14;
/** Оценка работы по задаче, минуты: от площадок длительности пока нет */
export const ESTIMATE_MINUTES: Record<string, number> = { assignment: 60, deadline: 30, exam: 120 };
const DEFAULT_MINUTES = 60;
const FIXED_TYPES = new Set(['lesson', 'webinar', 'exam']);

export interface PlanItem extends PlanTask {
  event: LearningEventDto;
  /** Подготовка к экзамену, а не само событие */
  prep: boolean;
}

const isoWeekday = (key: DayKey) => { const wd = weekdayOf(fromKey(key)); return wd === 0 ? 7 : wd; };

/** Отрезок события в часах ученика; через полночь — на два дня */
function busyOf(e: LearningEventDto, tz: string): PlanBusy[] {
  const start = new Date(e.startsAt).getTime();
  const minutes = e.durationMinutes && e.durationMinutes > 0 ? e.durationMinutes : DEFAULT_MINUTES;
  const from = wallClock(start, tz);
  const to = wallClock(start + minutes * 60_000 - 1, tz);
  if (from.dayKey === to.dayKey) return [{ day: from.dayKey, from: from.minutes, to: to.minutes + 1 }];
  return [{ day: from.dayKey, from: from.minutes, to: 24 * 60 }, { day: to.dayKey, from: 0, to: to.minutes + 1 }];
}

export function planFromEvents(
  events: readonly LearningEventDto[],
  prefs: SchedulePrefs,
  timeZone: TimeZoneChoice,
  now: Date = new Date(),
): { plan: WeekPlan; items: Map<string, PlanItem> } {
  const tz = resolveTimeZone(timeZone);
  const today = toKey(todayIn(timeZone, now));
  const days = Array.from({ length: PLAN_DAYS }, (_, i) => shiftKey(today, i));
  const lastDay = days[days.length - 1];
  const horizon = shiftKey(today, PLAN_LOOKAHEAD_DAYS);

  const busy: PlanBusy[] = [];
  const items = new Map<string, PlanItem>();
  for (const e of events) {
    if (e.status === 'cancelled') continue;
    const timed = FIXED_TYPES.has(e.type) || !isDueOnly(e);
    if (timed && !(e.type === 'webinar' && e.recordingTaskId)) busy.push(...busyOf(e, tz));

    // задача: задание или срок без длительности, подготовка к экзамену; только невыполненные и с будущим сроком
    const task = e.type === 'exam' || isDueOnly(e);
    if (!task || e.status !== 'pending' || new Date(e.startsAt).getTime() <= now.getTime()) continue;
    const due = wallClock(new Date(e.startsAt), tz);
    if (due.dayKey >= horizon) continue;
    const soft = due.dayKey > lastDay;
    const prep = e.type === 'exam';
    const id = prep ? `prep:${e.id}` : e.id;
    items.set(id, {
      id,
      title: e.title,
      type: e.type,
      dueDay: soft ? lastDay : due.dayKey,
      dueMinutes: soft ? 24 * 60 : due.minutes,
      minutes: ESTIMATE_MINUTES[e.type] ?? DEFAULT_MINUTES,
      priority: e.priority,
      soft,
      event: e,
      prep,
    });
  }

  const plan = buildWeekPlan({
    days: days.map((day) => ({ day, weekday: isoWeekday(day) })),
    nowMinutes: wallClock(now, tz).minutes,
    comfortFrom: prefs.comfortFrom,
    comfortTo: prefs.comfortTo,
    workFrom: prefs.workFrom,
    workTo: prefs.workTo,
    workDays: prefs.workDays,
    studyMinutes: prefs.studyMinutes,
    studyDays: prefs.studyDays,
    preferred: prefs.preferredStudyTime,
    busy,
    tasks: Array.from(items.values()),
  });
  return { plan, items };
}
