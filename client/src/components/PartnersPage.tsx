import { Link } from 'wouter';
import { ArrowLeft, CalendarCheck, FileJson, Handshake, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { LanguageSwitcher } from './LandingPage';
import { useLang } from '../i18n';

// Иконки карточек; тексты — m.site.partners в том же порядке
const benefitIcons = [Users, CalendarCheck, Handshake];
const wayIcons = [FileJson, RefreshCw, CalendarCheck];

export function PartnersPage() {
  const { m } = useLang();
  const p = m.site.partners;
  const subject = encodeURIComponent(p.mailSubject);
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {m.common.toHome}
          </Link>
          <img src="/myepa-logo-clean.png" alt="My EPA" className="h-10 w-auto" />
          <LanguageSwitcher />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
          {p.title}
        </h1>
        <p className="mt-4 max-w-3xl text-lg text-gray-600">
          {p.intro}
        </p>

        <section className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
          {p.benefits.map((item, i) => {
            const Icon = benefitIcons[i];
            return (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-6">
                <Icon className="mb-3 h-7 w-7 text-[#5a67d8]" aria-hidden="true" />
                <h2 className="mb-2 font-semibold text-gray-900">{item.title}</h2>
                <p className="text-sm leading-relaxed text-gray-600">{item.text}</p>
              </div>
            );
          })}
        </section>

        <section className="mt-12">
          <h2 className="mb-5 text-2xl font-bold text-gray-900">{p.howTitle}</h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {p.ways.map((item, i) => {
              const Icon = wayIcons[i];
              return (
                <div key={i} className="rounded-xl border border-gray-200 bg-white p-6">
                  <Icon className="mb-3 h-6 w-6 text-[#5a67d8]" aria-hidden="true" />
                  <h3 className="mb-2 font-semibold text-gray-900">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-gray-600">{item.text}</p>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-sm text-gray-500">
            {p.specNote}
          </p>
        </section>

        <section className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
          <div>
            <h2 className="mb-4 text-2xl font-bold text-gray-900">{p.dataTitle}</h2>
            <ul className="space-y-2 text-gray-700">
              {p.dataItems.map(item => (
                <li key={item} className="flex gap-2">
                  <span className="text-[#5a67d8]" aria-hidden="true">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-gray-900">
              <ShieldCheck className="h-6 w-6 text-[#5a67d8]" aria-hidden="true" />
              {p.consentTitle}
            </h2>
            <p className="text-gray-700">
              {p.consentText}
            </p>
          </div>
        </section>

        <section className="mt-12 rounded-xl bg-gradient-to-br from-[#667eea] to-[#764ba2] p-8 text-white">
          <h2 className="text-2xl font-bold">{p.discussTitle}</h2>
          <p className="mt-2 text-white/90">
            {p.discussText}
          </p>
          <a
            href={`mailto:support@myepa.ru?subject=${subject}`}
            className="mt-5 inline-block rounded-lg bg-white px-5 py-2.5 font-medium text-[#5a67d8] hover:bg-gray-50"
          >
            support@myepa.ru
          </a>
        </section>
      </main>
    </div>
  );
}
