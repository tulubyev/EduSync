import type { Lang } from '@shared/languages';

// Публичная часть сайта: главная, «Для площадок», страницы из подвала и правовые документы.
// Русский — исходный, остальные повторяют его форму (порядок и число пунктов тоже — так проверяет тест словарей).

/** Пункт списка: строка или [термин, пояснение] — термин выводится жирным */
export type SiteItem = string | readonly [string, string];

export interface SiteSection {
  title: string;
  text?: string[];
  items?: SiteItem[];
  steps?: SiteItem[];
  /** Блоки кода, первая строка — жирная */
  code?: string[][];
}

export interface SitePage {
  title: string;
  subtitle: string;
  sections: SiteSection[];
}

type Card = { title: string; text: string };

export interface SiteMessages {
  landing: {
    tagline: string;
    forPlatforms: string;
    login: string;
    heroTitle: string;
    heroText: string;
    start: string;
    haveAccount: string;
    featuresTitle: string;
    /** Порядок совпадает с карточками в LandingPage */
    features: [Card, Card, Card, Card, Card, Card];
    segmentsTitle: string;
    segments: [Card, Card, Card, Card];
    partnerTitle: string;
    partnerText: string;
    learnMore: string;
    rights: string;
    footerFeatures: string;
    footerSupport: string;
    footerLegal: string;
    documentation: string;
    api: string;
    status: string;
    contact: string;
    privacy: string;
    terms: string;
    cookies: string;
    security: string;
  };
  partners: {
    title: string;
    intro: string;
    benefits: [Card, Card, Card];
    howTitle: string;
    ways: [Card, Card, Card];
    specNote: string;
    dataTitle: string;
    dataItems: [string, string, string, string, string];
    consentTitle: string;
    consentText: string;
    discussTitle: string;
    discussText: string;
    mailSubject: string;
  };
  pages: {
    courses: SitePage;
    progress: SitePage;
    deadlines: SitePage;
    schedule: SitePage;
    docs: SitePage;
    api: SitePage;
    status: SitePage;
    contact: SitePage;
    security: SitePage;
    notFound: SitePage;
  };
  serviceStatus: {
    title: string;
    server: string;
    checking: string;
    up: string;
    down: string;
    checkedAt: (when: string) => string;
  };
  legal: {
    loadError: string;
    englishOnly: string;
  };
}

const ru: SiteMessages = {
  landing: {
    tagline: 'АГРЕГАТОР ОНЛАЙН-ОБУЧЕНИЯ',
    forPlatforms: 'Для площадок',
    login: 'Войти',
    heroTitle: 'Все курсы, уроки, вебинары и экзамены — в одном календаре',
    heroText: 'My EPA собирает ваше обучение с российских и международных площадок, показывает, что сделать сегодня, и даёт ссылки прямо на уроки и материалы.',
    start: 'Начать бесплатно',
    haveAccount: 'У меня уже есть аккаунт',
    featuresTitle: 'Возможности',
    features: [
      { title: 'Подключение площадок', text: 'Курсы и сроки с площадок, где вы учитесь, появляются сами' },
      { title: 'Программы и курсы', text: 'Курсы с разных площадок и свои — в одном месте' },
      { title: 'Прогресс', text: 'Сколько пройдено и сколько осталось' },
      { title: 'Календарь', text: 'Уроки, вебинары, задания и экзамены на неделю и месяц' },
      { title: 'Дедлайны', text: 'Что сделать сегодня и что уже просрочено' },
      { title: 'Запись вебинаров', text: 'Не успеваете на вебинар — запишем его по расписанию' },
    ],
    segmentsTitle: 'Для кого My EPA',
    segments: [
      { title: 'Взрослым на онлайн-курсах', text: 'Несколько курсов на разных площадках и работа — одно расписание и все сроки перед глазами.' },
      { title: 'Студентам', text: 'Курсы вуза и онлайн-курсы рядом: пары, задания и экзамены в одном календаре.' },
      { title: 'Школьникам и родителям', text: 'Онлайн-школа, репетиторы, олимпиады — ничего не забыто, родители видят расписание.' },
      { title: 'Компаниям', text: 'Сотрудник видит назначенные курсы рядом со своими и успевает пройти их в срок.' },
    ],
    partnerTitle: 'Вы — образовательная площадка?',
    partnerText: 'Подключите обмен данными с My EPA — ученики будут видеть ваши уроки и сроки в своём календаре.',
    learnMore: 'Подробнее',
    rights: 'Все права защищены.',
    footerFeatures: 'Возможности',
    footerSupport: 'Поддержка',
    footerLegal: 'Правовая информация',
    documentation: 'Как пользоваться',
    api: 'API',
    status: 'Статус сервиса',
    contact: 'Связаться с нами',
    privacy: 'Политика конфиденциальности',
    terms: 'Условия использования',
    cookies: 'Политика cookie',
    security: 'Безопасность',
  },
  partners: {
    title: 'My EPA для образовательных площадок',
    intro: 'Ученики учатся сразу на нескольких площадках. My EPA собирает их уроки, вебинары, задания и экзамены в один календарь. Подключите обмен данными — и ваши курсы будут в этом календаре.',
    benefits: [
      { title: 'Ученики доходят до конца', text: 'Ваши уроки, вебинары и сроки стоят в общем календаре ученика рядом с работой и другими курсами.' },
      { title: 'Ссылки прямо в ваш кабинет', text: 'Каждое событие ведёт на конкретный урок, материал или вебинар у вас — ученик возвращается на площадку.' },
      { title: 'Бесплатно для площадок', text: 'Обмен данными с My EPA ничего не стоит. Интеграция одна на всех учеников.' },
    ],
    howTitle: 'Как подключиться',
    ways: [
      { title: 'Формат My EPA', text: 'Открытый формат: вы публикуете выгрузку, которую мы забираем по расписанию, или присылаете изменения сами. Совместим с отраслевыми стандартами (LTI, OneRoster, xAPI).' },
      { title: 'Ваш API', text: 'Если у площадки уже есть API, мы подключаемся к нему сами.' },
      { title: 'Календарь iCal', text: 'Самый быстрый старт: ссылка на календарь ученика с уроками и сроками.' },
    ],
    specNote: 'Спецификация формата My EPA готовится и будет опубликована на этом сайте. Партнёры получают черновик и тестовый доступ раньше.',
    dataTitle: 'Какие данные',
    dataItems: [
      'Программы, курсы и модули',
      'Уроки и вебинары: время, длительность, ссылка',
      'Задания, дедлайны и экзамены',
      'Ссылки на материалы',
      'Прогресс ученика (по желанию)',
    ],
    consentTitle: 'Согласие ученика',
    consentText: 'Данные передаются только после того, как ученик сам подключит вашу площадку в My EPA и даст согласие. Ученик может отключить площадку в любой момент.',
    discussTitle: 'Обсудить подключение',
    discussText: 'Напишите нам: расскажите о площадке и о том, как у вас устроены курсы и расписание.',
    mailSubject: 'Партнёрство с My EPA',
  },
  pages: {
    courses: {
      title: 'Программы и курсы',
      subtitle: 'Курсы со всех площадок и свои — в одном списке',
      sections: [
        {
          title: 'Возможности',
          items: [
            ['Курсы с площадок', 'подключите площадку, и её курсы появятся сами'],
            ['Свои курсы', 'добавьте курс вручную: название, ссылка, категория'],
            ['Каталог', 'курсы по площадкам — добавьте нужный к себе одним нажатием'],
            ['Курс и календарь', 'уроки, задания и экзамены курса видны в общем календаре'],
          ],
        },
        {
          title: 'Как подключить площадку',
          steps: [
            'Откройте «Настройки» → «Платформы»',
            'Выберите площадку и войдите в свой аккаунт на ней',
            'Курсы и сроки загрузятся сами',
            'Отключить площадку можно в любой момент — её курсы и события исчезнут из My EPA',
          ],
        },
        {
          title: 'Площадки',
          text: ['Список площадок растёт: новые подключаются по мере готовности обмена данными. Если вы представляете площадку, загляните на страницу «Для площадок».'],
        },
      ],
    },
    progress: {
      title: 'Прогресс обучения',
      subtitle: 'Сколько пройдено и что впереди',
      sections: [
        {
          title: 'Что видно в аналитике',
          items: [
            ['Курсы', 'сколько всего, сколько завершено и сколько в процессе'],
            ['Прохождение', 'средний процент по всем курсам'],
            ['Время', 'часы обучения по длительности курсов'],
            ['Расходы', 'сколько потрачено на платные курсы'],
          ],
        },
        {
          title: 'Откуда данные',
          text: ['Прогресс курсов с подключённых площадок обновляется при синхронизации. У курсов, добавленных вручную, прогресс отмечаете вы.'],
        },
      ],
    },
    deadlines: {
      title: 'Дедлайны и сроки',
      subtitle: 'Задания, экзамены и сроки всех курсов — в одном списке',
      sections: [
        {
          title: 'Возможности',
          items: [
            ['Один список', 'сроки со всех площадок и ваши собственные'],
            ['Важность', 'от низкой до срочной — срочное видно сразу'],
            ['«Сегодня»', 'на главной — что сделать сегодня и что уже просрочено'],
            ['Быстрый ввод', 'фраза «Сдать эссе до пятницы» сама становится дедлайном'],
          ],
        },
        {
          title: 'Типы событий',
          items: ['Уроки', 'Вебинары', 'Задания', 'Экзамены', 'Дедлайны'],
        },
      ],
    },
    schedule: {
      title: 'Календарь',
      subtitle: 'Неделя и месяц учёбы на одном экране',
      sections: [
        {
          title: 'Возможности',
          items: [
            ['Неделя и месяц', 'уроки, вебинары, задания и экзамены всех курсов'],
            ['Часовой пояс', 'время показывается в выбранном поясе'],
            ['Ссылки', 'на урок, материалы и вход на вебинар — прямо из события'],
            ['Запись вебинара', 'не успеваете на вебинар — запланируйте запись из его карточки'],
          ],
        },
        {
          title: 'Быстрый ввод',
          text: ['Напишите событие обычной фразой — например, «Вебинар по Python завтра в 19:00 1ч» — и оно встанет в календарь. Быстрый ввод понимает русский, английский, французский, немецкий, испанский и итальянский.'],
        },
      ],
    },
    docs: {
      title: 'Как пользоваться',
      subtitle: 'Короткое руководство по My EPA',
      sections: [
        {
          title: 'Начало работы',
          steps: [
            ['Регистрация', 'создайте аккаунт по email'],
            ['Площадки', 'подключите площадки, на которых учитесь, или добавьте курсы вручную'],
            ['Календарь', 'добавьте уроки, вебинары и сроки, которых нет на площадках'],
            ['Каждый день', 'открывайте «Сегодня» на главной'],
          ],
        },
        {
          title: 'Разделы',
          items: [
            ['Главная', 'что на сегодня и ближайшие события'],
            ['Календарь', 'неделя и месяц'],
            ['Курсы', 'ваши курсы и каталог'],
            ['Дедлайны', 'все сроки'],
            ['Библиотека', 'материалы и сохранённые записи'],
            ['Записи', 'запись вебинаров по расписанию'],
            ['Платформы', 'подключённые площадки'],
            ['Настройки', 'профиль, площадки, уведомления'],
          ],
        },
        {
          title: 'Частые вопросы',
          items: [
            ['Как добавить курс вручную?', '«Курсы» → «Добавить курс»'],
            ['Как сменить язык?', 'переключатель языка в меню слева или вверху сайта'],
            ['Как записать вебинар?', '«Записи» → «Запланировать запись» или кнопка записи в карточке вебинара'],
          ],
        },
      ],
    },
    api: {
      title: 'API',
      subtitle: 'Для разработчиков',
      sections: [
        {
          title: 'Аутентификация',
          code: [
            ['POST /api/auth/login', 'Тело запроса: { identifier, password }', 'Ответ: { user, accessToken, refreshToken }'],
            ['POST /api/auth/register', 'Тело запроса: { firstName, lastName, email, password, phone?, country?, language? }', 'Ответ: { user, accessToken, refreshToken }'],
          ],
        },
        {
          title: 'Защищённые запросы',
          text: ['Все защищённые запросы требуют заголовок:'],
          code: [['Authorization: Bearer <accessToken>']],
        },
        {
          title: 'Лимиты запросов',
          items: ['Общие запросы: 1000 за 15 минут', 'Вход: 5 неудачных попыток за 15 минут'],
        },
      ],
    },
    status: {
      title: 'Статус сервиса',
      subtitle: 'Текущее состояние My EPA',
      sections: [],
    },
    contact: {
      title: 'Связаться с нами',
      subtitle: 'Мы всегда рады помочь',
      sections: [
        {
          title: 'Способы связи',
          items: [
            ['Email', 'support@myepa.ru'],
            ['Telegram', '@myepa_support'],
            ['Время ответа', 'в течение 24 часов'],
          ],
        },
        {
          title: 'Часы работы поддержки',
          text: ['Понедельник — пятница: 9:00 — 18:00 (МСК)', 'Суббота и воскресенье — выходные'],
        },
        {
          title: 'Сообщить о проблеме',
          text: ['При обращении, пожалуйста, укажите:'],
          items: ['Описание проблемы', 'Шаги, чтобы её повторить', 'Скриншоты (если есть)', 'Ваш браузер и устройство'],
        },
      ],
    },
    security: {
      title: 'Безопасность',
      subtitle: 'Как мы защищаем ваши данные',
      sections: [
        {
          title: 'Шифрование',
          items: ['Все соединения защищены HTTPS/TLS', 'Ключи доступа к подключённым площадкам хранятся зашифрованными (AES-256-GCM)'],
        },
        {
          title: 'Аутентификация',
          items: ['Пароли хранятся только в виде хеша', 'Ограничение числа попыток входа'],
        },
        {
          title: 'Защита от атак',
          items: [
            'Заголовки безопасности (Helmet) и ограничение источников запросов (CORS)',
            'Запросы к базе — через ORM с параметрами, без склейки SQL',
            'Обновление зависимостей с известными уязвимостями',
          ],
        },
        {
          title: 'Сообщить об уязвимости',
          text: ['Если вы обнаружили уязвимость, пожалуйста, сообщите нам: security@myepa.ru'],
        },
      ],
    },
    notFound: {
      title: 'Страница не найдена',
      subtitle: 'Запрашиваемая страница не существует.',
      sections: [],
    },
  },
  serviceStatus: {
    title: 'Проверка доступности',
    server: 'Сервер My EPA',
    checking: 'Проверяем…',
    up: 'Работает',
    down: 'Недоступен',
    checkedAt: (when) => `Проверено из вашего браузера: ${when}.`,
  },
  legal: {
    loadError: 'Не удалось загрузить документ. Напишите нам: support@myepa.ru',
    englishOnly: 'Документ пока доступен на английском языке.',
  },
};

const en: SiteMessages = {
  landing: {
    tagline: 'ONLINE LEARNING AGGREGATOR',
    forPlatforms: 'For platforms',
    login: 'Log in',
    heroTitle: 'All your courses, lessons, webinars and exams — in one calendar',
    heroText: 'My EPA brings together your learning from platforms around the world, shows what to do today and links straight to lessons and materials.',
    start: 'Get started for free',
    haveAccount: 'I already have an account',
    featuresTitle: 'Features',
    features: [
      { title: 'Platform connections', text: 'Courses and deadlines from the platforms you study on appear by themselves' },
      { title: 'Programmes and courses', text: 'Courses from different platforms and your own — in one place' },
      { title: 'Progress', text: 'How much is done and how much is left' },
      { title: 'Calendar', text: 'Lessons, webinars, assignments and exams for the week and month' },
      { title: 'Deadlines', text: 'What to do today and what is already overdue' },
      { title: 'Webinar recording', text: 'Can’t make it to a webinar? We’ll record it on schedule' },
    ],
    segmentsTitle: 'Who My EPA is for',
    segments: [
      { title: 'Adults taking online courses', text: 'Several courses on different platforms plus a job — one schedule with every deadline in sight.' },
      { title: 'Students', text: 'University and online courses side by side: classes, assignments and exams in one calendar.' },
      { title: 'School pupils and parents', text: 'Online school, tutors, olympiads — nothing is forgotten, and parents can see the schedule.' },
      { title: 'Companies', text: 'Employees see assigned training next to their own courses and finish it on time.' },
    ],
    partnerTitle: 'Are you a learning platform?',
    partnerText: 'Connect to My EPA — learners will see your lessons and deadlines in their calendar.',
    learnMore: 'Learn more',
    rights: 'All rights reserved.',
    footerFeatures: 'Features',
    footerSupport: 'Support',
    footerLegal: 'Legal',
    documentation: 'How to use',
    api: 'API',
    status: 'Service status',
    contact: 'Contact us',
    privacy: 'Privacy policy',
    terms: 'Terms of use',
    cookies: 'Cookie policy',
    security: 'Security',
  },
  partners: {
    title: 'My EPA for learning platforms',
    intro: 'Learners study on several platforms at once. My EPA brings their lessons, webinars, assignments and exams into one calendar. Connect data exchange and your courses will be in that calendar.',
    benefits: [
      { title: 'Learners finish courses', text: 'Your lessons, webinars and deadlines sit in the learner’s calendar next to work and other courses.' },
      { title: 'Links straight to your platform', text: 'Every event links to the exact lesson, material or webinar on your platform, bringing learners back to you.' },
      { title: 'Free for platforms', text: 'Data exchange with My EPA is free. One integration covers all your learners.' },
    ],
    howTitle: 'How to connect',
    ways: [
      { title: 'My EPA format', text: 'An open format: publish a feed we fetch on schedule, or push changes to us. Compatible with industry standards (LTI, OneRoster, xAPI).' },
      { title: 'Your API', text: 'If your platform already has an API, we connect to it ourselves.' },
      { title: 'iCal calendar', text: 'The fastest start: a calendar link with the learner’s lessons and deadlines.' },
    ],
    specNote: 'The My EPA format specification is in preparation and will be published on this site. Partners get the draft and test access earlier.',
    dataTitle: 'What data',
    dataItems: [
      'Programmes, courses and modules',
      'Lessons and webinars: time, duration, link',
      'Assignments, deadlines and exams',
      'Links to materials',
      'Learner progress (optional)',
    ],
    consentTitle: 'Learner consent',
    consentText: 'Data is shared only after the learner connects your platform in My EPA and gives consent. The learner can disconnect at any time.',
    discussTitle: 'Discuss integration',
    discussText: 'Write to us about your platform and how your courses and schedule are organised.',
    mailSubject: 'Partnership with My EPA',
  },
  pages: {
    courses: {
      title: 'Programmes and courses',
      subtitle: 'Courses from every platform and your own — in one list',
      sections: [
        {
          title: 'Features',
          items: [
            ['Platform courses', 'connect a platform and its courses appear by themselves'],
            ['Your own courses', 'add a course by hand: title, link, category'],
            ['Catalogue', 'courses grouped by platform — add one to yours in a click'],
            ['Course and calendar', 'the course’s lessons, assignments and exams show up in your calendar'],
          ],
        },
        {
          title: 'How to connect a platform',
          steps: [
            'Open “Settings” → “Platforms”',
            'Choose the platform and sign in to your account there',
            'Courses and deadlines load by themselves',
            'You can disconnect a platform at any time — its courses and events disappear from My EPA',
          ],
        },
        {
          title: 'Platforms',
          text: ['The list of platforms keeps growing: new ones are added as data exchange becomes ready. If you represent a platform, see the “For platforms” page.'],
        },
      ],
    },
    progress: {
      title: 'Learning progress',
      subtitle: 'How much is done and what lies ahead',
      sections: [
        {
          title: 'What analytics shows',
          items: [
            ['Courses', 'how many in total, completed and in progress'],
            ['Completion', 'average percentage across all courses'],
            ['Time', 'hours of learning based on course length'],
            ['Spending', 'how much you spent on paid courses'],
          ],
        },
        {
          title: 'Where the data comes from',
          text: ['Progress of courses from connected platforms is updated on sync. For courses you added by hand, you mark progress yourself.'],
        },
      ],
    },
    deadlines: {
      title: 'Deadlines',
      subtitle: 'Assignments, exams and deadlines of all courses — in one list',
      sections: [
        {
          title: 'Features',
          items: [
            ['One list', 'deadlines from all platforms plus your own'],
            ['Priority', 'from low to urgent — urgent items stand out'],
            ['“Today”', 'the home page shows what to do today and what is overdue'],
            ['Quick add', 'a phrase like “Submit essay by Friday” becomes a deadline'],
          ],
        },
        {
          title: 'Event types',
          items: ['Lessons', 'Webinars', 'Assignments', 'Exams', 'Deadlines'],
        },
      ],
    },
    schedule: {
      title: 'Calendar',
      subtitle: 'A week and a month of study on one screen',
      sections: [
        {
          title: 'Features',
          items: [
            ['Week and month', 'lessons, webinars, assignments and exams of all courses'],
            ['Time zone', 'times are shown in the zone you choose'],
            ['Links', 'to the lesson, materials and webinar room — right from the event'],
            ['Webinar recording', 'can’t make it? Schedule a recording from the webinar card'],
          ],
        },
        {
          title: 'Quick add',
          text: ['Type an event as a plain phrase — for example, “Python webinar tomorrow at 7pm 1h” — and it lands in your calendar. Quick add understands Russian, English, French, German, Spanish and Italian.'],
        },
      ],
    },
    docs: {
      title: 'How to use',
      subtitle: 'A short guide to My EPA',
      sections: [
        {
          title: 'Getting started',
          steps: [
            ['Sign up', 'create an account with your email'],
            ['Platforms', 'connect the platforms you study on, or add courses by hand'],
            ['Calendar', 'add lessons, webinars and deadlines that are not on any platform'],
            ['Every day', 'open “Today” on the home page'],
          ],
        },
        {
          title: 'Sections',
          items: [
            ['Home', 'what is on today and upcoming events'],
            ['Calendar', 'week and month'],
            ['Courses', 'your courses and the catalogue'],
            ['Deadlines', 'all deadlines'],
            ['Library', 'materials and saved recordings'],
            ['Recordings', 'scheduled webinar recording'],
            ['Platforms', 'connected platforms'],
            ['Settings', 'profile, platforms, notifications'],
          ],
        },
        {
          title: 'FAQ',
          items: [
            ['How do I add a course by hand?', '“Courses” → “Add course”'],
            ['How do I change the language?', 'the language switcher in the left menu or at the top of the site'],
            ['How do I record a webinar?', '“Recordings” → “Schedule a recording”, or the record button on the webinar card'],
          ],
        },
      ],
    },
    api: {
      title: 'API',
      subtitle: 'For developers',
      sections: [
        {
          title: 'Authentication',
          code: [
            ['POST /api/auth/login', 'Request body: { identifier, password }', 'Response: { user, accessToken, refreshToken }'],
            ['POST /api/auth/register', 'Request body: { firstName, lastName, email, password, phone?, country?, language? }', 'Response: { user, accessToken, refreshToken }'],
          ],
        },
        {
          title: 'Protected requests',
          text: ['All protected requests require the header:'],
          code: [['Authorization: Bearer <accessToken>']],
        },
        {
          title: 'Rate limits',
          items: ['General requests: 1000 per 15 minutes', 'Login: 5 failed attempts per 15 minutes'],
        },
      ],
    },
    status: {
      title: 'Service status',
      subtitle: 'Current state of My EPA',
      sections: [],
    },
    contact: {
      title: 'Contact us',
      subtitle: 'We are always happy to help',
      sections: [
        {
          title: 'How to reach us',
          items: [
            ['Email', 'support@myepa.ru'],
            ['Telegram', '@myepa_support'],
            ['Response time', 'within 24 hours'],
          ],
        },
        {
          title: 'Support hours',
          text: ['Monday to Friday: 9:00–18:00 Moscow time (UTC+3)', 'Saturday and Sunday: closed'],
        },
        {
          title: 'Report a problem',
          text: ['When you write to us, please include:'],
          items: ['What went wrong', 'Steps to reproduce it', 'Screenshots (if any)', 'Your browser and device'],
        },
      ],
    },
    security: {
      title: 'Security',
      subtitle: 'How we protect your data',
      sections: [
        {
          title: 'Encryption',
          items: ['All connections are protected by HTTPS/TLS', 'Access keys to connected platforms are stored encrypted (AES-256-GCM)'],
        },
        {
          title: 'Authentication',
          items: ['Passwords are stored only as hashes', 'Limited number of login attempts'],
        },
        {
          title: 'Protection against attacks',
          items: [
            'Security headers (Helmet) and restricted request origins (CORS)',
            'Database queries go through an ORM with parameters, no string-built SQL',
            'Dependencies with known vulnerabilities are updated',
          ],
        },
        {
          title: 'Report a vulnerability',
          text: ['If you find a vulnerability, please let us know: security@myepa.ru'],
        },
      ],
    },
    notFound: {
      title: 'Page not found',
      subtitle: 'The page you requested does not exist.',
      sections: [],
    },
  },
  serviceStatus: {
    title: 'Availability check',
    server: 'My EPA server',
    checking: 'Checking…',
    up: 'Operational',
    down: 'Unavailable',
    checkedAt: (when) => `Checked from your browser: ${when}.`,
  },
  legal: {
    loadError: 'Could not load the document. Contact us: support@myepa.ru',
    englishOnly: 'This document is available in English for now.',
  },
};

const fr: SiteMessages = {
  landing: {
    tagline: 'AGRÉGATEUR DE FORMATION EN LIGNE',
    forPlatforms: 'Pour les plateformes',
    login: 'Se connecter',
    heroTitle: 'Tous vos cours, leçons, webinaires et examens — dans un seul calendrier',
    heroText: 'My EPA rassemble votre formation venant de plateformes du monde entier, montre ce qu’il faut faire aujourd’hui et renvoie directement aux leçons et aux ressources.',
    start: 'Commencer gratuitement',
    haveAccount: 'J’ai déjà un compte',
    featuresTitle: 'Fonctionnalités',
    features: [
      { title: 'Connexion des plateformes', text: 'Les cours et échéances des plateformes où vous étudiez apparaissent tout seuls' },
      { title: 'Programmes et cours', text: 'Les cours de différentes plateformes et les vôtres — au même endroit' },
      { title: 'Progression', text: 'Ce qui est fait et ce qui reste' },
      { title: 'Calendrier', text: 'Leçons, webinaires, devoirs et examens sur la semaine et le mois' },
      { title: 'Échéances', text: 'Ce qu’il faut faire aujourd’hui et ce qui est déjà en retard' },
      { title: 'Enregistrement de webinaires', text: 'Vous ne pouvez pas assister au webinaire ? Nous l’enregistrons à l’heure prévue' },
    ],
    segmentsTitle: 'Pour qui est My EPA',
    segments: [
      { title: 'Adultes en formation en ligne', text: 'Plusieurs cours sur différentes plateformes et un travail — un seul planning, toutes les échéances sous les yeux.' },
      { title: 'Étudiants', text: 'Cours universitaires et cours en ligne côte à côte : séances, devoirs et examens dans un seul calendrier.' },
      { title: 'Élèves et parents', text: 'École en ligne, cours particuliers, olympiades — rien n’est oublié et les parents voient le planning.' },
      { title: 'Entreprises', text: 'Le salarié voit les formations assignées à côté des siennes et les termine à temps.' },
    ],
    partnerTitle: 'Vous êtes une plateforme de formation ?',
    partnerText: 'Connectez-vous à My EPA — les apprenants verront vos leçons et échéances dans leur calendrier.',
    learnMore: 'En savoir plus',
    rights: 'Tous droits réservés.',
    footerFeatures: 'Fonctionnalités',
    footerSupport: 'Assistance',
    footerLegal: 'Mentions légales',
    documentation: 'Mode d’emploi',
    api: 'API',
    status: 'État du service',
    contact: 'Nous contacter',
    privacy: 'Politique de confidentialité',
    terms: 'Conditions d’utilisation',
    cookies: 'Politique relative aux cookies',
    security: 'Sécurité',
  },
  partners: {
    title: 'My EPA pour les plateformes de formation',
    intro: 'Les apprenants étudient sur plusieurs plateformes à la fois. My EPA réunit leurs leçons, webinaires, devoirs et examens dans un seul calendrier. Connectez l’échange de données et vos cours y figureront.',
    benefits: [
      { title: 'Les apprenants vont jusqu’au bout', text: 'Vos leçons, webinaires et échéances figurent dans le calendrier de l’apprenant, à côté de son travail et de ses autres cours.' },
      { title: 'Des liens vers votre plateforme', text: 'Chaque événement mène à la leçon, à la ressource ou au webinaire précis chez vous — l’apprenant revient sur votre plateforme.' },
      { title: 'Gratuit pour les plateformes', text: 'L’échange de données avec My EPA ne coûte rien. Une seule intégration pour tous vos apprenants.' },
    ],
    howTitle: 'Comment se connecter',
    ways: [
      { title: 'Format My EPA', text: 'Un format ouvert : vous publiez un flux que nous récupérons selon un calendrier, ou vous nous envoyez les changements. Compatible avec les standards du secteur (LTI, OneRoster, xAPI).' },
      { title: 'Votre API', text: 'Si votre plateforme a déjà une API, nous nous y connectons nous-mêmes.' },
      { title: 'Calendrier iCal', text: 'Le démarrage le plus rapide : un lien vers le calendrier de l’apprenant avec ses leçons et échéances.' },
    ],
    specNote: 'La spécification du format My EPA est en préparation et sera publiée sur ce site. Les partenaires reçoivent le brouillon et un accès de test en avance.',
    dataTitle: 'Quelles données',
    dataItems: [
      'Programmes, cours et modules',
      'Leçons et webinaires : heure, durée, lien',
      'Devoirs, échéances et examens',
      'Liens vers les ressources',
      'Progression de l’apprenant (facultatif)',
    ],
    consentTitle: 'Consentement de l’apprenant',
    consentText: 'Les données ne sont transmises qu’après que l’apprenant a lui-même connecté votre plateforme dans My EPA et donné son consentement. Il peut la déconnecter à tout moment.',
    discussTitle: 'Discuter de l’intégration',
    discussText: 'Écrivez-nous : parlez-nous de votre plateforme et de l’organisation de vos cours et de votre planning.',
    mailSubject: 'Partenariat avec My EPA',
  },
  pages: {
    courses: {
      title: 'Programmes et cours',
      subtitle: 'Les cours de toutes les plateformes et les vôtres — dans une seule liste',
      sections: [
        {
          title: 'Fonctionnalités',
          items: [
            ['Cours des plateformes', 'connectez une plateforme et ses cours apparaissent tout seuls'],
            ['Vos propres cours', 'ajoutez un cours à la main : titre, lien, catégorie'],
            ['Catalogue', 'les cours classés par plateforme — ajoutez-en un chez vous en un clic'],
            ['Cours et calendrier', 'les leçons, devoirs et examens du cours apparaissent dans votre calendrier'],
          ],
        },
        {
          title: 'Comment connecter une plateforme',
          steps: [
            'Ouvrez « Paramètres » → « Plateformes »',
            'Choisissez la plateforme et connectez-vous à votre compte',
            'Les cours et échéances se chargent tout seuls',
            'Vous pouvez déconnecter une plateforme à tout moment — ses cours et événements disparaissent de My EPA',
          ],
        },
        {
          title: 'Plateformes',
          text: ['La liste des plateformes s’agrandit : de nouvelles s’ajoutent dès que l’échange de données est prêt. Si vous représentez une plateforme, consultez la page « Pour les plateformes ».'],
        },
      ],
    },
    progress: {
      title: 'Progression',
      subtitle: 'Ce qui est fait et ce qui vous attend',
      sections: [
        {
          title: 'Ce que montrent les statistiques',
          items: [
            ['Cours', 'combien au total, terminés et en cours'],
            ['Avancement', 'pourcentage moyen sur tous les cours'],
            ['Temps', 'heures d’apprentissage selon la durée des cours'],
            ['Dépenses', 'combien vous avez dépensé pour les cours payants'],
          ],
        },
        {
          title: 'D’où viennent les données',
          text: ['La progression des cours des plateformes connectées se met à jour à chaque synchronisation. Pour les cours ajoutés à la main, c’est vous qui la notez.'],
        },
      ],
    },
    deadlines: {
      title: 'Échéances',
      subtitle: 'Devoirs, examens et échéances de tous les cours — dans une seule liste',
      sections: [
        {
          title: 'Fonctionnalités',
          items: [
            ['Une seule liste', 'les échéances de toutes les plateformes et les vôtres'],
            ['Priorité', 'de basse à urgente — l’urgent se voit tout de suite'],
            ['« Aujourd’hui »', 'l’accueil montre ce qu’il faut faire aujourd’hui et ce qui est en retard'],
            ['Saisie rapide', 'une phrase comme « Rendre le devoir avant vendredi » devient une échéance'],
          ],
        },
        {
          title: 'Types d’événements',
          items: ['Leçons', 'Webinaires', 'Devoirs', 'Examens', 'Échéances'],
        },
      ],
    },
    schedule: {
      title: 'Calendrier',
      subtitle: 'Une semaine et un mois d’études sur un seul écran',
      sections: [
        {
          title: 'Fonctionnalités',
          items: [
            ['Semaine et mois', 'leçons, webinaires, devoirs et examens de tous les cours'],
            ['Fuseau horaire', 'les heures s’affichent dans le fuseau choisi'],
            ['Liens', 'vers la leçon, les ressources et l’accès au webinaire — directement depuis l’événement'],
            ['Enregistrement de webinaire', 'vous ne pourrez pas y être ? Programmez l’enregistrement depuis la fiche du webinaire'],
          ],
        },
        {
          title: 'Saisie rapide',
          text: ['Écrivez l’événement comme une phrase — par exemple « Webinaire Python demain à 19h 1h » — et il s’ajoute au calendrier. La saisie rapide comprend le russe, l’anglais, le français, l’allemand, l’espagnol et l’italien.'],
        },
      ],
    },
    docs: {
      title: 'Mode d’emploi',
      subtitle: 'Un court guide de My EPA',
      sections: [
        {
          title: 'Pour commencer',
          steps: [
            ['Inscription', 'créez un compte avec votre e-mail'],
            ['Plateformes', 'connectez les plateformes où vous étudiez ou ajoutez des cours à la main'],
            ['Calendrier', 'ajoutez les leçons, webinaires et échéances qui ne sont sur aucune plateforme'],
            ['Chaque jour', 'ouvrez « Aujourd’hui » sur l’accueil'],
          ],
        },
        {
          title: 'Rubriques',
          items: [
            ['Accueil', 'le programme du jour et les prochains événements'],
            ['Calendrier', 'semaine et mois'],
            ['Cours', 'vos cours et le catalogue'],
            ['Échéances', 'toutes les échéances'],
            ['Bibliothèque', 'ressources et enregistrements sauvegardés'],
            ['Enregistrements', 'enregistrement programmé des webinaires'],
            ['Plateformes', 'plateformes connectées'],
            ['Paramètres', 'profil, plateformes, notifications'],
          ],
        },
        {
          title: 'Questions fréquentes',
          items: [
            ['Comment ajouter un cours à la main ?', '« Cours » → « Ajouter un cours »'],
            ['Comment changer de langue ?', 'le sélecteur de langue dans le menu de gauche ou en haut du site'],
            ['Comment enregistrer un webinaire ?', '« Enregistrements » → « Programmer un enregistrement », ou le bouton d’enregistrement sur la fiche du webinaire'],
          ],
        },
      ],
    },
    api: {
      title: 'API',
      subtitle: 'Pour les développeurs',
      sections: [
        {
          title: 'Authentification',
          code: [
            ['POST /api/auth/login', 'Corps de la requête : { identifier, password }', 'Réponse : { user, accessToken, refreshToken }'],
            ['POST /api/auth/register', 'Corps de la requête : { firstName, lastName, email, password, phone?, country?, language? }', 'Réponse : { user, accessToken, refreshToken }'],
          ],
        },
        {
          title: 'Requêtes protégées',
          text: ['Toutes les requêtes protégées exigent l’en-tête :'],
          code: [['Authorization: Bearer <accessToken>']],
        },
        {
          title: 'Limites de requêtes',
          items: ['Requêtes générales : 1000 par 15 minutes', 'Connexion : 5 tentatives échouées par 15 minutes'],
        },
      ],
    },
    status: {
      title: 'État du service',
      subtitle: 'État actuel de My EPA',
      sections: [],
    },
    contact: {
      title: 'Nous contacter',
      subtitle: 'Nous sommes toujours heureux de vous aider',
      sections: [
        {
          title: 'Comment nous joindre',
          items: [
            ['E-mail', 'support@myepa.ru'],
            ['Telegram', '@myepa_support'],
            ['Délai de réponse', 'sous 24 heures'],
          ],
        },
        {
          title: 'Horaires de l’assistance',
          text: ['Du lundi au vendredi : 9h00–18h00, heure de Moscou (UTC+3)', 'Samedi et dimanche : fermé'],
        },
        {
          title: 'Signaler un problème',
          text: ['Lorsque vous nous écrivez, indiquez s’il vous plaît :'],
          items: ['Ce qui ne va pas', 'Les étapes pour le reproduire', 'Des captures d’écran (le cas échéant)', 'Votre navigateur et votre appareil'],
        },
      ],
    },
    security: {
      title: 'Sécurité',
      subtitle: 'Comment nous protégeons vos données',
      sections: [
        {
          title: 'Chiffrement',
          items: ['Toutes les connexions sont protégées par HTTPS/TLS', 'Les clés d’accès aux plateformes connectées sont stockées chiffrées (AES-256-GCM)'],
        },
        {
          title: 'Authentification',
          items: ['Les mots de passe sont stockés uniquement sous forme de hachage', 'Nombre limité de tentatives de connexion'],
        },
        {
          title: 'Protection contre les attaques',
          items: [
            'En-têtes de sécurité (Helmet) et origines des requêtes limitées (CORS)',
            'Requêtes à la base via un ORM avec paramètres, sans SQL assemblé à la main',
            'Mise à jour des dépendances présentant des vulnérabilités connues',
          ],
        },
        {
          title: 'Signaler une vulnérabilité',
          text: ['Si vous découvrez une vulnérabilité, merci de nous la signaler : security@myepa.ru'],
        },
      ],
    },
    notFound: {
      title: 'Page introuvable',
      subtitle: 'La page demandée n’existe pas.',
      sections: [],
    },
  },
  serviceStatus: {
    title: 'Vérification de disponibilité',
    server: 'Serveur My EPA',
    checking: 'Vérification…',
    up: 'Opérationnel',
    down: 'Indisponible',
    checkedAt: (when) => `Vérifié depuis votre navigateur : ${when}.`,
  },
  legal: {
    loadError: 'Impossible de charger le document. Écrivez-nous : support@myepa.ru',
    englishOnly: 'Ce document est pour l’instant disponible en anglais.',
  },
};

const de: SiteMessages = {
  landing: {
    tagline: 'AGGREGATOR FÜR ONLINE-LERNEN',
    forPlatforms: 'Für Plattformen',
    login: 'Anmelden',
    heroTitle: 'Alle Kurse, Lektionen, Webinare und Prüfungen — in einem Kalender',
    heroText: 'My EPA bündelt Ihr Lernen von Plattformen aus aller Welt, zeigt, was heute ansteht, und verlinkt direkt zu Lektionen und Materialien.',
    start: 'Kostenlos starten',
    haveAccount: 'Ich habe schon ein Konto',
    featuresTitle: 'Funktionen',
    features: [
      { title: 'Plattformen verbinden', text: 'Kurse und Fristen der Plattformen, auf denen Sie lernen, erscheinen von selbst' },
      { title: 'Programme und Kurse', text: 'Kurse verschiedener Plattformen und eigene — an einem Ort' },
      { title: 'Fortschritt', text: 'Wie viel geschafft ist und wie viel noch fehlt' },
      { title: 'Kalender', text: 'Lektionen, Webinare, Aufgaben und Prüfungen für Woche und Monat' },
      { title: 'Fristen', text: 'Was heute zu tun ist und was schon überfällig ist' },
      { title: 'Webinar-Aufnahme', text: 'Keine Zeit fürs Webinar? Wir nehmen es nach Plan auf' },
    ],
    segmentsTitle: 'Für wen ist My EPA',
    segments: [
      { title: 'Erwachsene in Online-Kursen', text: 'Mehrere Kurse auf verschiedenen Plattformen und ein Job — ein Plan, alle Fristen im Blick.' },
      { title: 'Studierende', text: 'Uni-Kurse und Online-Kurse nebeneinander: Veranstaltungen, Aufgaben und Prüfungen in einem Kalender.' },
      { title: 'Schüler und Eltern', text: 'Online-Schule, Nachhilfe, Olympiaden — nichts wird vergessen, und die Eltern sehen den Plan.' },
      { title: 'Unternehmen', text: 'Mitarbeitende sehen zugewiesene Schulungen neben ihren eigenen Kursen und schließen sie rechtzeitig ab.' },
    ],
    partnerTitle: 'Sie sind eine Lernplattform?',
    partnerText: 'Verbinden Sie sich mit My EPA — Lernende sehen Ihre Lektionen und Fristen in ihrem Kalender.',
    learnMore: 'Mehr erfahren',
    rights: 'Alle Rechte vorbehalten.',
    footerFeatures: 'Funktionen',
    footerSupport: 'Hilfe',
    footerLegal: 'Rechtliches',
    documentation: 'Anleitung',
    api: 'API',
    status: 'Dienststatus',
    contact: 'Kontakt',
    privacy: 'Datenschutzerklärung',
    terms: 'Nutzungsbedingungen',
    cookies: 'Cookie-Richtlinie',
    security: 'Sicherheit',
  },
  partners: {
    title: 'My EPA für Lernplattformen',
    intro: 'Lernende sind auf mehreren Plattformen gleichzeitig unterwegs. My EPA bündelt ihre Lektionen, Webinare, Aufgaben und Prüfungen in einem Kalender. Verbinden Sie den Datenaustausch — und Ihre Kurse stehen in diesem Kalender.',
    benefits: [
      { title: 'Lernende bleiben dran', text: 'Ihre Lektionen, Webinare und Fristen stehen im Kalender der Lernenden neben Arbeit und anderen Kursen.' },
      { title: 'Links direkt zu Ihnen', text: 'Jedes Ereignis führt zur konkreten Lektion, zum Material oder Webinar bei Ihnen — die Lernenden kommen auf Ihre Plattform zurück.' },
      { title: 'Kostenlos für Plattformen', text: 'Der Datenaustausch mit My EPA kostet nichts. Eine Integration für alle Ihre Lernenden.' },
    ],
    howTitle: 'So verbinden Sie sich',
    ways: [
      { title: 'My-EPA-Format', text: 'Ein offenes Format: Sie veröffentlichen einen Export, den wir nach Plan abholen, oder senden uns Änderungen selbst. Kompatibel mit Branchenstandards (LTI, OneRoster, xAPI).' },
      { title: 'Ihre API', text: 'Wenn Ihre Plattform bereits eine API hat, binden wir sie selbst an.' },
      { title: 'iCal-Kalender', text: 'Der schnellste Start: ein Kalenderlink mit den Lektionen und Fristen der Lernenden.' },
    ],
    specNote: 'Die Spezifikation des My-EPA-Formats wird vorbereitet und auf dieser Website veröffentlicht. Partner erhalten den Entwurf und einen Testzugang früher.',
    dataTitle: 'Welche Daten',
    dataItems: [
      'Programme, Kurse und Module',
      'Lektionen und Webinare: Zeit, Dauer, Link',
      'Aufgaben, Fristen und Prüfungen',
      'Links zu Materialien',
      'Fortschritt der Lernenden (optional)',
    ],
    consentTitle: 'Einwilligung der Lernenden',
    consentText: 'Daten werden erst übertragen, nachdem die Lernenden Ihre Plattform selbst in My EPA verbunden und eingewilligt haben. Sie können die Verbindung jederzeit trennen.',
    discussTitle: 'Integration besprechen',
    discussText: 'Schreiben Sie uns: Erzählen Sie von Ihrer Plattform und davon, wie Ihre Kurse und Ihr Zeitplan aufgebaut sind.',
    mailSubject: 'Partnerschaft mit My EPA',
  },
  pages: {
    courses: {
      title: 'Programme und Kurse',
      subtitle: 'Kurse aller Plattformen und eigene — in einer Liste',
      sections: [
        {
          title: 'Funktionen',
          items: [
            ['Kurse von Plattformen', 'verbinden Sie eine Plattform, und ihre Kurse erscheinen von selbst'],
            ['Eigene Kurse', 'fügen Sie einen Kurs von Hand hinzu: Titel, Link, Kategorie'],
            ['Katalog', 'Kurse nach Plattformen — mit einem Klick zu Ihren hinzufügen'],
            ['Kurs und Kalender', 'Lektionen, Aufgaben und Prüfungen des Kurses stehen in Ihrem Kalender'],
          ],
        },
        {
          title: 'So verbinden Sie eine Plattform',
          steps: [
            'Öffnen Sie „Einstellungen“ → „Plattformen“',
            'Wählen Sie die Plattform und melden Sie sich dort in Ihrem Konto an',
            'Kurse und Fristen werden von selbst geladen',
            'Sie können eine Plattform jederzeit trennen — ihre Kurse und Ereignisse verschwinden aus My EPA',
          ],
        },
        {
          title: 'Plattformen',
          text: ['Die Liste der Plattformen wächst: Neue kommen hinzu, sobald der Datenaustausch bereit ist. Wenn Sie eine Plattform vertreten, sehen Sie sich die Seite „Für Plattformen“ an.'],
        },
      ],
    },
    progress: {
      title: 'Lernfortschritt',
      subtitle: 'Was geschafft ist und was noch kommt',
      sections: [
        {
          title: 'Was die Statistik zeigt',
          items: [
            ['Kurse', 'wie viele insgesamt, abgeschlossen und in Bearbeitung'],
            ['Abschluss', 'durchschnittlicher Prozentsatz über alle Kurse'],
            ['Zeit', 'Lernstunden nach Kursdauer'],
            ['Ausgaben', 'wie viel Sie für kostenpflichtige Kurse ausgegeben haben'],
          ],
        },
        {
          title: 'Woher die Daten kommen',
          text: ['Der Fortschritt von Kursen verbundener Plattformen wird bei der Synchronisierung aktualisiert. Bei Kursen, die Sie von Hand hinzugefügt haben, tragen Sie ihn selbst ein.'],
        },
      ],
    },
    deadlines: {
      title: 'Fristen',
      subtitle: 'Aufgaben, Prüfungen und Fristen aller Kurse — in einer Liste',
      sections: [
        {
          title: 'Funktionen',
          items: [
            ['Eine Liste', 'Fristen aller Plattformen und Ihre eigenen'],
            ['Wichtigkeit', 'von niedrig bis dringend — Dringendes fällt sofort auf'],
            ['„Heute“', 'die Startseite zeigt, was heute zu tun ist und was überfällig ist'],
            ['Schnelleingabe', 'ein Satz wie „Hausaufgabe bis Freitag“ wird zur Frist'],
          ],
        },
        {
          title: 'Ereignistypen',
          items: ['Lektionen', 'Webinare', 'Aufgaben', 'Prüfungen', 'Fristen'],
        },
      ],
    },
    schedule: {
      title: 'Kalender',
      subtitle: 'Eine Woche und ein Monat Lernen auf einem Bildschirm',
      sections: [
        {
          title: 'Funktionen',
          items: [
            ['Woche und Monat', 'Lektionen, Webinare, Aufgaben und Prüfungen aller Kurse'],
            ['Zeitzone', 'Zeiten werden in der gewählten Zone angezeigt'],
            ['Links', 'zur Lektion, zu Materialien und zum Webinarraum — direkt aus dem Ereignis'],
            ['Webinar-Aufnahme', 'keine Zeit? Planen Sie die Aufnahme direkt aus der Webinarkarte'],
          ],
        },
        {
          title: 'Schnelleingabe',
          text: ['Schreiben Sie das Ereignis als normalen Satz — zum Beispiel „Webinar Python morgen um 19 Uhr 1 Stunde“ — und es landet im Kalender. Die Schnelleingabe versteht Russisch, Englisch, Französisch, Deutsch, Spanisch und Italienisch.'],
        },
      ],
    },
    docs: {
      title: 'Anleitung',
      subtitle: 'Eine kurze Einführung in My EPA',
      sections: [
        {
          title: 'Erste Schritte',
          steps: [
            ['Registrierung', 'erstellen Sie ein Konto mit Ihrer E-Mail'],
            ['Plattformen', 'verbinden Sie die Plattformen, auf denen Sie lernen, oder fügen Sie Kurse von Hand hinzu'],
            ['Kalender', 'tragen Sie Lektionen, Webinare und Fristen ein, die auf keiner Plattform stehen'],
            ['Jeden Tag', 'öffnen Sie „Heute“ auf der Startseite'],
          ],
        },
        {
          title: 'Bereiche',
          items: [
            ['Startseite', 'was heute ansteht und die nächsten Ereignisse'],
            ['Kalender', 'Woche und Monat'],
            ['Kurse', 'Ihre Kurse und der Katalog'],
            ['Fristen', 'alle Fristen'],
            ['Bibliothek', 'Materialien und gespeicherte Aufnahmen'],
            ['Aufnahmen', 'geplante Aufnahme von Webinaren'],
            ['Plattformen', 'verbundene Plattformen'],
            ['Einstellungen', 'Profil, Plattformen, Benachrichtigungen'],
          ],
        },
        {
          title: 'Häufige Fragen',
          items: [
            ['Wie füge ich einen Kurs von Hand hinzu?', '„Kurse“ → „Kurs hinzufügen“'],
            ['Wie ändere ich die Sprache?', 'mit dem Sprachumschalter im linken Menü oder oben auf der Website'],
            ['Wie nehme ich ein Webinar auf?', '„Aufnahmen“ → „Aufnahme planen“ oder die Aufnahmeschaltfläche auf der Webinarkarte'],
          ],
        },
      ],
    },
    api: {
      title: 'API',
      subtitle: 'Für Entwickler',
      sections: [
        {
          title: 'Authentifizierung',
          code: [
            ['POST /api/auth/login', 'Anfrage: { identifier, password }', 'Antwort: { user, accessToken, refreshToken }'],
            ['POST /api/auth/register', 'Anfrage: { firstName, lastName, email, password, phone?, country?, language? }', 'Antwort: { user, accessToken, refreshToken }'],
          ],
        },
        {
          title: 'Geschützte Anfragen',
          text: ['Alle geschützten Anfragen benötigen den Header:'],
          code: [['Authorization: Bearer <accessToken>']],
        },
        {
          title: 'Anfragelimits',
          items: ['Allgemeine Anfragen: 1000 pro 15 Minuten', 'Anmeldung: 5 Fehlversuche pro 15 Minuten'],
        },
      ],
    },
    status: {
      title: 'Dienststatus',
      subtitle: 'Aktueller Zustand von My EPA',
      sections: [],
    },
    contact: {
      title: 'Kontakt',
      subtitle: 'Wir helfen gern',
      sections: [
        {
          title: 'So erreichen Sie uns',
          items: [
            ['E-Mail', 'support@myepa.ru'],
            ['Telegram', '@myepa_support'],
            ['Antwortzeit', 'innerhalb von 24 Stunden'],
          ],
        },
        {
          title: 'Supportzeiten',
          text: ['Montag bis Freitag: 9:00–18:00 Moskauer Zeit (UTC+3)', 'Samstag und Sonntag: geschlossen'],
        },
        {
          title: 'Problem melden',
          text: ['Bitte geben Sie in Ihrer Nachricht an:'],
          items: ['Was nicht funktioniert', 'Schritte, um es nachzustellen', 'Screenshots (falls vorhanden)', 'Ihren Browser und Ihr Gerät'],
        },
      ],
    },
    security: {
      title: 'Sicherheit',
      subtitle: 'Wie wir Ihre Daten schützen',
      sections: [
        {
          title: 'Verschlüsselung',
          items: ['Alle Verbindungen sind durch HTTPS/TLS geschützt', 'Zugangsschlüssel zu verbundenen Plattformen werden verschlüsselt gespeichert (AES-256-GCM)'],
        },
        {
          title: 'Authentifizierung',
          items: ['Passwörter werden nur als Hash gespeichert', 'Begrenzte Zahl von Anmeldeversuchen'],
        },
        {
          title: 'Schutz vor Angriffen',
          items: [
            'Sicherheits-Header (Helmet) und eingeschränkte Anfrageursprünge (CORS)',
            'Datenbankabfragen über ein ORM mit Parametern, ohne zusammengesetztes SQL',
            'Abhängigkeiten mit bekannten Schwachstellen werden aktualisiert',
          ],
        },
        {
          title: 'Schwachstelle melden',
          text: ['Wenn Sie eine Schwachstelle finden, melden Sie sie bitte an: security@myepa.ru'],
        },
      ],
    },
    notFound: {
      title: 'Seite nicht gefunden',
      subtitle: 'Die angeforderte Seite existiert nicht.',
      sections: [],
    },
  },
  serviceStatus: {
    title: 'Erreichbarkeitsprüfung',
    server: 'My-EPA-Server',
    checking: 'Wird geprüft…',
    up: 'In Betrieb',
    down: 'Nicht erreichbar',
    checkedAt: (when) => `Aus Ihrem Browser geprüft: ${when}.`,
  },
  legal: {
    loadError: 'Das Dokument konnte nicht geladen werden. Schreiben Sie uns: support@myepa.ru',
    englishOnly: 'Dieses Dokument ist vorerst auf Englisch verfügbar.',
  },
};

const es: SiteMessages = {
  landing: {
    tagline: 'AGREGADOR DE APRENDIZAJE EN LÍNEA',
    forPlatforms: 'Para plataformas',
    login: 'Entrar',
    heroTitle: 'Todos tus cursos, clases, webinars y exámenes — en un solo calendario',
    heroText: 'My EPA reúne tu aprendizaje de plataformas de todo el mundo, muestra qué hacer hoy y enlaza directamente a las clases y los materiales.',
    start: 'Empezar gratis',
    haveAccount: 'Ya tengo una cuenta',
    featuresTitle: 'Funciones',
    features: [
      { title: 'Conexión de plataformas', text: 'Los cursos y plazos de las plataformas donde estudias aparecen solos' },
      { title: 'Programas y cursos', text: 'Cursos de distintas plataformas y los tuyos — en un solo lugar' },
      { title: 'Progreso', text: 'Cuánto llevas hecho y cuánto falta' },
      { title: 'Calendario', text: 'Clases, webinars, tareas y exámenes de la semana y del mes' },
      { title: 'Plazos', text: 'Qué hacer hoy y qué ya está vencido' },
      { title: 'Grabación de webinars', text: '¿No llegas al webinar? Lo grabamos a la hora programada' },
    ],
    segmentsTitle: 'Para quién es My EPA',
    segments: [
      { title: 'Adultos en cursos en línea', text: 'Varios cursos en distintas plataformas y el trabajo — un solo horario con todos los plazos a la vista.' },
      { title: 'Universitarios', text: 'Asignaturas de la universidad y cursos en línea juntos: clases, tareas y exámenes en un calendario.' },
      { title: 'Escolares y padres', text: 'Escuela en línea, clases particulares, olimpiadas — nada se olvida y los padres ven el horario.' },
      { title: 'Empresas', text: 'El empleado ve los cursos asignados junto a los suyos y los termina a tiempo.' },
    ],
    partnerTitle: '¿Eres una plataforma educativa?',
    partnerText: 'Conéctate con My EPA — los alumnos verán tus clases y plazos en su calendario.',
    learnMore: 'Más información',
    rights: 'Todos los derechos reservados.',
    footerFeatures: 'Funciones',
    footerSupport: 'Ayuda',
    footerLegal: 'Información legal',
    documentation: 'Cómo usarlo',
    api: 'API',
    status: 'Estado del servicio',
    contact: 'Contacto',
    privacy: 'Política de privacidad',
    terms: 'Condiciones de uso',
    cookies: 'Política de cookies',
    security: 'Seguridad',
  },
  partners: {
    title: 'My EPA para plataformas educativas',
    intro: 'Los alumnos estudian en varias plataformas a la vez. My EPA reúne sus clases, webinars, tareas y exámenes en un solo calendario. Conecta el intercambio de datos y tus cursos estarán en ese calendario.',
    benefits: [
      { title: 'Los alumnos terminan los cursos', text: 'Tus clases, webinars y plazos están en el calendario del alumno, junto al trabajo y a otros cursos.' },
      { title: 'Enlaces directos a tu plataforma', text: 'Cada evento lleva a la clase, el material o el webinar concreto en tu plataforma — el alumno vuelve contigo.' },
      { title: 'Gratis para plataformas', text: 'El intercambio de datos con My EPA no cuesta nada. Una sola integración para todos tus alumnos.' },
    ],
    howTitle: 'Cómo conectarse',
    ways: [
      { title: 'Formato My EPA', text: 'Un formato abierto: publicas una exportación que recogemos según un horario, o nos envías los cambios tú. Compatible con los estándares del sector (LTI, OneRoster, xAPI).' },
      { title: 'Tu API', text: 'Si tu plataforma ya tiene API, nos conectamos nosotros.' },
      { title: 'Calendario iCal', text: 'El inicio más rápido: un enlace al calendario del alumno con sus clases y plazos.' },
    ],
    specNote: 'La especificación del formato My EPA está en preparación y se publicará en este sitio. Los socios reciben el borrador y un acceso de prueba antes.',
    dataTitle: 'Qué datos',
    dataItems: [
      'Programas, cursos y módulos',
      'Clases y webinars: hora, duración, enlace',
      'Tareas, plazos y exámenes',
      'Enlaces a materiales',
      'Progreso del alumno (opcional)',
    ],
    consentTitle: 'Consentimiento del alumno',
    consentText: 'Los datos solo se transmiten después de que el alumno conecte tu plataforma en My EPA y dé su consentimiento. Puede desconectarla en cualquier momento.',
    discussTitle: 'Hablar de la integración',
    discussText: 'Escríbenos: cuéntanos sobre tu plataforma y cómo organizas los cursos y el horario.',
    mailSubject: 'Colaboración con My EPA',
  },
  pages: {
    courses: {
      title: 'Programas y cursos',
      subtitle: 'Cursos de todas las plataformas y los tuyos — en una sola lista',
      sections: [
        {
          title: 'Funciones',
          items: [
            ['Cursos de plataformas', 'conecta una plataforma y sus cursos aparecen solos'],
            ['Tus propios cursos', 'añade un curso a mano: título, enlace, categoría'],
            ['Catálogo', 'cursos agrupados por plataforma — añade uno a los tuyos con un clic'],
            ['Curso y calendario', 'las clases, tareas y exámenes del curso aparecen en tu calendario'],
          ],
        },
        {
          title: 'Cómo conectar una plataforma',
          steps: [
            'Abre «Ajustes» → «Plataformas»',
            'Elige la plataforma e inicia sesión en tu cuenta',
            'Los cursos y plazos se cargan solos',
            'Puedes desconectar una plataforma cuando quieras — sus cursos y eventos desaparecen de My EPA',
          ],
        },
        {
          title: 'Plataformas',
          text: ['La lista de plataformas crece: se añaden nuevas en cuanto el intercambio de datos está listo. Si representas a una plataforma, visita la página «Para plataformas».'],
        },
      ],
    },
    progress: {
      title: 'Progreso',
      subtitle: 'Qué llevas hecho y qué viene',
      sections: [
        {
          title: 'Qué muestran las estadísticas',
          items: [
            ['Cursos', 'cuántos en total, terminados y en curso'],
            ['Avance', 'porcentaje medio de todos los cursos'],
            ['Tiempo', 'horas de estudio según la duración de los cursos'],
            ['Gastos', 'cuánto has gastado en cursos de pago'],
          ],
        },
        {
          title: 'De dónde salen los datos',
          text: ['El progreso de los cursos de plataformas conectadas se actualiza al sincronizar. En los cursos añadidos a mano, el progreso lo marcas tú.'],
        },
      ],
    },
    deadlines: {
      title: 'Plazos',
      subtitle: 'Tareas, exámenes y plazos de todos los cursos — en una sola lista',
      sections: [
        {
          title: 'Funciones',
          items: [
            ['Una sola lista', 'plazos de todas las plataformas y los tuyos'],
            ['Importancia', 'de baja a urgente — lo urgente se ve enseguida'],
            ['«Hoy»', 'la página de inicio muestra qué hacer hoy y qué está vencido'],
            ['Entrada rápida', 'una frase como «Tarea para el lunes» se convierte en un plazo'],
          ],
        },
        {
          title: 'Tipos de eventos',
          items: ['Clases', 'Webinars', 'Tareas', 'Exámenes', 'Plazos'],
        },
      ],
    },
    schedule: {
      title: 'Calendario',
      subtitle: 'Una semana y un mes de estudio en una sola pantalla',
      sections: [
        {
          title: 'Funciones',
          items: [
            ['Semana y mes', 'clases, webinars, tareas y exámenes de todos los cursos'],
            ['Zona horaria', 'las horas se muestran en la zona que elijas'],
            ['Enlaces', 'a la clase, los materiales y la sala del webinar — directamente desde el evento'],
            ['Grabación de webinar', '¿no llegas? Programa la grabación desde la ficha del webinar'],
          ],
        },
        {
          title: 'Entrada rápida',
          text: ['Escribe el evento como una frase — por ejemplo, «Webinar de Python mañana a las 19:00 1 hora» — y aparecerá en el calendario. La entrada rápida entiende ruso, inglés, francés, alemán, español e italiano.'],
        },
      ],
    },
    docs: {
      title: 'Cómo usarlo',
      subtitle: 'Una guía breve de My EPA',
      sections: [
        {
          title: 'Primeros pasos',
          steps: [
            ['Registro', 'crea una cuenta con tu correo'],
            ['Plataformas', 'conecta las plataformas donde estudias o añade cursos a mano'],
            ['Calendario', 'añade las clases, webinars y plazos que no están en ninguna plataforma'],
            ['Cada día', 'abre «Hoy» en la página de inicio'],
          ],
        },
        {
          title: 'Secciones',
          items: [
            ['Inicio', 'lo de hoy y los próximos eventos'],
            ['Calendario', 'semana y mes'],
            ['Cursos', 'tus cursos y el catálogo'],
            ['Plazos', 'todos los plazos'],
            ['Biblioteca', 'materiales y grabaciones guardadas'],
            ['Grabaciones', 'grabación programada de webinars'],
            ['Plataformas', 'plataformas conectadas'],
            ['Ajustes', 'perfil, plataformas, notificaciones'],
          ],
        },
        {
          title: 'Preguntas frecuentes',
          items: [
            ['¿Cómo añado un curso a mano?', '«Cursos» → «Añadir curso»'],
            ['¿Cómo cambio el idioma?', 'con el selector de idioma del menú izquierdo o de la parte superior del sitio'],
            ['¿Cómo grabo un webinar?', '«Grabaciones» → «Programar grabación», o el botón de grabar en la ficha del webinar'],
          ],
        },
      ],
    },
    api: {
      title: 'API',
      subtitle: 'Para desarrolladores',
      sections: [
        {
          title: 'Autenticación',
          code: [
            ['POST /api/auth/login', 'Cuerpo de la petición: { identifier, password }', 'Respuesta: { user, accessToken, refreshToken }'],
            ['POST /api/auth/register', 'Cuerpo de la petición: { firstName, lastName, email, password, phone?, country?, language? }', 'Respuesta: { user, accessToken, refreshToken }'],
          ],
        },
        {
          title: 'Peticiones protegidas',
          text: ['Todas las peticiones protegidas requieren la cabecera:'],
          code: [['Authorization: Bearer <accessToken>']],
        },
        {
          title: 'Límites de peticiones',
          items: ['Peticiones generales: 1000 cada 15 minutos', 'Inicio de sesión: 5 intentos fallidos cada 15 minutos'],
        },
      ],
    },
    status: {
      title: 'Estado del servicio',
      subtitle: 'Estado actual de My EPA',
      sections: [],
    },
    contact: {
      title: 'Contacto',
      subtitle: 'Siempre encantados de ayudar',
      sections: [
        {
          title: 'Cómo contactarnos',
          items: [
            ['Correo', 'support@myepa.ru'],
            ['Telegram', '@myepa_support'],
            ['Tiempo de respuesta', 'en 24 horas'],
          ],
        },
        {
          title: 'Horario de soporte',
          text: ['De lunes a viernes: 9:00–18:00, hora de Moscú (UTC+3)', 'Sábado y domingo: cerrado'],
        },
        {
          title: 'Informar de un problema',
          text: ['Cuando nos escribas, indica por favor:'],
          items: ['Qué ha fallado', 'Los pasos para reproducirlo', 'Capturas de pantalla (si las hay)', 'Tu navegador y dispositivo'],
        },
      ],
    },
    security: {
      title: 'Seguridad',
      subtitle: 'Cómo protegemos tus datos',
      sections: [
        {
          title: 'Cifrado',
          items: ['Todas las conexiones están protegidas con HTTPS/TLS', 'Las claves de acceso a las plataformas conectadas se guardan cifradas (AES-256-GCM)'],
        },
        {
          title: 'Autenticación',
          items: ['Las contraseñas se guardan solo como hash', 'Número limitado de intentos de inicio de sesión'],
        },
        {
          title: 'Protección frente a ataques',
          items: [
            'Cabeceras de seguridad (Helmet) y orígenes de peticiones limitados (CORS)',
            'Consultas a la base de datos mediante un ORM con parámetros, sin SQL concatenado',
            'Actualización de dependencias con vulnerabilidades conocidas',
          ],
        },
        {
          title: 'Informar de una vulnerabilidad',
          text: ['Si encuentras una vulnerabilidad, avísanos: security@myepa.ru'],
        },
      ],
    },
    notFound: {
      title: 'Página no encontrada',
      subtitle: 'La página solicitada no existe.',
      sections: [],
    },
  },
  serviceStatus: {
    title: 'Comprobación de disponibilidad',
    server: 'Servidor de My EPA',
    checking: 'Comprobando…',
    up: 'Funciona',
    down: 'No disponible',
    checkedAt: (when) => `Comprobado desde tu navegador: ${when}.`,
  },
  legal: {
    loadError: 'No se pudo cargar el documento. Escríbenos: support@myepa.ru',
    englishOnly: 'Por ahora este documento está disponible en inglés.',
  },
};

const it: SiteMessages = {
  landing: {
    tagline: 'AGGREGATORE DI FORMAZIONE ONLINE',
    forPlatforms: 'Per le piattaforme',
    login: 'Accedi',
    heroTitle: 'Tutti i tuoi corsi, lezioni, webinar ed esami — in un unico calendario',
    heroText: 'My EPA riunisce la tua formazione da piattaforme di tutto il mondo, mostra cosa fare oggi e porta direttamente a lezioni e materiali.',
    start: 'Inizia gratis',
    haveAccount: 'Ho già un account',
    featuresTitle: 'Funzioni',
    features: [
      { title: 'Collegamento delle piattaforme', text: 'Corsi e scadenze delle piattaforme dove studi compaiono da soli' },
      { title: 'Programmi e corsi', text: 'Corsi di piattaforme diverse e i tuoi — in un unico posto' },
      { title: 'Progressi', text: 'Quanto hai fatto e quanto manca' },
      { title: 'Calendario', text: 'Lezioni, webinar, compiti ed esami della settimana e del mese' },
      { title: 'Scadenze', text: 'Cosa fare oggi e cosa è già scaduto' },
      { title: 'Registrazione dei webinar', text: 'Non riesci a seguire il webinar? Lo registriamo all’ora programmata' },
    ],
    segmentsTitle: 'Per chi è My EPA',
    segments: [
      { title: 'Adulti nei corsi online', text: 'Più corsi su piattaforme diverse e il lavoro — un solo orario con tutte le scadenze sotto gli occhi.' },
      { title: 'Studenti universitari', text: 'Corsi universitari e online fianco a fianco: lezioni, compiti ed esami in un unico calendario.' },
      { title: 'Studenti delle scuole e genitori', text: 'Scuola online, ripetizioni, olimpiadi — non si dimentica nulla e i genitori vedono l’orario.' },
      { title: 'Aziende', text: 'Il dipendente vede i corsi assegnati accanto ai propri e li completa in tempo.' },
    ],
    partnerTitle: 'Sei una piattaforma di formazione?',
    partnerText: 'Collegati a My EPA — gli studenti vedranno le tue lezioni e scadenze nel loro calendario.',
    learnMore: 'Scopri di più',
    rights: 'Tutti i diritti riservati.',
    footerFeatures: 'Funzioni',
    footerSupport: 'Assistenza',
    footerLegal: 'Note legali',
    documentation: 'Come si usa',
    api: 'API',
    status: 'Stato del servizio',
    contact: 'Contattaci',
    privacy: 'Informativa sulla privacy',
    terms: 'Termini di utilizzo',
    cookies: 'Cookie policy',
    security: 'Sicurezza',
  },
  partners: {
    title: 'My EPA per le piattaforme di formazione',
    intro: 'Gli studenti studiano su più piattaforme contemporaneamente. My EPA riunisce le loro lezioni, webinar, compiti ed esami in un unico calendario. Collega lo scambio di dati e i tuoi corsi saranno in quel calendario.',
    benefits: [
      { title: 'Gli studenti arrivano in fondo', text: 'Le tue lezioni, webinar e scadenze stanno nel calendario dello studente accanto al lavoro e agli altri corsi.' },
      { title: 'Link diretti alla tua piattaforma', text: 'Ogni evento porta alla lezione, al materiale o al webinar preciso da te — lo studente torna sulla piattaforma.' },
      { title: 'Gratis per le piattaforme', text: 'Lo scambio di dati con My EPA non costa nulla. Un’unica integrazione per tutti i tuoi studenti.' },
    ],
    howTitle: 'Come collegarsi',
    ways: [
      { title: 'Formato My EPA', text: 'Un formato aperto: pubblichi un’esportazione che preleviamo secondo un orario, oppure ci invii tu le modifiche. Compatibile con gli standard del settore (LTI, OneRoster, xAPI).' },
      { title: 'La tua API', text: 'Se la tua piattaforma ha già un’API, ci colleghiamo noi.' },
      { title: 'Calendario iCal', text: 'L’avvio più rapido: un link al calendario dello studente con lezioni e scadenze.' },
    ],
    specNote: 'La specifica del formato My EPA è in preparazione e verrà pubblicata su questo sito. I partner ricevono prima la bozza e un accesso di prova.',
    dataTitle: 'Quali dati',
    dataItems: [
      'Programmi, corsi e moduli',
      'Lezioni e webinar: ora, durata, link',
      'Compiti, scadenze ed esami',
      'Link ai materiali',
      'Progressi dello studente (facoltativo)',
    ],
    consentTitle: 'Consenso dello studente',
    consentText: 'I dati vengono trasmessi solo dopo che lo studente ha collegato la tua piattaforma in My EPA e ha dato il consenso. Può scollegarla in qualsiasi momento.',
    discussTitle: 'Parliamo dell’integrazione',
    discussText: 'Scrivici: raccontaci della tua piattaforma e di come sono organizzati i corsi e l’orario.',
    mailSubject: 'Collaborazione con My EPA',
  },
  pages: {
    courses: {
      title: 'Programmi e corsi',
      subtitle: 'Corsi di tutte le piattaforme e i tuoi — in un’unica lista',
      sections: [
        {
          title: 'Funzioni',
          items: [
            ['Corsi delle piattaforme', 'collega una piattaforma e i suoi corsi compaiono da soli'],
            ['I tuoi corsi', 'aggiungi un corso a mano: titolo, link, categoria'],
            ['Catalogo', 'corsi raggruppati per piattaforma — aggiungine uno ai tuoi con un clic'],
            ['Corso e calendario', 'lezioni, compiti ed esami del corso compaiono nel tuo calendario'],
          ],
        },
        {
          title: 'Come collegare una piattaforma',
          steps: [
            'Apri «Impostazioni» → «Piattaforme»',
            'Scegli la piattaforma e accedi al tuo account',
            'Corsi e scadenze si caricano da soli',
            'Puoi scollegare una piattaforma in qualsiasi momento — i suoi corsi ed eventi spariscono da My EPA',
          ],
        },
        {
          title: 'Piattaforme',
          text: ['L’elenco delle piattaforme cresce: se ne aggiungono di nuove appena lo scambio di dati è pronto. Se rappresenti una piattaforma, guarda la pagina «Per le piattaforme».'],
        },
      ],
    },
    progress: {
      title: 'Progressi',
      subtitle: 'Cosa hai fatto e cosa ti aspetta',
      sections: [
        {
          title: 'Cosa mostrano le statistiche',
          items: [
            ['Corsi', 'quanti in totale, completati e in corso'],
            ['Completamento', 'percentuale media su tutti i corsi'],
            ['Tempo', 'ore di studio in base alla durata dei corsi'],
            ['Spese', 'quanto hai speso per i corsi a pagamento'],
          ],
        },
        {
          title: 'Da dove vengono i dati',
          text: ['I progressi dei corsi delle piattaforme collegate si aggiornano a ogni sincronizzazione. Per i corsi aggiunti a mano li segni tu.'],
        },
      ],
    },
    deadlines: {
      title: 'Scadenze',
      subtitle: 'Compiti, esami e scadenze di tutti i corsi — in un’unica lista',
      sections: [
        {
          title: 'Funzioni',
          items: [
            ['Un’unica lista', 'scadenze di tutte le piattaforme e le tue'],
            ['Priorità', 'da bassa a urgente — l’urgente si vede subito'],
            ['«Oggi»', 'la pagina iniziale mostra cosa fare oggi e cosa è scaduto'],
            ['Inserimento rapido', 'una frase come «Compito entro venerdì» diventa una scadenza'],
          ],
        },
        {
          title: 'Tipi di eventi',
          items: ['Lezioni', 'Webinar', 'Compiti', 'Esami', 'Scadenze'],
        },
      ],
    },
    schedule: {
      title: 'Calendario',
      subtitle: 'Una settimana e un mese di studio in una sola schermata',
      sections: [
        {
          title: 'Funzioni',
          items: [
            ['Settimana e mese', 'lezioni, webinar, compiti ed esami di tutti i corsi'],
            ['Fuso orario', 'gli orari sono mostrati nel fuso scelto'],
            ['Link', 'alla lezione, ai materiali e alla sala del webinar — direttamente dall’evento'],
            ['Registrazione del webinar', 'non ci sarai? Programma la registrazione dalla scheda del webinar'],
          ],
        },
        {
          title: 'Inserimento rapido',
          text: ['Scrivi l’evento come una frase — ad esempio «Webinar Python domani alle 19 1 ora» — e finisce nel calendario. L’inserimento rapido capisce russo, inglese, francese, tedesco, spagnolo e italiano.'],
        },
      ],
    },
    docs: {
      title: 'Come si usa',
      subtitle: 'Una breve guida a My EPA',
      sections: [
        {
          title: 'Per iniziare',
          steps: [
            ['Registrazione', 'crea un account con la tua email'],
            ['Piattaforme', 'collega le piattaforme dove studi o aggiungi i corsi a mano'],
            ['Calendario', 'aggiungi lezioni, webinar e scadenze che non sono su nessuna piattaforma'],
            ['Ogni giorno', 'apri «Oggi» nella pagina iniziale'],
          ],
        },
        {
          title: 'Sezioni',
          items: [
            ['Home', 'cosa c’è oggi e i prossimi eventi'],
            ['Calendario', 'settimana e mese'],
            ['Corsi', 'i tuoi corsi e il catalogo'],
            ['Scadenze', 'tutte le scadenze'],
            ['Libreria', 'materiali e registrazioni salvate'],
            ['Registrazioni', 'registrazione programmata dei webinar'],
            ['Piattaforme', 'piattaforme collegate'],
            ['Impostazioni', 'profilo, piattaforme, notifiche'],
          ],
        },
        {
          title: 'Domande frequenti',
          items: [
            ['Come aggiungo un corso a mano?', '«Corsi» → «Aggiungi corso»'],
            ['Come cambio la lingua?', 'con il selettore della lingua nel menu a sinistra o in alto sul sito'],
            ['Come registro un webinar?', '«Registrazioni» → «Programma registrazione», oppure il pulsante di registrazione nella scheda del webinar'],
          ],
        },
      ],
    },
    api: {
      title: 'API',
      subtitle: 'Per gli sviluppatori',
      sections: [
        {
          title: 'Autenticazione',
          code: [
            ['POST /api/auth/login', 'Corpo della richiesta: { identifier, password }', 'Risposta: { user, accessToken, refreshToken }'],
            ['POST /api/auth/register', 'Corpo della richiesta: { firstName, lastName, email, password, phone?, country?, language? }', 'Risposta: { user, accessToken, refreshToken }'],
          ],
        },
        {
          title: 'Richieste protette',
          text: ['Tutte le richieste protette richiedono l’intestazione:'],
          code: [['Authorization: Bearer <accessToken>']],
        },
        {
          title: 'Limiti delle richieste',
          items: ['Richieste generali: 1000 ogni 15 minuti', 'Accesso: 5 tentativi falliti ogni 15 minuti'],
        },
      ],
    },
    status: {
      title: 'Stato del servizio',
      subtitle: 'Stato attuale di My EPA',
      sections: [],
    },
    contact: {
      title: 'Contattaci',
      subtitle: 'Siamo sempre felici di aiutarti',
      sections: [
        {
          title: 'Come contattarci',
          items: [
            ['Email', 'support@myepa.ru'],
            ['Telegram', '@myepa_support'],
            ['Tempi di risposta', 'entro 24 ore'],
          ],
        },
        {
          title: 'Orari dell’assistenza',
          text: ['Dal lunedì al venerdì: 9:00–18:00, ora di Mosca (UTC+3)', 'Sabato e domenica: chiuso'],
        },
        {
          title: 'Segnala un problema',
          text: ['Quando ci scrivi, indica per favore:'],
          items: ['Cosa non funziona', 'I passaggi per riprodurlo', 'Screenshot (se ci sono)', 'Il tuo browser e dispositivo'],
        },
      ],
    },
    security: {
      title: 'Sicurezza',
      subtitle: 'Come proteggiamo i tuoi dati',
      sections: [
        {
          title: 'Cifratura',
          items: ['Tutte le connessioni sono protette da HTTPS/TLS', 'Le chiavi di accesso alle piattaforme collegate sono conservate cifrate (AES-256-GCM)'],
        },
        {
          title: 'Autenticazione',
          items: ['Le password sono conservate solo come hash', 'Numero limitato di tentativi di accesso'],
        },
        {
          title: 'Protezione dagli attacchi',
          items: [
            'Intestazioni di sicurezza (Helmet) e origini delle richieste limitate (CORS)',
            'Query al database tramite ORM con parametri, senza SQL composto a mano',
            'Aggiornamento delle dipendenze con vulnerabilità note',
          ],
        },
        {
          title: 'Segnala una vulnerabilità',
          text: ['Se trovi una vulnerabilità, segnalacela: security@myepa.ru'],
        },
      ],
    },
    notFound: {
      title: 'Pagina non trovata',
      subtitle: 'La pagina richiesta non esiste.',
      sections: [],
    },
  },
  serviceStatus: {
    title: 'Verifica di disponibilità',
    server: 'Server di My EPA',
    checking: 'Verifica…',
    up: 'Operativo',
    down: 'Non disponibile',
    checkedAt: (when) => `Verificato dal tuo browser: ${when}.`,
  },
  legal: {
    loadError: 'Impossibile caricare il documento. Scrivici: support@myepa.ru',
    englishOnly: 'Per ora questo documento è disponibile in inglese.',
  },
};

export const site: Record<Lang, SiteMessages> = { ru, en, fr, de, es, it };
