import { Link } from 'wouter';
import {
  BarChart3, BellRing, BookOpen, Briefcase, CalendarDays, GraduationCap, LayoutDashboard, Link2, School, UserRound
} from 'lucide-react';
import { pathForPage } from './FooterPages';
import { useLang } from '../i18n';
import { LanguageSwitcher } from './LanguageSwitcher';

interface LandingPageProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
}

const features = [
  {
    icon: Link2,
    title: { ru: 'Интеграции платформ', en: 'Platform integrations' },
    description: { ru: 'Подключайте Coursera, edX, Stepik и другие', en: 'Connect Coursera, edX, Stepik and more' },
    page: 'documentation'
  },
  {
    icon: BookOpen,
    title: { ru: 'Управление курсами', en: 'Course management' },
    description: { ru: 'Объединяйте курсы с разных платформ в одном месте', en: 'All your courses from different platforms in one place' },
    page: 'course-management'
  },
  {
    icon: BarChart3,
    title: { ru: 'Аналитика обучения', en: 'Learning analytics' },
    description: { ru: 'Отслеживайте прогресс и получайте инсайты', en: 'Track your progress and get insights' },
    page: 'progress-tracking'
  },
  {
    icon: CalendarDays,
    title: { ru: 'Умный календарь', en: 'Smart calendar' },
    description: { ru: 'Единое расписание дедлайнов со всех платформ', en: 'One schedule of deadlines from all platforms' },
    page: 'schedule-planning'
  },
  {
    icon: BellRing,
    title: { ru: 'Управление дедлайнами', en: 'Deadline management' },
    description: { ru: 'Никогда не пропустите важный срок', en: 'Never miss an important deadline' },
    page: 'deadline-management'
  },
  {
    icon: LayoutDashboard,
    title: { ru: 'Панель управления', en: 'Dashboard' },
    description: { ru: 'Полный контроль над вашим обучением', en: 'Full control over your learning' },
    page: 'documentation'
  }
];

const segments = [
  {
    icon: UserRound,
    title: { ru: 'Взрослым на онлайн-курсах', en: 'Adults taking online courses' },
    description: {
      ru: 'Несколько курсов на разных площадках и работа — одно расписание и напоминания до дедлайна.',
      en: 'Several courses on different platforms plus a job — one schedule and reminders before every deadline.'
    }
  },
  {
    icon: GraduationCap,
    title: { ru: 'Студентам', en: 'Students' },
    description: {
      ru: 'Курсы вуза и онлайн-курсы рядом: пары, задания и экзамены в одном календаре.',
      en: 'University and online courses side by side: classes, assignments and exams in one calendar.'
    }
  },
  {
    icon: School,
    title: { ru: 'Школьникам и родителям', en: 'School pupils and parents' },
    description: {
      ru: 'Онлайн-школа, репетиторы, олимпиады — ничего не забыто, родители видят расписание.',
      en: 'Online school, tutors, olympiads — nothing is forgotten, and parents can see the schedule.'
    }
  },
  {
    icon: Briefcase,
    title: { ru: 'Компаниям', en: 'Companies' },
    description: {
      ru: 'Сотрудник видит назначенные курсы рядом со своими и успевает пройти их в срок.',
      en: 'Employees see assigned training next to their own courses and finish it on time.'
    }
  }
];

const footerLinks = [
  {
    title: { ru: 'Возможности', en: 'Features' },
    items: [
      { label: { ru: 'Управление курсами', en: 'Course management' }, href: pathForPage('course-management') },
      { label: { ru: 'Отслеживание прогресса', en: 'Progress tracking' }, href: pathForPage('progress-tracking') },
      { label: { ru: 'Управление дедлайнами', en: 'Deadline management' }, href: pathForPage('deadline-management') },
      { label: { ru: 'Планирование расписания', en: 'Schedule planning' }, href: pathForPage('schedule-planning') }
    ]
  },
  {
    title: { ru: 'Поддержка', en: 'Support' },
    items: [
      { label: { ru: 'Для площадок', en: 'For platforms' }, href: '/partners' },
      { label: { ru: 'Документация', en: 'Documentation' }, href: pathForPage('documentation') },
      { label: { ru: 'API Reference', en: 'API Reference' }, href: pathForPage('api-reference') },
      { label: { ru: 'Статус системы', en: 'System status' }, href: pathForPage('system-status') },
      { label: { ru: 'Связаться с нами', en: 'Contact us' }, href: pathForPage('contact') }
    ]
  },
  {
    title: { ru: 'Правовая информация', en: 'Legal' },
    items: [
      { label: { ru: 'Политика конфиденциальности', en: 'Privacy policy' }, href: pathForPage('privacy-policy') },
      { label: { ru: 'Условия использования', en: 'Terms of use' }, href: pathForPage('terms-of-service') },
      { label: { ru: 'Cookie Policy', en: 'Cookie policy' }, href: pathForPage('cookie-policy') },
      { label: { ru: 'Безопасность', en: 'Security' }, href: pathForPage('security') }
    ]
  }
];

const primaryButton =
  'rounded-lg bg-gradient-to-br from-[#667eea] to-[#764ba2] px-6 py-3 font-medium text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg';

export { LanguageSwitcher };

export function LandingPage({ onLoginClick, onRegisterClick }: LandingPageProps) {
  const { t } = useLang();
  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <img src="/myepa-logo-clean.png" alt="My EPA" className="h-10 w-auto sm:h-12" />
          <span className="hidden bg-gradient-to-br from-[#667eea] to-[#764ba2] bg-clip-text text-lg font-bold tracking-widest text-transparent lg:block">
            {t({ ru: 'АГРЕГАТОР ОНЛАЙН ОБУЧЕНИЯ', en: 'ONLINE LEARNING AGGREGATOR' })}
          </span>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/partners" className="hidden text-sm font-medium text-gray-600 hover:text-gray-900 sm:inline">
              {t({ ru: 'Для площадок', en: 'For platforms' })}
            </Link>
            <LanguageSwitcher />
            <button
              onClick={onLoginClick}
              className="rounded-lg border border-[#667eea] px-4 py-2 text-sm font-medium text-[#5a67d8] transition hover:bg-[#667eea]/10"
            >
              {t({ ru: 'Войти', en: 'Log in' })}
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-6 pt-12 text-center sm:px-6 sm:pt-16">
        <h1 className="mx-auto max-w-3xl text-3xl font-bold leading-tight text-gray-900 sm:text-5xl">
          {t({
            ru: 'Все курсы, уроки, вебинары и экзамены — в одном календаре',
            en: 'All your courses, lessons, webinars and exams — in one calendar'
          })}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-gray-600 sm:text-lg">
          {t({
            ru: 'My EPA собирает ваше обучение с российских и международных площадок, напоминает о сроках и даёт ссылки прямо на уроки и материалы.',
            en: 'My EPA brings together your learning from platforms around the world, reminds you of deadlines and links straight to lessons and materials.'
          })}
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button onClick={onRegisterClick} className={primaryButton}>
            {t({ ru: 'Начать бесплатно', en: 'Get started for free' })}
          </button>
          <button
            onClick={onLoginClick}
            className="rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
          >
            {t({ ru: 'У меня уже есть аккаунт', en: 'I already have an account' })}
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="sr-only">{t({ ru: 'Возможности', en: 'Features' })}</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(feature => (
            <Link
              key={feature.title.en}
              href={pathForPage(feature.page)}
              className="block rounded-xl border border-gray-200 bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#667eea]/10 text-[#5a67d8]">
                <feature.icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">{t(feature.title)}</h3>
              <p className="text-sm leading-relaxed text-gray-600">{t(feature.description)}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <h2 className="mb-6 text-center text-2xl font-bold text-gray-900 sm:text-3xl">
          {t({ ru: 'Для кого My EPA', en: 'Who My EPA is for' })}
        </h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {segments.map(segment => (
            <div key={segment.title.en} className="rounded-xl border border-gray-200 bg-white p-6">
              <segment.icon className="mb-3 h-7 w-7 text-[#5a67d8]" aria-hidden="true" />
              <h3 className="mb-2 font-semibold text-gray-900">{t(segment.title)}</h3>
              <p className="text-sm leading-relaxed text-gray-600">{t(segment.description)}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-xl bg-gradient-to-br from-[#667eea] to-[#764ba2] p-6 text-white sm:flex-row sm:p-8">
          <div>
            <h3 className="text-lg font-semibold">{t({ ru: 'Вы — образовательная площадка?', en: 'Are you a learning platform?' })}</h3>
            <p className="mt-1 text-sm text-white/90">
              {t({
                ru: 'Подключите обмен данными с My EPA — ученики будут видеть ваши уроки и сроки в своём календаре.',
                en: 'Connect to My EPA — learners will see your lessons and deadlines in their calendar.'
              })}
            </p>
          </div>
          <Link href="/partners" className="shrink-0 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-[#5a67d8] hover:bg-gray-50">
            {t({ ru: 'Подробнее', en: 'Learn more' })}
          </Link>
        </div>
      </section>

      <footer className="bg-[#1a1a1a] px-4 py-12 text-white sm:px-6">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <img src="/myepa-logo.png" alt="My EPA" className="mb-4 w-32" />
            <p className="text-xs text-gray-400">
              © {new Date().getFullYear()} My EPA. {t({ ru: 'Все права защищены.', en: 'All rights reserved.' })}
            </p>
          </div>
          {footerLinks.map(group => (
            <div key={group.title.en}>
              <h4 className="mb-4 text-sm font-semibold">{t(group.title)}</h4>
              <ul className="space-y-2.5">
                {group.items.map(item => (
                  <li key={item.href + item.label.en}>
                    <Link href={item.href} className="text-sm text-[#7aa7f7] hover:underline">
                      {t(item.label)}
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
