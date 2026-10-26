import { useEffect, useMemo, useState } from 'react';
import { authService } from '@/services/authService';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, ArrowDown, ArrowUp, CheckCircle, Loader, Merge, Play, Plus, X } from 'lucide-react';
import { fmtZoned, useRecordingTimeZone, type TimeZoneChoice } from './timezones';
import { videoLabel } from './recordingLink';
import { useLang } from '@/i18n';
import type { Messages } from '@/locales';

/** Поля задачи, которые показывает окно склейки (обновляются списком записей каждые 10 с). */
export interface MergeDialogTask {
  id: string;
  title: string;
  mergeStatus?: 'idle' | 'queued' | 'merging' | 'completed' | 'failed';
  mergeProgress?: string;
  mergeError?: string;
  mergedUrl?: string;
}

interface OptionPart {
  video: string;
  url: string;
  durationMs?: number;
  fileSize?: number;
}

interface OptionRecording {
  taskId: string;
  title: string;
  scheduledTime: string;
  parts: OptionPart[];
}

interface MergeOptions {
  current: OptionRecording;
  others: OptionRecording[];
  lastSelection: Array<{ taskId: string; video: string }> | null;
}

interface Item extends OptionPart {
  key: string;
  label: string;
  taskId: string;
  recordingTitle: string;
  own: boolean;
  checked: boolean;
}

interface RecordingMergeDialogProps {
  task: MergeDialogTask | null;
  onClose: () => void;
  /** Статус склейки изменился — обновить список записей */
  onChanged: () => void;
  /** Открыть плеер с готовой склейкой */
  onWatch: (task: { id: string; title: string }) => void;
}

const fmtDate = (iso: string, tz: TimeZoneChoice) => {
  const { date, time } = fmtZoned(iso, tz);
  return `${date.slice(0, 5)}, ${time}`;
};

function fmtDuration(ms: number | undefined, m: Messages): string {
  if (!ms || ms <= 0) return '';
  const totalMin = Math.round(ms / 60000);
  if (totalMin < 1) return m.recordings.merge.seconds(Math.max(1, Math.round(ms / 1000)));
  const h = Math.floor(totalMin / 60);
  return h > 0 ? m.recordings.list.hoursMinutes(h, totalMin % 60) : m.common.minutes(totalMin);
}

const fmtSize = (bytes: number | undefined, m: Messages) => (bytes ? m.recordings.merge.megabytes(Math.round(bytes / 1024 / 1024)) : '');

function toItems(rec: OptionRecording, own: boolean, checked: boolean, m: Messages): Item[] {
  return rec.parts.map((p) => ({
    ...p,
    key: `${rec.taskId}:${p.video}`,
    label: videoLabel(p.video, rec.parts.length, m.recordings.files),
    taskId: rec.taskId,
    recordingTitle: rec.title,
    own,
    checked,
  }));
}

/**
 * Склейка в личном кабинете: какие части и в каком порядке объединить в один файл, в том числе
 * части других записей (например, если ночная запись прервалась и её запустили заново).
 * Склеивает воркер, здесь — выбор, очередь, статус и переход к готовому файлу.
 */
export function RecordingMergeDialog({ task, onClose, onChanged, onWatch }: RecordingMergeDialogProps) {
  const { m } = useLang();
  const t = m.recordings.merge;
  const [timeZone] = useRecordingTimeZone();
  const taskId = task?.id ?? null;
  const [options, setOptions] = useState<MergeOptions | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<'merge' | 'cancel' | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [addId, setAddId] = useState('');

  useEffect(() => {
    if (!taskId) return;
    let cancelled = false;
    setOptions(null);
    setItems([]);
    setMessage(null);
    setPreview(null);
    setAddId('');
    setLoading(true);
    authService
      .authenticatedFetch(`/api/recording/tasks/${taskId}/merge-options`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.message || t.errLoad);
        if (cancelled) return;
        const opts = d as MergeOptions;
        setOptions(opts);
        const own = toItems(opts.current, true, true, m);
        if (opts.lastSelection && opts.lastSelection.length > 0) {
          // Повторная склейка: тот же набор и порядок, что в прошлый раз, остальные части — снятыми
          const pool = new Map([...own, ...opts.others.flatMap((o) => toItems(o, false, true, m))].map((i) => [i.key, i]));
          const picked = opts.lastSelection.map((s) => pool.get(`${s.taskId}:${s.video}`)).filter((i): i is Item => !!i);
          const pickedKeys = new Set(picked.map((i) => i.key));
          setItems([...picked, ...own.filter((i) => !pickedKeys.has(i.key)).map((i) => ({ ...i, checked: false }))]);
        } else {
          setItems(own);
        }
      })
      .catch((e) => !cancelled && setMessage({ kind: 'error', text: (e as Error).message }))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  const selected = items.filter((i) => i.checked);
  const fromOther = selected.some((i) => !i.own);
  const totalMs = selected.reduce((s, i) => s + (i.durationMs ?? 0), 0);
  const totalBytes = selected.reduce((s, i) => s + (i.fileSize ?? 0), 0);
  const inQueue = task?.mergeStatus === 'queued' || task?.mergeStatus === 'merging';
  const addable = useMemo(() => {
    const present = new Set(items.map((i) => i.taskId));
    return (options?.others ?? []).filter((o) => !present.has(o.taskId));
  }, [options, items]);

  const move = (index: number, delta: number) => {
    setItems((prev) => {
      const j = index + delta;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  const addRecording = () => {
    const rec = options?.others.find((o) => o.taskId === addId);
    if (!rec) return;
    setItems((prev) => [...prev, ...toItems(rec, false, true, m)]);
    setAddId('');
  };

  const startMerge = async () => {
    if (!taskId || selected.length < 2) return;
    setBusy('merge');
    setMessage(null);
    try {
      const r = await authService.authenticatedFetch(`/api/recording/tasks/${taskId}/merge`, {
        method: 'POST',
        body: JSON.stringify({ sources: selected.map((i) => ({ taskId: i.taskId, video: i.video })) }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || t.errStart);
      setMessage({ kind: 'ok', text: t.started });
      onChanged();
    } catch (e) {
      setMessage({ kind: 'error', text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const cancelMerge = async () => {
    if (!taskId) return;
    setBusy('cancel');
    setMessage(null);
    try {
      const r = await authService.authenticatedFetch(`/api/recording/tasks/${taskId}/merge/cancel`, { method: 'POST' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || t.errCancel);
      setMessage({ kind: 'ok', text: t.cancelled });
      onChanged();
    } catch (e) {
      setMessage({ kind: 'error', text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={!!task} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[760px] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-6 break-words flex items-center gap-2">
            <Merge className="h-5 w-5 text-indigo-600 flex-shrink-0" />
            {t.title(task?.title ?? '')}
          </DialogTitle>
          <DialogDescription>
            {t.description}
          </DialogDescription>
        </DialogHeader>

        {task?.mergeStatus === 'queued' && (
          <div className="flex flex-wrap items-center gap-2 rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            <Loader className="h-4 w-4 animate-spin" />
            <span className="flex-1">{task.mergeProgress || t.queued}</span>
            <Button size="sm" variant="outline" onClick={cancelMerge} disabled={!!busy}>
              {busy === 'cancel' ? <Loader className="h-4 w-4 animate-spin" /> : m.recordings.list.cancel}
            </Button>
          </div>
        )}
        {task?.mergeStatus === 'merging' && (
          <div className="flex items-center gap-2 rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            <Loader className="h-4 w-4 animate-spin" />
            {task.mergeProgress || t.merging}
          </div>
        )}
        {task?.mergeStatus === 'failed' && (
          <div className="flex items-start gap-2 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{t.failed(task.mergeError || t.unknownError)}</span>
          </div>
        )}
        {task?.mergeStatus === 'completed' && task.mergedUrl && (
          <div className="flex flex-wrap items-center gap-2 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            <CheckCircle className="h-4 w-4" />
            <span className="flex-1">{t.ready}</span>
            <Button size="sm" className="gap-1" onClick={() => onWatch({ id: task.id, title: task.title })}>
              <Play className="h-4 w-4" /> {m.recordings.list.watch}
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center h-32 text-gray-500 gap-2">
            <Loader className="h-5 w-5 animate-spin" /> {t.loading}
          </div>
        )}

        {!loading && options && (
          <>
            <ol className="divide-y rounded border">
              {items.map((item, index) => (
                <li key={item.key} className={`p-2 ${item.checked ? '' : 'opacity-60'}`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-indigo-600"
                      checked={item.checked}
                      onChange={(e) =>
                        setItems((prev) => prev.map((i) => (i.key === item.key ? { ...i, checked: e.target.checked } : i)))
                      }
                      aria-label={t.include(item.label)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {item.own ? item.label : `${item.recordingTitle} — ${item.label}`}
                      </div>
                      <div className="text-xs text-gray-500">
                        {[fmtDuration(item.durationMs, m), fmtSize(item.fileSize, m), item.own ? '' : t.otherRecording]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={preview === item.key ? 'default' : 'ghost'}
                      className="h-8 w-8 p-0"
                      title={t.preview}
                      onClick={() => setPreview(preview === item.key ? null : item.key)}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title={t.up} disabled={index === 0} onClick={() => move(index, -1)}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      title={t.down}
                      disabled={index === items.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    {!item.own && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        title={t.remove}
                        onClick={() => setItems((prev) => prev.filter((i) => i.key !== item.key))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {preview === item.key && (
                    <video key={item.url} src={item.url} controls playsInline preload="metadata" className="mt-2 w-full max-h-[40vh] rounded bg-black" />
                  )}
                </li>
              ))}
              {items.length === 0 && <li className="p-3 text-sm text-gray-500">{t.noParts}</li>}
            </ol>

            {addable.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="h-9 flex-1 min-w-[200px] rounded border border-gray-300 bg-white px-2 text-sm"
                  value={addId}
                  onChange={(e) => setAddId(e.target.value)}
                >
                  <option value="">{t.addOther}</option>
                  {addable.map((o) => (
                    <option key={o.taskId} value={o.taskId}>
                      {fmtDate(o.scheduledTime, timeZone)} — {o.title} ({t.parts(o.parts.length)})
                    </option>
                  ))}
                </select>
                <Button size="sm" variant="outline" className="gap-1" disabled={!addId} onClick={addRecording}>
                  <Plus className="h-4 w-4" /> {m.common.add}
                </Button>
              </div>
            )}

            {fromOther && (
              <p className="text-xs text-amber-700">
                {t.qualityNote}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button onClick={startMerge} disabled={!!busy || inQueue || selected.length < 2} className="gap-2">
                {busy === 'merge' ? <Loader className="h-4 w-4 animate-spin" /> : <Merge className="h-4 w-4" />}
                {task?.mergeStatus === 'completed' ? t.mergeAgain : m.recordings.list.merge} ({selected.length})
              </Button>
              <span className="text-xs text-gray-500">
                {selected.length < 2
                  ? t.minParts
                  : [fmtDuration(totalMs, m) && `≈ ${fmtDuration(totalMs, m)}`, fmtSize(totalBytes, m)].filter(Boolean).join(' · ')}
              </span>
            </div>
          </>
        )}

        {message && <p className={`text-sm ${message.kind === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{message.text}</p>}
      </DialogContent>
    </Dialog>
  );
}
