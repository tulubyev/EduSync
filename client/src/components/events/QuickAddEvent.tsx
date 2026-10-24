import { useMemo, useState } from 'react';
import { Plus, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EVENT_TYPE_LABELS, draftWallInput, parseQuickEvent } from '@shared/learningEvents';
import { zonedInputToUtcIso, type TimeZoneChoice } from '../recording/timezones';
import { createEvent } from './eventsApi';
import { emptyEventForm, type EventFormValues } from './EventFormDialog';
import { dayTitle, todayIn } from './eventTime';

interface QuickAddEventProps {
  timeZone: TimeZoneChoice;
  onAdded: () => void;
  /** «Подробнее»: открыть полную форму с разобранными полями */
  onOpenForm: (values: EventFormValues) => void;
}

/** Быстрый ввод одной строкой: «Вебинар по Python завтра в 19:00 1ч https://…» */
export function QuickAddEvent({ timeZone, onAdded, onOpenForm }: QuickAddEventProps) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = todayIn(timeZone);
  const draft = useMemo(() => (text.trim() ? parseQuickEvent(text, today) : null), [text, timeZone]);
  const wall = draft ? draftWallInput(draft, today) : '';

  const toForm = (): EventFormValues => ({
    ...emptyEventForm(wall),
    type: draft!.type,
    title: draft!.title,
    durationMinutes: draft!.durationMinutes ? String(draft!.durationMinutes) : '',
    priority: draft!.priority,
    ...(draft!.url ? (draft!.type === 'webinar' ? { joinUrl: draft!.url } : { lessonUrl: draft!.url }) : {}),
  });

  const add = async () => {
    if (!draft) return;
    if (!draft.title) return onOpenForm(toForm());
    const f = toForm();
    setSaving(true);
    setError(null);
    try {
      await createEvent({
        type: f.type,
        title: f.title,
        startsAt: zonedInputToUtcIso(wall, timeZone)!,
        durationMinutes: draft.durationMinutes,
        priority: f.priority,
        lessonUrl: f.lessonUrl,
        joinUrl: f.joinUrl,
      });
      setText('');
      onAdded();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось добавить');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <form
        className="flex gap-2"
        onSubmit={(e) => { e.preventDefault(); add(); }}
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Например: Вебинар по Python завтра в 19:00 1ч"
          aria-label="Быстрое добавление события"
          maxLength={1000}
        />
        <Button type="submit" disabled={!draft || saving} className="shrink-0" aria-label="Добавить">
          <Plus className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Добавить</span>
        </Button>
      </form>
      {draft && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
          <span className="font-medium text-gray-800">{EVENT_TYPE_LABELS[draft.type]}</span>
          <span>{dayTitle(wall.slice(0, 10))}, {draft.time ? wall.slice(11) : `${wall.slice(11)} (время не указано)`}</span>
          {draft.durationMinutes && <span>{draft.durationMinutes} мин</span>}
          {draft.url && <span className="max-w-[16rem] truncate">{draft.url}</span>}
          {!draft.title && <span className="text-orange-600">нет названия</span>}
          <button type="button" onClick={() => onOpenForm(toForm())} className="inline-flex items-center gap-1 text-purple-700 hover:underline">
            <SlidersHorizontal className="h-3.5 w-3.5" /> Подробнее
          </button>
        </div>
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
