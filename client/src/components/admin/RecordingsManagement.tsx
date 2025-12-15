import { useState, useEffect } from 'react';
import { Video, HardDrive, Clock, CheckCircle, AlertCircle, Loader, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface RecordingsManagementProps {
  isVisible: boolean;
  userRole: string;
}

interface RecordingTask {
  id: string;
  title: string;
  description?: string;
  status: 'ready' | 'in_progress' | 'uploading' | 'completed' | 'failed' | 'cancelled';
  begetUrl?: string;
  scheduledTime: string;
  duration: number;
  createdAt: string;
  errorMessage?: string;
  workerId?: string;
  saveTarget?: 'yandex_disk' | 'library' | 'beget';
  fileSize?: number;
}

export function RecordingsManagement({ isVisible, userRole }: RecordingsManagementProps) {
  const [recordings, setRecordings] = useState<RecordingTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    ready: 0,
    in_progress: 0,
    uploading: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
    storageUsed: 0
  });

  const fetchRecordings = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/recording/tasks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setRecordings(data || []);

        // Подсчитываем статистику
        const newStats = {
          total: data.length,
          ready: data.filter((r: any) => r.status === 'ready').length,
          in_progress: data.filter((r: any) => r.status === 'in_progress').length,
          uploading: data.filter((r: any) => r.status === 'uploading').length,
          completed: data.filter((r: any) => r.status === 'completed').length,
          failed: data.filter((r: any) => r.status === 'failed').length,
          cancelled: data.filter((r: any) => r.status === 'cancelled').length,
          storageUsed: 0
        };
        setStats(newStats);
      }
    } catch (error) {
      console.error('Ошибка загрузки записей:', error);
    } finally {
      setIsLoading(true);
    }
  };

  useEffect(() => {
    if (isVisible) {
      fetchRecordings();
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; label: string }> = {
      ready: { bg: '#dbeafe', text: '#0284c7', label: 'Готова' },
      in_progress: { bg: '#fef3c7', text: '#b45309', label: 'Запись' },
      uploading: { bg: '#e9d5ff', text: '#7c3aed', label: 'Загрузка' },
      completed: { bg: '#dcfce7', text: '#166534', label: 'Завершена' },
      failed: { bg: '#fee2e2', text: '#991b1b', label: 'Ошибка' },
      cancelled: { bg: '#f3f4f6', text: '#6b7280', label: 'Отменена' }
    };
    const badge = styles[status] || styles['ready'];
    return badge;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
      case 'cancelled':
        return <AlertCircle className="h-4 w-4" />;
      case 'in_progress':
      case 'uploading':
        return <Loader className="h-4 w-4 animate-spin" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatDuration = (minutes: number) => {
    const mins = Math.floor(minutes);
    const secs = Math.round((minutes % 1) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')} мин`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const getStorageTarget = (target?: string) => {
    const targets: Record<string, { label: string; color: string }> = {
      'beget': { label: 'S3 Beget', color: '#ff6b6b' },
      'yandex_disk': { label: 'Yandex.Disk', color: '#4d96ff' },
      'library': { label: 'Библиотека', color: '#51cf66' }
    };
    return targets[target || 'beget'] || targets['beget'];
  };

  return (
    <div className="mt-6 bg-white p-4 sm:p-6 rounded-xl border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Video className="h-5 w-5 text-purple-600" />
          Управление записями трансляций
        </h3>
        <button
          onClick={fetchRecordings}
          disabled={isLoading}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          title="Обновить"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-6">
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-600">Всего</p>
          <p className="text-xl font-bold text-blue-700">{stats.total}</p>
        </div>
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-600">Ожидают</p>
          <p className="text-xl font-bold text-blue-700">{stats.ready}</p>
        </div>
        <div className="p-3 bg-yellow-50 rounded-lg">
          <p className="text-xs text-yellow-600">Запись</p>
          <p className="text-xl font-bold text-yellow-700">{stats.in_progress}</p>
        </div>
        <div className="p-3 bg-purple-50 rounded-lg">
          <p className="text-xs text-purple-600">Загрузка</p>
          <p className="text-xl font-bold text-purple-700">{stats.uploading}</p>
        </div>
        <div className="p-3 bg-green-50 rounded-lg">
          <p className="text-xs text-green-600">Завершено</p>
          <p className="text-xl font-bold text-green-700">{stats.completed}</p>
        </div>
        <div className="p-3 bg-red-50 rounded-lg">
          <p className="text-xs text-red-600">Ошибки</p>
          <p className="text-xl font-bold text-red-700">{stats.failed}</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">Отменено</p>
          <p className="text-xl font-bold text-gray-700">{stats.cancelled}</p>
        </div>
      </div>

      {/* Список записей */}
      {isLoading && recordings.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <Loader className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      ) : recordings.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Video className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>Нет запланированных записей</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left p-3 font-semibold text-gray-700">Название</th>
                <th className="text-left p-3 font-semibold text-gray-700">Статус</th>
                <th className="text-left p-3 font-semibold text-gray-700">Планируемое время</th>
                <th className="text-left p-3 font-semibold text-gray-700">Длительность</th>
                <th className="text-left p-3 font-semibold text-gray-700">Размер</th>
                <th className="text-left p-3 font-semibold text-gray-700">Хранилище</th>
                <th className="text-left p-3 font-semibold text-gray-700">Воркер</th>
                <th className="text-left p-3 font-semibold text-gray-700">Действия</th>
              </tr>
            </thead>
            <tbody>
              {recordings.slice(0, 10).map((recording) => {
                const badgeStyle = getStatusBadge(recording.status);
                return (
                  <tr key={recording.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3">
                      <div>
                        <p className="font-medium text-gray-900">{recording.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{recording.id.slice(0, 8)}</p>
                      </div>
                    </td>
                    <td className="p-3">
                      <div
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                        style={{ backgroundColor: badgeStyle.bg, color: badgeStyle.text }}
                      >
                        {getStatusIcon(recording.status)}
                        {badgeStyle.label}
                      </div>
                    </td>
                    <td className="p-3 text-gray-600">
                      {format(new Date(recording.scheduledTime), 'dd.MM.yyyy HH:mm', { locale: ru })}
                    </td>
                    <td className="p-3 text-gray-600">{formatDuration(recording.duration)}</td>
                    <td className="p-3 text-gray-600 text-sm">{formatFileSize(recording.fileSize)}</td>
                    <td className="p-3">
                      {(() => {
                        const storage = getStorageTarget(recording.saveTarget);
                        return (
                          <span 
                            className="text-xs font-medium px-2 py-1 rounded text-white"
                            style={{ backgroundColor: storage.color }}
                          >
                            {storage.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="p-3 text-gray-600">
                      {recording.workerId ? (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {recording.workerId.slice(0, 8)}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      {recording.status === 'completed' && recording.begetUrl && (
                        <a
                          href={recording.begetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-xs"
                        >
                          Просмотр
                        </a>
                      )}
                      {recording.status === 'failed' && recording.errorMessage && (
                        <span
                          className="text-red-600 text-xs cursor-help"
                          title={recording.errorMessage}
                        >
                          Ошибка
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {recordings.length > 10 && (
            <div className="p-3 text-center text-sm text-gray-600">
              Показано 10 из {recordings.length} записей. Для полного списка перейдите на страницу "Записи"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
