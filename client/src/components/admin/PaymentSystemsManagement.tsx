import { useState, useEffect } from 'react';
import { CreditCard, RefreshCw, CheckCircle, XCircle, AlertTriangle, TrendingUp, Calendar, DollarSign } from 'lucide-react';

interface PaymentSystemStatus {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  isConfigured: boolean;
  lastChecked: string | null;
  totalTransactions: number;
  totalAmount: number;
  successRate: number;
}

interface Transaction {
  id: string;
  paymentSystem: string;
  amount: number;
  status: string;
  createdAt: string;
  userId: string;
  userName: string;
  planName: string;
}

interface PaymentStats {
  totalRevenue: number;
  monthlyRevenue: number;
  weeklyRevenue: number;
  transactionCount: number;
  successfulPayments: number;
  failedPayments: number;
  pendingPayments: number;
}

interface Props {
  isVisible: boolean;
  userRole: string;
}

export function PaymentSystemsManagement({ isVisible, userRole }: Props) {
  const [paymentSystems, setPaymentSystems] = useState<PaymentSystemStatus[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'systems' | 'transactions' | 'stats'>('systems');
  const [dateFilter, setDateFilter] = useState<'week' | 'month' | 'year' | 'all'>('month');

  useEffect(() => {
    if (isVisible) {
      fetchPaymentData();
    }
  }, [isVisible, dateFilter]);

  const fetchPaymentData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      
      const [systemsRes, transactionsRes, statsRes] = await Promise.all([
        fetch('/api/admin/payment-systems', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/admin/payment-transactions?period=${dateFilter}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/admin/payment-stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (systemsRes.ok) {
        const data = await systemsRes.json();
        setPaymentSystems(data.systems || []);
      } else {
        console.error('Ошибка получения платежных систем:', systemsRes.status);
        setPaymentSystems([]);
      }

      if (transactionsRes.ok) {
        const data = await transactionsRes.json();
        setTransactions(data.transactions || []);
      } else {
        setTransactions([]);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      } else {
        console.error('Ошибка получения статистики платежей:', statsRes.status);
        setStats({
          totalRevenue: 0,
          monthlyRevenue: 0,
          weeklyRevenue: 0,
          transactionCount: 0,
          successfulPayments: 0,
          failedPayments: 0,
          pendingPayments: 0
        });
      }
    } catch (error) {
      console.error('Ошибка загрузки данных платежей:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      'success': { bg: '#d4edda', text: '#155724', label: 'Успешно' },
      'succeeded': { bg: '#d4edda', text: '#155724', label: 'Успешно' },
      'pending': { bg: '#fff3cd', text: '#856404', label: 'Ожидает' },
      'failed': { bg: '#f8d7da', text: '#721c24', label: 'Ошибка' },
      'canceled': { bg: '#e2e3e5', text: '#383d41', label: 'Отменён' }
    };
    return badges[status] || badges['pending'];
  };

  if (!isVisible) return null;

  return (
    <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', border: '1px solid #e9ecef', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CreditCard size={24} color="#764ba2" />
          <h2 style={{ margin: 0, color: '#333' }}>Платежные системы</h2>
        </div>
        <button
          onClick={fetchPaymentData}
          disabled={isLoading}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
          Обновить
        </button>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #e9ecef', paddingBottom: '15px' }}>
        {[
          { id: 'systems', label: 'Платежные системы', icon: <CreditCard size={16} /> },
          { id: 'transactions', label: 'Транзакции', icon: <DollarSign size={16} /> },
          { id: 'stats', label: 'Статистика', icon: <TrendingUp size={16} /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '10px 20px',
              backgroundColor: activeTab === tab.id ? '#764ba2' : '#f8f9fa',
              color: activeTab === tab.id ? 'white' : '#333',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: activeTab === tab.id ? '600' : '400'
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '25px' }}>
          <div style={{ backgroundColor: '#e8f5e9', padding: '20px', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#2e7d32', marginBottom: '5px' }}>Всего поступлений</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1b5e20' }}>{formatCurrency(stats.totalRevenue)}</div>
          </div>
          <div style={{ backgroundColor: '#e3f2fd', padding: '20px', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#1565c0', marginBottom: '5px' }}>За месяц</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0d47a1' }}>{formatCurrency(stats.monthlyRevenue)}</div>
          </div>
          <div style={{ backgroundColor: '#fff3e0', padding: '20px', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#e65100', marginBottom: '5px' }}>За неделю</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#bf360c' }}>{formatCurrency(stats.weeklyRevenue)}</div>
          </div>
          <div style={{ backgroundColor: '#f3e5f5', padding: '20px', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#7b1fa2', marginBottom: '5px' }}>Транзакций</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4a148c' }}>{stats.transactionCount}</div>
          </div>
        </div>
      )}

      {activeTab === 'systems' && (
        <div style={{ display: 'grid', gap: '15px' }}>
          {paymentSystems.map((system) => (
            <div
              key={system.id}
              style={{
                backgroundColor: '#f8f9fa',
                padding: '20px',
                borderRadius: '8px',
                border: '1px solid #e9ecef',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '10px',
                  backgroundColor: system.isActive ? '#d4edda' : '#f8d7da',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {system.isActive ? (
                    <CheckCircle size={24} color="#155724" />
                  ) : (
                    <XCircle size={24} color="#721c24" />
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#333' }}>{system.name}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {system.isConfigured ? 'Настроен' : 'Требуется настройка'} | 
                    Последняя проверка: {system.lastChecked ? new Date(system.lastChecked).toLocaleString('ru-RU') : 'Н/Д'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#333' }}>{system.totalTransactions}</div>
                  <div style={{ fontSize: '11px', color: '#666' }}>транзакций</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1abc9c' }}>{formatCurrency(system.totalAmount)}</div>
                  <div style={{ fontSize: '11px', color: '#666' }}>сумма</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: system.successRate >= 90 ? '#28a745' : '#ffc107' }}>
                    {system.successRate}%
                  </div>
                  <div style={{ fontSize: '11px', color: '#666' }}>успешных</div>
                </div>
                <div style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  backgroundColor: system.isActive ? '#d4edda' : '#f8d7da',
                  color: system.isActive ? '#155724' : '#721c24',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  {system.isActive ? 'Активна' : 'Отключена'}
                </div>
              </div>
            </div>
          ))}

          {paymentSystems.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              Нет подключенных платежных систем
            </div>
          )}
        </div>
      )}

      {activeTab === 'transactions' && (
        <div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            {['week', 'month', 'year', 'all'].map((period) => (
              <button
                key={period}
                onClick={() => setDateFilter(period as any)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: dateFilter === period ? '#667eea' : '#f0f0f0',
                  color: dateFilter === period ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                {period === 'week' ? 'Неделя' : period === 'month' ? 'Месяц' : period === 'year' ? 'Год' : 'Все'}
              </button>
            ))}
          </div>

          {transactions.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e9ecef' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', color: '#666' }}>Дата</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', color: '#666' }}>Пользователь</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', color: '#666' }}>План</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', color: '#666' }}>Система</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', color: '#666' }}>Сумма</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', color: '#666' }}>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const badge = getStatusBadge(tx.status);
                    return (
                      <tr key={tx.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#333' }}>
                          {new Date(tx.createdAt).toLocaleString('ru-RU')}
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#333' }}>{tx.userName}</td>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#666' }}>{tx.planName}</td>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#666' }}>{tx.paymentSystem}</td>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#333', fontWeight: '600', textAlign: 'right' }}>
                          {formatCurrency(tx.amount)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 10px',
                            backgroundColor: badge.bg,
                            color: badge.text,
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '500'
                          }}>
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              Нет транзакций за выбранный период
            </div>
          )}
        </div>
      )}

      {activeTab === 'stats' && stats && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div style={{ backgroundColor: '#f8f9fa', padding: '25px', borderRadius: '10px', textAlign: 'center' }}>
              <CheckCircle size={40} color="#28a745" style={{ marginBottom: '10px' }} />
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#28a745' }}>{stats.successfulPayments}</div>
              <div style={{ fontSize: '14px', color: '#666' }}>Успешных платежей</div>
              <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
                {stats.transactionCount > 0 ? Math.round((stats.successfulPayments / stats.transactionCount) * 100) : 0}% от общего
              </div>
            </div>

            <div style={{ backgroundColor: '#f8f9fa', padding: '25px', borderRadius: '10px', textAlign: 'center' }}>
              <XCircle size={40} color="#dc3545" style={{ marginBottom: '10px' }} />
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#dc3545' }}>{stats.failedPayments}</div>
              <div style={{ fontSize: '14px', color: '#666' }}>Неуспешных</div>
              <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
                {stats.transactionCount > 0 ? Math.round((stats.failedPayments / stats.transactionCount) * 100) : 0}% от общего
              </div>
            </div>

            <div style={{ backgroundColor: '#f8f9fa', padding: '25px', borderRadius: '10px', textAlign: 'center' }}>
              <AlertTriangle size={40} color="#ffc107" style={{ marginBottom: '10px' }} />
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffc107' }}>{stats.pendingPayments}</div>
              <div style={{ fontSize: '14px', color: '#666' }}>В ожидании</div>
              <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
                Требуют внимания
              </div>
            </div>
          </div>

          <div style={{ marginTop: '25px', padding: '20px', backgroundColor: '#e7f3ff', borderRadius: '8px' }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#0066cc' }}>Информация о платежных системах</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
              <div>
                <strong>YooKassa</strong>
                <p style={{ fontSize: '13px', color: '#666', margin: '5px 0' }}>
                  Основная платежная система для приема платежей. Поддерживает карты, электронные кошельки и банковские переводы.
                </p>
              </div>
              <div>
                <strong>Альфа-Банк</strong>
                <p style={{ fontSize: '13px', color: '#666', margin: '5px 0' }}>
                  Дополнительная система для банковских карт. Прямое подключение к эквайрингу.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
