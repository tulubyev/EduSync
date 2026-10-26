import { useState, useEffect } from 'react';
import { Route, Switch, useLocation, Link } from 'wouter';
import AdminPanel from './components/AdminPanel';
import { AuthForm } from './components/AuthForm';
import { LandingPage } from './components/LandingPage';
import { FooterPage, PUBLIC_PAGE_PATHS } from './components/FooterPages';
import { PartnersPage } from './components/PartnersPage';
import { useLang, setLang, onUserLangChange } from './i18n';
import type { Messages } from './locales';
import { isLang } from '@shared/languages';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { authService } from './services/authService';
import { CoursesPage } from './components/courses/CoursesPage';
import { DeadlinesPage } from './components/deadlines/DeadlinesPage';
import { CalendarPage } from './components/events/CalendarPage';
import { TodayPanel } from './components/events/TodayPanel';
import { LibraryPage } from './components/library/LibraryPage';
import { PlatformsPage } from './components/platforms/PlatformsPage';
import { AnalyticsPage } from './components/analytics/AnalyticsPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { SubscriptionPage } from './components/settings/SubscriptionPage';
import { RecordingSchedulePage } from './components/recording/RecordingSchedulePage';
import { OAuthCallbackHandler } from './components/OAuthCallbackHandler';
import { Sheet, SheetContent, SheetTrigger } from './components/ui/sheet';
import { 
  BookOpen, 
  Calendar, 
  CalendarDays,
  FileText, 
  Globe, 
  BarChart3, 
  Settings, 
  LogOut,
  Home,
  Menu,
  X,
  CreditCard,
  CheckCircle,
  Video
} from 'lucide-react';

function SubscriptionSuccessPage() {
  const { m } = useLang();
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-4">{m.paymentSuccess.title}</h1>
        <p className="text-gray-600 mb-6">
          {m.paymentSuccess.text}
        </p>
        <div className="flex gap-4 justify-center">
          <a href="/subscription" className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            {m.paymentSuccess.mySubscription}
          </a>
          <a href="/home" className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            {m.common.toHome}
          </a>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [location, navigate] = useLocation();
  const { t, m } = useLang();

  // Язык кабинета — из профиля ученика; выбор в переключателе сохраняется в профиле
  useEffect(() => {
    if (currentUser && isLang(currentUser.language)) setLang(currentUser.language);
  }, [currentUser?.id, currentUser?.language]);

  useEffect(() => onUserLangChange((language) => {
    if (!localStorage.getItem('accessToken')) return;
    authService.authenticatedFetch('/api/profile/language', { method: 'PUT', body: JSON.stringify({ language }) })
      .then((res) => {
        if (!res.ok) return;
        setCurrentUser((u: any) => {
          if (!u) return u;
          const next = { ...u, language };
          localStorage.setItem('currentUser', JSON.stringify(next));
          return next;
        });
      })
      .catch(() => { /* язык останется только в браузере */ });
  }), []);

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
        <h1 className="mt-5 text-gray-700 text-xl">{m.app.loading}</h1>
      </div>
    );
  }

  if (location === '/partners') {
    return <PartnersPage />;
  }

  const publicPage = PUBLIC_PAGE_PATHS[location];
  if (publicPage) {
    return <FooterPage page={publicPage} onBack={() => navigate('/')} />;
  }

  if (!currentUser) {
    if (showAuthForm) {
      return (
        <div className="relative bg-gradient-to-br from-[#667eea] to-[#764ba2]">
          <button
            onClick={() => setShowAuthForm(false)}
            className="m-4 mb-0 sm:m-0 sm:absolute sm:top-5 sm:left-5 px-5 py-2.5 bg-white/90 text-gray-700 border-none rounded-lg text-sm font-medium cursor-pointer z-50 shadow-md hover:bg-white transition-colors"
          >
            ← {t({ ru: 'На главную', en: 'Home' })}
          </button>
          <AuthForm key={authMode} initialMode={authMode} onAuthSuccess={handleAuthSuccess} />
        </div>
      );
    }
    const openAuth = (mode: 'login' | 'register') => {
      setAuthMode(mode);
      setShowAuthForm(true);
    };
    return <LandingPage onLoginClick={() => openAuth('login')} onRegisterClick={() => openAuth('register')} />;
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
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar 
          user={currentUser} 
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          onAdminClick={() => setShowAdminPanel(true)}
          onLogout={handleLogout}
        />
      </div>
      
      {/* Mobile Header with Sheet Drawer */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <Sheet>
          <SheetTrigger asChild>
            <button className="p-2 hover:bg-gray-100 rounded-lg min-h-11 min-w-11 flex items-center justify-center">
              <Menu className="w-5 h-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <MobileSidebarContent 
              user={currentUser}
              onAdminClick={() => setShowAdminPanel(true)}
              onLogout={handleLogout}
            />
          </SheetContent>
        </Sheet>
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <img src="/myepa-logo-clean.png" alt="My EPA" className="w-8 h-8 object-contain" />
            <span className="font-bold text-gray-800">My EPA</span>
          </div>
        </Link>
        <div className="w-11" />
      </div>
      
      <main className={`flex-1 overflow-auto transition-all duration-300 pt-16 lg:pt-0 ml-0 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'}`}>
        <Switch>
          <Route path="/" component={() => <Dashboard user={currentUser} />} />
          <Route path="/home" component={() => <Dashboard user={currentUser} />} />
          <Route path="/courses" component={CoursesPage} />
          <Route path="/calendar" component={CalendarPage} />
          <Route path="/deadlines" component={DeadlinesPage} />
          <Route path="/library" component={LibraryPage} />
          <Route path="/platforms" component={PlatformsPage} />
          <Route path="/analytics" component={AnalyticsPage} />
          <Route path="/recordings" component={RecordingSchedulePage} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="/subscription" component={SubscriptionPage} />
          <Route path="/subscription/success" component={SubscriptionSuccessPage} />
          <Route path="/auth/stepik/callback" component={OAuthCallbackHandler} />
          <Route component={() => <Dashboard user={currentUser} />} />
        </Switch>
      </main>
    </div>
  );
}

// Пункты меню кабинета (общие для боковой панели и мобильного меню)
const navItems: Array<{ path: string; icon: typeof Home; label: keyof Messages['nav'] }> = [
  { path: '/home', icon: Home, label: 'home' },
  { path: '/calendar', icon: CalendarDays, label: 'calendar' },
  { path: '/courses', icon: BookOpen, label: 'courses' },
  { path: '/deadlines', icon: Calendar, label: 'deadlines' },
  { path: '/library', icon: FileText, label: 'library' },
  { path: '/recordings', icon: Video, label: 'recordings' },
  { path: '/platforms', icon: Globe, label: 'platforms' },
  { path: '/analytics', icon: BarChart3, label: 'analytics' },
  { path: '/subscription', icon: CreditCard, label: 'subscription' },
  { path: '/settings', icon: Settings, label: 'settings' },
];

interface SidebarProps {
  user: any;
  isOpen: boolean;
  onToggle: () => void;
  onAdminClick: () => void;
  onLogout: () => void;
}

function Sidebar({ user, isOpen, onToggle, onAdminClick, onLogout }: SidebarProps) {
  const [location] = useLocation();
  const { m } = useLang();


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
                <p className="text-xs text-gray-500">{m.app.tagline}</p>
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
                {isOpen && <span>{m.nav[item.label]}</span>}
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
            {isOpen && <span>{m.app.adminPanel}</span>}
          </button>
        )}
        {isOpen && <LanguageSwitcher className="mb-1 w-full" />}
        <button
          onClick={onLogout}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-left text-red-600 hover:bg-red-50 transition-colors mb-2`}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {isOpen && <span>{m.app.logout}</span>}
        </button>

        {/* User Profile Section with Avatar */}
        <div className={`flex items-center gap-3 px-3 py-3 bg-gray-50 rounded-lg transition-all ${isOpen ? '' : 'justify-center'}`}>
          {user.profileImageUrl ? (
            <img
              src={user.profileImageUrl}
              alt="Avatar"
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </div>
          )}
          {isOpen && (
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="font-medium text-sm text-gray-800 truncate">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-gray-500 truncate">{user.email || user.phone}</p>
              {user.adminRole ? (
                <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-purple-100 text-purple-700 leading-tight">
                  {m.app.roles[user.adminRole] ?? user.adminRole}
                </span>
              ) : (
                <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-500 leading-tight">
                  {m.app.user}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface MobileSidebarContentProps {
  user: any;
  onAdminClick: () => void;
  onLogout: () => void;
}

function MobileSidebarContent({ user, onAdminClick, onLogout }: MobileSidebarContentProps) {
  const { m } = useLang();
  const [location] = useLocation();


  return (
    <div className="h-full bg-white flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <Link href="/">
          <div className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
            <img src="/myepa-logo-clean.png" alt="My EPA Logo" className="w-10 h-10 object-contain" />
            <div>
              <h1 className="font-bold text-gray-800 text-lg">My EPA</h1>
              <p className="text-xs text-gray-500">{m.app.tagline}</p>
            </div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location === item.path || (location === '/' && item.path === '/home');
          const Icon = item.icon;
          
          return (
            <Link key={item.path} href={item.path}>
              <div className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors cursor-pointer min-h-11 ${
                isActive 
                  ? 'bg-purple-50 text-purple-700 font-medium' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}>
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{m.nav[item.label]}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-2 border-t border-gray-200">
        {user.adminRole && (
          <button
            onClick={onAdminClick}
            className="flex items-center gap-3 px-3 py-3 rounded-lg w-full text-left text-purple-600 hover:bg-purple-50 transition-colors mb-1 min-h-11"
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            <span>{m.app.adminPanel}</span>
          </button>
        )}
        <LanguageSwitcher className="mb-1 w-full min-h-11" />
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-3 rounded-lg w-full text-left text-red-600 hover:bg-red-50 transition-colors mb-2 min-h-11"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span>{m.app.logout}</span>
        </button>

        <div className="flex items-center gap-3 px-3 py-3 bg-gray-50 rounded-lg">
          {user.profileImageUrl ? (
            <img src={user.profileImageUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </div>
          )}
          <div className="overflow-hidden flex-1 min-w-0">
            <p className="font-medium text-sm text-gray-800 truncate">{user.firstName} {user.lastName}</p>
            <p className="text-xs text-gray-500 truncate">{user.email || user.phone}</p>
            {user.adminRole ? (
              <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-purple-100 text-purple-700 leading-tight">
                {m.app.roles[user.adminRole] ?? user.adminRole}
              </span>
            ) : (
              <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-500 leading-tight">
                {m.app.user}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ user }: { user: any }) {
  const { m } = useLang();
  const [stats, setStats] = useState({
    totalCourses: 0,
    inProgress: 0,
    completed: 0,
    deadlines: 0,
  });
  const [recentCourses, setRecentCourses] = useState<any[]>([]);

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
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">{m.dashboard.hello(user.firstName)}</h1>
        <p className="text-gray-600 mt-1">{m.dashboard.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard icon="📚" title={m.dashboard.totalCourses} value={stats.totalCourses} color="#667eea" />
        <StatCard icon="🎯" title={m.dashboard.inProgress} value={stats.inProgress} color="#ffc107" />
        <StatCard icon="✅" title={m.dashboard.completed} value={stats.completed} color="#28a745" />
        <StatCard icon="⏰" title={m.dashboard.deadlines} value={stats.deadlines} color="#dc3545" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TodayPanel />
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-600" />
              {m.dashboard.myCourses}
            </h2>
            <Link href="/courses">
              <div className="text-sm text-purple-600 hover:text-purple-700 cursor-pointer">{m.dashboard.allCourses}</div>
            </Link>
          </div>
          
          {recentCourses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>{m.dashboard.noCourses}</p>
              <Link href="/courses">
                <div className="inline-block mt-3 text-purple-600 hover:text-purple-700 cursor-pointer">{m.dashboard.addFirstCourse}</div>
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

      </div>

      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickAction href="/library" icon="📚" title={m.nav.library} />
        <QuickAction href="/platforms" icon="🔗" title={m.nav.platforms} />
        <QuickAction href="/analytics" icon="📊" title={m.nav.analytics} />
        <QuickAction href="/settings" icon="⚙️" title={m.nav.settings} />
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

function QuickAction({ href, icon, title }: { href: string; icon: string; title: string }) {
  return (
    <Link href={href}>
      <div className="p-5 bg-white border border-gray-200 rounded-xl cursor-pointer text-center hover:shadow-md hover:border-purple-200 transition-all group">
        <span className="text-2xl block mb-2 group-hover:scale-110 transition-transform">{icon}</span>
        <h4 className="font-medium text-gray-800">{title}</h4>
      </div>
    </Link>
  );
}

export default App;
