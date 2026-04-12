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
    const mins = Math.floor(minutes);
    const secs = Math.round((minutes % 1) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
    setEditFormData({
      title: task.title,
      description: task.description || '',
      streamUrl: task.streamUrl,
      streamPassword: '',
      scheduledTime: task.scheduledTime.substring(0, 16),
      duration: task.duration,
    });
  };

  const handleEditSave = async () => {
    if (!editingTask || !editFormData.title.trim() || !editFormData.streamUrl.trim()) return;
    
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
          title: editFormData.title,
          description: editFormData.description,
          streamUrl: editFormData.streamUrl,
          streamPassword: editFormData.streamPassword,
          scheduledTime: new Date(editFormData.scheduledTime).toISOString(),
          duration: editFormData.duration,
        }),
      });

      if (response.ok) {
        await fetchTasks();
        setEditingTask(null);
      }
    } catch (error) {
      console.error('Error updating task:', error);
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
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">{task.title}</h4>
              {task.description && (
                <p className="text-sm text-gray-600 mt-1">{task.description}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {format(new Date(task.scheduledTime), 'dd MMMM yyyy, HH:mm', { locale: ru })}
              </p>
            </div>
            <div className="ml-4">{getStatusBadge(task.status)}</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 mb-3 text-sm">
            <div className="bg-gray-50 p-2 sm:p-3 rounded flex justify-between sm:block">
              <span className="text-gray-600">Длительность</span>
              <p className="font-semibold">{formatDuration(task.duration)} мин</p>
            </div>
            <div className="bg-gray-50 p-2 sm:p-3 rounded flex justify-between sm:block">
              <span className="text-gray-600">Размер</span>
              <p className="font-semibold">{getTotalFileSize(task.parts)}</p>
            </div>
            <div className="bg-gray-50 p-2 sm:p-3 rounded flex justify-between sm:block">
              <span className="text-gray-600">Части</span>
              <p className="font-semibold">{task.parts.filter(p => p.status === 'completed').length}/{task.parts.length}</p>
            </div>
          </div>

          {task.errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded p-2 mb-3">
              <p className="text-sm text-red-800">{task.errorMessage}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {task.status === 'completed' && (task.begetUrl || task.playlistUrl) && (
              <Button size="sm" variant="outline" className="min-h-11 flex-1 sm:flex-none" asChild>
                <a href={task.begetUrl || task.playlistUrl} target="_blank" rel="noopener noreferrer">
                  <Play className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Смотреть видео</span>
                  <span className="sm:hidden">Видео</span>
                </a>
              </Button>
            )}
            {task.status === 'ready' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleEditStart(task)}
                className="min-h-11 flex-1 sm:flex-none"
              >
                <Edit2 className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Редактировать</span>
              </Button>
            )}
            {task.status !== 'in_progress' && task.status !== 'uploading' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDelete(task.id)}
                className="text-red-600 hover:text-red-700 min-h-11 flex-1 sm:flex-none"
              >
                <Trash2 className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Удалить</span>
              </Button>
            )}
          </div>
        </div>
      ))}

      {editingTask && (
        <Dialog open={!!editingTask} onOpenChange={() => setEditingTask(null)}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Редактировать запись</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Название</Label>
                <Input
                  id="edit-title"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Описание (опционально)</Label>
                <Textarea
                  id="edit-description"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-url">Ссылка на трансляцию</Label>
                <Input
                  id="edit-url"
                  type="url"
                  value={editFormData.streamUrl}
                  onChange={(e) => setEditFormData({ ...editFormData, streamUrl: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-password">Пароль (опционально)</Label>
                <Input
                  id="edit-password"
                  type="password"
                  value={editFormData.streamPassword}
                  onChange={(e) => setEditFormData({ ...editFormData, streamPassword: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-time">Время начала</Label>
                <Input
                  id="edit-time"
                  type="datetime-local"
                  value={editFormData.scheduledTime}
                  onChange={(e) => setEditFormData({ ...editFormData, scheduledTime: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-duration">Длительность (минут)</Label>
                <Input
                  id="edit-duration"
                  type="number"
                  min="1"
                  max="1440"
                  value={editFormData.duration}
                  onChange={(e) => setEditFormData({ ...editFormData, duration: parseInt(e.target.value) || 60 })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingTask(null)} disabled={isUpdating}>
                Отмена
              </Button>
              <Button onClick={handleEditSave} disabled={isUpdating}>
                {isUpdating ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
