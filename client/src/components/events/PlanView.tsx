import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { AlertTriangle, ClipboardList } from 'lucide-react';
import { useLang } from '@/i18n';
import type { TimeZoneChoice } from '../recording/timezones';
import { EVENT_COLORS } from './EventCard';
import { fetchEvents, type LearningEventDto } from './eventsApi';
import { dayKeyOf, dayStartUtc, dayTitle, shiftKey, timeOf, toKey, todayIn } from './eventTime';
import { PLAN_DAYS, PLAN_LOOKAHEAD_DAYS, planFromEvents } from './planData';
import { useSchedulePrefs } from './useRecordingHints';
import { isDueOnly } from './weekLayout';

const pad = (n: number) => String(n).padStart(2, '0');
const hhmm = (min: number) => `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`;

/** «План»: когда заниматься заданиями и подготовкой к экзаменам — по свободному времени до сроков (#20) */
export function PlanView({ timeZone, onOpen }: { timeZone: TimeZoneChoice; onOpen: (e: LearningEventDto) => void }) {
  const { m, lang } = useLang();
  const p = m.plan;
  const prefs = useSchedulePrefs();
  const [events, setEvents] = useState<LearningEventDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const today = toKey(todayIn(timeZone));

  useEffect(() => {
    let cancelled = false;
    // со вчерашнего дня: урок, начавшийся до полуночи, может занимать утро
    fetchEvents(dayStartUtc(shiftKey(today, -1), timeZone), dayStartUtc(shiftKey(today, PLAN_LOOKAHEAD_DAYS + 1), timeZone))
      .then((list) => { if (!cancelled) { setEvents(list); setError(null); } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : m.common.loadError); });
    return () => { cancelled = true; };
  }, [today, timeZone]);

  const result = useMemo(() => (events && prefs ? planFromEvents(events, prefs, timeZone) : null), [events, prefs, timeZone]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!result) return <p className="text-sm text-gray-500">{m.common.loading}</p>;
  const { plan, items } = result;
  const dueText = (e: LearningEventDto) => p.due(`${dayTitle(dayKeyOf(e.startsAt, timeZone), lang)}, ${timeOf(e.startsAt, timeZone)}`);
  const fixedOn = (day: string) => (events ?? [])
    .filter((e) => e.status !== 'cancelled' && !isDueOnly(e) && dayKeyOf(e.startsAt, timeZone) === day)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">{p.intro}</p>

      {plan.warnings.length > 0 && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {plan.warnings.map((w) => {
            const item = items.get(w.taskId)!;
            const title = item.prep ? p.examPrep(item.title) : item.title;
            return (
              <p key={w.taskId} className="flex items-start gap-1.5 font-medium">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {p.short(title, p.duration(w.shortMinutes))}
              </p>
            );
          })}
          <p className="mt-1 text-red-700">
            {p.shortHint}{' '}
            <Link href="/settings"><span className="cursor-pointer font-medium underline">{p.settingsLink}</span></Link>
          </p>
        </div>
      )}

      {items.size === 0 && <p className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">{p.nothing}</p>}

      <div className="grid gap-3 md:grid-cols-2">
        {plan.days.slice(0, PLAN_DAYS).map((d) => {
          const blocks = plan.blocks.filter((b) => b.day === d.day);
          const fixed = fixedOn(d.day);
          const rows = [
            ...fixed.map((e) => ({ key: e.id, at: timeOf(e.startsAt, timeZone), fixed: true as const, e })),
            ...blocks.map((b) => ({ key: `${b.taskId}@${b.from}`, at: hhmm(b.from), fixed: false as const, b })),
          ].sort((a, b) => a.at.localeCompare(b.at));
          return (
            <section key={d.day} className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <h3 className={`text-sm font-semibold ${d.day === today ? 'text-purple-700' : 'text-gray-800'}`}>
                  {dayTitle(d.day, lang)}{d.day === today ? ` · ${m.events.calendar.todayMark}` : ''}
                </h3>
                <span className="shrink-0 text-xs text-gray-500">
                  {d.budget === 0 ? p.dayOff : p.load(p.duration(d.planned), p.duration(d.budget))}
                </span>
              </div>
              {d.budget > 0 && (
                <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-purple-500" style={{ width: `${Math.min(100, (d.planned / d.budget) * 100)}%` }} />
                </div>
              )}
              {rows.length === 0 ? (
                <p className="text-xs text-gray-400">{p.dayFree}</p>
              ) : (
                <ul className="space-y-1.5">
                  {rows.map((r) => {
                    if (r.fixed) {
                      return (
                        <li key={r.key}>
                          <button type="button" onClick={() => onOpen(r.e)} className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs text-gray-500 hover:bg-gray-50">
                            <span className="w-10 shrink-0 tabular-nums">{r.at}</span>
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: EVENT_COLORS[r.e.type] }} />
                            <span className="truncate">{m.events.types[r.e.type]} · {r.e.title}</span>
                          </button>
                        </li>
                      );
                    }
                    const item = items.get(r.b.taskId)!;
                    const color = EVENT_COLORS[item.event.type];
                    return (
                      <li key={r.key}>
                        <button
                          type="button"
                          onClick={() => onOpen(item.event)}
                          className="flex w-full items-start gap-2 rounded-md border border-dashed px-2 py-1.5 text-left text-sm hover:brightness-95"
                          style={{ borderColor: color, backgroundColor: `${color}14` }}
                        >
                          <span className="w-10 shrink-0 pt-px text-xs font-semibold tabular-nums" style={{ color }}>{r.at}</span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-1 font-medium text-gray-800">
                              <ClipboardList className="h-3.5 w-3.5 shrink-0" style={{ color }} />
                              <span className="break-words">{item.prep ? p.examPrep(item.title) : item.title}</span>
                            </span>
                            <span className="block text-xs text-gray-500">
                              {hhmm(r.b.from)}–{hhmm(r.b.to)} · {p.duration(r.b.to - r.b.from)} · {dueText(item.event)}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
