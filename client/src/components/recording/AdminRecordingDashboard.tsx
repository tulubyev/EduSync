import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RefreshCw,
  Trash2,
  RotateCcw,
  XCircle,
  ExternalLink,
  Database,
  HardDrive,
  AlertCircle,
  CheckCircle2,
  Clock,
  Activity,
  CloudOff,
} from 'lucide-react';

interface AdminTask {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  streamUrl: string;
  streamPassword?: string | null;
  scheduledTime: string | null;
  duration: number | null;
  saveTarget: string | null;
  status: string;
  workerId?: string | null;
  lastHeartbeat?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  begetUrl?: string | null;
  fileSize?: number | null;
  errorMessage?: string | null;
  urlCheckStatus?: string | null;
  urlCheckMessage?: string | null;
  urlCheckedAt?: string | null;
  attemptCount?: number | null;
  currentPart?: number | null;
  totalParts?: number | null;
  createdAt: string;
  updatedAt: string;
}

interface S3File {
  key: string;
  size: number;
  lastModified: string;
  url: string;
}

interface HealthService {
  status: 'ok' | 'error' | 'not_configured';
  error?: string;
  bucket?: string;
}

interface HealthData {
  timestamp: string;
  services: {
    database?: HealthService;
    s3?: HealthService;
  };
}

interface StatEntry {
  status: string;
  count: number;
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Запланировано',
  ready: 'Готова',
  in_progress: 'Запись',
  uploading: 'Загрузка',
  completed: 'Завершена',
  failed: 'Ошибка',
  cancelled: 'Отменена',
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  ready: 'bg-cyan-100 text-cyan-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  uploading: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-700',
};

const ALL_STATUSES = ['scheduled', 'ready', 'in_progress', 'uploading', 'completed', 'failed', 'cancelled'];

function fmtDuration(minutes: number | null): string {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}ч ${m}м` : `${m}м`;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function fmtDateFull(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function fmtSize(bytes: number | null | undefined): string {
  if (!bytes) return '';
  if (bytes > 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
  if (bytes > 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1024).toFixed(0) + ' KB';
}

function toDatetimeLocal(d: string | null | undefined): string {
  if (!d) return '';
  const dt = new Date(d);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

export function AdminRecordingDashboard() {
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [tasksTotal, setTasksTotal] = useState(0);
  const [taskLimit, setTaskLimit] = useState(100);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [health, setHealth] = useState<HealthData | null>(null);
  const [s3Files, setS3Files] = useState<S3File[]>([]);
  const [s3Configured, setS3Configured] = useState<boolean>(true);
  const [s3Message, setS3Message] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState('');

  const [editTask, setEditTask] = useState<AdminTask | null>(null);
  const [editForm, setEditForm] = useState<Partial<AdminTask>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');

  const token = () => localStorage.getItem('accessToken');
  const headers = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` });

  const fetchStats = useCallback(async () => {
    const res = await fetch('/api/recording/admin/stats', { headers: { 'Authorization': `Bearer ${token()}` } });
    if (res.ok) {
      const data = await res.json();
      const map: Record<string, number> = {};
      (data.stats || []).forEach((s: StatEntry) => { map[s.status] = s.count; });
      setStats(map);
    }
  }, []);

  const fetchHealth = useCallback(async () => {
    const res = await fetch('/api/recording/admin/health', { headers: { 'Authorization': `Bearer ${token()}` } });
    if (res.ok) setHealth(await res.json());
  }, []);

  const fetchTasks = useCallback(async () => {
    const url = filterStatus
      ? `/api/recording/admin/tasks?status=${filterStatus}&limit=${taskLimit}`
      : `/api/recording/admin/tasks?limit=${taskLimit}`;
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token()}` } });
    if (res.ok) {
      const data = await res.json();
      setTasks(data.tasks || []);
      setTasksTotal(data.total ?? (data.tasks?.length ?? 0));
    }
  }, [filterStatus, taskLimit]);

  const fetchS3Files = useCallback(async () => {
    const res = await fetch('/api/recording/admin/s3-files', { headers: { 'Authorization': `Bearer ${token()}` } });
    if (res.ok) {
      const data = await res.json();
      setS3Files(data.files || []);
      setS3Configured(data.configured !== false);
      setS3Message(data.message || '');
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([fetchStats(), fetchHealth(), fetchTasks(), fetchS3Files()]);
    setLastUpdate(new Date().toLocaleTimeString('ru-RU'));
    setIsRefreshing(false);
  }, [fetchStats, fetchHealth, fetchTasks, fetchS3Files]);

  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 15000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleReset = async (id: string) => {
    await fetch(`/api/recording/admin/tasks/${id}/reset`, { method: 'PATCH', headers: headers() });
    fetchTasks();
    fetchStats();
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Отменить задачу?')) return;
    await fetch(`/api/recording/admin/tasks/${id}/cancel`, { method: 'PATCH', headers: headers() });
    fetchTasks();
    fetchStats();
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Удалить задачу "${title.slice(0, 40)}" из БД?`)) return;
    await fetch(`/api/recording/admin/tasks/${id}`, { method: 'DELETE', headers: headers() });
    fetchTasks();
    fetchStats();
  };

  const handleClearFailed = async () => {
    if (!confirm('Удалить все задачи со статусом "failed" из базы данных?')) return;
    const res = await fetch('/api/recording/admin/tasks/failed/clear', { method: 'DELETE', headers: headers() });
    if (res.ok) {
      const data = await res.json();
      alert(`Удалено: ${data.deleted} задач`);
    }
    fetchTasks();
    fetchStats();
  };

  const openEdit = async (id: string) => {
    const res = await fetch(`/api/recording/admin/tasks/${id}`, { headers: { 'Authorization': `Bearer ${token()}` } });
    if (res.ok) {
      const data = await res.json();
      setEditTask(data.task);
      setEditForm({ ...data.task });
      setSaveStatus('idle');
      setSaveMessage('');
    }
  };

  const handleSave = async () => {
    if (!editTask) return;
    setIsSaving(true);
    setSaveStatus('idle');
    const payload = {
      title: editForm.title,
      description: editForm.description || null,
      streamUrl: editForm.streamUrl,
      streamPassword: editForm.streamPassword || null,
      duration: editForm.duration,
      scheduledTime: editForm.scheduledTime || null,
      saveTarget: editForm.saveTarget || null,
      status: editForm.status,
      begetUrl: editForm.begetUrl || null,
      errorMessage: editForm.errorMessage || null,
    };
    try {
      const res = await fetch(`/api/recording/admin/tasks/${editTask.id}`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Ошибка');
      setSaveStatus('ok');
      setSaveMessage('Сохранено');
      fetchTasks();
      fetchStats();
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (e: unknown) {
      setSaveStatus('error');
      setSaveMessage(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredTasks = tasks;
  const totalCount = Object.values(stats).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-sm text-gray-500">
          {lastUpdate && <>Обновлено: {lastUpdate}</>}
        </div>
        <Button variant="outline" size="sm" onClick={refreshAll} disabled={isRefreshing} className="min-h-9">
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Обновить
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {ALL_STATUSES.map(s => (
          <div
            key={s}
            onClick={() => setFilterStatus(filterStatus === s ? null : s)}
            className={`p-2 rounded-lg border cursor-pointer transition-all text-center ${
              filterStatus === s ? 'ring-2 ring-purple-500 bg-purple-50' : 'hover:bg-gray-50'
            }`}
          >
            <p className="text-xl font-bold text-gray-800">{stats[s] || 0}</p>
            <p className="text-xs text-gray-500 mt-0.5">{STATUS_LABELS[s]}</p>
          </div>
        ))}
        <div
          onClick={() => setFilterStatus(null)}
          className={`p-2 rounded-lg border cursor-pointer transition-all text-center ${
            filterStatus === null ? 'ring-2 ring-gray-500 bg-gray-100' : 'hover:bg-gray-50'
          }`}
        >
          <p className="text-xl font-bold text-gray-800">{totalCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Всего</p>
        </div>
      </div>

      {/* Health */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Состояние сервисов
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2 px-4">
          <div className="flex flex-wrap gap-6">
            <HealthItem
              label="PostgreSQL"
              icon={Database}
              service={health?.services?.database}
            />
            <HealthItem
              label="Beget S3"
              icon={HardDrive}
              service={health?.services?.s3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tasks table */}
      <Card>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              Задачи записи
              {filterStatus && (
                <Badge variant="outline" className="text-xs">
                  {STATUS_LABELS[filterStatus] || filterStatus}
                  <button className="ml-1 hover:text-red-500" onClick={() => setFilterStatus(null)}>×</button>
                </Badge>
              )}
              <span className="text-xs text-gray-400 font-normal">
                (показано {tasks.length}{tasksTotal > tasks.length ? ` из ${tasksTotal}` : ''})
              </span>
            </CardTitle>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearFailed}
              className="min-h-8 text-xs"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Очистить failed
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-10 text-gray-500 text-sm">Нет задач</div>
          ) : (
            <div className="overflow-x-auto" id="tasks-table-wrapper">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-2 px-3 font-medium text-gray-600 whitespace-nowrap">ID</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">Название</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600 whitespace-nowrap">Статус</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600 whitespace-nowrap">Длит.</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600 whitespace-nowrap">Воркер</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600 whitespace-nowrap">Heartbeat</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600 whitespace-nowrap">Файл</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">Ошибка</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600 whitespace-nowrap">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map(task => (
                    <tr key={task.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-3">
                        <button
                          className="font-mono text-xs text-purple-600 hover:text-purple-800 hover:underline whitespace-nowrap"
                          onClick={() => openEdit(task.id)}
                          title={task.id}
                        >
                          {task.id.slice(0, 8)}…
                        </button>
                      </td>
                      <td className="py-2 px-3 max-w-[180px]">
                        <span className="block truncate" title={task.title}>{task.title}</span>
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[task.status] || 'bg-gray-100 text-gray-700'}`}>
                          {STATUS_LABELS[task.status] || task.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-gray-600">{fmtDuration(task.duration)}</td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="font-mono text-xs text-gray-500">
                          {task.workerId ? task.workerId.slice(-10) : '—'}
                        </span>
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-gray-500 text-xs">{fmtDate(task.lastHeartbeat)}</td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        {task.begetUrl ? (
                          <a href={task.begetUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs">
                            <ExternalLink className="h-3 w-3" /> Открыть
                          </a>
                        ) : '—'}
                      </td>
                      <td className="py-2 px-3 max-w-[160px]">
                        {task.errorMessage && (
                          <span className="text-red-600 text-xs truncate block" title={task.errorMessage}>
                            {task.errorMessage.slice(0, 50)}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {['failed', 'in_progress'].includes(task.status) && (
                            <button
                              onClick={() => handleReset(task.id)}
                              title="Сбросить (повторить)"
                              className="p-1 rounded hover:bg-blue-100 text-blue-600"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {['ready', 'in_progress', 'scheduled'].includes(task.status) && (
                            <button
                              onClick={() => handleCancel(task.id)}
                              title="Отменить"
                              className="p-1 rounded hover:bg-yellow-100 text-yellow-600"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(task.id, task.title)}
                            title="Удалить из БД"
                            className="p-1 rounded hover:bg-red-100 text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {tasksTotal > tasks.length && (
            <div className="flex justify-center py-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTaskLimit(l => l + 100)}
                className="text-xs"
              >
                Загрузить ещё (показано {tasks.length} из {tasksTotal})
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* S3 files */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            Файлы в S3 (последние 100)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!s3Configured ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
              <CloudOff className="h-5 w-5 text-gray-400" />
              <span>{s3Message || 'S3 не настроен'}</span>
            </div>
          ) : s3Files.length === 0 ? (
            <div className="text-center py-6 text-sm text-gray-500">Нет файлов</div>
          ) : (
            <div className="space-y-1">
              {s3Files.map(f => (
                <div key={f.key} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50">
                  <span className="text-xs font-mono text-gray-700 truncate flex-1 mr-2" title={f.key}>{f.key}</span>
                  <span className="text-xs text-gray-500 mr-3 whitespace-nowrap">{fmtSize(f.size)}</span>
                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs whitespace-nowrap">
                    <ExternalLink className="h-3 w-3" /> Открыть
                  </a>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit modal */}
      <Dialog open={!!editTask} onOpenChange={open => { if (!open) setEditTask(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="truncate">{editTask?.title || 'Задача'}</DialogTitle>
            <p className="text-xs font-mono text-gray-500">{editTask?.id}</p>
          </DialogHeader>

          {editTask && (
            <div className="space-y-4 py-2">
              <Section title="Основное">
                <FormField label="Название">
                  <Input
                    value={editForm.title || ''}
                    onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  />
                </FormField>
                <FormField label="Описание">
                  <Textarea
                    value={editForm.description || ''}
                    onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                    rows={2}
                  />
                </FormField>
              </Section>

              <Section title="Трансляция">
                <FormField label="URL источника" full>
                  <Input
                    value={editForm.streamUrl || ''}
                    onChange={e => setEditForm(f => ({ ...f, streamUrl: e.target.value }))}
                    className="font-mono text-sm"
                  />
                </FormField>
                <FormField label="Пароль">
                  <Input
                    value={editForm.streamPassword || ''}
                    onChange={e => setEditForm(f => ({ ...f, streamPassword: e.target.value }))}
                  />
                </FormField>
                <FormField label="Длительность (мин)">
                  <Input
                    type="number"
                    min={1}
                    value={editForm.duration || ''}
                    onChange={e => setEditForm(f => ({ ...f, duration: parseInt(e.target.value) || undefined }))}
                  />
                </FormField>
                <FormField label="Время записи">
                  <Input
                    type="datetime-local"
                    value={toDatetimeLocal(editForm.scheduledTime)}
                    onChange={e => setEditForm(f => ({ ...f, scheduledTime: e.target.value }))}
                  />
                </FormField>
                <FormField label="Хранилище (saveTarget)">
                  <Select
                    value={editForm.saveTarget || 'beget'}
                    onValueChange={v => setEditForm(f => ({ ...f, saveTarget: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beget">Beget S3</SelectItem>
                      <SelectItem value="yandex_disk">Яндекс.Диск</SelectItem>
                      <SelectItem value="library">Библиотека</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </Section>

              <Section title="Статус и управление">
                <FormField label="Статус">
                  <Select
                    value={editForm.status || ''}
                    onValueChange={v => setEditForm(f => ({ ...f, status: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_STATUSES.map(s => (
                        <SelectItem key={s} value={s}>{STATUS_LABELS[s] || s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <ReadOnlyField label="Worker ID" value={editTask.workerId || ''} mono />
                <ReadOnlyField label="Попытки" value={String(editTask.attemptCount ?? 0)} />
                <ReadOnlyField label="Часть" value={`${editTask.currentPart || 1} / ${editTask.totalParts || 1}`} />
              </Section>

              <Section title="Результат">
                <FormField label="Beget URL" full>
                  <Input
                    value={editForm.begetUrl || ''}
                    onChange={e => setEditForm(f => ({ ...f, begetUrl: e.target.value }))}
                    className="font-mono text-sm"
                  />
                </FormField>
                <ReadOnlyField label="Размер файла" value={fmtSize(editTask.fileSize) || '—'} />
                <FormField label="Сообщение об ошибке" full>
                  <Textarea
                    value={editForm.errorMessage || ''}
                    onChange={e => setEditForm(f => ({ ...f, errorMessage: e.target.value }))}
                    rows={2}
                  />
                </FormField>
              </Section>

              <Section title="Временные метки">
                <ReadOnlyField label="Создана" value={fmtDateFull(editTask.createdAt)} />
                <ReadOnlyField label="Обновлена" value={fmtDateFull(editTask.updatedAt)} />
                <ReadOnlyField label="Начата" value={fmtDateFull(editTask.startedAt)} />
                <ReadOnlyField label="Завершена" value={fmtDateFull(editTask.completedAt)} />
                <ReadOnlyField label="Heartbeat" value={fmtDateFull(editTask.lastHeartbeat)} />
              </Section>

              {editTask.urlCheckStatus && (
                <Section title="Проверка URL">
                  <FormField label="Статус проверки">
                    <div className="py-2">
                      <UrlCheckBadge status={editTask.urlCheckStatus} />
                    </div>
                  </FormField>
                  <ReadOnlyField label="Проверено в" value={fmtDateFull(editTask.urlCheckedAt)} />
                  <ReadOnlyField label="Сообщение" value={editTask.urlCheckMessage || ''} />
                </Section>
              )}
            </div>
          )}

          <DialogFooter className="flex items-center gap-3">
            {saveStatus === 'ok' && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> {saveMessage}
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" /> {saveMessage}
              </span>
            )}
            <Button variant="outline" onClick={() => setEditTask(null)}>Закрыть</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HealthItem({ label, icon: Icon, service }: { label: string; icon: React.ElementType; service?: HealthService }) {
  const status = service?.status;
  const isOk = status === 'ok';
  const isNotConfigured = status === 'not_configured';
  return (
    <div className="flex items-center gap-3">
      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isOk ? 'bg-green-500' : isNotConfigured ? 'bg-gray-300' : status ? 'bg-red-500' : 'bg-gray-200'}`} />
      <Icon className="h-4 w-4 text-gray-500" />
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-xs text-gray-500">
          {isOk ? (service?.bucket ? `Bucket: ${service.bucket}` : 'Подключено') :
           isNotConfigured ? 'Не настроено' :
           status === 'error' ? (service?.error || 'Ошибка') :
           'Загрузка...'}
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {children}
      </div>
    </div>
  );
}

function FormField({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <Label className="text-xs text-gray-600 mb-1 block">{label}</Label>
      {children}
    </div>
  );
}

function ReadOnlyField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <Label className="text-xs text-gray-600 mb-1 block">{label}</Label>
      <Input
        disabled
        value={value}
        className={`bg-gray-50 text-gray-600 ${mono ? 'font-mono text-xs' : ''}`}
      />
    </div>
  );
}

function UrlCheckBadge({ status }: { status: string }) {
  const labels: Record<string, string> = { ok: '✓ ok', warning: '⚠ warning', failed: '✕ failed', pending: '… pending' };
  const colors: Record<string, string> = {
    ok: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    failed: 'bg-red-100 text-red-800',
    pending: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
      {labels[status] || status}
    </span>
  );
}
