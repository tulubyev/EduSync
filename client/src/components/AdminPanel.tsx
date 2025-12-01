import { useState, useEffect } from 'react';
import { ApiKeysModal } from './modals/ApiKeysModal';
import { SyncModal } from './modals/SyncModal'; 
import { WebhooksModal } from './modals/WebhooksModal';
import { SecurityModal } from './modals/SecurityModal';
import { AdminDashboardStats } from './admin/AdminDashboardStats';
import { PendingDocumentsList } from './admin/PendingDocumentsList';
import { UserManagement } from './admin/UserManagement';
import { DocumentArchive } from './admin/DocumentArchive';
import { SystemMonitoring } from './admin/SystemMonitoring';
import { ApiManagement } from './admin/ApiManagement';
import { UsersSection } from './admin/UsersSection';

// AdminPanel component for administrators
function AdminPanel({ user, onBack }: any) {
  const [pendingDocuments, setPendingDocuments] = useState([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showUsersSection, setShowUsersSection] = useState(false);
  const [showDocumentArchive, setShowDocumentArchive] = useState(false);
  const [showSystemMonitoring, setShowSystemMonitoring] = useState(false);
  const [showApiManagement, setShowApiManagement] = useState(false);
  const [showApiKeysModal, setShowApiKeysModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showWebhooksModal, setShowWebhooksModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [archivedDocuments, setArchivedDocuments] = useState([]);
  const [isLoadingArchive, setIsLoadingArchive] = useState(false);
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [systemMetrics, setSystemMetrics] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [systemLogs, setSystemLogs] = useState([]);
  const [isLoadingSystem, setIsLoadingSystem] = useState(false);
  
  // Новые состояния для продвинутого мониторинга (аккуратно добавляем)
  const [systemAlerts, setSystemAlerts] = useState(null);
  const [realTimeMetrics, setRealTimeMetrics] = useState(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date());
  
  // Загружаем документы на модерацию
  useEffect(() => {
    const fetchPendingDocuments = async () => {
      try {
        const response = await fetch('/api/admin/documents/pending', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        });
        if (response.ok) {
          const docs = await response.json();
          setPendingDocuments(docs);
        } else if (response.status === 403 || response.status === 401) {
          // Токен истек - выходим из админ панели
          console.log('Токен истек, требуется повторная авторизация');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('currentUser');
          onBack(); // Выходим из админ панели
          return; // Прерываем выполнение
        }
      } catch (error) {
        console.error('Ошибка загрузки документов на модерацию:', error);
      } finally {
        setIsLoadingDocs(false);
      }
    };

    fetchPendingDocuments();
    // Обновляем каждые 30 секунд
    const interval = setInterval(fetchPendingDocuments, 30000);
    return () => clearInterval(interval);
  }, []);

  // Автоматическое обновление системного мониторинга (аккуратно добавляем)
  useEffect(() => {
    if (showSystemMonitoring) {
      // Обновляем каждые 10 секунд при открытом мониторинге
      const interval = setInterval(fetchSystemData, 10000);
      return () => clearInterval(interval);
    }
  }, [showSystemMonitoring]);

  // Функция для обновления статуса документа
  const updateDocumentStatus = async (docId: string, status: string, reason?: string) => {
    try {
      const response = await fetch(`/api/documents/${docId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          status,
          changeReason: reason,
          verificationNotes: status === 'verified' ? 'Утверждено администратором' : 'Отклонено администратором'
        })
      });

      if (response.ok) {
        // Обновляем список документов
        setPendingDocuments(prev => prev.filter((doc: any) => doc.id !== docId));
        return true;
      } else {
        console.error('Ошибка обновления статуса документа');
        return false;
      }
    } catch (error) {
      console.error('Ошибка при обновлении документа:', error);
      return false;
    }
  };

  // Функция для загрузки пользователей
  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const response = await fetch('/api/admin/users?page=1&limit=50', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      } else {
        console.error('Ошибка загрузки пользователей:', response.status);
      }
    } catch (error) {
      console.error('Ошибка при загрузке пользователей:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Функция для загрузки архивных документов
  const fetchArchivedDocuments = async () => {
    setIsLoadingArchive(true);
    try {
      const response = await fetch('/api/admin/documents/archived', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (response.ok) {
        const docs = await response.json();
        setArchivedDocuments(docs);
      } else if (response.status === 403 || response.status === 401) {
        // Токен истек - выходим из админ панели  
        console.log('Токен истек, требуется повторная авторизация');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('currentUser');
        onBack(); // Выходим из админ панели
        return;
      } else {
        console.error('Ошибка загрузки архивных документов:', response.status);
      }
    } catch (error) {
      console.error('Ошибка при загрузке архивных документов:', error);
    } finally {
      setIsLoadingArchive(false);
    }
  };

  // Функция для загрузки системных метрик (расширенная версия)
  const fetchSystemData = async () => {
    setIsLoadingSystem(true);
    try {
      const [metricsResponse, healthResponse, logsResponse, alertsResponse, realtimeResponse] = await Promise.all([
        fetch('/api/admin/system/metrics', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
        }),
        fetch('/api/admin/system/health', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
        }),
        fetch('/api/admin/system/logs?limit=50', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
        }),
        // Новые endpoints для продвинутого мониторинга
        fetch('/api/admin/monitoring/alerts', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
        }),
        fetch('/api/admin/monitoring/realtime', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
        })
      ]);

      // Существующие данные (сохраняем совместимость)
      if (metricsResponse.ok) {
        const metrics = await metricsResponse.json();
        setSystemMetrics(metrics);
      }
      
      if (healthResponse.ok) {
        const health = await healthResponse.json();
        setSystemHealth(health);
      }
      
      if (logsResponse.ok) {
        const logs = await logsResponse.json();
        setSystemLogs(logs);
      }

      // Новые данные для продвинутого мониторинга
      if (alertsResponse.ok) {
        const alerts = await alertsResponse.json();
        setSystemAlerts(alerts);
      }

      if (realtimeResponse.ok) {
        const realtime = await realtimeResponse.json();
        setRealTimeMetrics(realtime);
      }

      setLastUpdateTime(new Date());
    } catch (error) {
      console.error('Ошибка при загрузке системных данных:', error);
    } finally {
      setIsLoadingSystem(false);
    }
  };

  const adminRoles = {
    super_admin: 'Супер Администратор',
    devops_admin: 'DevOps Администратор', 
    analytics_admin: 'Аналитический Администратор',
    finance_admin: 'Финансовый Администратор',
    api_admin: 'API Администратор',
    security_admin: 'Администратор Безопасности'
  };

  const adminPermissions = {
    super_admin: ['Все разделы', 'Управление курсами', 'Управление платформами', 'Пользователи'],
    devops_admin: ['Мониторинг системы', 'Производительность', 'Логи системы'],
    analytics_admin: ['Просмотр пользователей', 'Просмотр курсов', 'Просмотр платформ', 'Аналитика'],
    finance_admin: ['Просмотр подписок', 'Финансовые отчеты'],
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

      {/* My EPA Dashboard Statistics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
        <div style={{ padding: '20px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e9ecef', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>Пользователей</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#667eea' }}>—</div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>из внешних источников</div>
        </div>
        <div style={{ padding: '20px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e9ecef', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>Курсов</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#764ba2' }}>111</div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>в базе (9 категорий)</div>
        </div>
        <div style={{ padding: '20px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e9ecef', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>Платформ</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1abc9c' }}>8+</div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>интегрировано</div>
        </div>
        <div style={{ padding: '20px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e9ecef', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>Регионы</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f39c12' }}>4</div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>географических</div>
        </div>
      </div>

      {showUsersSection && (
        <UsersSection 
          isVisible={true}
          userRole={userRole}
          isLoading={isLoadingUsers}
        />
      )}

      {showUserManagement && (
        <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', border: '1px solid #e9ecef', marginBottom: '20px' }}>
          <h2 style={{ margin: '0 0 15px 0', color: '#333' }}>📖 Управление курсами</h2>
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            Компонент управления курсами (в разработке)
          </div>
        </div>
      )}

      {showDocumentArchive && (
        <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', border: '1px solid #e9ecef', marginBottom: '20px' }}>
          <h2 style={{ margin: '0 0 15px 0', color: '#333' }}>🌐 Управление платформами</h2>
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            Компонент управления платформами (в разработке)
          </div>
        </div>
      )}

      {/* Системный мониторинг */}
      {showSystemMonitoring && (
        <SystemMonitoring 
          isVisible={true}
          systemHealth={systemHealth}
          systemAlerts={systemAlerts}
          systemMetrics={systemMetrics}
          systemLogs={systemLogs}
          realTimeMetrics={realTimeMetrics}
          lastUpdateTime={lastUpdateTime}
          isLoading={isLoadingSystem}
        />
      )}

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
                fontWeight: '500'
              }}
            >
              👥 {showUsersSection ? 'Скрыть пользователей' : 'Пользователи'}
            </button>
          )}
          
          {(userRole === 'super_admin' || userRole === 'analytics_admin') && (
            <button 
              onClick={() => setShowUserManagement(!showUserManagement)}
              style={{ 
                padding: '15px 20px', 
                backgroundColor: showUserManagement ? '#764ba2' : '#764ba2', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              📖 {showUserManagement ? 'Скрыть курсы' : 'Курсы'}
            </button>
          )}
          
          {(userRole === 'super_admin' || userRole === 'analytics_admin') && (
            <button 
              onClick={() => setShowDocumentArchive(!showDocumentArchive)}
              style={{ 
                padding: '15px 20px', 
                backgroundColor: showDocumentArchive ? '#1abc9c' : '#1abc9c', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              🌐 {showDocumentArchive ? 'Скрыть платформы' : 'Платформы'}
            </button>
          )}
          
          {(userRole === 'super_admin' || userRole === 'devops_admin') && (
            <button 
              onClick={() => {
                setShowSystemMonitoring(!showSystemMonitoring);
                if (!showSystemMonitoring) {
                  fetchSystemData();
                }
              }}
              style={{ 
                padding: '15px 20px', 
                backgroundColor: showSystemMonitoring ? '#6c757d' : '#6c757d', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              🔧 {showSystemMonitoring ? 'Скрыть мониторинг' : 'Системный мониторинг'}
            </button>
          )}
        </div>
      </div>

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
