import { useState, useEffect } from 'react';
import { Users, Book, Globe, Crown } from 'lucide-react';

interface UsersSectionProps {
  isVisible: boolean;
  userRole: string;
  isLoading: boolean;
  onRefresh?: () => void;
}

export function UsersSection({ isVisible, userRole, isLoading, onRefresh }: UsersSectionProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'premium'>('all');
  
  if (!isVisible) return null;

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const response = await fetch('/api/admin/users/detailed/all?page=1&limit=50', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(fetchUsers, 30000);
    return () => clearInterval(interval);
  }, []);

  const getSubscriptionBadge = (subscription: string) => {
    const badges: { [key: string]: { bg: string; text: string; label: string } } = {
      'premium': { bg: '#fff3cd', text: '#856404', label: 'Premium' },
      'pro': { bg: '#d4edff', text: '#084298', label: 'Pro' },
      'free': { bg: '#f8f9fa', text: '#6c757d', label: 'Free' }
    };
    const badge = badges[subscription] || badges['free'];
    return { ...badge };
  };

  const filteredUsers = users.filter((user: any) => {
    if (filter === 'premium') return user.subscription !== 'free';
    if (filter === 'active') return user.enrolledCourses > 0;
    return true;
  });

  const stats = {
    total: users.length,
    premium: users.filter((u: any) => u.subscription !== 'free').length,
    active: users.filter((u: any) => u.enrolledCourses > 0).length
  };

  return (
    <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', border: '1px solid #e9ecef', marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: '#333' }}>👥 Пользователи</h2>
        <button
          onClick={fetchUsers}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          🔄 Обновить
        </button>
      </div>

      {/* Statistics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '20px' }}>
        <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Всего пользователей</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>{stats.total}</div>
        </div>
        <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Premium подписчики</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffc107' }}>{stats.premium}</div>
        </div>
        <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Активные пользователи</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>{stats.active}</div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {['all', 'active', 'premium'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            style={{
              padding: '8px 16px',
              backgroundColor: filter === f ? '#007bff' : '#f8f9fa',
              color: filter === f ? 'white' : '#333',
              border: `1px solid ${filter === f ? '#007bff' : '#e9ecef'}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {f === 'all' ? 'Все' : f === 'active' ? 'Активные' : 'Premium'}
          </button>
        ))}
      </div>

      {/* Users List */}
      {isLoadingUsers ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          Загрузка пользователей...
        </div>
      ) : filteredUsers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          Пользователи не найдены
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e9ecef' }}>
                <th style={{ padding: '12px', textAlign: 'left', color: '#333', fontSize: '14px', fontWeight: '600' }}>Имя</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#333', fontSize: '14px', fontWeight: '600' }}>Email</th>
                <th style={{ padding: '12px', textAlign: 'center', color: '#333', fontSize: '14px', fontWeight: '600' }}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                    <Book size={16} /> Курсы
                  </span>
                </th>
                <th style={{ padding: '12px', textAlign: 'center', color: '#333', fontSize: '14px', fontWeight: '600' }}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                    <Globe size={16} /> Платформы
                  </span>
                </th>
                <th style={{ padding: '12px', textAlign: 'center', color: '#333', fontSize: '14px', fontWeight: '600' }}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                    <Crown size={16} /> Подписка
                  </span>
                </th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#333', fontSize: '14px', fontWeight: '600' }}>Присоединился</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user: any, idx: number) => {
                const subBadge = getSubscriptionBadge(user.subscription);
                return (
                  <tr key={user.id} style={{ borderBottom: '1px solid #e9ecef', backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                    <td style={{ padding: '12px', color: '#333', fontSize: '14px', fontWeight: '500' }}>
                      {user.firstName} {user.lastName}
                    </td>
                    <td style={{ padding: '12px', color: '#666', fontSize: '14px' }}>{user.email}</td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#333', fontWeight: '500' }}>
                      {user.enrolledCourses}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#333', fontWeight: '500' }}>
                      {user.connectedPlatforms}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          backgroundColor: subBadge.bg,
                          color: subBadge.text,
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}
                      >
                        {subBadge.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: '#666', fontSize: '14px' }}>
                      {user.joinedDate ? new Date(user.joinedDate).toLocaleDateString('ru-RU') : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
