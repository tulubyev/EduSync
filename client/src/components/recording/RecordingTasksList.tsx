import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Clock, Play, Trash2, Loader, Edit2, RefreshCw, RotateCcw, TriangleAlert, XCircle, StopCircle } from 'lucide-react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';

const pad = (n: number) => String(n).padStart(2, '0');
function utcToMoscow(utcStr: string): Date {
  return new Date(new Date(utcStr).getTime() + 3 * 60 * 60 * 1000);
}
function fmtMoscowDate(utcStr: string): string {
  const d = utcToMoscow(utcStr);
  return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`;
}
function fmtMoscowTime(utcStr: string): string {
  const d = utcToMoscow(utcStr);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}
function moscowToInputValue(utcStr: string): string {
  const d = utcToMoscow(utcStr);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}
function inputToUtcIso(localDatetime: string): string {
  return new Date(localDatetime + ':00+03:00').toISOString();
}

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

interface RecordingTask {
  id: string;
  title: string;
  description?: string;
  streamUrl: string;
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
}

interface RecordingTasksListProps {
  statusFilter?: string | null;
  refreshKey?: number;
  onTasksLoaded?: (tasks: RecordingTask[]) => void;
}

export function RecordingTasksList({ statusFilter, refreshKey, onTasksLoaded }: RecordingTasksListProps) {
  const [tasks, setTasks] = useState<RecordingTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<RecordingTask | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmState>({
    open: false,
    title: '',
    message: '',
    confirmLabel: 'Подтвердить',
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
    scheduledTime: '',
    duration: 60,
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);

  const filteredTasks = statusFilter 
    ? tasks.filter(task => task.status === statusFilter)
    : tasks;

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/recording/tasks', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(data);
        onTasksLoaded?.(data);
      }
    } catch (error) {
      console.error('Error fetching recording tasks:', error);
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
    const m = minutes % 60;
    if (h > 0) return `${h} ч ${m > 0 ? `${m} мин` : ''}`.trim();
    return `${m} мин`;
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

    const labels: Record<string, string> = {
      scheduled: 'Запланировано',
      ready: 'Готова к записи',
      in_progress: 'Идёт запись',
      uploading: 'Загрузка видео',
      completed: 'Завершена',
      failed: 'Ошибка',
      cancelled: 'Отменена',
    };

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${styles[status] ?? 'bg-gray-100 text-gray-800'}`}>
        {status === 'completed' && <CheckCircle className="h-4 w-4" />}
        {(status === 'in_progress' || status === 'uploading') && <Clock className="h-4 w-4 animate-spin" />}
        {status === 'failed' && <AlertCircle className="h-4 w-4" />}
        {labels[status] ?? status}
      </span>
    );
  };

  const handleDelete = (taskId: string) => {
    showConfirm({
      title: 'Удалить запись?',
      message: 'Задача будет удалена безвозвратно.',
      confirmLabel: 'Удалить',
      confirmVariant: 'destructive',
      onConfirm: async () => {
        closeConfirm();
        try {
          const token = localStorage.getItem('accessToken');
          const response = await fetch(`/api/recording/tasks/${taskId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (response.ok) await fetchTasks();
        } catch (error) {
          console.error('Error deleting task:', error);
        }
      },
    });
  };

  const handleCancel = (taskId: string) => {
    showConfirm({
      title: 'Отменить запись?',
      message: 'Задача будет переведена в статус "Отменена". После этого её можно удалить.',
      confirmLabel: 'Отменить запись',
      confirmVariant: 'destructive',
      onConfirm: async () => {
        closeConfirm();
        try {
          const token = localStorage.getItem('accessToken');
          const response = await fetch(`/api/recording/tasks/${taskId}/cancel`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (response.ok) await fetchTasks();
        } catch (error) {
          console.error('Error cancelling task:', error);
        }
      },
    });
  };

  const handleRecheck = async (taskId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      await fetch(`/api/recording/tasks/${taskId}/recheck`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      await fetchTasks();
    } catch (error) {
      console.error('Error requesting recheck:', error);
    }
  };

  const handleRecover = async (taskId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/recording/tasks/${taskId}/recover`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
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
      scheduledTime: moscowToInputValue(task.scheduledTime),
      duration: task.duration,
    });
  };

  const handleEditSave = async () => {
    if (!editingTask) return;
    setEditError(null);

    if (!editFormData.title.trim()) {
      setEditError('Укажите название записи');
      return;
    }
    if (!editFormData.streamUrl.trim()) {
      setEditError('Укажите ссылку на трансляцию');
      return;
    }
    if (!editFormData.scheduledTime) {
      setEditError('Укажите дату и время начала');
      return;
    }
    if (editFormData.duration < 1 || editFormData.duration > 1440) {
      setEditError('Длительность должна быть от 1 до 1440 минут');
      return;
    }

    try {
      setIsUpdating(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/recording/tasks/${editingTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: editFormData.title.trim(),
          description: editFormData.description.trim() || undefined,
          streamUrl: editFormData.streamUrl.trim(),
          streamPassword: editFormData.streamPassword || undefined,
          scheduledTime: inputToUtcIso(editFormData.scheduledTime),
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
        setEditError(data.message || 'Ошибка при сохранении. Попробуйте ещё раз.');
      }
    } catch (error) {
      setEditError('Ошибка соединения с сервером');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Загрузка списка записей...</div>;
  }

  if (tasks.length === 0) {
    return <div className="text-center py-8 text-gray-500">Нет запланированных или завершённых записей</div>;
  }

  if (filteredTasks.length === 0) {
    return <div className="text-center py-8 text-gray-500">Нет записей с выбранным статусом</div>;
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
                  Попытка {task.attemptCount} из 3
                </span>
              )}

              {task.status === 'completed' && task.duration > 10 && task.fileSize != null && task.fileSize < 5 * 1024 * 1024 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700" title="Файл значительно короче ожидаемого">
                  ⚠ Короткая
                </span>
              )}

              {task.status === 'completed' && (task.begetUrl || task.playlistUrl) && (
                <Button size="sm" variant="outline" className="h-8 w-8 p-0" title="Смотреть видео" asChild>
                  <a href={task.begetUrl || task.playlistUrl} target="_blank" rel="noopener noreferrer">
                    <Play className="h-4 w-4" />
                  </a>
                </Button>
              )}

              {(task.status === 'scheduled' || task.status === 'in_progress' || task.status === 'uploading') && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2 text-orange-500 hover:text-orange-700 hover:border-orange-300 text-xs gap-1"
                  title="Отменить запись"
                  onClick={() => handleCancel(task.id)}
                >
                  <StopCircle className="h-4 w-4" />
                  Отменить
                </Button>
              )}

              {(task.status === 'scheduled' || task.status === 'ready' || task.status === 'failed') && (
                <>
                  {(task.urlCheckStatus === 'warning' || task.urlCheckStatus === 'failed') && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600"
                      title="Перепроверить доступность URL"
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
                      title="Повторить запись"
                      onClick={() => handleRecover(task.id)}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Повторить
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0"
                    title={task.status === 'failed' ? 'Исправить и перезапустить' : 'Редактировать'}
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
                  title="Удалить"
                  onClick={() => handleDelete(task.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-sm">
            <div className="bg-gray-50 p-2 rounded">
              <span className="text-gray-500 text-xs block">Начало записи (МСК)</span>
              <p className="font-semibold text-xs leading-tight mt-0.5">
                {fmtMoscowDate(task.scheduledTime)}
              </p>
              <p className="text-xs text-gray-600">
                {fmtMoscowTime(task.scheduledTime)}
              </p>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <span className="text-gray-500 text-xs block">Источник</span>
              <div className="flex items-center gap-1 mt-0.5">
                <p className="font-semibold text-xs">{getDomain(task.streamUrl)}</p>
                {task.urlCheckStatus === 'pending' && (
                  <span title="Проверяется доступность..."><Loader className="h-3 w-3 text-gray-400 animate-spin flex-shrink-0" /></span>
                )}
                {task.urlCheckStatus === 'ok' && (
                  <span title="URL доступен"><CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" /></span>
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
              <span className="text-gray-500 text-xs block">Длительность</span>
              <p className="font-semibold text-xs mt-0.5">{formatDuration(task.duration)}</p>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <span className="text-gray-500 text-xs block">Статус</span>
              <p className={`text-xs font-semibold mt-0.5 ${
                task.status === 'scheduled'   ? 'text-indigo-600' :
                task.status === 'ready'       ? 'text-blue-600' :
                task.status === 'in_progress' ? 'text-amber-600' :
                task.status === 'uploading'   ? 'text-purple-600' :
                task.status === 'completed'   ? 'text-green-600' :
                task.status === 'failed'      ? 'text-red-600' :
                                                'text-gray-500'
              }`}>
                {task.status === 'scheduled'   ? 'Запланировано' :
                 task.status === 'ready'       ? 'Ожидает' :
                 task.status === 'in_progress' ? 'Идёт запись' :
                 task.status === 'uploading'   ? 'Загрузка' :
                 task.status === 'completed'   ? 'Завершена' :
                 task.status === 'failed'      ? 'Ошибка' :
                                                'Отменена'}
              </p>
            </div>
            <div className="bg-gray-50 p-2 rounded col-span-2 sm:col-span-1">
              <span className="text-gray-500 text-xs block">URL записи</span>
              {(task.begetUrl || task.playlistUrl) ? (
                <a
                  href={task.begetUrl || task.playlistUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline truncate block mt-0.5"
                  title={task.begetUrl || task.playlistUrl}
                >
                  {(() => {
                    const url = (task.begetUrl || task.playlistUrl)!;
                    return url.length > 36 ? url.slice(0, 36) + '…' : url;
                  })()}
                </a>
              ) : (
                <p className="text-xs text-gray-400 mt-0.5 italic">
                  {task.status === 'completed' ? 'Нет ссылки' :
                   task.status === 'failed'    ? '—' :
                                                 'После записи'}
                </p>
              )}
            </div>
          </div>

          {task.urlCheckStatus === 'warning' && task.urlCheckMessage && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded p-2 mt-2">
              <TriangleAlert className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-amber-800">Предупреждение о доступности</p>
                <p className="text-xs text-amber-700 mt-0.5">{task.urlCheckMessage}</p>
              </div>
            </div>
          )}

          {task.urlCheckStatus === 'failed' && task.urlCheckMessage && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded p-2 mt-2">
              <XCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-red-800">URL трансляции недоступен</p>
                <p className="text-xs text-red-700 mt-0.5">{task.urlCheckMessage}</p>
              </div>
            </div>
          )}

          {task.errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded p-2 mt-2">
              <p className="text-xs text-red-700">{task.errorMessage}</p>
            </div>
          )}
        </div>
      ))}

      {editingTask && (
        <Dialog open={!!editingTask} onOpenChange={() => { setEditingTask(null); setEditError(null); setEditSuccess(false); }}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTask.status === 'failed' ? 'Исправить и перезапустить запись' : 'Редактировать запись'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {editingTask.status === 'failed' && editingTask.errorMessage && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700 text-sm">
                    <span className="font-medium">Причина ошибки:</span> {editingTask.errorMessage}
                  </AlertDescription>
                </Alert>
              )}

              {editingTask.status === 'failed' && (
                <div className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
                  После сохранения задача будет переведена в статус «Готова к записи»
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
                    Изменения сохранены
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="edit-title">Название</Label>
                <Input
                  id="edit-title"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  disabled={isUpdating || editSuccess}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Описание (опционально)</Label>
                <Textarea
                  id="edit-description"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="min-h-[80px]"
                  disabled={isUpdating || editSuccess}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-url">Ссылка на трансляцию</Label>
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
                  Пароль {editingTask.status === 'failed' ? '(оставьте пустым, если не изменился)' : '(опционально)'}
                </Label>
                <Input
                  id="edit-password"
                  type="password"
                  placeholder={editingTask.status === 'failed' ? 'Введите новый пароль или оставьте пустым' : ''}
                  value={editFormData.streamPassword}
                  onChange={(e) => setEditFormData({ ...editFormData, streamPassword: e.target.value })}
                  disabled={isUpdating || editSuccess}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-time">
                  Дата и время начала{' '}
                  <span className="text-xs font-normal text-gray-500">(по Москве, UTC+3)</span>
                </Label>
                <Input
                  id="edit-time"
                  type="datetime-local"
                  value={editFormData.scheduledTime}
                  onChange={(e) => setEditFormData({ ...editFormData, scheduledTime: e.target.value })}
                  disabled={isUpdating || editSuccess}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-duration">Длительность (минут, от 1 до 1440)</Label>
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
                Отмена
              </Button>
              <Button onClick={handleEditSave} disabled={isUpdating || editSuccess}>
                {isUpdating ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Сохранение...
                  </>
                ) : editingTask.status === 'failed' ? 'Сохранить и перезапустить' : 'Сохранить'}
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
              Нет, отмена
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
