import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Loader2, RefreshCw, LogOut, BookOpen, Clock } from 'lucide-react';

interface StepikConnectionStatus {
  connected: boolean;
  status: string;
  syncStatus: string;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  coursesCount: number;
  requiresReauth: boolean;
  externalUserId: string | null;
}

interface SyncedCourse {
  id: string;
  externalCourseId: string;
  title: string;
  description: string | null;
  progress: number;
  isCompleted: boolean;
  courseUrl: string;
  imageUrl: string | null;
  startDate: string | null;
  endDate: string | null;
}

export function StepikConnectionPage() {
  const [status, setStatus] = useState<StepikConnectionStatus | null>(null);
  const [courses, setCourses] = useState<SyncedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('accessToken');

      const [statusRes, coursesRes] = await Promise.all([
        fetch('/api/stepik/status', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/stepik/courses', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setStatus(statusData);
      }

      if (coursesRes.ok) {
        const coursesData = await coursesRes.json();
        setCourses(coursesData.courses || []);
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error loading Stepik status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get OAuth URL
      const authRes = await fetch('/api/stepik/auth-url');
      const { authUrl } = await authRes.json();

      // Redirect to Stepik OAuth
      window.location.href = authUrl;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setError(null);
      const token = localStorage.getItem('accessToken');

      const res = await fetch('/api/stepik/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const result = await res.json();
        console.log('Sync result:', result);
        // Reload status
        await loadStatus();
      } else {
        const error = await res.json();
        setError(error.message || 'Sync failed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Вы уверены? Это удалит все синхронизированные курсы.')) {
      return;
    }

    try {
      setDisconnecting(true);
      setError(null);
      const token = localStorage.getItem('accessToken');

      const res = await fetch('/api/stepik/disconnect', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setStatus(null);
        setCourses([]);
      } else {
        const error = await res.json();
        setError(error.message || 'Disconnect failed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading && !status) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Ошибка</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Подключение к Stepik
              </CardTitle>
              <CardDescription>
                Синхронизируйте ваши курсы с платформы Stepik
              </CardDescription>
            </div>
            {status?.connected && (
              <Badge className="bg-green-100 text-green-800 border-green-300">
                ✓ Подключено
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {!status?.connected ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Подключитесь к Stepik для синхронизации ваших курсов и отслеживания прогресса.
              </p>
              <Button
                onClick={handleConnect}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Подключение...
                  </>
                ) : (
                  <>
                    <BookOpen className="w-4 h-4 mr-2" />
                    Подключить к Stepik
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Status Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Статус синхронизации</p>
                  <p className="font-medium capitalize">
                    {status.syncStatus === 'idle' && '✓ Готово'}
                    {status.syncStatus === 'syncing' && '⏳ Синхронизация...'}
                    {status.syncStatus === 'failed' && '✗ Ошибка'}
                  </p>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Синхронизированные курсы</p>
                  <p className="font-medium text-lg">{status.coursesCount}</p>
                </div>
              </div>

              {/* Last Sync */}
              {status.lastSyncAt && (
                <div className="bg-blue-50 p-3 rounded-lg flex items-start gap-3">
                  <Clock className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium">Последняя синхронизация</p>
                    <p>{new Date(status.lastSyncAt).toLocaleString('ru-RU')}</p>
                  </div>
                </div>
              )}

              {/* Sync Error */}
              {status.lastSyncError && (
                <div className="bg-yellow-50 p-3 rounded-lg flex items-start gap-3 border border-yellow-200">
                  <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-900">
                    <p className="font-medium">Ошибка синхронизации</p>
                    <p>{status.lastSyncError}</p>
                  </div>
                </div>
              )}

              {/* Reauth Required */}
              {status.requiresReauth && (
                <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                  <p className="text-sm font-medium text-red-900 mb-3">
                    ⚠️ Требуется повторное подключение
                  </p>
                  <Button
                    onClick={handleConnect}
                    size="sm"
                    className="w-full"
                    variant="default"
                  >
                    Переподключить к Stepik
                  </Button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={handleSync}
                  disabled={syncing || status.syncStatus === 'syncing'}
                  variant="outline"
                  className="flex-1"
                >
                  {syncing || status.syncStatus === 'syncing' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Синхронизация...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Синхронизировать
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  variant="outline"
                  className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  {disconnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Отключение...
                    </>
                  ) : (
                    <>
                      <LogOut className="w-4 h-4 mr-2" />
                      Отключить
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Courses List */}
      {status?.connected && courses.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Синхронизированные курсы ({courses.length})</h3>
          <div className="grid gap-4">
            {courses.map(course => (
              <Card key={course.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex gap-4">
                    {course.imageUrl && (
                      <img
                        src={course.imageUrl}
                        alt={course.title}
                        className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                      />
                    )}

                    <div className="flex-1">
                      <a
                        href={course.courseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lg font-medium text-blue-600 hover:underline"
                      >
                        {course.title}
                      </a>

                      {course.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {course.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 mt-3">
                        {/* Progress */}
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                course.isCompleted ? 'bg-green-600' : 'bg-blue-600'
                              }`}
                              style={{ width: `${course.progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-600 w-8 text-right">
                            {course.progress}%
                          </span>
                        </div>

                        {course.isCompleted && (
                          <Badge className="bg-green-100 text-green-800 border-green-300">
                            ✓ Завершен
                          </Badge>
                        )}
                      </div>

                      {(course.startDate || course.endDate) && (
                        <p className="text-xs text-gray-500 mt-2">
                          {course.startDate && `Начало: ${new Date(course.startDate).toLocaleDateString('ru-RU')}`}
                          {course.startDate && course.endDate && ' • '}
                          {course.endDate && `Конец: ${new Date(course.endDate).toLocaleDateString('ru-RU')}`}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {status?.connected && courses.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">Нет синхронизированных курсов</p>
            <p className="text-sm text-gray-500 mt-1">
              Нажмите кнопку синхронизации выше для загрузки ваших курсов с Stepik
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
