import { BookOpen, RefreshCw, Play, History, Settings, AlertCircle, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

interface CoursesManagementProps {
  isVisible: boolean;
  userRole: string;
}

interface DiscoveryResult {
  success: boolean;
  message: string;
  result: {
    totalSaved: number;
    platformsProcessed: number;
    platformsWithCourses: number;
    duration: number;
    errors: Array<{ platform: string; error: string }>;
  };
}

interface DiscoveryHistoryItem {
  id: string;
  timestamp: Date;
  totalSaved: number;
  platformsProcessed: number;
  duration: number;
  status: 'success' | 'error';
}

export function CoursesManagement({ isVisible, userRole }: CoursesManagementProps) {
  const [coursesCount, setCoursesCount] = useState(0);
  const [platformsCount, setPlatformsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isRunningDiscovery, setIsRunningDiscovery] = useState(false);
  const [discoveryResult, setDiscoveryResult] = useState<DiscoveryResult | null>(null);
  const [discoveryHistory, setDiscoveryHistory] = useState<DiscoveryHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [discoveryLimit, setDiscoveryLimit] = useState(10);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [coursesRes, platformsRes] = await Promise.all([
          fetch('/api/courses', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
          }),
          fetch('/api/platforms', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
          })
        ]);

        if (coursesRes.ok) {
          const data = await coursesRes.json();
          const courses = data.courses || data || [];
          setCoursesCount(Array.isArray(courses) ? courses.length : 0);
        }

        if (platformsRes.ok) {
          const data = await platformsRes.json();
          const platforms = data.platforms || data || [];
          setPlatformsCount(Array.isArray(platforms) ? platforms.length : 0);
        }
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const runCourseDiscovery = async () => {
    setIsRunningDiscovery(true);
    setDiscoveryResult(null);
    
    try {
      const response = await fetch('/api/admin/course-discovery', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ limit: discoveryLimit })
      });

      const data = await response.json();
      setDiscoveryResult(data);

      if (data.success) {
        setDiscoveryHistory(prev => [{
          id: Date.now().toString(),
          timestamp: new Date(),
          totalSaved: data.result.totalSaved,
          platformsProcessed: data.result.platformsProcessed,
          duration: data.result.duration,
          status: 'success'
        }, ...prev.slice(0, 9)]);

        const coursesRes = await fetch('/api/courses', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
        });
        if (coursesRes.ok) {
          const courseData = await coursesRes.json();
          const courses = courseData.courses || courseData || [];
          setCoursesCount(Array.isArray(courses) ? courses.length : 0);
        }
      }
    } catch (error) {
      console.error('Ошибка запуска discovery:', error);
      setDiscoveryResult({
        success: false,
        message: 'Ошибка при запуске поиска курсов',
        result: {
          totalSaved: 0,
          platformsProcessed: 0,
          platformsWithCourses: 0,
          duration: 0,
          errors: [{ platform: 'system', error: String(error) }]
        }
      });
    } finally {
      setIsRunningDiscovery(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', border: '1px solid #e9ecef', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BookOpen size={24} color="#764ba2" />
          <h2 style={{ margin: 0, color: '#333' }}>Управление курсами</h2>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowHistory(!showHistory)}
            style={{
              padding: '8px 16px',
              backgroundColor: showHistory ? '#667eea' : '#f0f0f0',
              color: showHistory ? 'white' : '#333',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <History size={16} />
            История
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' }}>
        <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#764ba2' }}>
            {isLoading ? '...' : coursesCount}
          </div>
          <div style={{ color: '#666', fontSize: '14px' }}>Курсов в базе</div>
        </div>
        <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#667eea' }}>
            {isLoading ? '...' : platformsCount}
          </div>
          <div style={{ color: '#666', fontSize: '14px' }}>Платформ</div>
        </div>
        <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1abc9c' }}>
            {platformsCount > 0 ? Math.round((coursesCount / platformsCount) * 10) / 10 : 0}
          </div>
          <div style={{ color: '#666', fontSize: '14px' }}>Курсов/платформу</div>
        </div>
      </div>

      {userRole === 'super_admin' && (
        <div style={{ backgroundColor: '#f0f4ff', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            <Settings size={20} color="#667eea" />
            <h3 style={{ margin: 0, color: '#333', fontSize: '16px' }}>Автоматический поиск курсов</h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '14px', color: '#666' }}>Платформ за раз:</label>
              <select
                value={discoveryLimit}
                onChange={(e) => setDiscoveryLimit(Number(e.target.value))}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  fontSize: '14px'
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={111}>Все (111)</option>
              </select>
            </div>

            <button
              onClick={runCourseDiscovery}
              disabled={isRunningDiscovery}
              style={{
                padding: '10px 20px',
                backgroundColor: isRunningDiscovery ? '#ccc' : '#1abc9c',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: isRunningDiscovery ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {isRunningDiscovery ? (
                <>
                  <RefreshCw size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                  Поиск курсов...
                </>
              ) : (
                <>
                  <Play size={16} />
                  Запустить поиск
                </>
              )}
            </button>
          </div>

          <div style={{ marginTop: '10px', fontSize: '12px', color: '#888' }}>
            Автозапуск: каждое воскресенье в 02:00 (5 платформ)
          </div>
        </div>
      )}

      {discoveryResult && (
        <div style={{
          backgroundColor: discoveryResult.success ? '#d4edda' : '#f8d7da',
          border: `1px solid ${discoveryResult.success ? '#c3e6cb' : '#f5c6cb'}`,
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            {discoveryResult.success ? (
              <CheckCircle size={20} color="#155724" />
            ) : (
              <AlertCircle size={20} color="#721c24" />
            )}
            <strong style={{ color: discoveryResult.success ? '#155724' : '#721c24' }}>
              {discoveryResult.message}
            </strong>
          </div>
          
          {discoveryResult.result && (
            <div style={{ fontSize: '13px', color: discoveryResult.success ? '#155724' : '#721c24' }}>
              <div>Обработано платформ: {discoveryResult.result.platformsProcessed}</div>
              <div>Платформ с курсами: {discoveryResult.result.platformsWithCourses}</div>
              <div>Новых курсов сохранено: {discoveryResult.result.totalSaved}</div>
              <div>Время выполнения: {Math.round(discoveryResult.result.duration / 1000)}с</div>
              
              {discoveryResult.result.errors.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <strong>Ошибки:</strong>
                  {discoveryResult.result.errors.map((err, i) => (
                    <div key={i} style={{ marginLeft: '10px' }}>• {err.platform}: {err.error}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showHistory && discoveryHistory.length > 0 && (
        <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#333' }}>История запусков</h4>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {discoveryHistory.map((item) => (
              <div key={item.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px',
                backgroundColor: 'white',
                borderRadius: '6px',
                marginBottom: '8px',
                border: '1px solid #e9ecef'
              }}>
                <div>
                  <div style={{ fontSize: '13px', color: '#333' }}>
                    {new Date(item.timestamp).toLocaleString('ru-RU')}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {item.platformsProcessed} платформ, {item.totalSaved} новых курсов
                  </div>
                </div>
                <div style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  backgroundColor: item.status === 'success' ? '#d4edda' : '#f8d7da',
                  color: item.status === 'success' ? '#155724' : '#721c24'
                }}>
                  {item.status === 'success' ? 'Успешно' : 'Ошибка'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px', fontWeight: '600' }}>Категории курсов:</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {['IT & Программирование', 'Дизайн & Искусство', 'Бизнес', 'Маркетинг', 'Языки', 'Здоровье', 'Наука', 'Финансы', 'Музыка', 'Дети'].map((cat, i) => (
            <div key={i} style={{ padding: '6px 12px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontSize: '12px', color: '#333' }}>
              {cat}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
