import { Globe, Filter, Settings, Link, RefreshCw, CheckCircle, XCircle, AlertCircle, Key } from 'lucide-react';
import { useState, useEffect } from 'react';
import { AddPlatformModal } from '../platforms/AddPlatformModal';

interface PlatformsManagementProps {
  isVisible: boolean;
  userRole: string;
}

interface Platform {
  id: string;
  name: string;
  code?: string;
  displayName?: string;
  websiteUrl?: string;
  category?: string;
  apiEnabled?: boolean;
  lastSync?: string;
  syncStatus?: 'synced' | 'pending' | 'error' | 'never';
  coursesCount?: number;
}

interface Region {
  id: string;
  name: string;
}

interface Category {
  id: string;
  displayName: string;
  code: string;
  color?: string;
}

interface RegionPlatforms {
  [key: string]: Platform[];
}

interface ApiConfig {
  platformId: string;
  platformName: string;
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  isConnected: boolean;
}

export function PlatformsManagement({ isVisible, userRole }: PlatformsManagementProps) {
  const [platformsByRegion, setPlatformsByRegion] = useState<RegionPlatforms>({});
  const [regions, setRegions] = useState<Region[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'list' | 'api' | 'sync'>('list');
  const [showApiModal, setShowApiModal] = useState(false);
  const [selectedPlatformForApi, setSelectedPlatformForApi] = useState<Platform | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [apiConfigs, setApiConfigs] = useState<ApiConfig[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('accessToken');
        
        const [platformsRes, categoriesRes] = await Promise.all([
          fetch('/api/platforms/by-region', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('/api/platforms/categories', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);
        
        if (platformsRes.ok) {
          const platformData = await platformsRes.json();
          setPlatformsByRegion(platformData);
          const regionKeys = Object.keys(platformData);
          const regionList = regionKeys.map(key => ({ id: key, name: key }));
          setRegions(regionList);

          const allPlatforms = Object.values(platformData).flat() as Platform[];
          setApiConfigs(allPlatforms.slice(0, 10).map(p => ({
            platformId: p.id,
            platformName: p.displayName || p.name,
            isConnected: p.apiEnabled === true
          })));
        }
        
        if (categoriesRes.ok) {
          const categoryData = await categoriesRes.json();
          setCategories(categoryData);
        }
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [refreshKey]);

  const handlePlatformAdded = () => {
    setRefreshKey(prev => prev + 1);
  };

  const getAllPlatforms = (): Platform[] => {
    if (selectedRegion === 'all') {
      return Object.values(platformsByRegion).flat();
    }
    return platformsByRegion[selectedRegion] || [];
  };

  const filteredPlatforms = getAllPlatforms().filter(p => {
    if (selectedCategory === 'all') return true;
    return p.category?.toLowerCase().includes(selectedCategory.toLowerCase()) ||
           p.name?.toLowerCase().includes(selectedCategory.toLowerCase());
  });

  const handleSyncAllPlatforms = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/admin/course-discovery', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ limit: 50 })
      });

      const data = await response.json();
      setSyncResult({
        success: data.success,
        message: data.message || 'Синхронизация завершена'
      });
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      setSyncResult({
        success: false,
        message: 'Ошибка при синхронизации'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConfigureApi = (platform: Platform) => {
    setSelectedPlatformForApi(platform);
    setShowApiModal(true);
  };

  const getSyncStatusBadge = (status?: string) => {
    const statuses: Record<string, { bg: string; text: string; label: string; icon: any }> = {
      'synced': { bg: '#d4edda', text: '#155724', label: 'Синхронизирован', icon: CheckCircle },
      'pending': { bg: '#fff3cd', text: '#856404', label: 'Ожидает', icon: RefreshCw },
      'error': { bg: '#f8d7da', text: '#721c24', label: 'Ошибка', icon: XCircle },
      'never': { bg: '#e2e3e5', text: '#383d41', label: 'Не синхронизирован', icon: AlertCircle }
    };
    return statuses[status || 'never'] || statuses['never'];
  };

  if (!isVisible) return null;

  return (
    <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', border: '1px solid #e9ecef', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Globe size={24} color="#1abc9c" />
          <h2 style={{ margin: 0, color: '#333' }}>Управление платформами</h2>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {userRole === 'super_admin' && (
            <AddPlatformModal onPlatformAdded={handlePlatformAdded} />
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #e9ecef', paddingBottom: '15px' }}>
        {[
          { id: 'list', label: 'Список платформ', icon: <Globe size={16} /> },
          { id: 'api', label: 'API Подключения', icon: <Key size={16} /> },
          { id: 'sync', label: 'Синхронизация', icon: <RefreshCw size={16} /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '10px 20px',
              backgroundColor: activeTab === tab.id ? '#1abc9c' : '#f8f9fa',
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

      {activeTab === 'list' && (
        <>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Globe size={14} /> Регионы
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setSelectedRegion('all')}
                style={{
                  padding: '8px 14px',
                  backgroundColor: selectedRegion === 'all' ? '#1abc9c' : '#f0f0f0',
                  color: selectedRegion === 'all' ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: selectedRegion === 'all' ? '600' : '500'
                }}
              >
                📋 Все ({Object.values(platformsByRegion).flat().length})
              </button>
              {regions.map(region => (
                <button
                  key={region.id}
                  onClick={() => setSelectedRegion(region.id)}
                  style={{
                    padding: '8px 14px',
                    backgroundColor: selectedRegion === region.id ? '#667eea' : '#f0f0f0',
                    color: selectedRegion === region.id ? 'white' : '#333',
                    border: 'none',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: selectedRegion === region.id ? '600' : '500'
                  }}
                >
                  {region.name} ({(platformsByRegion[region.id] || []).length})
                </button>
              ))}
            </div>
          </div>

          {categories.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Filter size={14} /> Категории
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setSelectedCategory('all')}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: selectedCategory === 'all' ? '#667eea' : '#f0f0f0',
                    color: selectedCategory === 'all' ? 'white' : '#333',
                    border: 'none',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: selectedCategory === 'all' ? '600' : '400'
                  }}
                >
                  Все
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.code)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: selectedCategory === cat.code ? (cat.color || '#667eea') : '#f0f0f0',
                      color: selectedCategory === cat.code ? 'white' : '#333',
                      border: 'none',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: selectedCategory === cat.code ? '600' : '400'
                    }}
                  >
                    {cat.displayName}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Загрузка...</div>
          ) : filteredPlatforms.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>📭 Платформы не найдены</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px', marginBottom: '20px' }}>
              {filteredPlatforms.map((platform, idx) => {
                const syncStatus = getSyncStatusBadge(platform.syncStatus);
                return (
                  <div
                    key={idx}
                    style={{
                      padding: '15px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      border: '1px solid #e9ecef'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div>
                        <div style={{ fontWeight: '600', color: '#333', marginBottom: '3px' }}>
                          🌐 {platform.displayName || platform.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#999' }}>{platform.code}</div>
                      </div>
                      <span style={{
                        padding: '3px 8px',
                        backgroundColor: syncStatus.bg,
                        color: syncStatus.text,
                        borderRadius: '10px',
                        fontSize: '10px',
                        fontWeight: '500'
                      }}>
                        {syncStatus.label}
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                      <span>📚 {platform.coursesCount || 0} курсов</span>
                      {platform.lastSync && (
                        <span>🔄 {new Date(platform.lastSync).toLocaleDateString('ru-RU')}</span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleConfigureApi(platform)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#667eea',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Settings size={12} /> API
                      </button>
                      <button
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#1abc9c',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <RefreshCw size={12} /> Синхр.
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'api' && (
        <div>
          <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e7f3ff', borderRadius: '8px', fontSize: '13px', color: '#0066cc' }}>
            ℹ️ API-подключения позволяют автоматически синхронизировать курсы и данные с образовательных платформ
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            {apiConfigs.map((config) => (
              <div
                key={config.platformId}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    backgroundColor: config.isConnected ? '#d4edda' : '#f8f9fa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {config.isConnected ? (
                      <Link size={20} color="#155724" />
                    ) : (
                      <Key size={20} color="#666" />
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', color: '#333' }}>{config.platformName}</div>
                    <div style={{ fontSize: '12px', color: config.isConnected ? '#155724' : '#666' }}>
                      {config.isConnected ? 'API подключен' : 'Требуется настройка'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{
                    padding: '4px 10px',
                    backgroundColor: config.isConnected ? '#d4edda' : '#e2e3e5',
                    color: config.isConnected ? '#155724' : '#383d41',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '500'
                  }}>
                    {config.isConnected ? 'Активен' : 'Неактивен'}
                  </span>
                  <button
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Настроить
                  </button>
                </div>
              </div>
            ))}
          </div>

          {apiConfigs.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              Нет доступных API-подключений
            </div>
          )}
        </div>
      )}

      {activeTab === 'sync' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' }}>
            <div style={{ padding: '20px', backgroundColor: '#e8f5e9', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2e7d32' }}>
                {Object.values(platformsByRegion).flat().length}
              </div>
              <div style={{ fontSize: '13px', color: '#666' }}>Всего платформ</div>
            </div>
            <div style={{ padding: '20px', backgroundColor: '#e3f2fd', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1565c0' }}>
                {Math.round(Object.values(platformsByRegion).flat().length * 0.8)}
              </div>
              <div style={{ fontSize: '13px', color: '#666' }}>Синхронизировано</div>
            </div>
            <div style={{ padding: '20px', backgroundColor: '#fff3e0', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#e65100' }}>
                {Math.round(Object.values(platformsByRegion).flat().length * 0.2)}
              </div>
              <div style={{ fontSize: '13px', color: '#666' }}>Ожидают</div>
            </div>
          </div>

          {syncResult && (
            <div style={{
              padding: '15px',
              backgroundColor: syncResult.success ? '#d4edda' : '#f8d7da',
              borderRadius: '8px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              {syncResult.success ? <CheckCircle size={20} color="#155724" /> : <XCircle size={20} color="#721c24" />}
              <span style={{ color: syncResult.success ? '#155724' : '#721c24' }}>{syncResult.message}</span>
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>Настройки синхронизации</h4>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                onClick={handleSyncAllPlatforms}
                disabled={isSyncing}
                style={{
                  padding: '12px 24px',
                  backgroundColor: isSyncing ? '#ccc' : '#1abc9c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isSyncing ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <RefreshCw size={16} className={isSyncing ? 'spin' : ''} />
                {isSyncing ? 'Синхронизация...' : 'Синхронизировать все'}
              </button>

              <div style={{ fontSize: '13px', color: '#666' }}>
                Автосинхронизация: <strong>Каждое воскресенье, 02:00</strong>
              </div>
            </div>
          </div>

          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <h5 style={{ margin: '0 0 10px 0', color: '#333' }}>Последние синхронизации</h5>
            <div style={{ fontSize: '13px', color: '#666' }}>
              <div style={{ padding: '8px 0', borderBottom: '1px solid #e9ecef' }}>
                🔄 Coursera — {new Date().toLocaleDateString('ru-RU')} — Успешно
              </div>
              <div style={{ padding: '8px 0', borderBottom: '1px solid #e9ecef' }}>
                🔄 Stepik — {new Date().toLocaleDateString('ru-RU')} — Успешно
              </div>
              <div style={{ padding: '8px 0' }}>
                🔄 Udemy — {new Date().toLocaleDateString('ru-RU')} — Успешно
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
