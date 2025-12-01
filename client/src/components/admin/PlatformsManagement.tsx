import { Globe, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';

interface PlatformsManagementProps {
  isVisible: boolean;
  userRole: string;
}

interface Platform {
  id: string;
  name: string;
  displayName?: string;
  region?: string;
}

interface Region {
  id: string;
  name: string;
}

export function PlatformsManagement({ isVisible, userRole }: PlatformsManagementProps) {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', region: '', category: '' });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/platforms', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setPlatforms((data.platforms || data || []).slice(0, 20));
          // Загружаем регионы
          if (data.regions) {
            setRegions(data.regions);
          } else {
            // Fallback регионы
            setRegions([
              { id: 'global', name: 'Глобальные' },
              { id: 'ru', name: 'Российские' },
              { id: 'cis', name: 'СНГ' },
              { id: 'asia', name: 'Азиатские' },
            ]);
          }
        }
      } catch (error) {
        console.error('Ошибка загрузки платформ:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAddPlatform = async () => {
    if (!formData.name) {
      alert('⚠️ Заполните название платформы');
      return;
    }
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/platforms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          code: formData.name.toLowerCase().replace(/\s+/g, '_'),
          region: formData.region,
          category: formData.category,
          isActive: true,
        }),
      });
      if (response.ok) {
        alert('✅ Платформа успешно добавлена!');
        setFormData({ name: '', region: '', category: '' });
        setShowAddModal(false);
        // Перезагружаем список
        window.location.reload();
      }
    } catch (error) {
      console.error('Ошибка добавления платформы:', error);
      alert('❌ Ошибка при добавлении платформы');
    }
  };

  const filteredPlatforms = selectedRegion === 'all' 
    ? platforms 
    : platforms.filter(p => p.region === selectedRegion);


  if (!isVisible) return null;

  return (
    <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', border: '1px solid #e9ecef', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Globe size={24} color="#1abc9c" />
          <h2 style={{ margin: 0, color: '#333' }}>Управление платформами</h2>
        </div>
        {userRole === 'super_admin' && (
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Plus size={16} /> Добавить
          </button>
        )}
      </div>

      {/* Фильтры по регионам */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setSelectedRegion('all')}
          style={{
            padding: '8px 14px',
            backgroundColor: selectedRegion === 'all' ? '#667eea' : '#f0f0f0',
            color: selectedRegion === 'all' ? 'white' : '#333',
            border: 'none',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: selectedRegion === 'all' ? '600' : '500',
            transition: 'all 0.2s'
          }}
        >
          Все ({platforms.length})
        </button>
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
            {region.name} ({platforms.filter(p => p.region === region.id).length})
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          Загрузка платформ...
        </div>
      ) : platforms.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          Платформы не найдены
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
          {filteredPlatforms.length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#999' }}>
              📭 Платформы в этом регионе не найдены
            </div>
          ) : filteredPlatforms.map((platform, idx) => (
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
                <div style={{ fontWeight: '500', color: '#333', marginBottom: '3px' }}>{platform.name}</div>
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
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#667eea', marginBottom: '5px' }}>{platforms.length}+</div>
          <div style={{ fontSize: '13px', color: '#666' }}>Платформ загружено</div>
        </div>
        <div style={{ padding: '15px', backgroundColor: '#f0fff7', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1abc9c', marginBottom: '5px' }}>4</div>
          <div style={{ fontSize: '13px', color: '#666' }}>Региональных группы</div>
        </div>
      </div>

      <div style={{ padding: '15px', backgroundColor: '#fff9e6', borderRadius: '8px', fontSize: '13px', color: '#b8860b' }}>
        ⚠️ Синхронизация платформ осуществляется автоматически каждые 24 часа
      </div>

      {/* Модальное окно добавления платформы */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>➕ Добавить новую платформу</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#333' }}>
                Название платформы
              </label>
              <input
                type="text"
                placeholder="Например: Skillbox, netology..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#333' }}>
                Регион
              </label>
              <select
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">Выберите регион</option>
                {regions.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#333' }}>
                Категория
              </label>
              <input
                type="text"
                placeholder="Например: Программирование, Дизайн..."
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#f0f0f0',
                  color: '#333',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500'
                }}
              >
                Отмена
              </button>
              <button
                onClick={handleAddPlatform}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500'
                }}
              >
                ✅ Добавить
              </button>
            </div>
          </div>
        </div>
      )}

      {userRole === 'super_admin' && (
        <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowAddModal(true)}
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
