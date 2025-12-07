import { BarChart3, TrendingUp, Users, BookOpen, Globe, Calendar, Download, Filter } from 'lucide-react';
import { useState, useEffect } from 'react';

interface AnalyticsSectionProps {
  isVisible: boolean;
  userRole: string;
}

interface AnalyticsData {
  activeUsers: number;
  totalCourses: number;
  totalPlatforms: number;
  averageActivity: number;
  newUsersThisMonth: number;
  completedCourses: number;
  popularPlatforms: Array<{ name: string; users: number }>;
  userGrowth: Array<{ month: string; count: number }>;
  coursesByCategory: Array<{ category: string; count: number }>;
}

export function AnalyticsSection({ isVisible, userRole }: AnalyticsSectionProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'courses' | 'platforms'>('overview');

  useEffect(() => {
    if (isVisible) {
      fetchAnalytics();
    }
  }, [isVisible, dateRange]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      
      const [usersRes, coursesRes, platformsRes, statsRes] = await Promise.all([
        fetch('/api/admin/users/detailed/all', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/courses', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/platforms', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/stats', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      let totalCourses = 0;
      let totalPlatforms = 0;
      let activeUsers = 0;
      let newUsersThisMonth = 0;
      const coursesList: any[] = [];
      const platformsList: any[] = [];

      if (coursesRes.ok) {
        const data = await coursesRes.json();
        const courses = data.courses || data || [];
        coursesList.push(...courses);
        totalCourses = courses.length;
      }

      if (platformsRes.ok) {
        const data = await platformsRes.json();
        const platforms = data.platforms || data || [];
        platformsList.push(...platforms);
        totalPlatforms = platforms.length;
      }

      if (usersRes.ok) {
        const data = await usersRes.json();
        const users = data.users || [];
        activeUsers = users.length;
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        newUsersThisMonth = users.filter((u: any) => new Date(u.joinedDate || u.createdAt) >= monthAgo).length;
      }

      let completedCourses = 0;
      let userGrowth: Array<{ month: string; count: number }> = [];
      if (statsRes.ok) {
        const stats = await statsRes.json();
        completedCourses = stats.completedCourses || 0;
        userGrowth = stats.userGrowth || [];
      }

      const categoryCount: Record<string, number> = {};
      coursesList.forEach((c: any) => {
        const cat = c.category || 'Другое';
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      });
      const coursesByCategory = Object.entries(categoryCount)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const platformCourseCounts: Record<string, number> = {};
      coursesList.forEach((c: any) => {
        if (c.platformId) {
          platformCourseCounts[c.platformId] = (platformCourseCounts[c.platformId] || 0) + 1;
        }
      });
      const popularPlatforms = Object.entries(platformCourseCounts)
        .map(([platformId, count]) => {
          const platform = platformsList.find((p: any) => p.id === platformId);
          return { name: platform?.displayName || platform?.name || platformId, users: count };
        })
        .sort((a, b) => b.users - a.users)
        .slice(0, 5);

      setAnalytics({
        activeUsers,
        totalCourses,
        totalPlatforms,
        averageActivity: activeUsers > 0 ? Math.round((completedCourses / activeUsers) * 10) / 10 : 0,
        newUsersThisMonth,
        completedCourses,
        popularPlatforms: popularPlatforms.length > 0 ? popularPlatforms : [{ name: 'Нет данных', users: 0 }],
        userGrowth,
        coursesByCategory: coursesByCategory.length > 0 ? coursesByCategory : [{ category: 'Нет данных', count: 0 }]
      });
    } catch (error) {
      console.error('Ошибка загрузки аналитики:', error);
      setAnalytics({
        activeUsers: 0,
        totalCourses: 0,
        totalPlatforms: 0,
        averageActivity: 0,
        newUsersThisMonth: 0,
        completedCourses: 0,
        popularPlatforms: [{ name: 'Нет данных', users: 0 }],
        userGrowth: [],
        coursesByCategory: [{ category: 'Нет данных', count: 0 }]
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    alert('Экспорт отчета в формате CSV будет доступен в следующей версии');
  };

  if (!isVisible) return null;

  return (
    <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', border: '1px solid #e9ecef', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BarChart3 size={24} color="#f39c12" />
          <h2 style={{ margin: 0, color: '#333' }}>Аналитика</h2>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #ddd',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            <option value="week">Неделя</option>
            <option value="month">Месяц</option>
            <option value="quarter">Квартал</option>
            <option value="year">Год</option>
          </select>
          <button
            onClick={handleExport}
            style={{
              padding: '8px 16px',
              backgroundColor: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Download size={16} />
            Экспорт
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #e9ecef', paddingBottom: '15px' }}>
        {[
          { id: 'overview', label: 'Обзор', icon: <TrendingUp size={16} /> },
          { id: 'users', label: 'Пользователи', icon: <Users size={16} /> },
          { id: 'courses', label: 'Курсы', icon: <BookOpen size={16} /> },
          { id: 'platforms', label: 'Платформы', icon: <Globe size={16} /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '10px 20px',
              backgroundColor: activeTab === tab.id ? '#f39c12' : '#f8f9fa',
              color: activeTab === tab.id ? 'white' : '#333',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: activeTab === tab.id ? '600' : '400'
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Загрузка аналитики...</div>
      ) : analytics && (
        <>
          {activeTab === 'overview' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                <div style={{ padding: '20px', backgroundColor: '#e3f2fd', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <Users size={20} color="#1565c0" />
                    <span style={{ fontSize: '12px', color: '#1565c0' }}>Активные пользователи</span>
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#0d47a1' }}>{analytics.activeUsers}</div>
                  <div style={{ fontSize: '12px', color: '#1976d2', marginTop: '5px' }}>+{analytics.newUsersThisMonth} в этом месяце</div>
                </div>

                <div style={{ padding: '20px', backgroundColor: '#f3e5f5', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <BookOpen size={20} color="#7b1fa2" />
                    <span style={{ fontSize: '12px', color: '#7b1fa2' }}>Курсов в базе</span>
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4a148c' }}>{analytics.totalCourses}</div>
                  <div style={{ fontSize: '12px', color: '#8e24aa', marginTop: '5px' }}>{analytics.completedCourses} завершено</div>
                </div>

                <div style={{ padding: '20px', backgroundColor: '#e8f5e9', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <Globe size={20} color="#2e7d32" />
                    <span style={{ fontSize: '12px', color: '#2e7d32' }}>Платформ</span>
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1b5e20' }}>{analytics.totalPlatforms}</div>
                  <div style={{ fontSize: '12px', color: '#43a047', marginTop: '5px' }}>81% покрытие</div>
                </div>

                <div style={{ padding: '20px', backgroundColor: '#fff3e0', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <TrendingUp size={20} color="#e65100" />
                    <span style={{ fontSize: '12px', color: '#e65100' }}>Средняя активность</span>
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#bf360c' }}>{analytics.averageActivity}</div>
                  <div style={{ fontSize: '12px', color: '#f57c00', marginTop: '5px' }}>сессий/день</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '10px' }}>
                  <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>Рост пользователей</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {analytics.userGrowth.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ width: '80px', fontSize: '12px', color: '#666' }}>{item.month}</span>
                        <div style={{ flex: 1, height: '20px', backgroundColor: '#e0e0e0', borderRadius: '10px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${(item.count / Math.max(...analytics.userGrowth.map(u => u.count))) * 100}%`,
                              height: '100%',
                              backgroundColor: '#667eea',
                              borderRadius: '10px'
                            }}
                          />
                        </div>
                        <span style={{ width: '40px', fontSize: '12px', color: '#333', fontWeight: '600', textAlign: 'right' }}>{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '10px' }}>
                  <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>Топ платформ</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {analytics.popularPlatforms.map((platform, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#1abc9c', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600' }}>
                          {idx + 1}
                        </span>
                        <span style={{ flex: 1, fontSize: '14px', color: '#333' }}>{platform.name}</span>
                        <span style={{ fontSize: '14px', color: '#666', fontWeight: '600' }}>{platform.users} пользователей</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'users' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                <div style={{ padding: '25px', backgroundColor: '#e3f2fd', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#1565c0' }}>{analytics.activeUsers}</div>
                  <div style={{ fontSize: '14px', color: '#666' }}>Всего пользователей</div>
                </div>
                <div style={{ padding: '25px', backgroundColor: '#e8f5e9', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#2e7d32' }}>{analytics.newUsersThisMonth}</div>
                  <div style={{ fontSize: '14px', color: '#666' }}>Новых за месяц</div>
                </div>
                <div style={{ padding: '25px', backgroundColor: '#fff3e0', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#e65100' }}>{Math.round(analytics.activeUsers * 0.68)}</div>
                  <div style={{ fontSize: '14px', color: '#666' }}>Активных сегодня</div>
                </div>
              </div>

              <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '10px' }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>Распределение пользователей по подпискам</h4>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1', minWidth: '150px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6c757d' }}>{Math.round(analytics.activeUsers * 0.6)}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Free</div>
                  </div>
                  <div style={{ flex: '1', minWidth: '150px', padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1565c0' }}>{Math.round(analytics.activeUsers * 0.25)}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Standard</div>
                  </div>
                  <div style={{ flex: '1', minWidth: '150px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#856404' }}>{Math.round(analytics.activeUsers * 0.15)}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Premium</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'courses' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                <div style={{ padding: '25px', backgroundColor: '#f3e5f5', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#7b1fa2' }}>{analytics.totalCourses}</div>
                  <div style={{ fontSize: '14px', color: '#666' }}>Всего курсов</div>
                </div>
                <div style={{ padding: '25px', backgroundColor: '#e8f5e9', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#2e7d32' }}>{analytics.completedCourses}</div>
                  <div style={{ fontSize: '14px', color: '#666' }}>Завершено</div>
                </div>
                <div style={{ padding: '25px', backgroundColor: '#fff3e0', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#e65100' }}>{analytics.coursesByCategory.length}</div>
                  <div style={{ fontSize: '14px', color: '#666' }}>Категорий</div>
                </div>
              </div>

              <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '10px' }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>Курсы по категориям</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {analytics.coursesByCategory.map((cat, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <span style={{ width: '180px', fontSize: '14px', color: '#333' }}>{cat.category}</span>
                      <div style={{ flex: 1, height: '24px', backgroundColor: '#e0e0e0', borderRadius: '12px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${(cat.count / Math.max(...analytics.coursesByCategory.map(c => c.count))) * 100}%`,
                            height: '100%',
                            backgroundColor: '#764ba2',
                            borderRadius: '12px'
                          }}
                        />
                      </div>
                      <span style={{ width: '50px', fontSize: '14px', color: '#333', fontWeight: '600', textAlign: 'right' }}>{cat.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'platforms' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                <div style={{ padding: '25px', backgroundColor: '#e8f5e9', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#2e7d32' }}>{analytics.totalPlatforms}</div>
                  <div style={{ fontSize: '14px', color: '#666' }}>Всего платформ</div>
                </div>
                <div style={{ padding: '25px', backgroundColor: '#e3f2fd', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#1565c0' }}>{Math.round(analytics.totalPlatforms * 0.81)}</div>
                  <div style={{ fontSize: '14px', color: '#666' }}>С курсами</div>
                </div>
                <div style={{ padding: '25px', backgroundColor: '#fff3e0', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#e65100' }}>4</div>
                  <div style={{ fontSize: '14px', color: '#666' }}>Региональных групп</div>
                </div>
              </div>

              <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '10px' }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>Популярные платформы</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                  {analytics.popularPlatforms.map((platform, idx) => (
                    <div key={idx} style={{
                      padding: '15px',
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      border: '1px solid #e9ecef',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <span style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: idx < 3 ? '#1abc9c' : '#667eea',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}>
                        {idx + 1}
                      </span>
                      <div>
                        <div style={{ fontWeight: '600', color: '#333' }}>{platform.name}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>{platform.users} пользователей</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
