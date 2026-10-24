import { Link } from 'wouter';
import { BarChart3, BellRing, BookOpen, CalendarDays, LayoutDashboard, Link2 } from 'lucide-react';
import { pathForPage } from './FooterPages';

interface LandingPageProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
}

const features = [
  {
    icon: Link2,
    title: 'Интеграции платформ',
    description: 'Подключайте Coursera, edX, Stepik и другие',
    page: 'documentation'
  },
  {
    icon: BookOpen,
    title: 'Управление курсами',
    description: 'Объединяйте курсы с разных платформ в одном месте',
    page: 'course-management'
  },
  {
    icon: BarChart3,
    title: 'Аналитика обучения',
    description: 'Отслеживайте прогресс и получайте инсайты',
    page: 'progress-tracking'
  },
  {
    icon: CalendarDays,
    title: 'Умный календарь',
    description: 'Единое расписание дедлайнов со всех платформ',
    page: 'schedule-planning'
  },
  {
    icon: BellRing,
    title: 'Управление дедлайнами',
    description: 'Никогда не пропустите важный срок',
    page: 'deadline-management'
  },
  {
    icon: LayoutDashboard,
    title: 'Панель управления',
    description: 'Полный контроль над вашим обучением',
    page: 'documentation'
  }
];

const footerLinks = [
  {
    title: 'Возможности',
    items: [
      { label: 'Управление курсами', page: 'course-management' },
      { label: 'Отслеживание прогресса', page: 'progress-tracking' },
      { label: 'Управление дедлайнами', page: 'deadline-management' },
      { label: 'Планирование расписания', page: 'schedule-planning' }
    ]
  },
  {
    title: 'Поддержка',
    items: [
      { label: 'Документация', page: 'documentation' },
      { label: 'API Reference', page: 'api-reference' },
      { label: 'Статус системы', page: 'system-status' },
      { label: 'Связаться с нами', page: 'contact' }
    ]
  },
  {
    title: 'Правовая информация',
    items: [
      { label: 'Политика конфиденциальности', page: 'privacy-policy' },
      { label: 'Условия использования', page: 'terms-of-service' },
      { label: 'Cookie Policy', page: 'cookie-policy' },
      { label: 'Безопасность', page: 'security' }
    ]
  }
];

const primaryButton =
  'rounded-lg bg-gradient-to-br from-[#667eea] to-[#764ba2] px-6 py-3 font-medium text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg';

export function LandingPage({ onLoginClick, onRegisterClick }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <img src="/myepa-logo-clean.png" alt="My EPA" className="h-10 w-auto sm:h-12" />
          <span className="hidden bg-gradient-to-br from-[#667eea] to-[#764ba2] bg-clip-text text-lg font-bold tracking-widest text-transparent md:block">
            АГРЕГАТОР ОНЛАЙН ОБУЧЕНИЯ
          </span>
          <button
            onClick={onLoginClick}
            className="rounded-lg border border-[#667eea] px-5 py-2 text-sm font-medium text-[#5a67d8] transition hover:bg-[#667eea]/10"
          >
            Войти
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-6 pt-12 text-center sm:px-6 sm:pt-16">
        <h1 className="mx-auto max-w-3xl text-3xl font-bold leading-tight text-gray-900 sm:text-5xl">
          Все курсы, уроки, вебинары и экзамены — в одном календаре
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-gray-600 sm:text-lg">
          My EPA собирает ваше обучение с российских и международных площадок, напоминает о сроках
          и даёт ссылки прямо на уроки и материалы.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button onClick={onRegisterClick} className={primaryButton}>
            Начать бесплатно
          </button>
          <button
            onClick={onLoginClick}
            className="rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
          >
            У меня уже есть аккаунт
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="sr-only">Возможности</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(feature => (
            <Link
              key={feature.title}
              href={pathForPage(feature.page)}
              className="block rounded-xl border border-gray-200 bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#667eea]/10 text-[#5a67d8]">
                <feature.icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-gray-600">{feature.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <footer className="bg-[#1a1a1a] px-4 py-12 text-white sm:px-6">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <img src="/myepa-logo.png" alt="My EPA" className="mb-4 w-32" />
            <p className="text-xs text-gray-400">
              © {new Date().getFullYear()} My EPA. Все права защищены.
            </p>
          </div>
          {footerLinks.map(group => (
            <div key={group.title}>
              <h4 className="mb-4 text-sm font-semibold">{group.title}</h4>
              <ul className="space-y-2.5">
                {group.items.map(item => (
                  <li key={item.page}>
                    <Link href={pathForPage(item.page)} className="text-sm text-[#7aa7f7] hover:underline">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}
