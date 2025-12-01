import { BookOpen } from 'lucide-react';
import { useState, useEffect } from 'react';

interface CoursesManagementProps {
  isVisible: boolean;
  userRole: string;
}

export function CoursesManagement({ isVisible, userRole }: CoursesManagementProps) {
  const [coursesCount, setCoursesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  if (!isVisible) return null;

  useEffect(() => {
    const fetchCourses = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/courses', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          const courses = data.courses || data || [];
          setCoursesCount(Array.isArray(courses) ? courses.length : 0);
        }
      } catch (error) {
        console.error('Ошибка загрузки курсов:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCourses();
  }, []);

  return (
    <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', border: '1px solid #e9ecef', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
        <BookOpen size={24} color="#764ba2" />
        <h2 style={{ margin: 0, color: '#333' }}>Управление курсами</h2>
      </div>

      <div style={{ backgroundColor: '#f8f9fa', padding: '40px', borderRadius: '8px', textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '10px' }}>📚</div>
        <div style={{ color: '#666', marginBottom: '5px', fontWeight: '500' }}>
          {isLoading ? 'Загрузка...' : `${coursesCount} курсов в базе`}
        </div>
        <div style={{ color: '#999', fontSize: '14px', marginBottom: '20px' }}>
          Распределены по 9 категориям и 4 региональным группам
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
          <button
            style={{
              padding: '12px 16px',
              backgroundColor: '#764ba2',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            ➕ Добавить курс
          </button>
          <button
            style={{
              padding: '12px 16px',
              backgroundColor: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            📊 Статистика
          </button>
          <button
            style={{
              padding: '12px 16px',
              backgroundColor: '#1abc9c',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            🔄 Синхронизация
          </button>
        </div>

        <div style={{ marginTop: '30px', textAlign: 'left' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px', fontWeight: '600' }}>Категории курсов:</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
            {['IT & Программирование', 'Дизайн & Искусство', 'Бизнес', 'Маркетинг', 'Язык', 'Здоровье', 'Наука', 'Финансы', 'Другое'].map((cat, i) => (
              <div key={i} style={{ padding: '8px 12px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontSize: '12px', color: '#333' }}>
                {cat}
              </div>
            ))}
          </div>
        </div>
      </div>

      {userRole === 'super_admin' && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e7f3ff', borderRadius: '8px', fontSize: '13px', color: '#0066cc' }}>
          💡 Super Admin: Вы можете редактировать, удалять курсы и управлять категориями
        </div>
      )}
    </div>
  );
}
