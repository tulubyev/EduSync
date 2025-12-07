import { useState } from 'react';
import { ApiKeysModal } from './modals/ApiKeysModal';
import { SyncModal } from './modals/SyncModal'; 
import { WebhooksModal } from './modals/WebhooksModal';
import { SecurityModal } from './modals/SecurityModal';
import { ApiManagement } from './admin/ApiManagement';
import { UsersSection } from './admin/UsersSection';
import { CoursesManagement } from './admin/CoursesManagement';
import { PlatformsManagement } from './admin/PlatformsManagement';
import { AnalyticsSection } from './admin/AnalyticsSection';
import { SubscriptionPlansManagement } from './admin/SubscriptionPlansManagement';
import { PaymentSystemsManagement } from './admin/PaymentSystemsManagement';

// AdminPanel component for administrators
function AdminPanel({ user, onBack }: any) {
  const [showUsersSection, setShowUsersSection] = useState(false);
  const [showCoursesManagement, setShowCoursesManagement] = useState(false);
  const [showPlatformsManagement, setShowPlatformsManagement] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showApiManagement, setShowApiManagement] = useState(false);
  const [showSubscriptionPlans, setShowSubscriptionPlans] = useState(false);
  const [showPaymentSystems, setShowPaymentSystems] = useState(false);
  const [showApiKeysModal, setShowApiKeysModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showWebhooksModal, setShowWebhooksModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);

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

  const userRole = user.adminRole || 'super_admin';

  return (
    <div style={{ padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ margin: '0 0 10px 0', color: '#333' }}>📚 My EPA - Админ-панель</h1>
          <p style={{ color: '#666', margin: 0 }}>
            Агрегатор образовательных программ | Роль: <span style={{ 
              backgroundColor: '#667eea', 
              color: 'white', 
              padding: '4px 8px', 
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              {adminRoles[userRole]}
            </span>
          </p>
        </div>
        <button 
          onClick={onBack}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#6c757d', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          ← Пользовательский дашборд
        </button>
      </div>

      {/* Доступные функции и Быстрые действия */}
      <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', border: '1px solid #e9ecef', marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 15px 0', color: '#333' }}>Доступные функции для вашей роли</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
          {adminPermissions[userRole].map((permission, idx) => (
            <span key={idx} style={{
              backgroundColor: '#007bff',
              color: 'white',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '14px'
            }}>
              {permission}
            </span>
          ))}
        </div>

        <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>Быстрые действия</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          {(userRole === 'super_admin' || userRole === 'analytics_admin') && (
            <button 
              onClick={() => setShowUsersSection(!showUsersSection)}
              style={{ 
                padding: '15px 20px', 
                backgroundColor: showUsersSection ? '#667eea' : '#667eea', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>👥 {showUsersSection ? 'Скрыть пользователей' : 'Пользователи'}</span>
              <span style={{ fontSize: '11px', opacity: 0.8 }}>—</span>
            </button>
          )}
          
          {(userRole === 'super_admin' || userRole === 'analytics_admin') && (
            <button 
              onClick={() => setShowCoursesManagement(!showCoursesManagement)}
              style={{ 
                padding: '15px 20px', 
                backgroundColor: showCoursesManagement ? '#667eea' : '#764ba2', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>📖 {showCoursesManagement ? 'Скрыть курсы' : 'Курсы'}</span>
              <span style={{ fontSize: '11px', opacity: 0.8 }}>111</span>
            </button>
          )}
          
          {(userRole === 'super_admin' || userRole === 'analytics_admin') && (
            <button 
              onClick={() => setShowPlatformsManagement(!showPlatformsManagement)}
              style={{ 
                padding: '15px 20px', 
                backgroundColor: showPlatformsManagement ? '#667eea' : '#1abc9c', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>🌐 {showPlatformsManagement ? 'Скрыть платформы' : 'Платформы'}</span>
              <span style={{ fontSize: '11px', opacity: 0.8 }}>8+</span>
            </button>
          )}

          {(userRole === 'super_admin' || userRole === 'analytics_admin') && (
            <button 
              onClick={() => setShowAnalytics(!showAnalytics)}
              style={{ 
                padding: '15px 20px', 
                backgroundColor: showAnalytics ? '#667eea' : '#f39c12', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>📊 {showAnalytics ? 'Скрыть аналитику' : 'Аналитика'}</span>
              <span style={{ fontSize: '11px', opacity: 0.8 }}>4</span>
            </button>
          )}

          {(userRole === 'super_admin' || userRole === 'finance_admin') && (
            <button 
              onClick={() => setShowSubscriptionPlans(!showSubscriptionPlans)}
              style={{ 
                padding: '15px 20px', 
                backgroundColor: showSubscriptionPlans ? '#667eea' : '#9b59b6', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>💳 {showSubscriptionPlans ? 'Скрыть подписки' : 'Подписки'}</span>
              <span style={{ fontSize: '11px', opacity: 0.8 }}>3</span>
            </button>
          )}

          {(userRole === 'super_admin' || userRole === 'finance_admin') && (
            <button 
              onClick={() => setShowPaymentSystems(!showPaymentSystems)}
              style={{ 
                padding: '15px 20px', 
                backgroundColor: showPaymentSystems ? '#667eea' : '#27ae60', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>🏦 {showPaymentSystems ? 'Скрыть платежи' : 'Платежные системы'}</span>
              <span style={{ fontSize: '11px', opacity: 0.8 }}>2</span>
            </button>
          )}
          
        </div>
      </div>

      {showUsersSection && (
        <UsersSection 
          isVisible={true}
          userRole={userRole}
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

      {/* Управление API */}
      {showApiManagement && (
        <ApiManagement 
          isVisible={true}
          onShowApiKeys={() => setShowApiKeysModal(true)}
          onShowSync={() => setShowSyncModal(true)}
          onShowWebhooks={() => setShowWebhooksModal(true)}
          onShowSecurity={() => setShowSecurityModal(true)}
        />
      )}

      {/* Модальные окна для управления API */}
      <ApiKeysModal isOpen={showApiKeysModal} onClose={() => setShowApiKeysModal(false)} />
      <SyncModal isOpen={showSyncModal} onClose={() => setShowSyncModal(false)} />
      <WebhooksModal isOpen={showWebhooksModal} onClose={() => setShowWebhooksModal(false)} />
      <SecurityModal isOpen={showSecurityModal} onClose={() => setShowSecurityModal(false)} />

      <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', border: '1px solid #e9ecef' }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>Системная информация</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <strong>Версия системы:</strong><br />
            <span style={{ color: '#666' }}>v2.1.3 (Стабильная)</span>
          </div>
          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <strong>Время работы:</strong><br />
            <span style={{ color: '#666' }}>47 дней, 12 часов</span>
          </div>
          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <strong>Последнее обновление:</strong><br />
            <span style={{ color: '#666' }}>28.12.2024 14:30</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;
