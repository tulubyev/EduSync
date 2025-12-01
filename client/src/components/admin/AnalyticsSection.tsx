import { BarChart3 } from 'lucide-react';

interface AnalyticsSectionProps {
  isVisible: boolean;
  userRole: string;
}

export function AnalyticsSection({ isVisible, userRole }: AnalyticsSectionProps) {
  if (!isVisible) return null;

  return (
    <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', border: '1px solid #e9ecef', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
        <BarChart3 size={24} color="#f39c12" />
        <h2 style={{ margin: 0, color: '#333' }}>Аналитика</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '20px' }}>
        <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>Активных пользователей</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#667eea', marginBottom: '5px' }}>—</div>
          <div style={{ fontSize: '12px', color: '#999' }}>за последние 30 дней</div>
        </div>

        <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>Курсов просмотрено</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#764ba2', marginBottom: '5px' }}>—</div>
          <div style={{ fontSize: '12px', color: '#999' }}>всего</div>
        </div>

        <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>Средняя активность</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1abc9c', marginBottom: '5px' }}>—</div>
          <div style={{ fontSize: '12px', color: '#999' }}>в сутки</div>
        </div>

        <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>Платформы популярны</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f39c12', marginBottom: '5px' }}>—</div>
          <div style={{ fontSize: '12px', color: '#999' }}>среди пользователей</div>
        </div>
      </div>

      <div style={{ padding: '20px', backgroundColor: '#f0f7ff', borderRadius: '8px', textAlign: 'center' }}>
        <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
          📊 Детальные графики и отчеты будут добавлены в следующей версии
        </div>
        <button
          style={{
            padding: '10px 20px',
            backgroundColor: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          Экспортировать отчёт
        </button>
      </div>
    </div>
  );
}
