import { useState, useEffect } from 'react';
import AdminPanel from './components/AdminPanel';
import { AuthForm } from './components/AuthForm';
import { LandingPage } from './components/LandingPage';

function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setCurrentUser(parsedUser);
      } catch (error) {
        console.warn('Ошибка загрузки пользователя:', error);
      }
    }

    const token = localStorage.getItem('accessToken');
    if (token) {
      fetch('/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(response => {
        if (response.ok) return response.json();
        throw new Error('Token invalid');
      })
      .then(data => {
        const serverUser = { ...data.user };
        setCurrentUser(serverUser);
        localStorage.setItem('currentUser', JSON.stringify(serverUser));
      })
      .catch(() => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('currentUser');
        setCurrentUser(null);
      })
      .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleAuthSuccess = (user: any) => {
    setCurrentUser(user);
    setShowAuthForm(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    setShowAdminPanel(false);
    setShowAuthForm(false);
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        flexDirection: 'column',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '4px solid #f3f3f3', 
          borderTop: '4px solid #667eea', 
          borderRadius: '50%', 
          animation: 'spin 1s linear infinite' 
        }}></div>
        <h1 style={{ marginTop: '20px', color: '#333' }}>Загрузка My EPA...</h1>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!currentUser) {
    if (showAuthForm) {
      return (
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowAuthForm(false)}
            style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              padding: '10px 20px',
              backgroundColor: 'rgba(255,255,255,0.9)',
              color: '#333',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              zIndex: 1000,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            ← На главную
          </button>
          <AuthForm onAuthSuccess={handleAuthSuccess} />
        </div>
      );
    }
    return <LandingPage onLoginClick={() => setShowAuthForm(true)} />;
  }

  if (currentUser.adminRole && showAdminPanel) {
    return (
      <AdminPanel 
        user={currentUser} 
        onBack={() => setShowAdminPanel(false)} 
      />
    );
  }

  return (
    <div style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <Header 
        user={currentUser} 
        onAdminClick={() => setShowAdminPanel(true)}
        onLogout={handleLogout}
      />
      <Dashboard user={currentUser} />
    </div>
  );
}

function Header({ user, onAdminClick, onLogout }: { user: any; onAdminClick: () => void; onLogout: () => void }) {
  return (
    <div style={{ backgroundColor: 'white', padding: '20px 30px', borderBottom: '1px solid #dee2e6' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '18px'
          }}>
            E
          </div>
          <div>
            <h1 style={{ margin: '0', color: '#333', fontSize: '24px' }}>My EPA</h1>
            <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
              Привет, {user.firstName}! Управляйте своими курсами
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {user.adminRole && (
            <button
              onClick={onAdminClick}
              style={{
                padding: '8px 16px',
                backgroundColor: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              ⚙️ Админ-панель
            </button>
          )}
          <button
            onClick={onLogout}
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            🚪 Выход
          </button>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ user }: { user: any }) {
  const [courses] = useState([
    { id: 1, title: 'Python для начинающих', platform: 'Coursera', progress: 45, status: 'in_progress' },
    { id: 2, title: 'Основы машинного обучения', platform: 'Stepik', progress: 78, status: 'in_progress' },
    { id: 3, title: 'Web Development Bootcamp', platform: 'Udemy', progress: 100, status: 'completed' },
    { id: 4, title: 'Data Science Specialization', platform: 'edX', progress: 12, status: 'in_progress' },
  ]);

  const [deadlines] = useState([
    { id: 1, title: 'Сдать проект по Python', course: 'Python для начинающих', dueDate: '2025-12-05', priority: 'high' },
    { id: 2, title: 'Тест по ML', course: 'Основы машинного обучения', dueDate: '2025-12-10', priority: 'medium' },
    { id: 3, title: 'Финальный экзамен', course: 'Data Science', dueDate: '2025-12-15', priority: 'high' },
  ]);

  return (
    <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Stats Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '20px',
        marginBottom: '30px'
      }}>
        <StatCard icon="📚" title="Всего курсов" value={courses.length} color="#667eea" />
        <StatCard icon="🎯" title="В процессе" value={courses.filter(c => c.status === 'in_progress').length} color="#ffc107" />
        <StatCard icon="✅" title="Завершено" value={courses.filter(c => c.status === 'completed').length} color="#28a745" />
        <StatCard icon="⏰" title="Дедлайны" value={deadlines.length} color="#dc3545" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        {/* Courses Section */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '25px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h2 style={{ margin: '0 0 20px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '10px' }}>
            📚 Мои курсы
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {courses.map(course => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
          <button style={{
            width: '100%',
            marginTop: '20px',
            padding: '12px',
            backgroundColor: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            cursor: 'pointer'
          }}>
            ➕ Добавить курс
          </button>
        </div>

        {/* Deadlines Section */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '25px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h2 style={{ margin: '0 0 20px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '10px' }}>
            ⏰ Ближайшие дедлайны
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {deadlines.map(deadline => (
              <DeadlineCard key={deadline.id} deadline={deadline} />
            ))}
          </div>
          <button style={{
            width: '100%',
            marginTop: '20px',
            padding: '12px',
            backgroundColor: '#764ba2',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            cursor: 'pointer'
          }}>
            ➕ Добавить дедлайн
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ 
        marginTop: '30px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px'
      }}>
        <QuickAction icon="📝" title="Заметки" description="Ваши заметки к курсам" />
        <QuickAction icon="📊" title="Аналитика" description="Статистика обучения" />
        <QuickAction icon="🔗" title="Платформы" description="Подключенные платформы" />
        <QuickAction icon="⚙️" title="Настройки" description="Персонализация" />
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, color }: { icon: string; title: string; value: number; color: string }) {
  return (
    <div style={{ 
      backgroundColor: 'white', 
      padding: '20px', 
      borderRadius: '12px', 
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      borderLeft: `4px solid ${color}`
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>{title}</p>
          <p style={{ margin: '0', fontSize: '28px', fontWeight: 'bold', color: '#333' }}>{value}</p>
        </div>
        <span style={{ fontSize: '32px' }}>{icon}</span>
      </div>
    </div>
  );
}

function CourseCard({ course }: { course: any }) {
  const platformColors: Record<string, string> = {
    'Coursera': '#0056D2',
    'Stepik': '#6BBE66',
    'Udemy': '#A435F0',
    'edX': '#02262B'
  };

  return (
    <div style={{ 
      padding: '15px', 
      backgroundColor: '#f8f9fa', 
      borderRadius: '8px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div style={{ flex: 1 }}>
        <h4 style={{ margin: '0 0 5px 0', color: '#333' }}>{course.title}</h4>
        <span style={{ 
          padding: '2px 8px', 
          backgroundColor: platformColors[course.platform] || '#667eea',
          color: 'white',
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          {course.platform}
        </span>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ 
          width: '80px', 
          height: '8px', 
          backgroundColor: '#e9ecef', 
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{ 
            width: `${course.progress}%`, 
            height: '100%', 
            backgroundColor: course.progress === 100 ? '#28a745' : '#667eea',
            borderRadius: '4px'
          }}></div>
        </div>
        <span style={{ fontSize: '12px', color: '#666' }}>{course.progress}%</span>
      </div>
    </div>
  );
}

function DeadlineCard({ deadline }: { deadline: any }) {
  const priorityColors: Record<string, string> = {
    'high': '#dc3545',
    'medium': '#ffc107',
    'low': '#28a745'
  };

  return (
    <div style={{ 
      padding: '15px', 
      backgroundColor: '#f8f9fa', 
      borderRadius: '8px',
      borderLeft: `4px solid ${priorityColors[deadline.priority]}`
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h4 style={{ margin: '0 0 5px 0', color: '#333' }}>{deadline.title}</h4>
          <p style={{ margin: '0', color: '#666', fontSize: '13px' }}>{deadline.course}</p>
        </div>
        <span style={{ 
          padding: '4px 10px', 
          backgroundColor: priorityColors[deadline.priority],
          color: 'white',
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          {deadline.dueDate}
        </span>
      </div>
    </div>
  );
}

function QuickAction({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <button style={{ 
      padding: '20px',
      backgroundColor: 'white',
      border: '1px solid #dee2e6',
      borderRadius: '12px',
      cursor: 'pointer',
      textAlign: 'left',
      transition: 'all 0.2s ease'
    }}>
      <span style={{ fontSize: '24px' }}>{icon}</span>
      <h4 style={{ margin: '10px 0 5px 0', color: '#333' }}>{title}</h4>
      <p style={{ margin: '0', color: '#666', fontSize: '13px' }}>{description}</p>
    </button>
  );
}

export default App;
