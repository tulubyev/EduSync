import { useEffect, useMemo, useState } from 'react';
import { authService } from '@/services/authService';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, ArrowDown, ArrowUp, CheckCircle, Loader, Merge, Play, Plus, X } from 'lucide-react';

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
  label: string;
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

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

function fmtDuration(ms?: number): string {
  if (!ms || ms <= 0) return '';
  const totalMin = Math.round(ms / 60000);
  if (totalMin < 1) return `${Math.max(1, Math.round(ms / 1000))} с`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h} ч ${m} мин` : `${m} мин`;
}

const fmtSize = (bytes?: number) => (bytes ? `${Math.round(bytes / 1024 / 1024)} МБ` : '');

function toItems(rec: OptionRecording, own: boolean, checked: boolean): Item[] {
  return rec.parts.map((p) => ({
    ...p,
    key: `${rec.taskId}:${p.video}`,
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
        if (!r.ok) throw new Error(d.message || 'Не удалось загрузить части записи');
        if (cancelled) return;
        const opts = d as MergeOptions;
        setOptions(opts);
        const own = toItems(opts.current, true, true);
        if (opts.lastSelection && opts.lastSelection.length > 0) {
          // Повторная склейка: тот же набор и порядок, что в прошлый раз, остальные части — снятыми
          const pool = new Map([...own, ...opts.others.flatMap((o) => toItems(o, false, true))].map((i) => [i.key, i]));
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
    setItems((prev) => [...prev, ...toItems(rec, false, true)]);
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
      if (!r.ok) throw new Error(d.message || 'Не удалось запустить склейку');
      setMessage({ kind: 'ok', text: `${d.message}. Окно можно закрыть — склейка идёт на сервере.` });
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
      if (!r.ok) throw new Error(d.message || 'Не удалось отменить');
      setMessage({ kind: 'ok', text: 'Склейка отменена' });
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
            Склейка: {task?.title}
          </DialogTitle>
          <DialogDescription>
            Отметьте части и расставьте их по порядку — они объединятся в один файл «Вся запись». Можно добавить
            части других ваших записей.
          </DialogDescription>
        </DialogHeader>

        {task?.mergeStatus === 'queued' && (
          <div className="flex flex-wrap items-center gap-2 rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            <Loader className="h-4 w-4 animate-spin" />
            <span className="flex-1">{task.mergeProgress || 'В очереди на склейку'}</span>
            <Button size="sm" variant="outline" onClick={cancelMerge} disabled={!!busy}>
              {busy === 'cancel' ? <Loader className="h-4 w-4 animate-spin" /> : 'Отменить'}
            </Button>
          </div>
        )}
        {task?.mergeStatus === 'merging' && (
          <div className="flex items-center gap-2 rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            <Loader className="h-4 w-4 animate-spin" />
            {task.mergeProgress || 'Идёт склейка…'}
          </div>
        )}
        {task?.mergeStatus === 'failed' && (
          <div className="flex items-start gap-2 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>Склейка не удалась: {task.mergeError || 'неизвестная ошибка'}</span>
          </div>
        )}
        {task?.mergeStatus === 'completed' && task.mergedUrl && (
          <div className="flex flex-wrap items-center gap-2 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            <CheckCircle className="h-4 w-4" />
            <span className="flex-1">Склейка готова. Новая склейка заменит её.</span>
            <Button size="sm" className="gap-1" onClick={() => onWatch({ id: task.id, title: task.title })}>
              <Play className="h-4 w-4" /> Смотреть / скачать
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center h-32 text-gray-500 gap-2">
            <Loader className="h-5 w-5 animate-spin" /> Загрузка частей…
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
                      aria-label={`Включить ${item.label}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {item.own ? item.label : `${item.recordingTitle} — ${item.label.toLowerCase()}`}
                      </div>
                      <div className="text-xs text-gray-500">
                        {[fmtDuration(item.durationMs), fmtSize(item.fileSize), item.own ? '' : 'другая запись']
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={preview === item.key ? 'default' : 'ghost'}
                      className="h-8 w-8 p-0"
                      title="Посмотреть часть"
                      onClick={() => setPreview(preview === item.key ? null : item.key)}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Выше" disabled={index === 0} onClick={() => move(index, -1)}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      title="Ниже"
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
                        title="Убрать из списка"
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
              {items.length === 0 && <li className="p-3 text-sm text-gray-500">У записи нет сохранённых частей.</li>}
            </ol>

            {addable.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="h-9 flex-1 min-w-[200px] rounded border border-gray-300 bg-white px-2 text-sm"
                  value={addId}
                  onChange={(e) => setAddId(e.target.value)}
                >
                  <option value="">Добавить части другой записи…</option>
                  {addable.map((o) => (
                    <option key={o.taskId} value={o.taskId}>
                      {fmtDate(o.scheduledTime)} — {o.title} ({o.parts.length} ч.)
                    </option>
                  ))}
                </select>
                <Button size="sm" variant="outline" className="gap-1" disabled={!addId} onClick={addRecording}>
                  <Plus className="h-4 w-4" /> Добавить
                </Button>
              </div>
            )}

            {fromOther && (
              <p className="text-xs text-amber-700">
                Части склеиваются без перекодирования, поэтому качество у них должно совпадать (разрешение, кодек, звук).
                Если не совпадает — склейка остановится с понятной ошибкой, исходные части не пострадают.
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button onClick={startMerge} disabled={!!busy || inQueue || selected.length < 2} className="gap-2">
                {busy === 'merge' ? <Loader className="h-4 w-4 animate-spin" /> : <Merge className="h-4 w-4" />}
                {task?.mergeStatus === 'completed' ? 'Склеить заново' : 'Склеить'} ({selected.length})
              </Button>
              <span className="text-xs text-gray-500">
                {selected.length < 2
                  ? 'Отметьте минимум 2 части'
                  : [fmtDuration(totalMs) && `≈ ${fmtDuration(totalMs)}`, fmtSize(totalBytes)].filter(Boolean).join(' · ')}
              </span>
            </div>
          </>
        )}

        {message && <p className={`text-sm ${message.kind === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{message.text}</p>}
      </DialogContent>
    </Dialog>
  );
}
