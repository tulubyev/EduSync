import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Clock, Play, Trash2, Loader, Edit2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  status: 'ready' | 'in_progress' | 'uploading' | 'completed' | 'failed' | 'cancelled';
  parts: RecordingPart[];
  playlistUrl?: string;
  begetUrl?: string;
  errorMessage?: string;
  workerId?: string;
  lastHeartbeat?: string;
  startedAt?: string;
  completedAt?: string;
}

interface RecordingTasksListProps {
  statusFilter?: string | null;
  refreshKey?: number;
  onTasksLoaded?: (tasks: RecordingTask[]) => void;
}

export function RecordingTasksList({ statusFilter, refreshKey, onTasksLoaded }: RecordingTasksListProps) {
  const [tasks, setTasks] = useState<RecordingTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [editingTask, setEditingTask] = useState<RecordingTask | null>(null);
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
      ready: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      uploading: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };

    const labels: Record<string, string> = {
      ready: 'Готова к записи',
      in_progress: 'Идёт запись',
      uploading: 'Загрузка видео',
      completed: 'Завершена',
      failed: 'Ошибка',
      cancelled: 'Отменена',
    };

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${styles[status]}`}>
        {status === 'completed' && <CheckCircle className="h-4 w-4" />}
        {(status === 'in_progress' || status === 'uploading') && <Clock className="h-4 w-4 animate-spin" />}
        {status === 'failed' && <AlertCircle className="h-4 w-4" />}
        {labels[status]}
      </span>
    );
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('Удалить эту запись?')) return;
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/recording/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        await fetchTasks();
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleClearQueue = async () => {
    if (!confirm('Удалить все запланированные и неудачные записи?')) return;
    try {
      setIsClearing(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/recording/tasks/clear-queue', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        await fetchTasks();
      }
    } catch (error) {
      console.error('Error clearing queue:', error);
    } finally {
      setIsClearing(false);
    }
  };

  const handleEditStart = (task: RecordingTask) => {
    setEditingTask(task);
    setEditError(null);
    setEditSuccess(false);
    const localTime = new Date(task.scheduledTime);
    const offset = localTime.getTimezoneOffset() * 60000;
    const localISO = new Date(localTime.getTime() - offset).toISOString().substring(0, 16);
    setEditFormData({
      title: task.title,
      description: task.description || '',
      streamUrl: task.streamUrl,
      streamPassword: '',
      scheduledTime: localISO,
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
          scheduledTime: new Date(editFormData.scheduledTime).toISOString(),
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

  const hasScheduledOrFailed = tasks.some(t => t.status === 'ready' || t.status === 'failed');

  return (
    <div className="space-y-4">
      {hasScheduledOrFailed && !statusFilter && (
        <div className="flex justify-end mb-3">
          <Button
            size="sm"
            variant="destructive"
            onClick={handleClearQueue}
            disabled={isClearing}
            className="min-h-11"
          >
            {isClearing ? (
              <>
                <Loader className="h-4 w-4 mr-1 animate-spin" />
                <span className="hidden sm:inline">Очистка...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Очистить очередь</span>
              </>
            )}
          </Button>
        </div>
      )}
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
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {getStatusBadge(task.status)}

              {task.status === 'completed' && (task.begetUrl || task.playlistUrl) && (
                <Button size="sm" variant="outline" className="h-8 w-8 p-0" title="Смотреть видео" asChild>
                  <a href={task.begetUrl || task.playlistUrl} target="_blank" rel="noopener noreferrer">
                    <Play className="h-4 w-4" />
                  </a>
                </Button>
              )}

              {(task.status === 'ready' || task.status === 'failed') && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                  title={task.status === 'failed' ? 'Исправить и перезапустить' : 'Редактировать'}
                  onClick={() => handleEditStart(task)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
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
              <span className="text-gray-500 text-xs block">Начало записи</span>
              <p className="font-semibold text-xs leading-tight mt-0.5">
                {format(new Date(task.scheduledTime), 'dd.MM.yyyy', { locale: ru })}
              </p>
              <p className="text-xs text-gray-600">
                {format(new Date(task.scheduledTime), 'HH:mm', { locale: ru })}
              </p>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <span className="text-gray-500 text-xs block">Источник</span>
              <p className="font-semibold text-xs mt-0.5">{getDomain(task.streamUrl)}</p>
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
                task.status === 'ready'       ? 'text-blue-600' :
                task.status === 'in_progress' ? 'text-amber-600' :
                task.status === 'uploading'   ? 'text-purple-600' :
                task.status === 'completed'   ? 'text-green-600' :
                task.status === 'failed'      ? 'text-red-600' :
                                                'text-gray-500'
              }`}>
                {task.status === 'ready'       ? 'Ожидает' :
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
                <Label htmlFor="edit-time">Дата и время начала</Label>
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
    </div>
  );
}
