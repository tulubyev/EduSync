import { useState, useEffect } from 'react';
import { Route, Switch, useLocation, Link } from 'wouter';
import AdminPanel from './components/AdminPanel';
import { AuthForm } from './components/AuthForm';
import { LandingPage } from './components/LandingPage';
import { CoursesPage } from './components/courses/CoursesPage';
import { DeadlinesPage } from './components/deadlines/DeadlinesPage';
import { NotesPage } from './components/notes/NotesPage';
import { PlatformsPage } from './components/platforms/PlatformsPage';
import { AnalyticsPage } from './components/analytics/AnalyticsPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { 
  BookOpen, 
  Calendar, 
  FileText, 
  Globe, 
  BarChart3, 
  Settings, 
  LogOut,
  Home,
  Menu,
  X
} from 'lucide-react';

function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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

    // Listen for user updates from SettingsPage and other components
    const handleUserUpdate = (event: any) => {
      if (event.detail) {
        setCurrentUser(event.detail);
      }
    };

    window.addEventListener('userUpdated', handleUserUpdate);
    return () => window.removeEventListener('userUpdated', handleUserUpdate);
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
      <div className="flex items-center justify-center h-screen flex-col bg-gray-50">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-purple-600 rounded-full animate-spin"></div>
        <h1 className="mt-5 text-gray-700 text-xl">Загрузка My EPA...</h1>
      </div>
    );
  }

  if (!currentUser) {
    if (showAuthForm) {
      return (
        <div className="relative">
          <button
            onClick={() => setShowAuthForm(false)}
            className="absolute top-5 left-5 px-5 py-2.5 bg-white/90 text-gray-700 border-none rounded-lg text-sm font-medium cursor-pointer z-50 shadow-md hover:bg-white transition-colors"
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
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        user={currentUser} 
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onAdminClick={() => setShowAdminPanel(true)}
        onLogout={handleLogout}
      />
      <main className={`flex-1 overflow-auto transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        <Switch>
          <Route path="/" component={() => <Dashboard user={currentUser} />} />
          <Route path="/home" component={() => <Dashboard user={currentUser} />} />
          <Route path="/courses" component={CoursesPage} />
          <Route path="/deadlines" component={DeadlinesPage} />
          <Route path="/notes" component={NotesPage} />
          <Route path="/platforms" component={PlatformsPage} />
          <Route path="/analytics" component={AnalyticsPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route component={() => <Dashboard user={currentUser} />} />
        </Switch>
      </main>
    </div>
  );
}

interface SidebarProps {
  user: any;
  isOpen: boolean;
  onToggle: () => void;
  onAdminClick: () => void;
  onLogout: () => void;
}

function Sidebar({ user, isOpen, onToggle, onAdminClick, onLogout }: SidebarProps) {
  const [location] = useLocation();

  const navItems = [
    { path: '/home', icon: Home, label: 'Главная' },
    { path: '/courses', icon: BookOpen, label: 'Курсы' },
    { path: '/deadlines', icon: Calendar, label: 'Дедлайны' },
    { path: '/notes', icon: FileText, label: 'Заметки' },
    { path: '/platforms', icon: Globe, label: 'Платформы' },
    { path: '/analytics', icon: BarChart3, label: 'Аналитика' },
    { path: '/settings', icon: Settings, label: 'Настройки' },
  ];

  return (
    <div className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-all duration-300 z-40 ${isOpen ? 'w-64' : 'w-16'}`}>
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {isOpen && (
          <Link href="/">
            <div className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
              <img 
                src="/myepa-logo-clean.png" 
                alt="My EPA Logo"
                className="w-10 h-10 object-contain"
              />
              <div>
                <h1 className="font-bold text-gray-800 text-lg">My EPA</h1>
                <p className="text-xs text-gray-500">Агрегатор курсов</p>
              </div>
            </div>
          </Link>
        )}
        <button 
          onClick={onToggle}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <nav className="p-2 space-y-1">
        {navItems.map((item) => {
          const isActive = location === item.path || (location === '/' && item.path === '/home');
          const Icon = item.icon;
          
          return (
            <Link key={item.path} href={item.path}>
              <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
                isActive 
                  ? 'bg-purple-50 text-purple-700 font-medium' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}>
                <Icon className="w-5 h-5 flex-shrink-0" />
                {isOpen && <span>{item.label}</span>}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-0 left-0 right-0 p-2 border-t border-gray-200">
        {user.adminRole && (
          <button
            onClick={onAdminClick}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-left text-purple-600 hover:bg-purple-50 transition-colors mb-1`}
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            {isOpen && <span>Админ-панель</span>}
          </button>
        )}
        <button
          onClick={onLogout}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-left text-red-600 hover:bg-red-50 transition-colors mb-2`}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {isOpen && <span>Выход</span>}
        </button>

        {/* User Profile Section with Avatar */}
        <div className={`flex items-center gap-3 px-3 py-3 bg-gray-50 rounded-lg transition-all ${isOpen ? '' : 'justify-center'}`}>
          {user.profileImageAvatar ? (
            <img
              src={user.profileImageAvatar}
              alt="Avatar"
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </div>
          )}
          {isOpen && (
            <div className="overflow-hidden">
              <p className="font-medium text-sm text-gray-800 truncate">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-gray-500 truncate">{user.email || user.phone}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Dashboard({ user }: { user: any }) {
  const [stats, setStats] = useState({
    totalCourses: 0,
    inProgress: 0,
    completed: 0,
    deadlines: 0,
  });
  const [recentCourses, setRecentCourses] = useState<any[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const token = localStorage.getItem('accessToken');
    
    try {
      const [coursesRes, deadlinesRes] = await Promise.all([
        fetch('/api/courses', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/deadlines', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (coursesRes.ok) {
        const courses = await coursesRes.json();
        setRecentCourses(courses.slice(0, 4));
        setStats(prev => ({
          ...prev,
          totalCourses: courses.length,
          inProgress: courses.filter((c: any) => c.status === 'in_progress').length,
          completed: courses.filter((c: any) => c.status === 'completed').length,
        }));
      }

      if (deadlinesRes.ok) {
        const deadlines = await deadlinesRes.json();
        const upcoming = deadlines
          .filter((d: any) => d.status !== 'completed')
          .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
          .slice(0, 3);
        setUpcomingDeadlines(upcoming);
        setStats(prev => ({
          ...prev,
          deadlines: deadlines.filter((d: any) => d.status !== 'completed').length,
        }));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Привет, {user.firstName}! 👋</h1>
        <p className="text-gray-600 mt-1">Вот что происходит с вашим обучением сегодня</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard icon="📚" title="Всего курсов" value={stats.totalCourses} color="#667eea" />
        <StatCard icon="🎯" title="В процессе" value={stats.inProgress} color="#ffc107" />
        <StatCard icon="✅" title="Завершено" value={stats.completed} color="#28a745" />
        <StatCard icon="⏰" title="Дедлайны" value={stats.deadlines} color="#dc3545" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-600" />
              Мои курсы
            </h2>
            <Link href="/courses">
              <a className="text-sm text-purple-600 hover:text-purple-700">Все курсы →</a>
            </Link>
          </div>
          
          {recentCourses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>У вас пока нет курсов</p>
              <Link href="/courses">
                <a className="inline-block mt-3 text-purple-600 hover:text-purple-700">Добавить первый курс</a>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentCourses.map((course) => (
                <DashboardCourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-600" />
              Ближайшие дедлайны
            </h2>
            <Link href="/deadlines">
              <a className="text-sm text-purple-600 hover:text-purple-700">Все дедлайны →</a>
            </Link>
          </div>
          
          {upcomingDeadlines.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Нет активных дедлайнов</p>
              <Link href="/deadlines">
                <a className="inline-block mt-3 text-purple-600 hover:text-purple-700">Добавить дедлайн</a>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingDeadlines.map((deadline) => (
                <DashboardDeadlineCard key={deadline.id} deadline={deadline} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickAction href="/notes" icon="📝" title="Заметки" />
        <QuickAction href="/platforms" icon="🔗" title="Платформы" />
        <QuickAction href="/analytics" icon="📊" title="Аналитика" />
        <QuickAction href="/settings" icon="⚙️" title="Настройки" />
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, color }: { icon: string; title: string; value: number; color: string }) {
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100" style={{ borderLeftColor: color, borderLeftWidth: '4px' }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-800">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}

function DashboardCourseCard({ course }: { course: any }) {
  const progress = parseFloat(course.progress) || 0;
  
  return (
    <div className="p-4 bg-gray-50 rounded-lg flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-800 truncate">{course.title}</h4>
        <div className="flex items-center gap-2 mt-1">
          {course.category && (
            <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
              {course.category}
            </span>
          )}
        </div>
      </div>
      <div className="text-right ml-4">
        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all"
            style={{ 
              width: `${progress}%`,
              backgroundColor: progress === 100 ? '#28a745' : '#667eea'
            }}
          ></div>
        </div>
        <span className="text-xs text-gray-500 mt-1">{Math.round(progress)}%</span>
      </div>
    </div>
  );
}

function DashboardDeadlineCard({ deadline }: { deadline: any }) {
  const dueDate = new Date(deadline.dueDate);
  const now = new Date();
  const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  const priorityColors: Record<string, string> = {
    'high': '#dc3545',
    'medium': '#ffc107',
    'low': '#28a745'
  };

  return (
    <div 
      className="p-4 bg-gray-50 rounded-lg"
      style={{ borderLeftWidth: '4px', borderLeftColor: priorityColors[deadline.priority] || '#667eea' }}
    >
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-medium text-gray-800">{deadline.title}</h4>
          {deadline.course && (
            <p className="text-sm text-gray-500 mt-0.5">{deadline.course.title}</p>
          )}
        </div>
        <span className={`text-xs px-2 py-1 rounded font-medium ${
          daysLeft <= 0 ? 'bg-red-100 text-red-700' :
          daysLeft <= 1 ? 'bg-orange-100 text-orange-700' :
          daysLeft <= 7 ? 'bg-yellow-100 text-yellow-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {daysLeft <= 0 ? 'Просрочено' :
           daysLeft === 1 ? 'Завтра' :
           `${daysLeft} дн.`}
        </span>
      </div>
    </div>
  );
}

function QuickAction({ href, icon, title }: { href: string; icon: string; title: string }) {
  return (
    <Link href={href}>
      <a className="p-5 bg-white border border-gray-200 rounded-xl cursor-pointer text-center hover:shadow-md hover:border-purple-200 transition-all group">
        <span className="text-2xl block mb-2 group-hover:scale-110 transition-transform">{icon}</span>
        <h4 className="font-medium text-gray-800">{title}</h4>
      </a>
    </Link>
  );
}

export default App;
