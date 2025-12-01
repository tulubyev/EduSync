import { Globe, Filter } from 'lucide-react';
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

export function PlatformsManagement({ isVisible, userRole }: PlatformsManagementProps) {
  const [platformsByRegion, setPlatformsByRegion] = useState<RegionPlatforms>({});
  const [regions, setRegions] = useState<Region[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('accessToken');
        
        // Загружаем платформы по регионам параллельно
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
          // Определяем регионы из полученных данных
          const regionKeys = Object.keys(platformData);
          const regionList = regionKeys.map(key => ({ id: key, name: key }));
          setRegions(regionList);
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

  // Получаем все платформы или из выбранного региона
  const getAllPlatforms = (): Platform[] => {
    if (selectedRegion === 'all') {
      return Object.values(platformsByRegion).flat();
    }
    return platformsByRegion[selectedRegion] || [];
  };

  // Фильтруем по категории
  const filteredPlatforms = getAllPlatforms().filter(p => {
    if (selectedCategory === 'all') return true;
    // Ищем категорию в имени платформы или поле category
    return p.category?.toLowerCase().includes(selectedCategory.toLowerCase()) ||
           p.name?.toLowerCase().includes(selectedCategory.toLowerCase());
  });


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
              fontWeight: selectedRegion === 'all' ? '600' : '500',
              transition: 'all 0.2s'
            }}
          >
            📋 Все регионы ({Object.values(platformsByRegion).flat().length})
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
                fontWeight: selectedRegion === region.id ? '600' : '500',
                transition: 'all 0.2s'
              }}
            >
              {region.name} ({(platformsByRegion[region.id] || []).length})
            </button>
          ))}
        </div>
      </div>

      {/* Фильтры по категориям */}
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
                fontWeight: selectedCategory === 'all' ? '600' : '400',
                transition: 'all 0.2s'
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
                  fontWeight: selectedCategory === cat.code ? '600' : '400',
                  transition: 'all 0.2s'
                }}
              >
                {cat.displayName}
              </button>
            ))}
          </div>
        </div>
      )}

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
            {Object.values(platformsByRegion).flat().length}
          </div>
          <div style={{ fontSize: '13px', color: '#666' }}>Всего платформ</div>
        </div>
        <div style={{ padding: '15px', backgroundColor: '#f0fff7', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1abc9c', marginBottom: '5px' }}>{regions.length}</div>
          <div style={{ fontSize: '13px', color: '#666' }}>Региональных групп</div>
        </div>
        <div style={{ padding: '15px', backgroundColor: '#fff5f0', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#FF6B6B', marginBottom: '5px' }}>{categories.length}</div>
          <div style={{ fontSize: '13px', color: '#666' }}>Категорий</div>
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
