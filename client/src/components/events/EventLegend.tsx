import { useState } from 'react';
import { EVENT_TYPES, type EventType } from '@shared/learningEvents';
import { useLang } from '@/i18n';
import { EVENT_COLORS } from './EventCard';

const KEY = 'calendar.hiddenTypes';

function readHidden(): Set<EventType> {
  try {
    return new Set((JSON.parse(localStorage.getItem(KEY) || '[]') as string[]).filter((t): t is EventType => (EVENT_TYPES as readonly string[]).includes(t)));
  } catch {
    return new Set();
  }
}

/** Скрытые типы событий календаря (запоминаются в браузере) */
export function useHiddenTypes(): [Set<EventType>, (next: Set<EventType>) => void] {
  const [hidden, setHidden] = useState<Set<EventType>>(readHidden);
  const update = (next: Set<EventType>) => {
    setHidden(next);
    try { localStorage.setItem(KEY, JSON.stringify(Array.from(next))); } catch { /* приватный режим */ }
  };
  return [hidden, update];
}

/** Легенда цветов: она же фильтр — нажатие скрывает или показывает тип */
export function EventLegend({ hidden, onChange }: { hidden: Set<EventType>; onChange: (next: Set<EventType>) => void }) {
  const { m } = useLang();
  const toggle = (t: EventType) => {
    const next = new Set(hidden);
    if (next.has(t)) next.delete(t);
    else next.add(t);
    onChange(next);
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={m.events.calendar.typesAria}>
      {EVENT_TYPES.map((t) => {
        const off = hidden.has(t);
        return (
          <button
            key={t}
            type="button"
            aria-pressed={!off}
            onClick={() => toggle(t)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${off ? 'border-gray-200 bg-white text-gray-400' : 'border-transparent text-gray-800'}`}
            style={off ? undefined : { backgroundColor: `${EVENT_COLORS[t]}1f` }}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: off ? '#d1d5db' : EVENT_COLORS[t] }} />
            {m.events.types[t]}
          </button>
        );
      })}
      {hidden.size > 0 && (
        <button type="button" onClick={() => onChange(new Set())} className="px-1 text-xs text-purple-700 hover:underline">
          {m.events.calendar.allTypes}
        </button>
      )}
    </div>
  );
}
