import { Globe } from 'lucide-react';
import { useState, useEffect } from 'react';
import { AddPlatformModal } from '../platforms/AddPlatformModal';

interface PlatformsManagementProps {
  isVisible: boolean;
  userRole: string;
}

interface Platform {
  id: string;
  name: string;
  displayName?: string;
  websiteUrl?: string;
}

interface Region {
  id: string;
  name: string;
}

interface RegionPlatforms {
  [key: string]: Platform[];
}

export function PlatformsManagement({ isVisible, userRole }: PlatformsManagementProps) {
  const [platformsByRegion, setPlatformsByRegion] = useState<RegionPlatforms>({});
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('global');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('accessToken');
        // Загружаем платформы по регионам
        const response = await fetch('/api/platforms/by-region', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setPlatformsByRegion(data);
          // Определяем регионы из полученных данных
          const regionKeys = Object.keys(data);
          const regionList = regionKeys.map(key => ({ id: key, name: formatRegionName(key) }));
          setRegions(regionList);
          if (regionKeys.length > 0 && !regionKeys.includes(selectedRegion)) {
            setSelectedRegion(regionKeys[0]);
          }
        }
      } catch (error) {
        console.error('Ошибка загрузки платформ:', error);
        // Fallback на пустую структуру
        setRegions([
          { id: 'global', name: 'Глобальные' },
          { id: 'russian', name: 'Российские' },
          { id: 'cis', name: 'СНГ' },
          { id: 'asia', name: 'Азиатские' },
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [refreshKey]);

  const formatRegionName = (regionId: string): string => {
    const names: Record<string, string> = {
      'global': 'Глобальные',
      'russian': 'Российские',
      'cis': 'СНГ',
      'asia': 'Азиатские',
    };
    return names[regionId] || regionId;
  };

  const handlePlatformAdded = () => {
    setRefreshKey(prev => prev + 1);
  };

  const filteredPlatforms = platformsByRegion[selectedRegion] || [];


  if (!isVisible) return null;

  return (
    <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', border: '1px solid #e9ecef', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Globe size={24} color="#1abc9c" />
          <h2 style={{ margin: 0, color: '#333' }}>Управление платформами</h2>
        </div>
        {userRole === 'super_admin' && (
          <AddPlatformModal onPlatformAdded={handlePlatformAdded} />
        )}
      </div>

      {/* Фильтры по регионам */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {regions.map(region => (
          <button
            key={region.id}
            onClick={() => setSelectedRegion(region.id)}
            style={{
              padding: '8px 14px',
              backgroundColor: selectedRegion === region.id ? '#1abc9c' : '#f0f0f0',
              color: selectedRegion === region.id ? 'white' : '#333',
              border: 'none',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: selectedRegion === region.id ? '600' : '500',
              transition: 'all 0.2s'
            }}
          >
            {region.name} ({(platformsByRegion[region.id] || []).length})
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          Загрузка платформ...
        </div>
      ) : Object.keys(platformsByRegion).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          Платформы не найдены
        </div>
      ) : filteredPlatforms.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          📭 Платформы в этом регионе не найдены
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
          {filteredPlatforms.map((platform, idx) => (
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
                <div style={{ fontSize: '16px', marginBottom: '5px' }}>🌐</div>
                <div style={{ fontWeight: '500', color: '#333', marginBottom: '3px' }}>{platform.displayName || platform.name}</div>
                <div style={{ fontSize: '12px', color: '#999' }}>Активна</div>
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
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
        <div style={{ padding: '15px', backgroundColor: '#f0f7ff', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#667eea', marginBottom: '5px' }}>
            {Object.values(platformsByRegion).reduce((acc, arr) => acc + arr.length, 0)}+
          </div>
          <div style={{ fontSize: '13px', color: '#666' }}>Платформ загружено</div>
        </div>
        <div style={{ padding: '15px', backgroundColor: '#f0fff7', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1abc9c', marginBottom: '5px' }}>{regions.length}</div>
          <div style={{ fontSize: '13px', color: '#666' }}>Региональных группы</div>
        </div>
      </div>

      <div style={{ padding: '15px', backgroundColor: '#fff9e6', borderRadius: '8px', fontSize: '13px', color: '#b8860b' }}>
        ⚠️ Синхронизация платформ осуществляется автоматически каждые 24 часа
      </div>

      {userRole === 'super_admin' && (
        <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
          <button
            onClick={() => window.location.reload()}
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
