import { useEffect, useState } from 'react';
import { CheckCircle2, Video, XCircle } from 'lucide-react';
import type { RecordingHint } from '@shared/recordingHints';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLang } from '@/i18n';
import type { TimeZoneChoice } from '../recording/timezones';
import { recordFromEvents, type LearningEventDto, type RecordFromEventResult } from './eventsApi';
import { dayKeyOf, dayTitle, timeOf } from './eventTime';
import { hintReason } from './hintText';

interface BatchRecordDialogProps {
  open: boolean;
  events: LearningEventDto[];
  hints: Map<string, RecordingHint>;
  timeZone: TimeZoneChoice;
  onClose: () => void;
  onDone: () => void;
}

/** «Записать все»: вебинары в неудобное время одним действием, подтверждение прав — одно на все (#48) */
export function BatchRecordDialog({ open, events, hints, timeZone, onClose, onDone }: BatchRecordDialogProps) {
  const { m, lang } = useLang();
  const t = m.hints.batch;
  // снимок на момент открытия: после записи вебинары пропадают из подсказок, а итог должен остаться
  const [rows, setRows] = useState<Array<{ event: LearningEventDto; hint?: RecordingHint }>>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rights, setRights] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Map<string, RecordFromEventResult> | null>(null);

  // при каждом открытии — все вебинары отмечены, согласие и итоги сброшены
  useEffect(() => {
    if (!open) return;
    setRows(events.map((event) => ({ event, hint: hints.get(event.id) })));
    setSelected(new Set(events.map((e) => e.id)));
    setRights(false);
    setError(null);
    setResults(null);
  }, [open]);

  const toggle = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const { results: list } = await recordFromEvents(rows.filter((r) => selected.has(r.event.id)).map((r) => r.event.id));
      setResults(new Map(list.map((r) => [r.id, r])));
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.failed);
    } finally {
      setBusy(false);
    }
  };

  const resultText = (r: RecordFromEventResult) => {
    if (r.ok) return t.scheduled;
    if (r.code === 'not_found') return t.notFound;
    if (r.code === 'not_recordable') return t.notRecordable;
    return r.message || t.failed;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.intro}</DialogDescription>
        </DialogHeader>
        <ul className="max-h-80 space-y-2 overflow-y-auto">
          {rows.map(({ event: e, hint }) => {
            const r = results?.get(e.id);
            return (
              <li key={e.id} className="flex items-start gap-3 rounded-lg border border-gray-200 p-3">
                {r ? (
                  r.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                ) : (
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0 accent-purple-600"
                    checked={selected.has(e.id)}
                    onChange={() => toggle(e.id)}
                    disabled={busy || !!results}
                    aria-label={e.title}
                  />
                )}
                <div className="min-w-0 text-sm">
                  <p className="break-words font-medium text-gray-800">{e.title}</p>
                  <p className="text-gray-500">
                    {dayTitle(dayKeyOf(e.startsAt, timeZone), lang)}, {timeOf(e.startsAt, timeZone)}
                    {hint && <> · {hintReason(hint, m)}</>}
                  </p>
                  {r && <p className={r.ok ? 'text-green-700' : 'text-red-700'}>{resultText(r)}</p>}
                </div>
              </li>
            );
          })}
        </ul>
        {!results && (
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-purple-600" checked={rights} onChange={(e) => setRights(e.target.checked)} disabled={busy} />
            <span>{t.rights}</span>
          </label>
        )}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          {results ? (
            <Button onClick={onClose}>{t.done}</Button>
          ) : (
            <>
              <Button variant="outline" onClick={onClose} disabled={busy}>{m.common.cancel}</Button>
              <Button onClick={submit} disabled={busy || !rights || selected.size === 0} className="gap-1">
                <Video className="h-4 w-4" /> {busy ? m.common.saving : t.submit(selected.size)}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
