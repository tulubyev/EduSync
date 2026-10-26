import { useState } from 'react';
import { Link } from 'wouter';
import { BookOpen, CheckCircle2, Circle, ExternalLink, FileText, Pencil, Trash2, Video, VideoOff } from 'lucide-react';
import { DUE_TYPES, type EventType } from '@shared/learningEvents';
import { useLang } from '@/i18n';
import type { TimeZoneChoice } from '../recording/timezones';
import { deleteEvent, isPast, updateEvent, type LearningEventDto } from './eventsApi';
import { dayTitle, dayKeyOf, timeOf } from './eventTime';

export const EVENT_COLORS: Record<EventType, string> = {
  lesson: '#3b82f6',
  webinar: '#8b5cf6',
  assignment: '#f59e0b',
  exam: '#ef4444',
  deadline: '#f97316',
};

const SOURCE_NAMES: Record<string, string> = { stepik: 'Stepik' };

interface EventCardProps {
  event: LearningEventDto;
  timeZone: TimeZoneChoice;
  onChanged: () => void;
  onEdit: (event: LearningEventDto) => void;
  onRecord: (event: LearningEventDto) => void;
  /** Показать дату (в ленте «Сегодня» для просроченных и следующих) */
  showDate?: boolean;
}

export function EventCard({ event, timeZone, onChanged, onEdit, onRecord, showDate }: EventCardProps) {
  const { m, lang } = useLang();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const due = DUE_TYPES.includes(event.type);
  const done = event.status === 'completed';
  const past = isPast(event);
  const overdue = due && !done && past;
  const canRecord = event.type === 'webinar' && !!event.joinUrl && !past && !event.recordingTaskId;
  const time = timeOf(event.startsAt, timeZone);
  const program = event.programTitle || event.courseTitle;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : m.common.error);
    } finally {
      setBusy(false);
    }
  };

  const toggleDone = () => run(() => updateEvent(event.id, { status: done ? 'pending' : 'completed' }));
  const remove = () => {
    const question = event.source === 'manual' ? m.events.card.confirmDelete(event.title) : m.events.card.confirmHide(event.title);
    if (window.confirm(question)) run(() => deleteEvent(event.id));
  };

  return (
    <div
      className={`rounded-lg border border-gray-100 bg-white p-3 ${done ? 'opacity-60' : ''}`}
      style={{ borderLeftWidth: 4, borderLeftColor: EVENT_COLORS[event.type] }}
    >
      <div className="flex items-start gap-2">
        {due && (
          <button
            type="button"
            onClick={toggleDone}
            disabled={busy}
            className="mt-0.5 shrink-0 text-gray-400 hover:text-green-600"
            aria-label={done ? m.events.card.undo : m.events.card.markDone}
            title={done ? m.events.card.undo : m.events.card.done}
          >
            {done ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <Circle className="h-5 w-5" />}
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className="font-medium" style={{ color: EVENT_COLORS[event.type] }}>{m.events.types[event.type]}</span>
            <span className="text-gray-500">
              {showDate && `${dayTitle(dayKeyOf(event.startsAt, timeZone), lang)}, `}
              {due ? m.events.card.due(time) : time}
              {event.durationMinutes ? ` · ${m.common.minutes(event.durationMinutes)}` : ''}
            </span>
            {overdue && <span className="rounded bg-red-100 px-1.5 py-0.5 text-red-700">{m.events.card.overdue}</span>}
            {event.source !== 'manual' && (
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">{event.source === 'ical' ? m.events.sourceCalendar : SOURCE_NAMES[event.source] ?? event.source}</span>
            )}
          </div>
          <h4 className={`mt-0.5 break-words font-medium text-gray-800 ${done ? 'line-through' : ''}`}>{event.title}</h4>
          {(program || event.moduleTitle) && (
            <p className="break-words text-sm text-gray-500">
              {[program, event.moduleTitle && event.moduleTitle !== event.title ? event.moduleTitle : null].filter(Boolean).join(' · ')}
            </p>
          )}

          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
            {event.lessonUrl && (
              <a href={event.lessonUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-purple-700 hover:underline">
                <BookOpen className="h-4 w-4" /> {m.events.card.openLesson}
              </a>
            )}
            {event.materialsUrl && (
              <a href={event.materialsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-purple-700 hover:underline">
                <FileText className="h-4 w-4" /> {m.events.card.materials}
              </a>
            )}
            {event.joinUrl && !past && (
              <a href={event.joinUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-purple-700 hover:underline">
                <ExternalLink className="h-4 w-4" /> {m.events.card.joinWebinar}
              </a>
            )}
            {canRecord && (
              <button type="button" onClick={() => onRecord(event)} className="inline-flex items-center gap-1 text-gray-700 hover:text-purple-700">
                <VideoOff className="h-4 w-4" /> {m.events.card.cantAttend}
              </button>
            )}
            {event.recordingTaskId && (
              <Link href={`/recordings?task=${event.recordingTaskId}`}>
                <span className="inline-flex cursor-pointer items-center gap-1 text-green-700 hover:underline">
                  <Video className="h-4 w-4" /> {m.events.card.recordingScheduled}
                </span>
              </Link>
            )}
          </div>
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
        <div className="flex shrink-0 gap-1">
          <button type="button" onClick={() => onEdit(event)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label={m.common.edit} title={m.common.edit}>
            <Pencil className="h-4 w-4" />
          </button>
          <button type="button" onClick={remove} disabled={busy} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600" aria-label={m.common.delete} title={m.common.delete}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
