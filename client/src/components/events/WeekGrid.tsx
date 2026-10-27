import { useEffect, useMemo, useState } from 'react';
import { AlarmClock, CheckCircle2, Video } from 'lucide-react';
import type { RecordingHint } from '@shared/recordingHints';
import { useLang } from '@/i18n';
import type { TimeZoneChoice } from '../recording/timezones';
import { EVENT_COLORS } from './EventCard';
import type { LearningEventDto } from './eventsApi';
import { dayKeyOf, fromKey, timeOf, weekdaysShort, type DayKey } from './eventTime';
import { dayBlocks, dayDue, hourRange, MIN_BLOCK_MINUTES } from './weekLayout';

const HOUR_PX = 56;
const pad = (n: number) => String(n).padStart(2, '0');
const hhmm = (min: number) => `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`;
/** Цвет типа с прозрачностью — фон блока */
const tint = (hex: string, alpha = '1f') => `${hex}${alpha}`;

interface WeekGridProps {
  days: DayKey[];
  events: LearningEventDto[];
  timeZone: TimeZoneChoice;
  todayKey: DayKey;
  hints: Map<string, RecordingHint>;
  onOpen: (event: LearningEventDto) => void;
}

/** Неделя «дни × часы»: занятия — блоками по времени и длительности, сроки — строкой сверху, цвет — по типу события */
export function WeekGrid({ days, events, timeZone, todayKey, hints, onOpen }: WeekGridProps) {
  const { m, lang } = useLang();
  const c = m.events.calendar;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const columns = useMemo(
    () => days.map((day) => ({ day, blocks: dayBlocks(events, day, timeZone), due: dayDue(events, day, timeZone) })),
    [days, events, timeZone],
  );
  const range = hourRange(columns.flatMap((col) => col.blocks));
  const hours = Array.from({ length: range.to - range.from }, (_, i) => range.from + i);
  const height = hours.length * HOUR_PX;
  const hasDue = columns.some((col) => col.due.length > 0);
  const nowKey = dayKeyOf(new Date(now), timeZone);
  const nowMin = (() => { const [h, mm] = timeOf(new Date(now), timeZone).split(':').map(Number); return h * 60 + mm; })();
  const names = weekdaysShort(lang);

  const icons = (e: LearningEventDto) => (
    <>
      {e.status === 'completed' && <CheckCircle2 className="h-3 w-3 shrink-0" />}
      {e.recordingTaskId && <Video className="h-3 w-3 shrink-0" />}
      {hints.has(e.id) && <AlarmClock className="h-3 w-3 shrink-0 text-amber-600" />}
    </>
  );

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* дни недели */}
      <div className="grid border-b border-gray-200" style={{ gridTemplateColumns: '3rem repeat(7, minmax(0, 1fr))' }}>
        <div />
        {columns.map(({ day }, i) => {
          const today = day === todayKey;
          return (
            <div key={day} className={`border-l border-gray-100 px-1 py-2 text-center ${i >= 5 ? 'bg-gray-50' : ''}`}>
              <div className={`text-xs uppercase ${today ? 'text-purple-700' : 'text-gray-500'}`}>{names[i]}</div>
              <div className={`mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${today ? 'bg-purple-600 text-white' : 'text-gray-800'}`}>
                {fromKey(day).day}
              </div>
            </div>
          );
        })}
      </div>

      {/* сроки без длительности: задания, дедлайны */}
      {hasDue && (
        <div className="grid border-b border-gray-200" style={{ gridTemplateColumns: '3rem repeat(7, minmax(0, 1fr))' }}>
          <div className="flex items-start justify-end px-1 pt-1.5 text-[10px] font-medium uppercase text-gray-400">{c.dueRow}</div>
          {columns.map(({ day, due }, i) => (
            <div key={day} className={`min-w-0 space-y-1 border-l border-gray-100 p-1 ${i >= 5 ? 'bg-gray-50' : ''}`}>
              {due.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => onOpen(e)}
                  className={`flex w-full min-w-0 items-center gap-1 rounded px-1.5 py-0.5 text-left text-xs hover:brightness-95 ${e.status === 'completed' ? 'opacity-50 line-through' : ''}`}
                  style={{ backgroundColor: tint(EVENT_COLORS[e.type], '26'), borderLeft: `3px solid ${EVENT_COLORS[e.type]}` }}
                  title={`${m.events.types[e.type]} · ${m.events.card.due(timeOf(e.startsAt, timeZone))} · ${e.title}`}
                >
                  <span className="shrink-0 font-semibold" style={{ color: EVENT_COLORS[e.type] }}>{timeOf(e.startsAt, timeZone)}</span>
                  <span className="truncate text-gray-800">{e.title}</span>
                  {icons(e)}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* часы */}
      <div className="grid" style={{ gridTemplateColumns: '3rem repeat(7, minmax(0, 1fr))' }}>
        <div className="relative" style={{ height }}>
          {hours.map((h, i) => (
            <div key={h} className="absolute right-1 -translate-y-1/2 text-[10px] text-gray-400" style={{ top: i * HOUR_PX }}>
              {i > 0 && `${pad(h)}:00`}
            </div>
          ))}
        </div>
        {columns.map(({ day, blocks }, i) => (
          <div key={day} className={`relative border-l border-gray-100 ${i >= 5 ? 'bg-gray-50' : ''}`} style={{ height }}>
            {hours.map((h, j) => (
              <div key={h} className="absolute inset-x-0 border-t border-gray-100" style={{ top: j * HOUR_PX }} />
            ))}
            {blocks.map((b) => {
              const e = b.event;
              const color = EVENT_COLORS[e.type];
              const top = ((b.start - range.from * 60) / 60) * HOUR_PX;
              const blockHeight = (Math.max(b.end - b.start, MIN_BLOCK_MINUTES) / 60) * HOUR_PX - 2;
              const width = 100 / b.lanes;
              const short = blockHeight < 40;
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => onOpen(e)}
                  className={`absolute overflow-hidden rounded-md px-1.5 py-0.5 text-left text-xs shadow-sm transition hover:z-10 hover:shadow-md ${e.status === 'completed' ? 'opacity-50' : ''}`}
                  style={{
                    top,
                    height: blockHeight,
                    left: `calc(${b.lane * width}% + 2px)`,
                    width: `calc(${width}% - 4px)`,
                    backgroundColor: tint(color),
                    borderLeft: `3px solid ${color}`,
                  }}
                  title={`${m.events.types[e.type]} · ${hhmm(b.start)}–${hhmm(b.end)} · ${e.title}`}
                >
                  <div className={`flex items-center gap-1 ${short ? '' : 'mb-0.5'}`}>
                    <span className="shrink-0 font-semibold" style={{ color }}>{hhmm(b.start)}</span>
                    {short && <span className={`truncate text-gray-800 ${e.status === 'completed' ? 'line-through' : ''}`}>{e.title}</span>}
                    <span className="ml-auto flex items-center gap-0.5" style={{ color }}>{icons(e)}</span>
                  </div>
                  {!short && (
                    <div
                      className={`break-words font-medium leading-tight text-gray-800 ${e.status === 'completed' ? 'line-through' : ''}`}
                      // столько строк названия, сколько помещается в блок под строкой времени
                      style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden', WebkitLineClamp: Math.max(1, Math.floor((blockHeight - 20) / 15)) }}
                    >
                      {e.title}
                    </div>
                  )}
                </button>
              );
            })}
            {day === nowKey && nowMin >= range.from * 60 && nowMin <= range.to * 60 && (
              <div className="pointer-events-none absolute inset-x-0 z-20" style={{ top: ((nowMin - range.from * 60) / 60) * HOUR_PX }}>
                <div className="relative h-0.5 bg-red-500"><span className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500" /></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
