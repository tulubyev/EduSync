interface SystemAlerts {
  summary: {
    total: number;
    high: number;
    medium: number;
  };
}

interface AdminDashboardStatsProps {
  pendingDocsCount: number;
  archivedDocsCount: number;
  systemAlerts: SystemAlerts | null;
  isLoadingDocs: boolean;
  isLoadingArchive: boolean;
}

export function AdminDashboardStats({ 
  pendingDocsCount, 
  archivedDocsCount, 
  systemAlerts,
  isLoadingDocs,
  isLoadingArchive 
}: AdminDashboardStatsProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '20px' }}>
      <div style={{ backgroundColor: '#fff3cd', padding: '20px', borderRadius: '8px', border: '1px solid #ffeeba' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#856404' }}>👥 Пользователи</h3>
        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#856404' }}>1,234</div>
        <p style={{ color: '#856404', fontSize: '14px', margin: 0 }}>Активных</p>
      </div>

      <div style={{ backgroundColor: '#d1ecf1', padding: '20px', borderRadius: '8px', border: '1px solid #bee5eb' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#0c5460' }}>💳 Транзакции</h3>
        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#0c5460' }}>₽15.2М</div>
        <p style={{ color: '#0c5460', fontSize: '14px', margin: 0 }}>За сегодня</p>
      </div>

      <div style={{ backgroundColor: '#d4edda', padding: '20px', borderRadius: '8px', border: '1px solid #c3e6cb' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#155724' }}>🏦 Банки</h3>
        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#155724' }}>12</div>
        <p style={{ color: '#155724', fontSize: '14px', margin: 0 }}>Подключенных банков</p>
      </div>

      <div style={{ backgroundColor: '#f8d7da', padding: '20px', borderRadius: '8px', border: '1px solid #f5c6cb' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#721c24' }}>⚠️ Активные алерты</h3>
        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#721c24' }}>
          {systemAlerts ? systemAlerts.summary.total : '...'}
        </div>
        <p style={{ color: '#721c24', fontSize: '14px', margin: 0 }}>
          {systemAlerts && systemAlerts.summary.high > 0 ? 
            `${systemAlerts.summary.high} критичных` : 
            'Требуют внимания'
          }
        </p>
      </div>

      <div style={{ backgroundColor: '#e2e3f3', padding: '20px', borderRadius: '8px', border: '1px solid #c2c5e8' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#4c5267' }}>📄 Документы на модерацию</h3>
        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4c5267' }}>
          {isLoadingDocs ? '...' : pendingDocsCount}
        </div>
        <p style={{ color: '#4c5267', fontSize: '14px', margin: 0 }}>Требуют проверки</p>
      </div>

      <div style={{ backgroundColor: '#e8f4f8', padding: '20px', borderRadius: '8px', border: '1px solid #b3d9e6' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#2c5866' }}>🗃️ Архив документов</h3>
        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2c5866' }}>
          {isLoadingArchive ? '...' : archivedDocsCount}
        </div>
        <p style={{ color: '#2c5866', fontSize: '14px', margin: 0 }}>Обработанных документов</p>
      </div>
    </div>
  );
}
