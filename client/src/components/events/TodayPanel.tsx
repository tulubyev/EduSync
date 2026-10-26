import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { AlarmClock, Sun, Video } from 'lucide-react';
import { DUE_TYPES } from '@shared/learningEvents';
import { useRecordingTimeZone } from '../recording/timezones';
import { useLang } from '@/i18n';
import { EventCard } from './EventCard';
import { fetchEvents, isPast, type LearningEventDto } from './eventsApi';
import { dayKeyOf, dayStartUtc, dayTitle, shiftKey, timeOf, toKey, todayIn } from './eventTime';
import { hintReason } from './hintText';
import { useRecordingHints } from './useRecordingHints';
import { QuickAddEvent } from './QuickAddEvent';
import { useEventDialogs } from './useEventDialogs';

const NEXT_DAYS = 7;
const OVERDUE_DAYS = 30;

/** «Сегодня» на главной: просроченное, события дня и ближайшие на неделю, быстрый ввод */
export function TodayPanel() {
  const [timeZone] = useRecordingTimeZone();
  const { m, lang } = useLang();
  const [events, setEvents] = useState<LearningEventDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);
  const { openEdit, openNew, openRecord, dialogs } = useEventDialogs(timeZone, reload);
  const todayKey = toKey(todayIn(timeZone));

  useEffect(() => {
    fetchEvents(dayStartUtc(shiftKey(todayKey, -OVERDUE_DAYS), timeZone), dayStartUtc(shiftKey(todayKey, NEXT_DAYS + 1), timeZone))
      .then((list) => { setEvents(list); setError(null); })
      .catch((e) => setError(e instanceof Error ? e.message : m.common.loadError));
  }, [todayKey, timeZone, reloadKey]);

  const overdue = events.filter((e) => DUE_TYPES.includes(e.type) && e.status === 'pending' && isPast(e) && dayKeyOf(e.startsAt, timeZone) < todayKey);
  const today = events.filter((e) => dayKeyOf(e.startsAt, timeZone) === todayKey);
  const next = events.filter((e) => dayKeyOf(e.startsAt, timeZone) > todayKey && e.status === 'pending').slice(0, 5);
  const { hints, dismiss } = useRecordingHints(events, timeZone);
  // вебинары в неудобное время, которых нет среди карточек ниже, — списком в блоке-подсказке
  const shown = new Set([...today, ...next].map((e) => e.id));
  const hinted = events.filter((e) => hints.has(e.id));
  const hintedElsewhere = hinted.filter((e) => !shown.has(e.id));

  const list = (items: LearningEventDto[], showDate = false) => (
    <div className="grid gap-2">
      {items.map((e) => (
        <EventCard
          key={e.id} event={e} timeZone={timeZone} onChanged={reload} onEdit={openEdit} onRecord={openRecord} showDate={showDate}
          hint={hints.get(e.id)} onDismissHint={dismiss}
        />
      ))}
    </div>
  );

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
          <Sun className="h-5 w-5 text-orange-500" /> {m.events.today.title}
        </h2>
        <Link href="/calendar">
          <span className="cursor-pointer text-sm text-purple-600 hover:text-purple-700">{m.events.today.calendarLink}</span>
        </Link>
      </div>
      <QuickAddEvent timeZone={timeZone} onAdded={reload} onOpenForm={openNew} />
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {hinted.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="flex items-center gap-1.5 font-semibold"><AlarmClock className="h-4 w-4" /> {m.hints.banner(hinted.length)}</p>
          <p className="mt-0.5 text-amber-800">{m.hints.bannerText}</p>
          {hintedElsewhere.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {hintedElsewhere.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="min-w-0 break-words font-medium">{e.title}</span>
                  <span className="text-amber-800">
                    {dayTitle(dayKeyOf(e.startsAt, timeZone), lang)}, {timeOf(e.startsAt, timeZone)} · {hintReason(hints.get(e.id)!, m)}
                  </span>
                  <button type="button" onClick={() => openRecord(e)} className="inline-flex items-center gap-1 rounded bg-purple-600 px-2 py-0.5 text-white hover:bg-purple-700">
                    <Video className="h-3.5 w-3.5" /> {m.hints.record}
                  </button>
                  <button type="button" onClick={() => dismiss(e.id)} className="text-amber-800 hover:underline">{m.hints.dismiss}</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {overdue.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold text-red-700">{m.events.today.overdue}</h3>
          {list(overdue, true)}
        </div>
      )}
      <div className="mt-4">
        {today.length === 0
          ? <p className="text-sm text-gray-500">{m.events.today.nothing}</p>
          : list(today)}
      </div>
      {next.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-600">{m.events.today.later}</h3>
          {list(next, true)}
        </div>
      )}
      {dialogs}
    </div>
  );
}
