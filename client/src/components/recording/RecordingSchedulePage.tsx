import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  Plus, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Server, 
  HardDrive,
  RefreshCw,
  Loader
} from 'lucide-react';
import { RecordingTasksList } from '@/components/library/RecordingTasksList';
import { RecordingModal, RecordingData } from '@/components/library/RecordingModal';

interface DashboardStats {
  ready: number;
  in_progress: number;
  uploading: number;
  completed: number;
  failed: number;
  cancelled: number;
  total: number;
}

interface WorkerInfo {
  workerId: string;
  isActive: boolean;
  dbConnected: boolean;
  s3Connected: boolean;
  activeTaskId: string | null;
  currentTaskTitle: string | null;
  tasksProcessed: number;
  tasksSuccessful: number;
  tasksFailed: number;
  lastError: string | null;
  lastErrorAt: string | null;
  lastSeenAt: string | null;
  isOnline: boolean;
  secondsAgo: number | null;
  healthStatus: 'healthy' | 'offline' | 'unknown';
}

interface SyncIssue {
  type: string;
  message: string;
  taskId?: string;
  workerId?: string;
}

export function RecordingSchedulePage() {
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [workers, setWorkers] = useState<WorkerInfo[]>([]);
  const [syncIssues, setSyncIssues] = useState<SyncIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string | null>(null);

  const fetchMonitoringData = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [dashboardRes, workersRes, syncRes] = await Promise.all([
        fetch('/api/recording/monitor/dashboard', { headers }),
        fetch('/api/recording/monitor/worker-status', { headers }),
        fetch('/api/recording/monitor/sync-check', { headers }),
      ]);

      if (dashboardRes.ok) {
        const data = await dashboardRes.json();
        setStats(data.stats);
      }

      if (workersRes.ok) {
        const data = await workersRes.json();
        setWorkers(data.workers);
      }

      if (syncRes.ok) {
        const data = await syncRes.json();
        setSyncIssues(data.issues);
      }
    } catch (error) {
      console.error('Error fetching monitoring data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMonitoringData();
    const interval = setInterval(fetchMonitoringData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchMonitoringData();
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
        fetchMonitoringData();
      }
    } catch (error) {
      console.error('Error scheduling recording:', error);
    } finally {
      setIsScheduling(false);
    }
  };

  const getWorkerStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'offline': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      ready: 'Ожидают',
      in_progress: 'Запись',
      uploading: 'Загрузка',
      completed: 'Завершено',
      failed: 'Ошибки',
    };
    return labels[status] || status;
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
        <Tabs defaultValue="tasks" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-flex">
            <TabsTrigger value="tasks" className="min-h-11">
              <Video className="h-4 w-4 mr-2" />
              Записи
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="min-h-11">
              <Activity className="h-4 w-4 mr-2" />
              Мониторинг
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-4">
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div 
                  onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'ready' ? null : 'ready')}
                  className={`cursor-pointer transition-all ${selectedStatusFilter === 'ready' ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <StatCard title="Ожидают" value={stats.ready} icon={Clock} color="blue" />
                </div>
                <div 
                  onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'in_progress' ? null : 'in_progress')}
                  className={`cursor-pointer transition-all ${selectedStatusFilter === 'in_progress' ? 'ring-2 ring-yellow-500' : ''}`}
                >
                  <StatCard title="Запись" value={stats.in_progress} icon={Activity} color="yellow" />
                </div>
                <div 
                  onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'uploading' ? null : 'uploading')}
                  className={`cursor-pointer transition-all ${selectedStatusFilter === 'uploading' ? 'ring-2 ring-purple-500' : ''}`}
                >
                  <StatCard title="Загрузка" value={stats.uploading} icon={HardDrive} color="purple" />
                </div>
                <div 
                  onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'completed' ? null : 'completed')}
                  className={`cursor-pointer transition-all ${selectedStatusFilter === 'completed' ? 'ring-2 ring-green-500' : ''}`}
                >
                  <StatCard title="Завершено" value={stats.completed} icon={CheckCircle} color="green" />
                </div>
                <div 
                  onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'failed' ? null : 'failed')}
                  className={`cursor-pointer transition-all ${selectedStatusFilter === 'failed' ? 'ring-2 ring-red-500' : ''}`}
                >
                  <StatCard title="Ошибки" value={stats.failed} icon={AlertTriangle} color="red" />
                </div>
                <div 
                  onClick={() => setSelectedStatusFilter(null)}
                  className={`cursor-pointer transition-all ${selectedStatusFilter === null ? 'ring-2 ring-gray-500' : ''}`}
                >
                  <StatCard title="Всего" value={stats.total} icon={Video} color="gray" />
                </div>
              </div>
            )}
            
            {selectedStatusFilter && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-700">
                  Фильтр: Показываются записи со статусом "{getStatusLabel(selectedStatusFilter)}"
                  <button 
                    onClick={() => setSelectedStatusFilter(null)}
                    className="ml-2 text-blue-600 hover:text-blue-800 underline"
                  >
                    Очистить
                  </button>
                </p>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Список записей</CardTitle>
              </CardHeader>
              <CardContent>
                <RecordingTasksList statusFilter={selectedStatusFilter} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    Статус воркеров
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {workers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Server className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>Нет зарегистрированных воркеров</p>
                      <p className="text-sm mt-1">Запустите Recording Worker в отдельном проекте</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {workers.map((worker) => (
                        <div key={worker.workerId} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${getWorkerStatusColor(worker.healthStatus)}`} />
                              <span className="font-medium">{worker.workerId}</span>
                            </div>
                            <Badge variant={worker.isOnline ? 'default' : 'secondary'}>
                              {worker.isOnline ? 'Онлайн' : 'Оффлайн'}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-1">
                              <span className={`w-2 h-2 rounded-full ${worker.dbConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                              <span className="text-gray-600">БД</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className={`w-2 h-2 rounded-full ${worker.s3Connected ? 'bg-green-500' : 'bg-red-500'}`} />
                              <span className="text-gray-600">S3</span>
                            </div>
                          </div>

                          {worker.currentTaskTitle && (
                            <div className="mt-2 text-sm bg-blue-50 text-blue-800 rounded px-2 py-1">
                              Запись: {worker.currentTaskTitle}
                            </div>
                          )}

                          <div className="mt-2 flex gap-4 text-xs text-gray-500">
                            <span>Выполнено: {worker.tasksSuccessful}</span>
                            <span>Ошибок: {worker.tasksFailed}</span>
                            {worker.secondsAgo !== null && (
                              <span>Был {worker.secondsAgo}с назад</span>
                            )}
                          </div>

                          {worker.lastError && (
                            <div className="mt-2 text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                              {worker.lastError}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Проблемы синхронизации
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {syncIssues.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-300" />
                      <p className="text-green-600 font-medium">Все в порядке</p>
                      <p className="text-sm mt-1">Проблем синхронизации не обнаружено</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {syncIssues.map((issue, index) => (
                        <div key={index} className="border border-yellow-200 bg-yellow-50 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm text-yellow-800">{issue.message}</p>
                              <div className="flex gap-2 mt-1 text-xs text-yellow-600">
                                {issue.taskId && <span>Задача: {issue.taskId.slice(0, 8)}...</span>}
                                {issue.workerId && <span>Воркер: {issue.workerId}</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {stats && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Статистика задач</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{stats.ready}</p>
                      <p className="text-sm text-blue-700">Ожидают</p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <p className="text-2xl font-bold text-yellow-600">{stats.in_progress}</p>
                      <p className="text-sm text-yellow-700">Записываются</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <p className="text-2xl font-bold text-purple-600">{stats.uploading}</p>
                      <p className="text-sm text-purple-700">Загружаются</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                      <p className="text-sm text-green-700">Завершены</p>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                      <p className="text-sm text-red-700">С ошибками</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-gray-600">{stats.total}</p>
                      <p className="text-sm text-gray-700">Всего</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
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
  color 
}: { 
  title: string; 
  value: number; 
  icon: any; 
  color: 'blue' | 'yellow' | 'purple' | 'green' | 'red' | 'gray';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
  };

  return (
    <div className={`p-3 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <Icon className="h-5 w-5" />
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <p className="text-sm mt-1">{title}</p>
    </div>
  );
}
