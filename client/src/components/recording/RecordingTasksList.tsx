import { useEffect, useRef, useState } from 'react';
import { authService } from '@/services/authService';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Clock, Play, Trash2, Loader, Edit2, RefreshCw, RotateCcw, TriangleAlert, XCircle, StopCircle, Merge } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RecordingPlayerDialog } from './RecordingPlayerDialog';
import { RecordingMergeDialog } from './RecordingMergeDialog';
import { TIME_ZONE_OPTIONS, browserTimeZone, fmtZoned, useRecordingTimeZone, utcToZonedInput, zonedInputToUtcIso, type TimeZoneChoice } from './timezones';
import { tzOptionLabel, tzShort } from '../events/tzLabels';
import { useLang } from '@/i18n';


interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant: 'default' | 'destructive';
  onConfirm: () => void;
}

interface RecordingPart {
  partNumber: number;
  fileName: string;
  startTime: string;
  status: 'pending' | 'recording' | 'completed' | 'failed';
  fileSize?: number;
}

interface StartInfo {
  state: 'waiting' | 'starting' | 'recording' | 'retrying' | 'failed';
  stage?: string;
  stageLabel?: string;
  attempt?: number;
  maxAttempts?: number;
  recordingConfirmed?: boolean;
  recordingStartedAt?: string;
  code?: string;
  reason?: string;
  hint?: string;
  detail?: string;
  severity?: 'info' | 'warn' | 'error';
  method?: 'direct' | 'extractor' | 'browser';
  methodLabel?: string;
  platform?: string;
  tool?: string;
  note?: string;
  fallback?: string;
}

interface RecordingTask {
  id: string;
  title: string;
  description?: string;
  streamUrl: string;
  joinName?: string;
  joinEmail?: string;
  joinPhone?: string;
  scheduledTime: string;
  duration: number;
  status: 'scheduled' | 'ready' | 'in_progress' | 'uploading' | 'completed' | 'failed' | 'cancelled';
  parts: RecordingPart[];
  playlistUrl?: string;
  begetUrl?: string;
  fileSize?: number | null;
  errorMessage?: string;
  workerId?: string;
  lastHeartbeat?: string;
  startedAt?: string;
  completedAt?: string;
  attemptCount?: number;
  urlCheckStatus?: 'pending' | 'ok' | 'warning' | 'failed';
  urlCheckMessage?: string;
  urlCheckedAt?: string;
  mergeStatus?: 'idle' | 'queued' | 'merging' | 'completed' | 'failed';
  mergeProgress?: string;
  mergedUrl?: string;
  mergeError?: string;
  start?: StartInfo;
  plannedMethod?: { method: 'direct' | 'extractor' | 'browser'; label: string; platform: string; note?: string };
}

interface RecordingTasksListProps {
  statusFilter?: string | null;
  refreshKey?: number;
  onTasksLoaded?: (tasks: RecordingTask[]) => void;
}

function useNow(intervalMs = 5000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function MethodLine({ task }: { task: RecordingTask }) {
  const t = useLang().m.recordings.start;
  const st = task.start;
  const label = st?.methodLabel ?? task.plannedMethod?.label;
  if (!label) return null;
  const platform = st?.platform ?? task.plannedMethod?.platform;
  const note = st?.note ?? task.plannedMethod?.note;
  return (
    <div className="mt-1 space-y-0.5">
      <p className="text-xs text-gray-500">
        {t.method}: {label}{platform ? ` · ${platform}` : ''}{st?.tool ? ` · ${st.tool}` : ''}
      </p>
      {st?.fallback && (
        <p className="text-xs text-amber-700">{t.fallback(st.fallback)}</p>
      )}
      {note && <p className="text-xs text-gray-400">{note}</p>}
    </div>
  );
}

function StartStatusPanel({ task }: { task: RecordingTask }) {
  return (
    <>
      <StartStatusBox task={task} />
      {task.status !== 'completed' && task.status !== 'cancelled' && <MethodLine task={task} />}
    </>
  );
}

function StartStatusBox({ task }: { task: RecordingTask }) {
  const { m } = useLang();
  const t = m.recordings.start;
  const [tz] = useRecordingTimeZone();
  const st = task.start;
  const attempt = st?.attempt && st?.maxAttempts ? t.attempt(st.attempt, st.maxAttempts) : '';

  if (task.status === 'failed' || st?.state === 'retrying') {
    const started = !!st?.recordingConfirmed;
    const retrying = st?.state === 'retrying' && task.status !== 'failed';
    return (
      <div className={`border rounded p-2 mt-2 ${retrying ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
        <p className={`text-xs font-medium ${retrying ? 'text-amber-800' : 'text-red-800'}`}>
          {started ? t.interrupted : t.notStarted}
          {retrying ? t.willRetry : ''}
          {attempt}
        </p>
        <p className={`text-xs mt-0.5 ${retrying ? 'text-amber-700' : 'text-red-700'}`}>
          {st?.reason ?? task.errorMessage ?? t.unknownReason}
        </p>
        {st?.hint && <p className="text-xs text-gray-600 mt-1">{t.whatToDo(st.hint)}</p>}
        {(st?.code || task.errorMessage) && (
          <details className="mt-1">
            <summary className="text-xs text-gray-400 cursor-pointer">{t.details}</summary>
            <p className="text-xs text-gray-500 mt-1 break-words">
              {st?.code && <span className="font-mono">{st.code}</span>}
              {st?.stage && t.stage(st.stage)}
              {task.errorMessage && <><br />{task.errorMessage}</>}
            </p>
          </details>
        )}
      </div>
    );
  }

  if (task.status === 'in_progress' || task.status === 'uploading') {
    if (st?.recordingConfirmed || task.status === 'uploading') {
      return (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded p-2 mt-2">
          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
          <p className="text-xs text-green-800">
            {t.started}: {st?.method && st.method !== 'browser' ? t.streamFlowing : t.videoReceived}
            {st?.recordingStartedAt ? t.at(fmtZoned(st.recordingStartedAt, tz).time, tzShort(tz, m)) : ''}
            {attempt}
          </p>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded p-2 mt-2">
        <Loader className="h-4 w-4 text-blue-600 animate-spin flex-shrink-0" />
        <p className="text-xs text-blue-800">
          {t.notConfirmed}: {st?.stageLabel ?? t.preparing}…{attempt}
        </p>
      </div>
    );
  }

  if ((task.status === 'ready' || task.status === 'scheduled') && st?.reason) {
    const sev = st.severity ?? 'info';
    const box =
      sev === 'error' ? 'bg-red-50 border-red-200 text-red-800'
      : sev === 'warn' ? 'bg-amber-50 border-amber-200 text-amber-800'
      : 'bg-gray-50 border-gray-200 text-gray-700';
    return (
      <div className={`border rounded p-2 mt-2 ${box}`}>
        <p className="text-xs font-medium">{st.reason}</p>
        {st.hint && <p className="text-xs mt-0.5 opacity-80">{st.hint}</p>}
      </div>
    );
  }

  if (task.errorMessage) {
    return (
      <div className="bg-red-50 border border-red-200 rounded p-2 mt-2">
        <p className="text-xs text-red-700">{task.errorMessage}</p>
      </div>
    );
  }
  return null;
}

export function RecordingTasksList({ statusFilter, refreshKey, onTasksLoaded }: RecordingTasksListProps) {
  const { m } = useLang();
  const r = m.recordings;
  const l = r.list;
  const [tasks, setTasks] = useState<RecordingTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const now = useNow(5000);
  const [timeZone, setTimeZone] = useRecordingTimeZone();
  const [editingTask, setEditingTask] = useState<RecordingTask | null>(null);
  const [playerTask, setPlayerTask] = useState<{ id: string; title: string } | null>(null);
  const [mergeTaskId, setMergeTaskId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmState>({
    open: false,
    title: '',
    message: '',
    confirmLabel: '',
    confirmVariant: 'destructive',
    onConfirm: () => {},
  });

  const showConfirm = (opts: Omit<ConfirmState, 'open'>) => {
    setConfirmDialog({ open: true, ...opts });
  };

  const closeConfirm = () => {
    setConfirmDialog(prev => ({ ...prev, open: false }));
  };
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    streamUrl: '',
    streamPassword: '',
    joinName: '',
    joinEmail: '',
    joinPhone: '',
    scheduledTime: '',
    duration: 60,
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);

  const filteredTasks = statusFilter 
    ? tasks.filter(task => task.status === statusFilter)
    : tasks;

  // Склейка: свои части (≥2) или части других завершённых записей пользователя
  const isFinished = (t: RecordingTask) => t.status === 'completed' || t.status === 'failed';
  const hasVideo = (t: RecordingTask) => (t.parts?.length ?? 0) > 0 || !!t.begetUrl;
  const finishedWithVideo = tasks.filter(t => isFinished(t) && hasVideo(t)).length;
  const canMerge = (t: RecordingTask) =>
    isFinished(t) &&
    ((t.parts?.length ?? 0) >= 2 ||
      (hasVideo(t) && finishedWithVideo >= 2) ||
      (!!t.mergeStatus && t.mergeStatus !== 'idle'));
  const mergeTask = tasks.find(t => t.id === mergeTaskId) ?? null;

  // Ссылка из библиотеки или письма: /recordings?task=<id> — сразу открыть плеер этой записи (один раз)
  const linkedTaskHandled = useRef(false); // список опрашивается каждые 10 с — открываем только при первой загрузке
  const openLinkedTask = (list: RecordingTask[]) => {
    if (linkedTaskHandled.current) return;
    linkedTaskHandled.current = true;
    const id = new URLSearchParams(window.location.search).get('task');
    const t = id ? list.find((x) => x.id === id) : undefined;
    if (t) setPlayerTask({ id: t.id, title: t.title });
  };

  const fetchTasks = async () => {
    try {
      const response = await authService.authenticatedFetch('/api/recording/tasks', {
        method: 'GET',
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(data);
        onTasksLoaded?.(data);
        openLinkedTask(data);
      } else if (response.status === 401) {
        console.warn('Recording tasks: сессия истекла, требуется повторный вход');
      } else {
        console.error('Recording tasks: HTTP', response.status);
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'TOKEN_MISSING') {
        console.warn('Recording tasks: токен не найден');
      } else {
        console.error('Recording tasks error:', error instanceof Error ? error.message : error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 10000);
    return () => clearInterval(interval);
  }, [refreshKey]);

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    return h > 0 ? l.hoursMinutes(h, minutes % 60) : m.common.minutes(minutes);
  };

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  };

  const getTotalFileSize = (parts: RecordingPart[]) => {
    const totalBytes = parts.reduce((sum, part) => sum + (part.fileSize || 0), 0);
    if (totalBytes === 0) return 'N/A';
    if (totalBytes > 1024 * 1024 * 1024) {
      return `${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    return `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      scheduled: 'bg-indigo-100 text-indigo-800',
      ready: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      uploading: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${styles[status] ?? 'bg-gray-100 text-gray-800'}`}>
        {status === 'completed' && <CheckCircle className="h-4 w-4" />}
        {(status === 'in_progress' || status === 'uploading') && <Clock className="h-4 w-4 animate-spin" />}
        {status === 'failed' && <AlertCircle className="h-4 w-4" />}
        {r.status[status] ?? status}
      </span>
    );
  };

  const handleDelete = (taskId: string) => {
    showConfirm({
      title: r.confirm.deleteTitle,
      message: r.confirm.deleteText,
      confirmLabel: r.confirm.deleteOk,
      confirmVariant: 'destructive',
      onConfirm: async () => {
        closeConfirm();
        try {
          const response = await authService.authenticatedFetch(`/api/recording/tasks/${taskId}`, { method: 'DELETE' });
          if (response.ok) await fetchTasks();
        } catch (error) {
          console.error('Error deleting task:', error);
        }
      },
    });
  };

  const handleCancel = (taskId: string) => {
    showConfirm({
      title: r.confirm.cancelTitle,
      message: r.confirm.cancelText,
      confirmLabel: r.confirm.cancelOk,
      confirmVariant: 'destructive',
      onConfirm: async () => {
        closeConfirm();
        try {
          const response = await authService.authenticatedFetch(`/api/recording/tasks/${taskId}/cancel`, { method: 'POST' });
          if (response.ok) await fetchTasks();
        } catch (error) {
          console.error('Error cancelling task:', error);
        }
      },
    });
  };

  const handleRecheck = async (taskId: string) => {
    try {
      await authService.authenticatedFetch(`/api/recording/tasks/${taskId}/recheck`, { method: 'POST' });
      await fetchTasks();
    } catch (error) {
      console.error('Error requesting recheck:', error);
    }
  };

  const handleRecover = async (taskId: string) => {
    try {
      const response = await authService.authenticatedFetch(`/api/recording/tasks/${taskId}/recover`, { method: 'POST' });
      if (response.ok) await fetchTasks();
    } catch (error) {
      console.error('Error recovering task:', error);
    }
  };

  const handleEditStart = (task: RecordingTask) => {
    setEditingTask(task);
    setEditError(null);
    setEditSuccess(false);
    setEditFormData({
      title: task.title,
      description: task.description || '',
      streamUrl: task.streamUrl,
      streamPassword: '',
      joinName: task.joinName || '',
      joinEmail: task.joinEmail || '',
      joinPhone: task.joinPhone || '',
      scheduledTime: utcToZonedInput(task.scheduledTime, timeZone),
      duration: task.duration,
    });
  };

  const handleEditSave = async () => {
    if (!editingTask) return;
    setEditError(null);

    if (!editFormData.title.trim()) {
      setEditError(r.edit.errName);
      return;
    }
    if (!editFormData.streamUrl.trim()) {
      setEditError(r.form.errUrl);
      return;
    }
    if (!editFormData.scheduledTime) {
      setEditError(r.edit.errStart);
      return;
    }
    if (editFormData.duration < 1 || editFormData.duration > 1440) {
      setEditError(r.form.errDuration);
      return;
    }

    try {
      setIsUpdating(true);
      const response = await authService.authenticatedFetch(`/api/recording/tasks/${editingTask.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: editFormData.title.trim(),
          description: editFormData.description.trim() || undefined,
          streamUrl: editFormData.streamUrl.trim(),
          streamPassword: editFormData.streamPassword || undefined,
          joinName: editFormData.joinName.trim() || undefined,
          joinEmail: editFormData.joinEmail.trim() || undefined,
          joinPhone: editFormData.joinPhone.trim() || undefined,
          scheduledTime: zonedInputToUtcIso(editFormData.scheduledTime, timeZone),
          duration: Number(editFormData.duration),
        }),
      });

      if (response.ok) {
        setEditSuccess(true);
        await fetchTasks();
        setTimeout(() => {
          setEditingTask(null);
          setEditSuccess(false);
        }, 1000);
      } else {
        const data = await response.json().catch(() => ({}));
        setEditError(data.message || r.edit.errSave);
      }
    } catch (error) {
      setEditError(r.edit.connectionError);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">{l.loading}</div>;
  }

  if (tasks.length === 0) {
    return <div className="text-center py-8 text-gray-500">{l.empty}</div>;
  }

  if (filteredTasks.length === 0) {
    return <div className="text-center py-8 text-gray-500">{l.emptyFilter}</div>;
  }

  return (
    <div className="space-y-4">
      {filteredTasks.map((task) => (
        <div
          key={task.id}
          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 truncate">{task.title}</h4>
              {task.description && (
                <p className="text-sm text-gray-600 mt-0.5 line-clamp-1">{task.description}</p>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
              {getStatusBadge(task.status)}

              {task.attemptCount !== undefined && task.attemptCount > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                  {l.attempt(task.attemptCount, 3)}
                </span>
              )}

              {task.status === 'completed' && task.duration > 10 && task.fileSize != null && task.fileSize < 5 * 1024 * 1024 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700" title={l.shortHint}>
                  {l.short}
                </span>
              )}

              {(task.status === 'completed' || task.status === 'failed') && (task.mergedUrl || task.begetUrl || (task.parts?.length ?? 0) > 0) && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                  title={l.watchHint}
                  onClick={() => setPlayerTask({ id: task.id, title: task.title })}
                >
                  <Play className="h-4 w-4" />
                </Button>
              )}

              {canMerge(task) && (
                <Button
                  size="sm"
                  variant="outline"
                  className={`h-8 px-2 text-xs gap-1 ${
                    task.mergeStatus === 'merging' || task.mergeStatus === 'queued'
                      ? 'text-blue-600 border-blue-300'
                      : task.mergeStatus === 'failed'
                      ? 'text-red-500 border-red-300'
                      : task.mergeStatus === 'completed' && task.mergedUrl
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : 'text-indigo-600 hover:text-indigo-800 hover:border-indigo-300'
                  }`}
                  title={
                    task.mergeStatus === 'merging' || task.mergeStatus === 'queued'
                      ? (task.mergeProgress ?? l.merging)
                      : task.mergeStatus === 'failed'
                      ? l.mergeFailedHint(task.mergeError ?? l.unknown)
                      : l.mergeHint
                  }
                  onClick={() => setMergeTaskId(task.id)}
                >
                  {task.mergeStatus === 'merging' || task.mergeStatus === 'queued'
                    ? <Loader className="h-3.5 w-3.5 animate-spin" />
                    : <Merge className="h-3.5 w-3.5" />
                  }
                  {task.mergeStatus === 'merging'
                    ? l.merging
                    : task.mergeStatus === 'queued'
                    ? l.queued
                    : task.mergeStatus === 'failed'
                    ? l.mergeFailed
                    : task.mergeStatus === 'completed' && task.mergedUrl
                    ? l.merged
                    : l.merge}
                </Button>
              )}

              {(task.status === 'scheduled' || task.status === 'in_progress' || task.status === 'uploading') && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2 text-orange-500 hover:text-orange-700 hover:border-orange-300 text-xs gap-1"
                  title={l.cancelHint}
                  onClick={() => handleCancel(task.id)}
                >
                  <StopCircle className="h-4 w-4" />
                  {l.cancel}
                </Button>
              )}

              {(task.status === 'scheduled' || task.status === 'ready' || task.status === 'failed' || task.status === 'in_progress' || task.status === 'cancelled') && (
                <>
                  {(task.urlCheckStatus === 'warning' || task.urlCheckStatus === 'failed') && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600"
                      title={l.recheckHint}
                      onClick={() => handleRecheck(task.id)}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {task.status === 'failed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2 text-green-600 hover:text-green-800 hover:border-green-300 text-xs gap-1"
                      title={l.retryHint}
                      onClick={() => handleRecover(task.id)}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      {l.retry}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0"
                    title={task.status === 'failed' ? l.fixHint : l.editHint}
                    onClick={() => handleEditStart(task)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </>
              )}

              {task.status !== 'in_progress' && task.status !== 'uploading' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:border-red-300"
                  title={l.deleteHint}
                  onClick={() => handleDelete(task.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-sm">
            <div className="bg-gray-50 p-2 rounded">
              <span className="text-gray-500 text-xs block">{l.start(tzShort(timeZone, m))}</span>
              <p className="font-semibold text-xs leading-tight mt-0.5">
                {fmtZoned(task.scheduledTime, timeZone).date}
              </p>
              <p className="text-xs text-gray-600">
                {fmtZoned(task.scheduledTime, timeZone).time}
              </p>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <span className="text-gray-500 text-xs block">{l.source}</span>
              <div className="flex items-center gap-1 mt-0.5">
                <p className="font-semibold text-xs">{getDomain(task.streamUrl)}</p>
                {task.urlCheckStatus === 'pending' && (
                  <span title={l.checking}><Loader className="h-3 w-3 text-gray-400 animate-spin flex-shrink-0" /></span>
                )}
                {task.urlCheckStatus === 'ok' && (
                  <span title={l.urlOk}><CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" /></span>
                )}
                {task.urlCheckStatus === 'warning' && (
                  <span title={task.urlCheckMessage ?? undefined}><TriangleAlert className="h-3 w-3 text-amber-500 flex-shrink-0" /></span>
                )}
                {task.urlCheckStatus === 'failed' && (
                  <span title={task.urlCheckMessage ?? undefined}><XCircle className="h-3 w-3 text-red-500 flex-shrink-0" /></span>
                )}
              </div>
              <a
                href={task.streamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline truncate block"
                title={task.streamUrl}
              >
                {task.streamUrl.length > 32 ? task.streamUrl.slice(0, 32) + '…' : task.streamUrl}
              </a>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <span className="text-gray-500 text-xs block">{l.duration}</span>
              <p className="font-semibold text-xs mt-0.5">{formatDuration(task.duration)}</p>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <span className="text-gray-500 text-xs block">{l.status}</span>
              {(() => {
                const isActive = task.status === 'in_progress' || task.status === 'uploading';
                let pct = 0;
                if (isActive && task.startedAt && task.duration) {
                  const elapsed = now - new Date(task.startedAt).getTime();
                  pct = Math.min(99, Math.round(elapsed / (task.duration * 60 * 1000) * 100));
                } else if (task.status === 'completed') {
                  pct = 100;
                }
                const label = r.status[task.status] ?? task.status;
                const color =
                  task.status === 'scheduled'   ? 'text-indigo-600' :
                  task.status === 'ready'       ? 'text-blue-600' :
                  task.status === 'in_progress' ? 'text-amber-600' :
                  task.status === 'uploading'   ? 'text-purple-600' :
                  task.status === 'completed'   ? 'text-green-600' :
                  task.status === 'failed'      ? 'text-red-600' : 'text-gray-500';
                const barColor =
                  task.status === 'in_progress' ? 'bg-amber-400' :
                  task.status === 'uploading'   ? 'bg-purple-400' : 'bg-green-500';
                return (
                  <>
                    <p className={`text-xs font-semibold mt-0.5 ${color}`}>{label}</p>
                    {(isActive || task.status === 'completed') && (
                      <div className="mt-1.5">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-xs text-gray-400">{pct}%</span>
                          {isActive && task.startedAt && task.duration && (
                            <span className="text-xs text-gray-400">
                              {m.common.minutes(Math.max(0, Math.round((task.duration * 60 * 1000 - (now - new Date(task.startedAt).getTime())) / 60000)))}
                            </span>
                          )}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-1000 ${barColor}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            <div className="bg-gray-50 p-2 rounded col-span-2 sm:col-span-1">
              <span className="text-gray-500 text-xs block">{l.file}</span>
              {(task.begetUrl || task.playlistUrl) ? (
                <button
                  type="button"
                  onClick={() => setPlayerTask({ id: task.id, title: task.title })}
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline truncate block mt-0.5 text-left max-w-full"
                  title={l.playerHint}
                >
                  ▶ {l.watch}
                </button>
              ) : (
                <p className="text-xs text-gray-400 mt-0.5 italic">
                  {task.status === 'completed' ? l.noLink :
                   task.status === 'failed'    ? '—' :
                                                 l.afterRecording}
                </p>
              )}
            </div>
          </div>

          {(task.joinName || task.joinEmail || task.joinPhone) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 px-1">
              {task.joinName && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <span className="text-gray-400">👤</span>
                  {task.joinName}
                </span>
              )}
              {task.joinEmail && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <span className="text-gray-400">✉</span>
                  {task.joinEmail}
                </span>
              )}
              {task.joinPhone && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <span className="text-gray-400">📞</span>
                  {task.joinPhone}
                </span>
              )}
            </div>
          )}

          {task.urlCheckStatus === 'warning' && task.urlCheckMessage && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded p-2 mt-2">
              <TriangleAlert className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-amber-800">{l.urlWarning}</p>
                <p className="text-xs text-amber-700 mt-0.5">{task.urlCheckMessage}</p>
              </div>
            </div>
          )}

          {task.urlCheckStatus === 'failed' && task.urlCheckMessage && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded p-2 mt-2">
              <XCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-red-800">{l.urlFailed}</p>
                <p className="text-xs text-red-700 mt-0.5">{task.urlCheckMessage}</p>
              </div>
            </div>
          )}

          <StartStatusPanel task={task} />
        </div>
      ))}

      <RecordingPlayerDialog
        taskId={playerTask?.id ?? null}
        title={playerTask?.title}
        onClose={() => setPlayerTask(null)}
      />

      <RecordingMergeDialog
        task={mergeTask}
        onClose={() => setMergeTaskId(null)}
        onChanged={fetchTasks}
        onWatch={(t) => {
          setMergeTaskId(null);
          setPlayerTask(t);
        }}
      />

      {editingTask && (
        <Dialog open={!!editingTask} onOpenChange={() => { setEditingTask(null); setEditError(null); setEditSuccess(false); }}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTask.status === 'failed' ? r.edit.titleFix : r.edit.title}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {editingTask.status === 'failed' && editingTask.errorMessage && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700 text-sm">
                    <span className="font-medium">{r.edit.errorReason}</span> {editingTask.start?.reason ?? editingTask.errorMessage}
                  </AlertDescription>
                </Alert>
              )}

              {editingTask.status === 'failed' && (
                <div className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
                  {r.edit.willBeReady}
                </div>
              )}

              {editError && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700 text-sm">{editError}</AlertDescription>
                </Alert>
              )}

              {editSuccess && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700 text-sm font-medium">
                    {r.edit.saved}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="edit-title">{r.edit.name}</Label>
                <Input
                  id="edit-title"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  disabled={isUpdating || editSuccess}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">{r.form.description}</Label>
                <Textarea
                  id="edit-description"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="min-h-[80px]"
                  disabled={isUpdating || editSuccess}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-url">{r.form.streamUrl}</Label>
                <Input
                  id="edit-url"
                  type="url"
                  value={editFormData.streamUrl}
                  onChange={(e) => setEditFormData({ ...editFormData, streamUrl: e.target.value })}
                  disabled={isUpdating || editSuccess}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-password">
                  {r.edit.password} {editingTask.status === 'failed' ? r.edit.passwordKeep : r.edit.optional}
                </Label>
                <Input
                  id="edit-password"
                  type="password"
                  placeholder={editingTask.status === 'failed' ? r.edit.passwordPlaceholder : ''}
                  value={editFormData.streamPassword}
                  onChange={(e) => setEditFormData({ ...editFormData, streamPassword: e.target.value })}
                  disabled={isUpdating || editSuccess}
                />
              </div>

              <div className="border-t pt-3">
                <p className="text-xs text-gray-500 mb-3">{r.edit.joinTitle}</p>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="edit-join-name">{r.form.joinName}</Label>
                    <Input
                      id="edit-join-name"
                      placeholder={r.edit.joinNamePlaceholder}
                      value={editFormData.joinName}
                      onChange={(e) => setEditFormData({ ...editFormData, joinName: e.target.value })}
                      disabled={isUpdating || editSuccess}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-join-email">{r.form.joinEmail} <span className="text-gray-400 font-normal">{r.edit.optional}</span></Label>
                    <Input
                      id="edit-join-email"
                      type="email"
                      placeholder={r.form.emailPlaceholder}
                      value={editFormData.joinEmail}
                      onChange={(e) => setEditFormData({ ...editFormData, joinEmail: e.target.value })}
                      disabled={isUpdating || editSuccess}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-join-phone">{r.form.joinPhone} <span className="text-gray-400 font-normal">{r.edit.optional}</span></Label>
                    <Input
                      id="edit-join-phone"
                      type="tel"
                      placeholder={r.form.phonePlaceholder}
                      value={editFormData.joinPhone}
                      onChange={(e) => setEditFormData({ ...editFormData, joinPhone: e.target.value })}
                      disabled={isUpdating || editSuccess}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-time">{r.edit.start}</Label>
                <div className="flex flex-col gap-2">
                  <Input
                    id="edit-time"
                    type="datetime-local"
                    value={editFormData.scheduledTime}
                    onChange={(e) => setEditFormData({ ...editFormData, scheduledTime: e.target.value })}
                    disabled={isUpdating || editSuccess}
                  />
                  <Select
                    value={timeZone}
                    onValueChange={(v) => {
                      // то же время записи, показанное в другом поясе
                      const utc = zonedInputToUtcIso(editFormData.scheduledTime, timeZone);
                      const next = v as TimeZoneChoice;
                      setTimeZone(next);
                      if (utc) setEditFormData({ ...editFormData, scheduledTime: utcToZonedInput(utc, next) });
                    }}
                    disabled={isUpdating || editSuccess}
                  >
                    <SelectTrigger aria-label={m.events.calendar.timeZone}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_ZONE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.value === 'local' ? `${m.timeZones.local} (${browserTimeZone()})` : tzOptionLabel(o.value, m)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-duration">{r.edit.duration}</Label>
                <Input
                  id="edit-duration"
                  type="number"
                  min="1"
                  max="1440"
                  value={editFormData.duration}
                  onChange={(e) => setEditFormData({ ...editFormData, duration: parseInt(e.target.value) || 60 })}
                  disabled={isUpdating || editSuccess}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => { setEditingTask(null); setEditError(null); setEditSuccess(false); }}
                disabled={isUpdating}
              >
                {m.common.cancel}
              </Button>
              <Button onClick={handleEditSave} disabled={isUpdating || editSuccess}>
                {isUpdating ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    {m.common.saving}
                  </>
                ) : editingTask.status === 'failed' ? r.edit.saveRestart : m.common.save}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={confirmDialog.open} onOpenChange={closeConfirm}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{confirmDialog.title}</DialogTitle>
            <DialogDescription>{confirmDialog.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeConfirm}>
              {r.confirm.no}
            </Button>
            <Button variant={confirmDialog.confirmVariant} onClick={confirmDialog.onConfirm}>
              {confirmDialog.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
