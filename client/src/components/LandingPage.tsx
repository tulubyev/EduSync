import { Link } from 'wouter';
import {
  BarChart3, BellRing, BookOpen, Briefcase, CalendarDays, GraduationCap, Link2, School, UserRound, Video
} from 'lucide-react';
import { pathForPage } from './FooterPages';
import { useLang } from '../i18n';
import { LanguageSwitcher } from './LanguageSwitcher';

interface LandingPageProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
}

// Карточки возможностей: тексты — m.site.landing.features в том же порядке
const features = [
  { icon: Link2, page: 'documentation' },
  { icon: BookOpen, page: 'course-management' },
  { icon: BarChart3, page: 'progress-tracking' },
  { icon: CalendarDays, page: 'schedule-planning' },
  { icon: BellRing, page: 'deadline-management' },
  { icon: Video, page: 'documentation' },
];

const segmentIcons = [UserRound, GraduationCap, School, Briefcase];

const primaryButton =
  'rounded-lg bg-gradient-to-br from-[#667eea] to-[#764ba2] px-6 py-3 font-medium text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg';

export { LanguageSwitcher };

export function LandingPage({ onLoginClick, onRegisterClick }: LandingPageProps) {
  const { m } = useLang();
  const l = m.site.landing;
  const footerLinks = [
    {
      title: l.footerFeatures,
      items: [
        { label: l.features[1].title, href: pathForPage('course-management') },
        { label: l.features[2].title, href: pathForPage('progress-tracking') },
        { label: l.features[4].title, href: pathForPage('deadline-management') },
        { label: l.features[3].title, href: pathForPage('schedule-planning') },
      ],
    },
    {
      title: l.footerSupport,
      items: [
        { label: l.forPlatforms, href: '/partners' },
        { label: l.documentation, href: pathForPage('documentation') },
        { label: l.api, href: pathForPage('api-reference') },
        { label: l.status, href: pathForPage('system-status') },
        { label: l.contact, href: pathForPage('contact') },
      ],
    },
    {
      title: l.footerLegal,
      items: [
        { label: l.privacy, href: pathForPage('privacy-policy') },
        { label: l.terms, href: pathForPage('terms-of-service') },
        { label: l.cookies, href: pathForPage('cookie-policy') },
        { label: l.security, href: pathForPage('security') },
      ],
    },
  ];
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <img src="/myepa-logo-clean.png" alt="My EPA" className="h-10 w-auto sm:h-12" />
          <span className="hidden bg-gradient-to-br from-[#667eea] to-[#764ba2] bg-clip-text text-lg font-bold tracking-widest text-transparent lg:block">
            {l.tagline}
          </span>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/partners" className="hidden text-sm font-medium text-gray-600 hover:text-gray-900 sm:inline">
              {l.forPlatforms}
            </Link>
            <LanguageSwitcher />
            <button
              onClick={onLoginClick}
              className="rounded-lg border border-[#667eea] px-4 py-2 text-sm font-medium text-[#5a67d8] transition hover:bg-[#667eea]/10"
            >
              {l.login}
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-6 pt-12 text-center sm:px-6 sm:pt-16">
        <h1 className="mx-auto max-w-3xl text-3xl font-bold leading-tight text-gray-900 sm:text-5xl">
          {l.heroTitle}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-gray-600 sm:text-lg">
          {l.heroText}
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button onClick={onRegisterClick} className={primaryButton}>
            {l.start}
          </button>
          <button
            onClick={onLoginClick}
            className="rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
          >
            {l.haveAccount}
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="sr-only">{l.featuresTitle}</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <Link
              key={i}
              href={pathForPage(feature.page)}
              className="block rounded-xl border border-gray-200 bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#667eea]/10 text-[#5a67d8]">
                <feature.icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">{l.features[i].title}</h3>
              <p className="text-sm leading-relaxed text-gray-600">{l.features[i].text}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <h2 className="mb-6 text-center text-2xl font-bold text-gray-900 sm:text-3xl">
          {l.segmentsTitle}
        </h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {l.segments.map((segment, i) => {
            const Icon = segmentIcons[i];
            return (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-6">
                <Icon className="mb-3 h-7 w-7 text-[#5a67d8]" aria-hidden="true" />
                <h3 className="mb-2 font-semibold text-gray-900">{segment.title}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{segment.text}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-xl bg-gradient-to-br from-[#667eea] to-[#764ba2] p-6 text-white sm:flex-row sm:p-8">
          <div>
            <h3 className="text-lg font-semibold">{l.partnerTitle}</h3>
            <p className="mt-1 text-sm text-white/90">
              {l.partnerText}
            </p>
          </div>
          <Link href="/partners" className="shrink-0 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-[#5a67d8] hover:bg-gray-50">
            {l.learnMore}
          </Link>
        </div>
      </section>

      <footer className="bg-[#1a1a1a] px-4 py-12 text-white sm:px-6">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <img src="/myepa-logo.png" alt="My EPA" className="mb-4 w-32" />
            <p className="text-xs text-gray-400">
              © {new Date().getFullYear()} My EPA. {l.rights}
            </p>
          </div>
          {footerLinks.map((group, i) => (
            <div key={i}>
              <h4 className="mb-4 text-sm font-semibold">{group.title}</h4>
              <ul className="space-y-2.5">
                {group.items.map(item => (
                  <li key={item.href + item.label}>
                    <Link href={item.href} className="text-sm text-[#7aa7f7] hover:underline">
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
