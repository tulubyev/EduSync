import React, { useState, useEffect } from 'react';
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

interface DashboardStats {
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
  const [userStats, setUserStats] = useState<DashboardStats>({ ready: 0, in_progress: 0, uploading: 0, completed: 0, failed: 0, cancelled: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [tasksRefreshKey, setTasksRefreshKey] = useState(0);

  const computeUserStats = (tasks: Array<{ status: string }>) => {
    const stats: DashboardStats = { ready: 0, in_progress: 0, uploading: 0, completed: 0, failed: 0, cancelled: 0, total: tasks.length };
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
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/recording/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          scheduledTime: new Date(data.scheduledTime).toISOString(),
        }),
      });

      if (response.ok) {
        setShowRecordingModal(false);
        setTasksRefreshKey(k => k + 1);
      }
    } catch (error) {
      console.error('Error scheduling recording:', error);
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
        onClose={() => setShowRecordingModal(false)}
        onSubmit={handleScheduleRecording}
        isLoading={isScheduling}
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
  color: 'blue' | 'yellow' | 'purple' | 'green' | 'red' | 'gray';
  active?: boolean;
  onClick?: () => void;
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200 hover:bg-yellow-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100',
    green: 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100',
    red: 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100',
    gray: 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100',
  };

  const activeClasses = {
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
