import { useEffect, useState } from 'react';

interface FooterPageProps {
  page: string;
  onBack: () => void;
}

// Публичные страницы сайта: адрес → страница. Открываются без входа и по прямой ссылке.
export const PUBLIC_PAGE_PATHS: Record<string, string> = {
  '/features/courses': 'course-management',
  '/features/progress': 'progress-tracking',
  '/features/deadlines': 'deadline-management',
  '/features/schedule': 'schedule-planning',
  '/docs': 'documentation',
  '/docs/api': 'api-reference',
  '/status': 'system-status',
  '/contacts': 'contact',
  '/privacy': 'privacy-policy',
  '/terms': 'terms-of-service',
  '/cookies': 'cookie-policy',
  '/security': 'security',
};

export function pathForPage(page: string): string {
  return Object.keys(PUBLIC_PAGE_PATHS).find(path => PUBLIC_PAGE_PATHS[path] === page) ?? '/';
}

function ServiceStatus() {
  const [state, setState] = useState<'checking' | 'up' | 'down'>('checking');
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  useEffect(() => {
    fetch('/api/config/public')
      .then(res => res.json().then(() => res.ok))
      .then(ok => setState(ok ? 'up' : 'down'))
      .catch(() => setState('down'))
      .finally(() => setCheckedAt(new Date()));
  }, []);

  const label = state === 'checking' ? 'Проверяем…' : state === 'up' ? 'Работает' : 'Недоступен';
  return (
    <section>
      <h2>Статус сервиса</h2>
      <div className="status-grid">
        <div className={`status-item ${state === 'up' ? 'operational' : ''}`}>
          <span className="status-indicator"></span>
          <span>Сервер My EPA</span>
          <span className="status-label">{label}</span>
        </div>
      </div>
      {checkedAt && (
        <p>Проверено из вашего браузера: {checkedAt.toLocaleString('ru-RU')}.</p>
      )}
    </section>
  );
}

export function FooterPage({ page, onBack }: FooterPageProps) {
  const renderContent = () => {
    switch (page) {
      case 'course-management':
        return (
          <>
            <h1>Управление курсами</h1>
            <p className="subtitle">Объединяйте курсы с разных платформ в одном месте</p>
            
            <section>
              <h2>Возможности</h2>
              <ul>
                <li><strong>Агрегация курсов</strong> — подключайте курсы с Coursera, Udemy, edX, Stepik и других платформ</li>
                <li><strong>Единый дашборд</strong> — все ваши курсы в одном интерфейсе</li>
                <li><strong>Автоматическая синхронизация</strong> — прогресс обновляется автоматически</li>
                <li><strong>Категоризация</strong> — группируйте курсы по темам и приоритетам</li>
              </ul>
            </section>

            <section>
              <h2>Площадки</h2>
              <p>Сейчас подключается Stepik. Обмен данными с Coursera, edX и другими российскими и
              международными площадками готовится.</p>
            </section>

            <section>
              <h2>Как подключить платформу</h2>
              <ol>
                <li>Перейдите в Настройки → Интеграции</li>
                <li>Нажмите "Подключить платформу"</li>
                <li>Выберите нужную платформу</li>
                <li>Авторизуйтесь через OAuth или введите API-ключ</li>
                <li>Дождитесь синхронизации курсов</li>
              </ol>
            </section>
          </>
        );

      case 'progress-tracking':
        return (
          <>
            <h1>Отслеживание прогресса</h1>
            <p className="subtitle">Детальная аналитика вашего обучения</p>
            
            <section>
              <h2>Аналитика обучения</h2>
              <ul>
                <li><strong>Общий прогресс</strong> — процент завершения по всем курсам</li>
                <li><strong>Статистика по времени</strong> — сколько времени вы учитесь ежедневно/еженедельно</li>
                <li><strong>Графики активности</strong> — визуализация вашего прогресса</li>
                <li><strong>Сравнение</strong> — сравните свой прогресс с прошлыми периодами</li>
              </ul>
            </section>

            <section>
              <h2>Метрики</h2>
              <ul>
                <li>Количество завершённых уроков</li>
                <li>Время, проведённое за обучением</li>
                <li>Серии ежедневного обучения (streaks)</li>
                <li>Достигнутые цели</li>
              </ul>
            </section>
          </>
        );

      case 'deadline-management':
        return (
          <>
            <h1>Управление дедлайнами</h1>
            <p className="subtitle">Никогда не пропустите важный срок</p>
            
            <section>
              <h2>Функции календаря</h2>
              <ul>
                <li><strong>Единый календарь</strong> — все дедлайны со всех платформ в одном месте</li>
                <li><strong>Напоминания</strong> — уведомления за день, час, 15 минут до дедлайна</li>
                <li><strong>Цветовая кодировка</strong> — визуальное разделение по срочности</li>
                <li><strong>Синхронизация</strong> — экспорт в Google Calendar, Apple Calendar</li>
              </ul>
            </section>

            <section>
              <h2>Типы дедлайнов</h2>
              <ul>
                <li>Задания и тесты</li>
                <li>Проектные работы</li>
                <li>Экзамены</li>
                <li>Сертификационные сроки</li>
              </ul>
            </section>
          </>
        );

      case 'schedule-planning':
        return (
          <>
            <h1>Планирование расписания</h1>
            <p className="subtitle">Оптимизируйте своё время обучения</p>
            
            <section>
              <h2>Умное планирование</h2>
              <ul>
                <li><strong>Рекомендации по времени</strong> — система предлагает оптимальные слоты для обучения</li>
                <li><strong>Адаптивное расписание</strong> — автоматическая корректировка при изменении планов</li>
                <li><strong>Баланс нагрузки</strong> — равномерное распределение материала</li>
              </ul>
            </section>

            <section>
              <h2>Адаптация под время суток</h2>
              <ul>
                <li><strong>Утро (5:00-9:00)</strong> — энергичный режим для активного обучения</li>
                <li><strong>День (9:00-17:00)</strong> — фокусированный режим для глубокого погружения</li>
                <li><strong>Вечер (17:00-22:00)</strong> — спокойный режим для повторения</li>
                <li><strong>Ночь (22:00-5:00)</strong> — нейтральный режим для лёгкого чтения</li>
              </ul>
            </section>
          </>
        );

      case 'documentation':
        return (
          <>
            <h1>Документация</h1>
            <p className="subtitle">Полное руководство по использованию платформы</p>
            
            <section>
              <h2>Начало работы</h2>
              <ol>
                <li><strong>Регистрация</strong> — создайте аккаунт с email или телефоном</li>
                <li><strong>Настройка профиля</strong> — укажите ваши цели обучения</li>
                <li><strong>Подключение платформ</strong> — добавьте ваши образовательные платформы</li>
                <li><strong>Синхронизация</strong> — дождитесь импорта курсов</li>
              </ol>
            </section>

            <section>
              <h2>Основные разделы</h2>
              <ul>
                <li><strong>Дашборд</strong> — главная страница с обзором активности</li>
                <li><strong>Курсы</strong> — список всех подключённых курсов</li>
                <li><strong>Дедлайны</strong> — календарь сроков</li>
                <li><strong>Заметки</strong> — записи привязанные к курсам</li>
                <li><strong>Аналитика</strong> — статистика обучения</li>
                <li><strong>Настройки</strong> — персонализация и интеграции</li>
              </ul>
            </section>

            <section>
              <h2>Часто задаваемые вопросы</h2>
              <ul>
                <li><strong>Как подключить курс вручную?</strong> — Курсы → Добавить курс → Заполнить форму</li>
                <li><strong>Как изменить тему оформления?</strong> — Настройки → Внешний вид → Выбор темы</li>
                <li><strong>Как экспортировать данные?</strong> — Настройки → Конфиденциальность → Экспорт данных</li>
              </ul>
            </section>
          </>
        );

      case 'api-reference':
        return (
          <>
            <h1>API Reference</h1>
            <p className="subtitle">Документация для разработчиков</p>
            
            <section>
              <h2>Аутентификация</h2>
              <div className="code-block">
                <p><strong>POST /api/auth/login</strong></p>
                <p>Тело запроса: {"{ identifier, password }"}</p>
                <p>Ответ: {"{ user, accessToken, refreshToken }"}</p>
              </div>
              <div className="code-block">
                <p><strong>POST /api/auth/register</strong></p>
                <p>Тело запроса: {"{ firstName, lastName, email, phone, password }"}</p>
                <p>Ответ: {"{ user, accessToken, refreshToken }"}</p>
              </div>
            </section>

            <section>
              <h2>Защищённые эндпоинты</h2>
              <p>Все защищённые эндпоинты требуют заголовок:</p>
              <div className="code-block">
                <p>Authorization: Bearer {"<accessToken>"}</p>
              </div>
            </section>

            <section>
              <h2>Лимиты запросов</h2>
              <ul>
                <li>Общие запросы: 1000 запросов / 15 минут</li>
                <li>Аутентификация: 5 попыток / 15 минут</li>
              </ul>
            </section>
          </>
        );

      case 'system-status':
        return (
          <>
            <h1>Статус системы</h1>
            <p className="subtitle">Текущее состояние сервиса</p>
            <ServiceStatus />
          </>
        );

      case 'contact':
        return (
          <>
            <h1>Связаться с нами</h1>
            <p className="subtitle">Мы всегда рады помочь</p>
            
            <section>
              <h2>Способы связи</h2>
              <ul>
                <li><strong>Email:</strong> support@myepa.ru</li>
                <li><strong>Telegram:</strong> @myepa_support</li>
                <li><strong>Время ответа:</strong> в течение 24 часов</li>
              </ul>
            </section>

            <section>
              <h2>Часы работы поддержки</h2>
              <p>Понедельник — Пятница: 9:00 — 18:00 (МСК)</p>
              <p>Суббота — Воскресенье: выходные</p>
            </section>

            <section>
              <h2>Сообщить о проблеме</h2>
              <p>При обращении, пожалуйста, укажите:</p>
              <ul>
                <li>Описание проблемы</li>
                <li>Шаги для воспроизведения</li>
                <li>Скриншоты (если применимо)</li>
                <li>Ваш браузер и устройство</li>
              </ul>
            </section>
          </>
        );

      case 'privacy-policy':
        return (
          <>
            <h1>Политика конфиденциальности</h1>
            <p className="subtitle">Последнее обновление: ноябрь 2025</p>
            
            <section>
              <h2>Сбор информации</h2>
              <p>Мы собираем следующую информацию:</p>
              <ul>
                <li>Регистрационные данные (имя, email, телефон)</li>
                <li>Данные о курсах с подключённых платформ</li>
                <li>Статистика использования сервиса</li>
              </ul>
            </section>

            <section>
              <h2>Использование данных</h2>
              <p>Ваши данные используются для:</p>
              <ul>
                <li>Предоставления услуг платформы</li>
                <li>Персонализации опыта</li>
                <li>Улучшения качества сервиса</li>
                <li>Связи с вами по техническим вопросам</li>
              </ul>
            </section>

            <section>
              <h2>Защита данных</h2>
              <ul>
                <li>Все данные шифруются при передаче (HTTPS/TLS)</li>
                <li>Пароли хранятся в хешированном виде</li>
                <li>Доступ к данным ограничен</li>
              </ul>
            </section>

            <section>
              <h2>Ваши права</h2>
              <ul>
                <li>Право на доступ к своим данным</li>
                <li>Право на исправление данных</li>
                <li>Право на удаление аккаунта и данных</li>
                <li>Право на экспорт данных</li>
              </ul>
            </section>
          </>
        );

      case 'terms-of-service':
        return (
          <>
            <h1>Условия использования</h1>
            <p className="subtitle">Последнее обновление: ноябрь 2025</p>
            
            <section>
              <h2>1. Принятие условий</h2>
              <p>Используя My EPA, вы соглашаетесь с данными условиями. Если вы не согласны, пожалуйста, не используйте сервис.</p>
            </section>

            <section>
              <h2>2. Описание сервиса</h2>
              <p>My EPA — платформа для агрегации и управления образовательными курсами с различных онлайн-платформ.</p>
            </section>

            <section>
              <h2>3. Регистрация</h2>
              <ul>
                <li>Вы должны предоставить достоверную информацию</li>
                <li>Вы несёте ответственность за безопасность аккаунта</li>
                <li>Один аккаунт на пользователя</li>
              </ul>
            </section>

            <section>
              <h2>4. Правила использования</h2>
              <p>Запрещается:</p>
              <ul>
                <li>Нарушать права других пользователей</li>
                <li>Использовать сервис для незаконных целей</li>
                <li>Пытаться получить несанкционированный доступ</li>
                <li>Распространять вредоносное ПО</li>
              </ul>
            </section>

            <section>
              <h2>5. Ограничение ответственности</h2>
              <p>Сервис предоставляется "как есть". Мы не несём ответственности за перебои в работе или потерю данных.</p>
            </section>
          </>
        );

      case 'cookie-policy':
        return (
          <>
            <h1>Политика Cookie</h1>
            <p className="subtitle">Информация об использовании cookie-файлов</p>
            
            <section>
              <h2>Что такое cookie?</h2>
              <p>Cookie — небольшие текстовые файлы, сохраняемые в вашем браузере для улучшения работы сайта.</p>
            </section>

            <section>
              <h2>Типы используемых cookie</h2>
              <ul>
                <li><strong>Необходимые</strong> — для работы аутентификации и сессий</li>
                <li><strong>Функциональные</strong> — для сохранения ваших настроек</li>
                <li><strong>Аналитические</strong> — для улучшения сервиса</li>
              </ul>
            </section>

            <section>
              <h2>Управление cookie</h2>
              <p>Вы можете управлять cookie в настройках браузера. Отключение некоторых cookie может повлиять на работу сервиса.</p>
            </section>
          </>
        );

      case 'security':
        return (
          <>
            <h1>Безопасность</h1>
            <p className="subtitle">Как мы защищаем ваши данные</p>
            
            <section>
              <h2>Шифрование</h2>
              <ul>
                <li>Все соединения защищены HTTPS/TLS</li>
                <li>Ключи доступа к подключённым площадкам хранятся зашифрованными (AES-256-GCM)</li>
              </ul>
            </section>

            <section>
              <h2>Аутентификация</h2>
              <ul>
                <li>Пароли хранятся только в виде хеша</li>
                <li>Ограничение числа попыток входа</li>
              </ul>
            </section>

            <section>
              <h2>Защита от атак</h2>
              <ul>
                <li>Заголовки безопасности (Helmet) и ограничение источников запросов (CORS)</li>
                <li>Запросы к базе — через ORM с параметрами, без склейки SQL</li>
                <li>Обновление зависимостей с известными уязвимостями</li>
              </ul>
            </section>

            <section>
              <h2>Сообщить об уязвимости</h2>
              <p>Если вы обнаружили уязвимость, пожалуйста, сообщите нам: security@myepa.ru</p>
            </section>
          </>
        );

      default:
        return (
          <>
            <h1>Страница не найдена</h1>
            <p>Запрашиваемая страница не существует.</p>
          </>
        );
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Header */}
      <header style={{
        backgroundColor: 'white',
        padding: '15px 40px',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <img 
          src="/myepa-logo-clean.png" 
          alt="My EPA Logo" 
          style={{
            height: '50px',
            width: 'auto'
          }}
        />
        <button
          onClick={onBack}
          style={{
            padding: '10px 24px',
            background: '#5a6a7a',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          ← На главную
        </button>
      </header>

      {/* Content */}
      <main style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '40px 20px'
      }}>
        <style>{`
          h1 {
            font-size: 32px;
            font-weight: 700;
            color: #1a1a1a;
            margin: 0 0 12px 0;
          }
          .subtitle {
            font-size: 18px;
            color: #666;
            margin: 0 0 40px 0;
          }
          section {
            margin-bottom: 40px;
          }
          h2 {
            font-size: 20px;
            font-weight: 600;
            color: #333;
            margin: 0 0 16px 0;
            padding-bottom: 8px;
            border-bottom: 2px solid #667eea;
          }
          ul, ol {
            padding-left: 24px;
            margin: 0;
          }
          li {
            margin-bottom: 10px;
            line-height: 1.6;
            color: #444;
          }
          p {
            line-height: 1.7;
            color: #444;
            margin: 0 0 16px 0;
          }
          .platforms-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 12px;
            margin-top: 16px;
          }
          .platform-card {
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 16px;
            text-align: center;
            font-weight: 500;
            color: #333;
          }
          .code-block {
            background: #1a1a1a;
            color: #fff;
            padding: 16px;
            border-radius: 8px;
            margin: 12px 0;
            font-family: monospace;
            font-size: 14px;
          }
          .code-block p {
            color: #fff;
            margin: 4px 0;
          }
          .status-grid {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .status-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px;
            background: white;
            border-radius: 8px;
            border: 1px solid #e0e0e0;
          }
          .status-item.operational .status-indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #22c55e;
          }
          .status-label {
            margin-left: auto;
            color: #22c55e;
            font-weight: 500;
          }
        `}</style>
        {renderContent()}
      </main>
    </div>
  );
}
