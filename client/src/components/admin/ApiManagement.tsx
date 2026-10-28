import { useState, useEffect } from 'react';

function RecordingWorkerStatusCard() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/recording/monitor/worker-status', {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        });
        if (response.ok) {
          const data = await response.json();
          setStatus(data);
        }
      } catch (error) {
        console.error('Error fetching worker status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const worker = status?.workers?.[0];
  const isOnline = worker?.isOnline;

  return (
    <div style={{ padding: '15px', backgroundColor: '#f1f8e9', borderRadius: '8px', border: '1px solid #dcedc8' }}>
      <h4 style={{ margin: '0 0 10px 0', color: '#33691e', display: 'flex', alignItems: 'center', gap: '8px' }}>
        🎥 Recording Worker
      </h4>
      <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span>Статус:</span>
          <span style={{ color: isOnline ? '#28a745' : '#dc3545', fontWeight: 'bold' }}>
            {loading ? '⏳ Загрузка...' : isOnline ? '✅ Онлайн' : '❌ Офлайн'}
          </span>
        </div>
        {worker && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span>ID воркера:</span>
              <span style={{ fontWeight: '500' }}>{worker.workerId}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span>БД / S3:</span>
              <span style={{ fontWeight: '500' }}>
                {worker.dbConnected ? '✅' : '❌'} / {worker.s3Connected ? '✅' : '❌'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span>Задач в работе:</span>
              <span style={{ color: worker.activeTaskId ? '#1976d2' : 'inherit', fontWeight: 'bold' }}>
                {worker.activeTaskId ? '⏺️ Записывает' : '💤 Ожидание'}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('accessToken')}` });
const row = { display: 'flex', justifyContent: 'space-between', marginBottom: '5px' } as const;

/** Подключены ли платёжные системы — по настройкам сервера (/api/admin/payment-systems) */
function PaymentSystemsStatusCard() {
  const [systems, setSystems] = useState<Array<{ code: string; name: string; isConfigured: boolean }> | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    fetch('/api/admin/payment-systems', { headers: authHeaders() })
      .then(async (r) => {
        if (r.status === 403) { setDenied(true); return; }
        if (r.ok) setSystems((await r.json()).systems ?? []);
      })
      .catch((error) => console.error('Error fetching payment systems:', error));
  }, []);

  // раздел платежей виден только super_admin и finance_admin
  if (denied) return null;

  return (
    <div style={{ padding: '15px', backgroundColor: '#f3e5f5', borderRadius: '8px', border: '1px solid #e1bee7' }}>
      <h4 style={{ margin: '0 0 10px 0', color: '#7b1fa2', display: 'flex', alignItems: 'center', gap: '8px' }}>
        💳 Платёжные системы
      </h4>
      <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
        {!systems && <div>⏳ Загрузка...</div>}
        {systems?.map((s) => (
          <div key={s.code} style={row}>
            <span>{s.name}:</span>
            <span style={{ color: s.isConfigured ? '#28a745' : '#6c757d', fontWeight: 'bold' }}>
              {s.isConfigured ? '✅ Подключена' : '— Не настроена'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const formatUptime = (ms: number) => {
  const min = Math.floor(ms / 60000);
  const days = Math.floor(min / 1440);
  const hours = Math.floor((min % 1440) / 60);
  return days > 0 ? `${days} дн. ${hours} ч` : hours > 0 ? `${hours} ч ${min % 60} мин` : `${min} мин`;
};

/** Работа сервера с последнего запуска — метрики процесса (/api/admin/system/health) */
function ServerStatsCard() {
  const [stats, setStats] = useState<{ uptime: number; totalRequests: number; averageResponseTime: number; errorRate: number } | null>(null);

  useEffect(() => {
    const load = () =>
      fetch('/api/admin/system/health', { headers: authHeaders() })
        .then(async (r) => { if (r.ok) setStats((await r.json()).detailed ?? null); })
        .catch((error) => console.error('Error fetching server stats:', error));
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '15px', backgroundColor: '#e8f5e8', borderRadius: '8px', border: '1px solid #c8e6c9' }}>
      <h4 style={{ margin: '0 0 10px 0', color: '#2e7d32', display: 'flex', alignItems: 'center', gap: '8px' }}>
        📈 Сервер с последнего запуска
      </h4>
      <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
        {!stats ? <div>⏳ Загрузка...</div> : (
          <>
            <div style={row}><span>Работает:</span><span style={{ fontWeight: 'bold' }}>{formatUptime(stats.uptime)}</span></div>
            <div style={row}><span>Запросов:</span><span style={{ fontWeight: 'bold' }}>{stats.totalRequests.toLocaleString('ru-RU')}</span></div>
            <div style={row}>
              <span>Ошибок:</span>
              <span style={{ color: stats.errorRate > 0 ? '#dc3545' : '#28a745', fontWeight: 'bold' }}>{stats.errorRate.toFixed(1)}%</span>
            </div>
            <div style={row}><span>Среднее время ответа:</span><span style={{ fontWeight: 'bold' }}>{Math.round(stats.averageResponseTime)} мс</span></div>
          </>
        )}
      </div>
    </div>
  );
}

interface ApiManagementProps {
  isVisible: boolean;
}

export function ApiManagement({ isVisible }: ApiManagementProps) {
  if (!isVisible) return null;

  return (
    <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', border: '1px solid #e9ecef', marginBottom: '20px' }}>
      <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>🔗 Состояние сервисов</h2>
      
      {/* Статус API */}
      <div style={{ marginBottom: '25px' }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>📊 Статус подключений</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
          
          {/* Платёжные системы и работа сервера — настоящие данные */}
          <PaymentSystemsStatusCard />
          <ServerStatsCard />

          {/* Состояние Recording Worker */}
          <RecordingWorkerStatusCard />
        </div>
      </div>
    </div>
  );
}