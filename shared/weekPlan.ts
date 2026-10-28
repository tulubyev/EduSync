/**
 * План недели (#20): раскладка самостоятельной работы (задания, сроки, подготовка к экзаменам) по свободному времени.
 * Чистая детерминированная функция без базы и часовых поясов: всё — в часах ученика (день YYYY-MM-DD и минуты от полуночи).
 *
 * Правила:
 * - сроки жёсткие: работа по задаче ставится только до её срока; не хватает времени — предупреждение с нехваткой;
 * - фиксированные события (уроки, вебинары, экзамены) и рабочие часы не двигаются и не перекрываются;
 * - в день — не больше заявленного времени на учёбу и только в дни учёбы, внутри удобных часов;
 * - любимое время суток — мягкое: сначала оно, потом остальное время дня;
 * - очередь — по сроку, затем по важности: раньше срок — раньше место.
 */

export const DAY_PERIODS = ['morning', 'afternoon', 'evening', 'night'] as const;
export type DayPeriod = (typeof DAY_PERIODS)[number];
export const isDayPeriod = (v: unknown): v is DayPeriod => (DAY_PERIODS as readonly unknown[]).includes(v);

/** Границы времени суток, минуты от полуночи; ночь — через полночь */
const PERIOD_RANGES: Record<DayPeriod, Array<[number, number]>> = {
  morning: [[6 * 60, 12 * 60]],
  afternoon: [[12 * 60, 17 * 60]],
  evening: [[17 * 60, 22 * 60]],
  night: [[22 * 60, 24 * 60], [0, 6 * 60]],
};

const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
/** Блок работы — не длиннее полутора часов и не короче четверти часа (кроме последнего остатка) */
export const MAX_BLOCK = 90;
export const MIN_BLOCK = 15;

export interface PlanTask {
  id: string;
  title: string;
  type: string;
  /** Срок: день и минуты от полуночи в часах ученика */
  dueDay: string;
  dueMinutes: number;
  /** Сколько минут работы нужно */
  minutes: number;
  priority: string;
  /** Срок за пределами плана: раскладываем по неделе, но о нехватке не предупреждаем */
  soft?: boolean;
}

export interface PlanBusy {
  day: string;
  from: number;
  to: number;
}

export interface PlanInput {
  /** Дни плана подряд, начиная с сегодняшнего; weekday — 1 (пн) … 7 (вс) */
  days: Array<{ day: string; weekday: number }>;
  /** Сейчас, минуты от полуночи сегодняшнего (первого) дня */
  nowMinutes: number;
  comfortFrom: number;
  comfortTo: number;
  workFrom: number | null;
  workTo: number | null;
  workDays: number[];
  /** Минут на учёбу в день и дни учёбы */
  studyMinutes: number;
  studyDays: number[];
  preferred: DayPeriod | null;
  busy: PlanBusy[];
  tasks: PlanTask[];
}

export interface PlanBlock {
  taskId: string;
  day: string;
  from: number;
  to: number;
}

export interface PlanWarning {
  taskId: string;
  /** Сколько минут не хватило до срока */
  shortMinutes: number;
}

export interface PlanDayLoad {
  day: string;
  budget: number;
  planned: number;
}

export interface WeekPlan {
  blocks: PlanBlock[];
  warnings: PlanWarning[];
  days: PlanDayLoad[];
}

type Interval = [number, number];

/** Вычесть отрезки из отрезков; результат упорядочен и без пустых кусков */
function subtract(free: Interval[], cut: Interval[]): Interval[] {
  let out = free;
  for (const [cf, ct] of cut) {
    const next: Interval[] = [];
    for (const [f, t] of out) {
      if (ct <= f || cf >= t) { next.push([f, t]); continue; }
      if (cf > f) next.push([f, cf]);
      if (ct < t) next.push([ct, t]);
    }
    out = next;
  }
  return out.filter(([f, t]) => t > f).sort((a, b) => a[0] - b[0]);
}

/** Свободные отрезки дня в порядке выбора: сначала любимое время суток, потом остальное — оба по времени */
function preferenceOrder(free: Interval[], preferred: DayPeriod | null): Interval[] {
  if (!preferred) return free;
  const ranges = PERIOD_RANGES[preferred];
  const inside: Interval[] = [];
  for (const [f, t] of free) {
    for (const [pf, pt] of ranges) {
      const a = Math.max(f, pf);
      const b = Math.min(t, pt);
      if (b > a) inside.push([a, b]);
    }
  }
  inside.sort((x, y) => x[0] - y[0]);
  return [...inside, ...subtract(free, inside)];
}

export function buildWeekPlan(input: PlanInput): WeekPlan {
  const firstDay = input.days[0]?.day;
  // свободное время по дням: удобные часы минус рабочие часы и фиксированные события; сегодня — с текущей минуты
  const free = new Map<string, Interval[]>();
  const budget = new Map<string, number>();
  for (const { day, weekday } of input.days) {
    const studyDay = input.studyDays.includes(weekday);
    budget.set(day, studyDay ? Math.max(0, input.studyMinutes) : 0);
    if (!studyDay) { free.set(day, []); continue; }
    const start = day === firstDay ? Math.max(input.comfortFrom, Math.ceil(input.nowMinutes / 5) * 5) : input.comfortFrom;
    let intervals: Interval[] = start < input.comfortTo ? [[start, input.comfortTo]] : [];
    if (input.workFrom !== null && input.workTo !== null && input.workDays.includes(weekday)) {
      intervals = subtract(intervals, [[input.workFrom, input.workTo]]);
    }
    intervals = subtract(intervals, input.busy.filter((b) => b.day === day).map((b) => [b.from, b.to] as Interval));
    free.set(day, intervals);
  }

  const order = input.days.map((d) => d.day);
  const tasks = [...input.tasks].sort((a, b) =>
    a.dueDay.localeCompare(b.dueDay) || a.dueMinutes - b.dueMinutes
    || (PRIORITY_RANK[a.priority] ?? 2) - (PRIORITY_RANK[b.priority] ?? 2)
    || a.id.localeCompare(b.id));

  const blocks: PlanBlock[] = [];
  const warnings: PlanWarning[] = [];
  for (const task of tasks) {
    let remaining = Math.max(0, Math.round(task.minutes));
    for (const day of order) {
      if (remaining === 0 || day > task.dueDay) break;
      let left = budget.get(day)!;
      if (left <= 0) continue;
      // в день срока — только до срока
      const usable = day === task.dueDay ? subtract(free.get(day)!, [[task.dueMinutes, 24 * 60]]) : free.get(day)!;
      for (const [f, t] of preferenceOrder(usable, input.preferred)) {
        let cursor = f;
        while (remaining > 0 && left > 0 && cursor < t) {
          const len = Math.min(remaining, left, t - cursor, MAX_BLOCK);
          // короткий обрывок не годится для работы, если это не последний остаток задачи
          if (len < MIN_BLOCK && len < remaining) break;
          blocks.push({ taskId: task.id, day, from: cursor, to: cursor + len });
          free.set(day, subtract(free.get(day)!, [[cursor, cursor + len]]));
          remaining -= len;
          left -= len;
          cursor += len;
        }
        if (remaining === 0 || left <= 0) break;
      }
      budget.set(day, left);
    }
    if (remaining > 0 && !task.soft) warnings.push({ taskId: task.id, shortMinutes: remaining });
  }

  blocks.sort((a, b) => a.day.localeCompare(b.day) || a.from - b.from);
  const days = input.days.map(({ day, weekday }) => ({
    day,
    budget: input.studyDays.includes(weekday) ? Math.max(0, input.studyMinutes) : 0,
    planned: blocks.filter((b) => b.day === day).reduce((s, b) => s + (b.to - b.from), 0),
  }));
  return { blocks, warnings, days };
}
