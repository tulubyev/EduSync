import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TIME_ZONE_OPTIONS, useRecordingTimeZone, type TimeZoneChoice } from '../recording/timezones';
import { EventCard, EVENT_COLORS } from './EventCard';
import { fetchEvents, type LearningEventDto } from './eventsApi';
import {
  weekdaysShort, dayKeyOf, dayStartUtc, dayTitle, fromKey, monthGridKeys, monthTitle, shiftKey, toKey, todayIn,
  weekKeys, weekTitle, type DayKey,
} from './eventTime';
import { QuickAddEvent } from './QuickAddEvent';
import { useEventDialogs } from './useEventDialogs';
import { useLang } from '@/i18n';
import { tzOptionLabel } from './tzLabels';
import { CalendarFeedDialog } from './CalendarFeedDialog';

type View = 'week' | 'month';
const VIEW_KEY = 'calendar.view';

function readView(): View {
  try { return localStorage.getItem(VIEW_KEY) === 'month' ? 'month' : 'week'; } catch { return 'week'; }
}

/** Календарь ученика «Неделя / Месяц»: уроки, вебинары, задания, экзамены и дедлайны всех курсов (#17) */
export function CalendarPage() {
  const [timeZone, setTimeZone] = useRecordingTimeZone();
  const { m, lang } = useLang();
  const c = m.events.calendar;
  const [view, setViewState] = useState<View>(readView);
  const todayKey = toKey(todayIn(timeZone));
  const [anchor, setAnchor] = useState<DayKey>(todayKey);
  const [selected, setSelected] = useState<DayKey>(todayKey);
  const [events, setEvents] = useState<LearningEventDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [feedOpen, setFeedOpen] = useState(false);
  const reload = () => setReloadKey((k) => k + 1);
  const { openEdit, openNew, openRecord, dialogs } = useEventDialogs(timeZone, reload);

  const setView = (v: View) => {
    setViewState(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* приватный режим */ }
  };

  const days = useMemo(() => (view === 'week' ? weekKeys(anchor) : monthGridKeys(anchor)), [view, anchor]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchEvents(dayStartUtc(days[0], timeZone), dayStartUtc(shiftKey(days[days.length - 1], 1), timeZone))
      .then((list) => { if (!cancelled) setEvents(list); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : m.common.loadError); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [days, timeZone, reloadKey]);

  const byDay = useMemo(() => {
    const map = new Map<DayKey, LearningEventDto[]>();
    for (const e of events) {
      const key = dayKeyOf(e.startsAt, timeZone);
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return map;
  }, [events, timeZone]);

  const step = (dir: -1 | 1) => {
    if (view === 'week') setAnchor(shiftKey(anchor, dir * 7));
    else {
      const d = fromKey(anchor);
      const m = d.month + dir;
      setAnchor(toKey({ year: d.year + Math.floor((m - 1) / 12), month: ((m - 1 + 12) % 12) + 1, day: 1 }));
    }
  };
  const goToday = () => { setAnchor(todayKey); setSelected(todayKey); };

  const card = (e: LearningEventDto) => (
    <EventCard key={e.id} event={e} timeZone={timeZone} onChanged={reload} onEdit={openEdit} onRecord={openRecord} />
  );
  const currentMonth = fromKey(anchor).month;

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <CalendarDays className="h-6 w-6 text-purple-600" /> {c.title}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5" role="tablist">
            {(['week', 'month'] as View[]).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={`rounded-md px-3 py-1.5 text-sm ${view === v ? 'bg-purple-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                {v === 'week' ? c.week : c.month}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={() => setFeedOpen(true)} className="gap-1">
            <CalendarPlus className="h-4 w-4" /> {m.calendarFeed.button}
          </Button>
          <Select value={timeZone} onValueChange={(v) => setTimeZone(v as TimeZoneChoice)}>
            <SelectTrigger className="w-auto min-w-[10rem]" aria-label={c.timeZone}><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIME_ZONE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{tzOptionLabel(o.value, m)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <QuickAddEvent timeZone={timeZone} onAdded={reload} onOpenForm={openNew} />
      </div>

      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => step(-1)} aria-label={m.common.back}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" onClick={goToday}>{m.common.today}</Button>
          <Button variant="outline" size="icon" onClick={() => step(1)} aria-label={m.common.forward}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <h2 className="text-right font-semibold text-gray-800">{view === 'week' ? weekTitle(anchor, lang) : monthTitle(anchor, lang)}</h2>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {loading && events.length === 0 && <p className="text-sm text-gray-500">{m.common.loading}</p>}

      {view === 'week' ? (
        <div className="space-y-4">
          {days.map((key) => {
            const list = byDay.get(key) ?? [];
            return (
              <section key={key}>
                <h3 className={`mb-2 text-sm font-semibold ${key === todayKey ? 'text-purple-700' : 'text-gray-600'}`}>
                  {dayTitle(key, lang)}{key === todayKey ? ` · ${c.todayMark}` : ''}
                </h3>
                {list.length === 0 ? <p className="text-sm text-gray-400">{c.empty}</p> : <div className="grid gap-2">{list.map(card)}</div>}
              </section>
            );
          })}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-gray-200 bg-gray-200 text-sm" style={{ gap: 1 }}>
            {weekdaysShort(lang).map((w) => <div key={w} className="bg-gray-50 py-1 text-center text-xs font-medium text-gray-500">{w}</div>)}
            {days.map((key) => {
              const list = byDay.get(key) ?? [];
              const d = fromKey(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelected(key)}
                  className={`flex min-h-[3.5rem] min-w-0 flex-col items-stretch justify-start bg-white p-1 text-left sm:min-h-[5.5rem] ${d.month !== currentMonth ? 'text-gray-400' : 'text-gray-800'} ${selected === key ? 'ring-2 ring-inset ring-purple-500' : ''}`}
                  aria-label={c.dayAria(dayTitle(key, lang), list.length)}
                >
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${key === todayKey ? 'bg-purple-600 text-white' : ''}`}>{d.day}</span>
                  <div className="mt-0.5 flex flex-wrap gap-0.5 sm:hidden">
                    {list.slice(0, 4).map((e) => <span key={e.id} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: EVENT_COLORS[e.type] }} />)}
                  </div>
                  <div className="hidden space-y-0.5 sm:block">
                    {list.slice(0, 3).map((e) => (
                      <div key={e.id} className={`truncate rounded px-1 text-xs text-white ${e.status === 'completed' ? 'opacity-50' : ''}`} style={{ backgroundColor: EVENT_COLORS[e.type] }}>
                        {e.title}
                      </div>
                    ))}
                    {list.length > 3 && <div className="px-1 text-xs text-gray-500">{c.more(list.length - 3)}</div>}
                  </div>
                </button>
              );
            })}
          </div>
          <section className="mt-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-600">{dayTitle(selected, lang)}</h3>
            {(byDay.get(selected) ?? []).length === 0
              ? <p className="text-sm text-gray-400">{c.empty}</p>
              : <div className="grid gap-2">{(byDay.get(selected) ?? []).map(card)}</div>}
          </section>
        </>
      )}
      {dialogs}
      <CalendarFeedDialog open={feedOpen} onClose={() => setFeedOpen(false)} />
    </div>
  );
}
