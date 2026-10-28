import { useState } from 'react';
import { ApiManagement } from './admin/ApiManagement';
import { UsersSection } from './admin/UsersSection';
import { CoursesManagement } from './admin/CoursesManagement';
import { PlatformsManagement } from './admin/PlatformsManagement';
import { AnalyticsSection } from './admin/AnalyticsSection';
import { SubscriptionPlansManagement } from './admin/SubscriptionPlansManagement';
import { PaymentSystemsManagement } from './admin/PaymentSystemsManagement';
import { AdminRecordingDashboard } from './recording/AdminRecordingDashboard';

// AdminPanel component for administrators
function AdminPanel({ user, onBack }: any) {
  const [showUsersSection, setShowUsersSection] = useState(false);
  const [showCoursesManagement, setShowCoursesManagement] = useState(false);
  const [showPlatformsManagement, setShowPlatformsManagement] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showApiManagement, setShowApiManagement] = useState(false);
  const [showSubscriptionPlans, setShowSubscriptionPlans] = useState(false);
  const [showPaymentSystems, setShowPaymentSystems] = useState(false);
  const [showRecordings, setShowRecordings] = useState(false);

  const adminRoles = {
    super_admin: 'Супер Администратор',
    devops_admin: 'DevOps Администратор', 
    analytics_admin: 'Аналитический Администратор',
    finance_admin: 'Финансовый Администратор',
    api_admin: 'API Администратор',
    security_admin: 'Администратор Безопасности'
  };

  const adminPermissions = {
    super_admin: ['Все разделы', 'Управление курсами', 'Управление платформами', 'Пользователи', 'Подписки', 'Платежные системы'],
    devops_admin: ['Мониторинг системы', 'Производительность', 'Логи системы'],
    analytics_admin: ['Просмотр пользователей', 'Просмотр курсов', 'Просмотр платформ', 'Аналитика'],
    finance_admin: ['Просмотр подписок', 'Финансовые отчеты', 'Управление подписками', 'Платежные системы'],
    api_admin: ['Мониторинг API', 'Управление интеграциями'],
    security_admin: ['Мониторинг безопасности', 'Логи', 'Анализ']
  };

  const userRole = (user.adminRole || 'super_admin') as keyof typeof adminRoles;

  return (
    <div className="light-island p-3 sm:p-5 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">📚 My EPA - Админ-панель</h1>
          <p className="text-gray-600 text-sm">
            Агрегатор образовательных программ | Роль: <span className="bg-indigo-500 text-white px-2 py-1 rounded text-xs font-medium">
              {adminRoles[userRole]}
            </span>
          </p>
        </div>
        <button 
          onClick={onBack}
          className="px-4 py-3 bg-gray-600 text-white border-none rounded-lg cursor-pointer text-sm font-medium min-h-11 hover:bg-gray-700 transition-colors"
        >
          ← Вернуться
        </button>
      </div>

      {/* Доступные функции и Быстрые действия */}
      <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 mb-5">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Доступные функции для вашей роли</h2>
        <div className="flex flex-wrap gap-2 mb-5">
          {adminPermissions[userRole].map((permission: string, idx: number) => (
            <span key={idx} className="bg-blue-500 text-white px-3 py-1.5 rounded-full text-sm">
              {permission}
            </span>
          ))}
        </div>

        <h3 className="text-base font-semibold text-gray-800 mb-4">Быстрые действия</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {(userRole === 'super_admin' || userRole === 'analytics_admin') && (
            <button 
              onClick={() => setShowUsersSection(!showUsersSection)}
              className="p-3 sm:p-4 bg-indigo-500 text-white border-none rounded-lg cursor-pointer text-sm font-medium flex flex-col items-center gap-1 min-h-11 hover:bg-indigo-600 transition-colors"
            >
              <span className="text-xs sm:text-sm">👥 {showUsersSection ? 'Скрыть' : 'Пользователи'}</span>
              <span className="text-xs opacity-80">—</span>
            </button>
          )}
          
          {(userRole === 'super_admin' || userRole === 'analytics_admin') && (
            <button 
              onClick={() => setShowCoursesManagement(!showCoursesManagement)}
              className={`p-3 sm:p-4 ${showCoursesManagement ? 'bg-indigo-500' : 'bg-purple-600'} text-white border-none rounded-lg cursor-pointer text-sm font-medium flex flex-col items-center gap-1 min-h-11 hover:opacity-90 transition-colors`}
            >
              <span className="text-xs sm:text-sm">📖 {showCoursesManagement ? 'Скрыть' : 'Курсы'}</span>
              <span className="text-xs opacity-80">111</span>
            </button>
          )}
          
          {(userRole === 'super_admin' || userRole === 'analytics_admin') && (
            <button 
              onClick={() => setShowPlatformsManagement(!showPlatformsManagement)}
              className={`p-3 sm:p-4 ${showPlatformsManagement ? 'bg-indigo-500' : 'bg-teal-500'} text-white border-none rounded-lg cursor-pointer text-sm font-medium flex flex-col items-center gap-1 min-h-11 hover:opacity-90 transition-colors`}
            >
              <span className="text-xs sm:text-sm">🌐 {showPlatformsManagement ? 'Скрыть' : 'Платформы'}</span>
              <span className="text-xs opacity-80">8+</span>
            </button>
          )}

          {(userRole === 'super_admin' || userRole === 'analytics_admin') && (
            <button 
              onClick={() => setShowAnalytics(!showAnalytics)}
              className={`p-3 sm:p-4 ${showAnalytics ? 'bg-indigo-500' : 'bg-orange-500'} text-white border-none rounded-lg cursor-pointer text-sm font-medium flex flex-col items-center gap-1 min-h-11 hover:opacity-90 transition-colors`}
            >
              <span className="text-xs sm:text-sm">📊 {showAnalytics ? 'Скрыть' : 'Аналитика'}</span>
              <span className="text-xs opacity-80">—</span>
            </button>
          )}

          {(userRole === 'super_admin' || userRole === 'api_admin') && (
            <button 
              onClick={() => setShowApiManagement(!showApiManagement)}
              className={`p-3 sm:p-4 ${showApiManagement ? 'bg-indigo-500' : 'bg-cyan-500'} text-white border-none rounded-lg cursor-pointer text-sm font-medium flex flex-col items-center gap-1 min-h-11 hover:opacity-90 transition-colors`}
            >
              <span className="text-xs sm:text-sm">🔗 {showApiManagement ? 'Скрыть' : 'API'}</span>
              <span className="text-xs opacity-80">—</span>
            </button>
          )}

          {(userRole === 'super_admin' || userRole === 'finance_admin') && (
            <button 
              onClick={() => setShowSubscriptionPlans(!showSubscriptionPlans)}
              className={`p-3 sm:p-4 ${showSubscriptionPlans ? 'bg-indigo-500' : 'bg-green-500'} text-white border-none rounded-lg cursor-pointer text-sm font-medium flex flex-col items-center gap-1 min-h-11 hover:opacity-90 transition-colors`}
            >
              <span className="text-xs sm:text-sm">💳 {showSubscriptionPlans ? 'Скрыть' : 'Подписки'}</span>
              <span className="text-xs opacity-80">—</span>
            </button>
          )}

          {(userRole === 'super_admin' || userRole === 'finance_admin') && (
            <button 
              onClick={() => setShowPaymentSystems(!showPaymentSystems)}
              className={`p-3 sm:p-4 ${showPaymentSystems ? 'bg-indigo-500' : 'bg-pink-500'} text-white border-none rounded-lg cursor-pointer text-sm font-medium flex flex-col items-center gap-1 min-h-11 hover:opacity-90 transition-colors`}
            >
              <span className="text-xs sm:text-sm">💰 {showPaymentSystems ? 'Скрыть' : 'Платежи'}</span>
              <span className="text-xs opacity-80">—</span>
            </button>
          )}

          {(userRole === 'super_admin' || userRole === 'devops_admin') && (
            <button 
              onClick={() => setShowRecordings(!showRecordings)}
              className={`p-3 sm:p-4 ${showRecordings ? 'bg-indigo-500' : 'bg-red-500'} text-white border-none rounded-lg cursor-pointer text-sm font-medium flex flex-col items-center gap-1 min-h-11 hover:opacity-90 transition-colors`}
            >
              <span className="text-xs sm:text-sm">📹 {showRecordings ? 'Скрыть' : 'Записи'}</span>
              <span className="text-xs opacity-80">—</span>
            </button>
          )}
        </div>
      </div>

      {showUsersSection && (
        <UsersSection 
          isVisible={true}
          userRole={userRole}
          isLoading={false}
        />
      )}

      <CoursesManagement 
        isVisible={showCoursesManagement}
        userRole={userRole}
      />

      <PlatformsManagement 
        isVisible={showPlatformsManagement}
        userRole={userRole}
      />

      <AnalyticsSection 
        isVisible={showAnalytics}
        userRole={userRole}
      />

      <SubscriptionPlansManagement 
        isVisible={showSubscriptionPlans}
      />

      <PaymentSystemsManagement 
        isVisible={showPaymentSystems}
        userRole={userRole}
      />

      {showRecordings && (
        <AdminRecordingDashboard />
      )}

      {/* Управление API */}
      {showApiManagement && (
        <ApiManagement 
          isVisible={true}
        />
      )}
    </div>
  );
}

export default AdminPanel;
