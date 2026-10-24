import { Link } from 'wouter';
import { ArrowLeft, CalendarCheck, FileJson, Handshake, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { LanguageSwitcher } from './LandingPage';
import { useLang } from '../i18n';

const benefits = [
  {
    icon: Users,
    title: { ru: 'Ученики доходят до конца', en: 'Learners finish courses' },
    text: {
      ru: 'Ваши уроки, вебинары и сроки стоят в общем календаре ученика рядом с работой и другими курсами, а напоминания приходят вовремя.',
      en: 'Your lessons, webinars and deadlines sit in the learner’s calendar next to work and other courses, with timely reminders.'
    }
  },
  {
    icon: CalendarCheck,
    title: { ru: 'Ссылки прямо в ваш кабинет', en: 'Links straight to your platform' },
    text: {
      ru: 'Каждое событие ведёт на конкретный урок, материал или вебинар у вас — ученик возвращается на площадку.',
      en: 'Every event links to the exact lesson, material or webinar on your platform, bringing learners back to you.'
    }
  },
  {
    icon: Handshake,
    title: { ru: 'Бесплатно для площадок', en: 'Free for platforms' },
    text: {
      ru: 'Обмен данными с My EPA ничего не стоит. Интеграция одна на всех учеников.',
      en: 'Data exchange with My EPA is free. One integration covers all your learners.'
    }
  }
];

const ways = [
  {
    icon: FileJson,
    title: { ru: 'Формат My EPA', en: 'My EPA format' },
    text: {
      ru: 'Открытый формат: вы публикуете выгрузку, которую мы забираем по расписанию, или присылаете изменения сами. Совместим с отраслевыми стандартами (LTI, OneRoster, xAPI).',
      en: 'An open format: publish a feed we fetch on schedule, or push changes to us. Compatible with industry standards (LTI, OneRoster, xAPI).'
    }
  },
  {
    icon: RefreshCw,
    title: { ru: 'Ваш API', en: 'Your API' },
    text: {
      ru: 'Если у площадки уже есть API, мы подключаемся к нему сами.',
      en: 'If your platform already has an API, we connect to it ourselves.'
    }
  },
  {
    icon: CalendarCheck,
    title: { ru: 'Календарь iCal', en: 'iCal calendar' },
    text: {
      ru: 'Самый быстрый старт: ссылка на календарь ученика с уроками и сроками.',
      en: 'The fastest start: a calendar link with the learner’s lessons and deadlines.'
    }
  }
];

const dataItems = [
  { ru: 'Программы, курсы и модули', en: 'Programmes, courses and modules' },
  { ru: 'Уроки и вебинары: время, длительность, ссылка', en: 'Lessons and webinars: time, duration, link' },
  { ru: 'Задания, дедлайны и экзамены', en: 'Assignments, deadlines and exams' },
  { ru: 'Ссылки на материалы', en: 'Links to materials' },
  { ru: 'Прогресс ученика (по желанию)', en: 'Learner progress (optional)' }
];

export function PartnersPage() {
  const { t } = useLang();
  const subject = encodeURIComponent(t({ ru: 'Партнёрство с My EPA', en: 'Partnership with My EPA' }));
  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t({ ru: 'На главную', en: 'Home' })}
          </Link>
          <img src="/myepa-logo-clean.png" alt="My EPA" className="h-10 w-auto" />
          <LanguageSwitcher />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
          {t({ ru: 'My EPA для образовательных площадок', en: 'My EPA for learning platforms' })}
        </h1>
        <p className="mt-4 max-w-3xl text-lg text-gray-600">
          {t({
            ru: 'Ученики учатся сразу на нескольких площадках. My EPA собирает их уроки, вебинары, задания и экзамены в один календарь с напоминаниями. Подключите обмен данными — и ваши курсы будут в этом календаре.',
            en: 'Learners study on several platforms at once. My EPA brings their lessons, webinars, assignments and exams into one calendar with reminders. Connect data exchange and your courses will be in that calendar.'
          })}
        </p>

        <section className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
          {benefits.map(item => (
            <div key={item.title.en} className="rounded-xl border border-gray-200 bg-white p-6">
              <item.icon className="mb-3 h-7 w-7 text-[#5a67d8]" aria-hidden="true" />
              <h2 className="mb-2 font-semibold text-gray-900">{t(item.title)}</h2>
              <p className="text-sm leading-relaxed text-gray-600">{t(item.text)}</p>
            </div>
          ))}
        </section>

        <section className="mt-12">
          <h2 className="mb-5 text-2xl font-bold text-gray-900">{t({ ru: 'Как подключиться', en: 'How to connect' })}</h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {ways.map(item => (
              <div key={item.title.en} className="rounded-xl border border-gray-200 bg-white p-6">
                <item.icon className="mb-3 h-6 w-6 text-[#5a67d8]" aria-hidden="true" />
                <h3 className="mb-2 font-semibold text-gray-900">{t(item.title)}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{t(item.text)}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-gray-500">
            {t({
              ru: 'Спецификация формата My EPA готовится и будет опубликована на этом сайте. Партнёры получают черновик и тестовый доступ раньше.',
              en: 'The My EPA format specification is in preparation and will be published on this site. Partners get the draft and test access earlier.'
            })}
          </p>
        </section>

        <section className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
          <div>
            <h2 className="mb-4 text-2xl font-bold text-gray-900">{t({ ru: 'Какие данные', en: 'What data' })}</h2>
            <ul className="space-y-2 text-gray-700">
              {dataItems.map(item => (
                <li key={item.en} className="flex gap-2">
                  <span className="text-[#5a67d8]" aria-hidden="true">•</span>
                  {t(item)}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-gray-900">
              <ShieldCheck className="h-6 w-6 text-[#5a67d8]" aria-hidden="true" />
              {t({ ru: 'Согласие ученика', en: 'Learner consent' })}
            </h2>
            <p className="text-gray-700">
              {t({
                ru: 'Данные передаются только после того, как ученик сам подключит вашу площадку в My EPA и даст согласие. Ученик может отключить площадку в любой момент.',
                en: 'Data is shared only after the learner connects your platform in My EPA and gives consent. The learner can disconnect at any time.'
              })}
            </p>
          </div>
        </section>

        <section className="mt-12 rounded-xl bg-gradient-to-br from-[#667eea] to-[#764ba2] p-8 text-white">
          <h2 className="text-2xl font-bold">{t({ ru: 'Обсудить подключение', en: 'Discuss integration' })}</h2>
          <p className="mt-2 text-white/90">
            {t({
              ru: 'Напишите нам: расскажите о площадке и о том, как у вас устроены курсы и расписание.',
              en: 'Write to us about your platform and how your courses and schedule are organised.'
            })}
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
