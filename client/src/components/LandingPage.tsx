import { useState } from 'react';
import { FooterPage } from './FooterPages';

interface LandingPageProps {
  onLoginClick: () => void;
}

export function LandingPage({ onLoginClick }: LandingPageProps) {
  const [currentPage, setCurrentPage] = useState<string | null>(null);

  const features = [
    {
      icon: '🔗',
      title: 'Интеграции платформ',
      description: 'Подключайте Coursera, edX, Stepik и другие',
      color: '#5f6368',
      page: 'documentation'
    },
    {
      icon: '📚',
      title: 'Управление курсами',
      description: 'Объединяйте курсы с разных платформ в одном месте',
      color: '#4285f4',
      page: 'course-management'
    },
    {
      icon: '📊',
      title: 'Аналитика обучения',
      description: 'Отслеживайте прогресс и получайте инсайты',
      color: '#34a853',
      page: 'progress-tracking'
    },
    {
      icon: '📅',
      title: 'Умный календарь',
      description: 'Единое расписание дедлайнов со всех платформ',
      color: '#ea4335',
      page: 'schedule-planning'
    },
    {
      icon: '⏰',
      title: 'Управление дедлайнами',
      description: 'Никогда не пропустите важный срок',
      color: '#fbbc04',
      page: 'deadline-management'
    },
    {
      icon: '⚙️',
      title: 'Панель управления',
      description: 'Полный контроль над вашим обучением',
      color: '#9c27b0',
      page: 'documentation'
    }
  ];

  const footerLinks = {
    features: [
      { label: 'Управление курсами', page: 'course-management' },
      { label: 'Отслеживание прогресса', page: 'progress-tracking' },
      { label: 'Управление дедлайнами', page: 'deadline-management' },
      { label: 'Планирование расписания', page: 'schedule-planning' }
    ],
    support: [
      { label: 'Документация', page: 'documentation' },
      { label: 'API Reference', page: 'api-reference' },
      { label: 'Статус системы', page: 'system-status' },
      { label: 'Связаться с нами', page: 'contact' }
    ],
    legal: [
      { label: 'Политика конфиденциальности', page: 'privacy-policy' },
      { label: 'Условия использования', page: 'terms-of-service' },
      { label: 'Cookie Policy', page: 'cookie-policy' },
      { label: 'Безопасность', page: 'security' }
    ]
  };

  if (currentPage) {
    return <FooterPage page={currentPage} onBack={() => setCurrentPage(null)} />;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Header */}
      <header style={{
        backgroundColor: 'white',
        padding: '20px 40px',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <img 
          src="/myepa-logo-clean.png" 
          alt="My EPA Logo" 
          style={{
            position: 'absolute',
            left: '40px',
            height: '50px',
            width: 'auto'
          }}
        />
        <span style={{
          fontSize: '24px',
          fontWeight: '700',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '2px'
        }}>
          АГРЕГАТОР ОНЛАЙН ОБУЧЕНИЯ
        </span>
        <button
          onClick={onLoginClick}
          style={{
            position: 'absolute',
            right: '40px',
            padding: '10px 24px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
          }}
        >
          Войти
        </button>
      </header>


      {/* Features Grid */}
      <section style={{
        padding: '60px 40px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '24px'
        }}>
          {features.map((feature, index) => (
            <div
              key={index}
              onClick={() => feature.page && setCurrentPage(feature.page)}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '28px',
                border: '1px solid #e8e8e8',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '10px',
                backgroundColor: `${feature.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                marginBottom: '16px'
              }}>
                {feature.icon}
              </div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#1a1a1a',
                margin: '0 0 8px 0'
              }}>
                {feature.title}
              </h3>
              <p style={{
                fontSize: '14px',
                color: '#666',
                margin: '0',
                lineHeight: '1.5'
              }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        backgroundColor: '#1a1a1a',
        color: '#fff',
        padding: '60px 40px 40px'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '40px'
        }}>
          {/* Brand */}
          <div>
            <img 
              src="/myepa-logo.png" 
              alt="My EPA Logo" 
              style={{
                maxWidth: '160px',
                height: 'auto',
                marginBottom: '16px'
              }}
            />
            <p style={{
              fontSize: '12px',
              color: '#666',
              margin: 0
            }}>
              © 2025 My EPA. Все права защищены.
            </p>
          </div>

          {/* Features */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: '#fff' }}>
              Возможности
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {footerLinks.features.map((item, i) => (
                <li key={i} style={{ marginBottom: '10px' }}>
                  <button
                    onClick={() => setCurrentPage(item.page)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#4285f4',
                      fontSize: '14px',
                      cursor: 'pointer',
                      padding: 0,
                      textAlign: 'left'
                    }}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: '#fff' }}>
              Поддержка
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {footerLinks.support.map((item, i) => (
                <li key={i} style={{ marginBottom: '10px' }}>
                  <button
                    onClick={() => setCurrentPage(item.page)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#4285f4',
                      fontSize: '14px',
                      cursor: 'pointer',
                      padding: 0,
                      textAlign: 'left'
                    }}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: '#fff' }}>
              Правовая информация
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {footerLinks.legal.map((item, i) => (
                <li key={i} style={{ marginBottom: '10px' }}>
                  <button
                    onClick={() => setCurrentPage(item.page)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#4285f4',
                      fontSize: '14px',
                      cursor: 'pointer',
                      padding: 0,
                      textAlign: 'left'
                    }}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

      </footer>
    </div>
  );
}
