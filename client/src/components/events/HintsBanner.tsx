import { useEffect, useState } from 'react';
import { AlarmClock, Video } from 'lucide-react';
import { soonWebinars, type RecordingHint } from '@shared/recordingHints';
import { useLang } from '@/i18n';
import type { TimeZoneChoice } from '../recording/timezones';
import { BatchRecordDialog } from './BatchRecordDialog';
import type { LearningEventDto } from './eventsApi';
import { dayKeyOf, dayTitle, timeOf } from './eventTime';
import { hintReason } from './hintText';

interface HintsBannerProps {
  /** Вебинары в неудобное время (у каждого есть подсказка в hints) */
  hinted: LearningEventDto[];
  /** Какие из них показать списком: остальные видны карточками ниже */
  listed: LearningEventDto[];
  hints: Map<string, RecordingHint>;
  timeZone: TimeZoneChoice;
  onRecord: (event: LearningEventDto) => void;
  onDismiss: (id: string) => void;
  onRecorded: () => void;
  /** Заголовок; по умолчанию — «на этой неделе» */
  title?: string;
}

/** «Вебинаров в неудобное время: N» с кнопкой «Записать все» — на главной и в календаре (#48) */
export function HintsBanner({ hinted, listed, hints, timeZone, onRecord, onDismiss, onRecorded, title }: HintsBannerProps) {
  const { m, lang } = useLang();
  const [batchOpen, setBatchOpen] = useState(false);
  if (hinted.length === 0 && !batchOpen) return null;
  return (
    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 font-semibold"><AlarmClock className="h-4 w-4" /> {title ?? m.hints.banner(hinted.length)}</p>
        {hinted.length > 1 && (
          <button type="button" onClick={() => setBatchOpen(true)} className="inline-flex items-center gap-1 rounded bg-purple-600 px-2.5 py-1 font-medium text-white hover:bg-purple-700">
            <Video className="h-3.5 w-3.5" /> {m.hints.recordAll(hinted.length)}
          </button>
        )}
      </div>
      <p className="mt-0.5 text-amber-800">{m.hints.bannerText}</p>
      {listed.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {listed.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="min-w-0 break-words font-medium">{e.title}</span>
              <span className="text-amber-800">
                {dayTitle(dayKeyOf(e.startsAt, timeZone), lang)}, {timeOf(e.startsAt, timeZone)} · {hintReason(hints.get(e.id)!, m)}
              </span>
              <button type="button" onClick={() => onRecord(e)} className="inline-flex items-center gap-1 rounded bg-purple-600 px-2 py-0.5 text-white hover:bg-purple-700">
                <Video className="h-3.5 w-3.5" /> {m.hints.record}
              </button>
              <button type="button" onClick={() => onDismiss(e.id)} className="text-amber-800 hover:underline">{m.hints.dismiss}</button>
            </li>
          ))}
        </ul>
      )}
      <BatchRecordDialog
        open={batchOpen}
        events={hinted}
        hints={hints}
        timeZone={timeZone}
        onClose={() => setBatchOpen(false)}
        onDone={onRecorded}
      />
    </div>
  );
}

/**
 * Напоминание перед вебинаром (#48): начнётся в ближайшие 2 часа, ещё не записывается —
 * «Не успеваете? Записать» или «Приду» (скрывает и напоминание, и подсказку для этого вебинара).
 */
export function SoonWebinarBanner({ events, dismissed, onRecord, onDismiss }: {
  events: LearningEventDto[];
  dismissed: (id: string) => boolean;
  onRecord: (event: LearningEventDto) => void;
  onDismiss: (id: string) => void;
}) {
  const { m } = useLang();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const soon = soonWebinars(events, now).filter((e) => !dismissed(e.id));
  if (soon.length === 0) return null;
  return (
    <div className="mt-4 space-y-2">
      {soon.map((e) => {
        const minutes = Math.max(1, Math.round((new Date(e.startsAt).getTime() - now) / 60_000));
        return (
          <div key={e.id} role="status" className="rounded-lg border border-purple-200 bg-purple-50 p-3 text-sm text-purple-900">
            <p className="flex items-center gap-1.5 font-semibold"><AlarmClock className="h-4 w-4 shrink-0" /> {m.hints.soon.title(e.title, minutes)}</p>
            <p className="mt-0.5 text-purple-800">{m.hints.soon.text}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => onRecord(e)} className="inline-flex items-center gap-1 rounded bg-purple-600 px-2.5 py-1 font-medium text-white hover:bg-purple-700">
                <Video className="h-3.5 w-3.5" /> {m.hints.record}
              </button>
              <button type="button" onClick={() => onDismiss(e.id)} className="text-purple-800 hover:underline">{m.hints.soon.attend}</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
