import { Globe } from 'lucide-react';

interface PlatformsManagementProps {
  isVisible: boolean;
  userRole: string;
}

export function PlatformsManagement({ isVisible, userRole }: PlatformsManagementProps) {
  if (!isVisible) return null;

  const platforms = [
    { name: 'Coursera', icon: '🎓', status: 'Активна' },
    { name: 'edX', icon: '📚', status: 'Активна' },
    { name: 'Udemy', icon: '🎯', status: 'Активна' },
    { name: 'Stepik', icon: '🇷🇺', status: 'Активна' },
    { name: 'FutureLearn', icon: '🌍', status: 'Активна' },
    { name: 'MasterClass', icon: '⭐', status: 'Активна' },
  ];

  return (
    <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', border: '1px solid #e9ecef', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
        <Globe size={24} color="#1abc9c" />
        <h2 style={{ margin: 0, color: '#333' }}>Управление платформами</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
        {platforms.map((platform, idx) => (
          <div
            key={idx}
            style={{
              padding: '15px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #e9ecef',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div>
              <div style={{ fontSize: '18px', marginBottom: '5px' }}>{platform.icon}</div>
              <div style={{ fontWeight: '500', color: '#333', marginBottom: '3px' }}>{platform.name}</div>
              <div style={{ fontSize: '12px', color: '#999' }}>{platform.status}</div>
            </div>
            <div style={{ display: 'flex', gap: '5px', flexDirection: 'column' }}>
              <button
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px'
                }}
              >
                ⚙️
              </button>
              <button
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#1abc9c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px'
                }}
              >
                🔄
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
        <div style={{ padding: '15px', backgroundColor: '#f0f7ff', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#667eea', marginBottom: '5px' }}>8+</div>
          <div style={{ fontSize: '13px', color: '#666' }}>Платформ интегрировано</div>
        </div>
        <div style={{ padding: '15px', backgroundColor: '#f0fff7', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1abc9c', marginBottom: '5px' }}>4</div>
          <div style={{ fontSize: '13px', color: '#666' }}>Региональных группы</div>
        </div>
      </div>

      <div style={{ padding: '15px', backgroundColor: '#fff9e6', borderRadius: '8px', fontSize: '13px', color: '#b8860b' }}>
        ⚠️ Синхронизация платформ осуществляется автоматически каждые 24 часа
      </div>

      {userRole === 'super_admin' && (
        <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
          <button
            style={{
              padding: '10px 16px',
              backgroundColor: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            ➕ Добавить платформу
          </button>
          <button
            style={{
              padding: '10px 16px',
              backgroundColor: '#1abc9c',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            🔄 Синхронизировать всё
          </button>
        </div>
      )}
    </div>
  );
}
