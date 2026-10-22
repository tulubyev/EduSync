import React, { useState, useEffect } from 'react';
import { authService } from '@/services/authService';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Video, 
  Plus, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  HardDrive,
  RefreshCw,
  Loader,
} from 'lucide-react';
import { RecordingTasksList } from './RecordingTasksList';
import { RecordingModal, RecordingData } from './RecordingModal';
import { DEFAULT_TIME_ZONE, zonedInputToUtcIso } from './timezones';

interface DashboardStats {
  scheduled: number;
  ready: number;
  in_progress: number;
  uploading: number;
  completed: number;
  failed: number;
  cancelled: number;
  total: number;
}


export function RecordingSchedulePage() {
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [userStats, setUserStats] = useState<DashboardStats>({ scheduled: 0, ready: 0, in_progress: 0, uploading: 0, completed: 0, failed: 0, cancelled: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [tasksRefreshKey, setTasksRefreshKey] = useState(0);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const computeUserStats = (tasks: Array<{ status: string }>) => {
    const stats: DashboardStats = { scheduled: 0, ready: 0, in_progress: 0, uploading: 0, completed: 0, failed: 0, cancelled: 0, total: tasks.length };
    tasks.forEach(t => {
      if (t.status in stats) (stats as any)[t.status]++;
    });
    setUserStats(stats);
  };

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTasksRefreshKey(k => k + 1);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleScheduleRecording = async (data: RecordingData) => {
    try {
      setIsScheduling(true);
      setScheduleError(null);
      const response = await authService.authenticatedFetch('/api/recording/schedule', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          timeZone: undefined,
          // время из формы — на часах в выбранном поясе; на сервер — UTC
          scheduledTime: zonedInputToUtcIso(data.scheduledTime, data.timeZone ?? DEFAULT_TIME_ZONE),
        }),
      });

      if (response.ok) {
        setShowRecordingModal(false);
        setTasksRefreshKey(k => k + 1);
      } else {
        const errorData = await response.json().catch(() => ({}));
        const msg = (errorData as any).message || `Ошибка ${response.status}: не удалось запланировать запись`;
        setScheduleError(msg);
      }
    } catch (error) {
      console.error('Error scheduling recording:', error);
      setScheduleError('Ошибка соединения с сервером. Проверьте подключение и попробуйте снова.');
    } finally {
      setIsScheduling(false);
    }
  };


  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Video className="h-6 w-6 text-purple-600" />
            Запись по расписанию
          </h1>
          <p className="text-gray-600 mt-1">
            Управление автономной записью трансляций
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="min-h-11"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
          <Button onClick={() => setShowRecordingModal(true)} className="min-h-11">
            <Plus className="h-4 w-4 mr-2" />
            Запланировать запись
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <StatCard
              title="Запланировано"
              value={userStats.scheduled}
              icon={Clock}
              color="indigo"
              active={selectedFilter === 'scheduled'}
              onClick={() => setSelectedFilter(selectedFilter === 'scheduled' ? null : 'scheduled')}
            />
            <StatCard 
              title="Ожидают" 
              value={userStats.ready} 
              icon={Clock} 
              color="blue" 
              active={selectedFilter === 'ready'}
              onClick={() => setSelectedFilter(selectedFilter === 'ready' ? null : 'ready')}
            />
            <StatCard 
              title="Запись" 
              value={userStats.in_progress} 
              icon={Activity} 
              color="yellow"
              active={selectedFilter === 'in_progress'}
              onClick={() => setSelectedFilter(selectedFilter === 'in_progress' ? null : 'in_progress')}
            />
            <StatCard 
              title="Загрузка" 
              value={userStats.uploading} 
              icon={HardDrive} 
              color="purple"
              active={selectedFilter === 'uploading'}
              onClick={() => setSelectedFilter(selectedFilter === 'uploading' ? null : 'uploading')}
            />
            <StatCard 
              title="Завершено" 
              value={userStats.completed} 
              icon={CheckCircle} 
              color="green"
              active={selectedFilter === 'completed'}
              onClick={() => setSelectedFilter(selectedFilter === 'completed' ? null : 'completed')}
            />
            <StatCard 
              title="Ошибки" 
              value={userStats.failed} 
              icon={AlertTriangle} 
              color="red"
              active={selectedFilter === 'failed'}
              onClick={() => setSelectedFilter(selectedFilter === 'failed' ? null : 'failed')}
            />
            <StatCard 
              title="Всего" 
              value={userStats.total} 
              icon={Video} 
              color="gray"
              active={selectedFilter === null}
              onClick={() => setSelectedFilter(null)}
            />
          </div>

          <Card>
            <CardContent className="pt-4">
              <RecordingTasksList 
                statusFilter={selectedFilter}
                refreshKey={tasksRefreshKey}
                onTasksLoaded={computeUserStats}
              />
            </CardContent>
          </Card>
        </div>
      )}

      <RecordingModal
        open={showRecordingModal}
        onClose={() => { setShowRecordingModal(false); setScheduleError(null); }}
        onSubmit={handleScheduleRecording}
        isLoading={isScheduling}
        error={scheduleError}
      />
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  color,
  active,
  onClick
}: { 
  title: string; 
  value: number; 
  icon: React.ElementType; 
  color: 'indigo' | 'blue' | 'yellow' | 'purple' | 'green' | 'red' | 'gray';
  active?: boolean;
  onClick?: () => void;
}) {
  const colorClasses = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200 hover:bg-yellow-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100',
    green: 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100',
    red: 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100',
    gray: 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100',
  };

  const activeClasses = {
    indigo: 'ring-2 ring-indigo-500 bg-indigo-100',
    blue: 'ring-2 ring-blue-500 bg-blue-100',
    yellow: 'ring-2 ring-yellow-500 bg-yellow-100',
    purple: 'ring-2 ring-purple-500 bg-purple-100',
    green: 'ring-2 ring-green-500 bg-green-100',
    red: 'ring-2 ring-red-500 bg-red-100',
    gray: 'ring-2 ring-gray-500 bg-gray-100',
  };

  return (
    <div 
      className={`p-3 rounded-lg border cursor-pointer transition-all ${colorClasses[color]} ${active ? activeClasses[color] : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <Icon className="h-5 w-5" />
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <p className="text-sm mt-1">{title}</p>
    </div>
  );
}
