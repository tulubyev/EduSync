import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { 
  Search, 
  ExternalLink, 
  Globe, 
  BookOpen,
  CheckCircle,
  Link as LinkIcon
} from 'lucide-react';
import { AddPlatformModal } from './AddPlatformModal';

interface Platform {
  id: string;
  name: string;
  displayName: string;
  websiteUrl: string;
  logoUrl?: string;
  description?: string;
  category: string;
  authType: string;
  isGlobal: boolean;
  supportedLanguages: string[];
  isConnected?: boolean;
}

const globalPlatforms: Platform[] = [
  // ===== IT & PROGRAMMING =====
  {
    id: 'coursera',
    name: 'coursera',
    displayName: 'Coursera',
    websiteUrl: 'https://www.coursera.org',
    logoUrl: 'https://d3njjcbhbojbot.cloudfront.net/web/images/favicons/favicon-v2-194x194.png',
    description: 'Курсы от топ-университетов: Stanford, Yale, Princeton, Google',
    category: 'IT - General',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['en', 'ru', 'zh', 'es', 'fr', 'de', 'pt', 'ar', 'ja', 'ko'],
  },
  {
    id: 'edx',
    name: 'edx',
    displayName: 'edX',
    websiteUrl: 'https://www.edx.org',
    logoUrl: 'https://www.edx.org/favicon.ico',
    description: 'Курсы от MIT, Harvard, Berkeley и других',
    category: 'IT - General',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['en', 'es', 'fr', 'zh', 'ar'],
  },
  {
    id: 'udemy',
    name: 'udemy',
    displayName: 'Udemy',
    websiteUrl: 'https://www.udemy.com',
    logoUrl: 'https://www.udemy.com/staticx/udemy/images/v7/logo-udemy.svg',
    description: '200,000+ курсов: IT, Programming, Development',
    category: 'IT - General',
    authType: 'api_key',
    isGlobal: true,
    supportedLanguages: ['en', 'ru', 'es', 'de', 'fr', 'pt', 'ja', 'ko', 'zh', 'tr'],
  },
  {
    id: 'pluralsight',
    name: 'pluralsight',
    displayName: 'Pluralsight',
    websiteUrl: 'https://www.pluralsight.com',
    logoUrl: 'https://www.pluralsight.com/etc/clientlibs/pluralsight/main/images/favicons/android-chrome-192x192.png',
    description: 'IT-специалистам: Cloud, DevOps, Software Development',
    category: 'IT - General',
    authType: 'api_key',
    isGlobal: true,
    supportedLanguages: ['en'],
  },
  {
    id: 'codecademy',
    name: 'codecademy',
    displayName: 'Codecademy',
    websiteUrl: 'https://www.codecademy.com',
    logoUrl: 'https://www.codecademy.com/favicon.ico',
    description: 'Интерактивное программирование: Python, JavaScript, SQL',
    category: 'IT - Programming',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['en'],
  },
  {
    id: 'freecodecamp',
    name: 'freecodecamp',
    displayName: 'freeCodeCamp',
    websiteUrl: 'https://www.freecodecamp.org',
    logoUrl: 'https://www.freecodecamp.org/favicon.ico',
    description: 'Бесплатное веб-разработка и программирование',
    category: 'IT - Programming',
    authType: 'none',
    isGlobal: true,
    supportedLanguages: ['en', 'es', 'zh', 'pt'],
  },
  {
    id: 'sololearn',
    name: 'sololearn',
    displayName: 'SoloLearn',
    websiteUrl: 'https://www.sololearn.com',
    logoUrl: 'https://www.sololearn.com/favicon.ico',
    description: 'Мобильное программирование для всех',
    category: 'IT - Programming',
    authType: 'api_key',
    isGlobal: true,
    supportedLanguages: ['en'],
  },
  {
    id: 'treehouse',
    name: 'treehouse',
    displayName: 'Treehouse',
    websiteUrl: 'https://teamtreehouse.com',
    logoUrl: 'https://teamtreehouse.com/favicon.ico',
    description: 'Веб-разработка и JavaScript для начинающих',
    category: 'IT - Programming',
    authType: 'api_key',
    isGlobal: true,
    supportedLanguages: ['en'],
  },
  {
    id: 'udacity',
    name: 'udacity',
    displayName: 'Udacity',
    websiteUrl: 'https://www.udacity.com',
    logoUrl: 'https://www.udacity.com/favicon.ico',
    description: 'Нанодипломы: AI, Machine Learning, Data Science',
    category: 'IT - General',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['en'],
  },
  {
    id: 'datacamp',
    name: 'datacamp',
    displayName: 'DataCamp',
    websiteUrl: 'https://www.datacamp.com',
    logoUrl: 'https://www.datacamp.com/favicon.ico',
    description: 'Data Science, Machine Learning, Python, R, SQL',
    category: 'IT - Data Science',
    authType: 'api_key',
    isGlobal: true,
    supportedLanguages: ['en'],
  },
  {
    id: 'geekbrains',
    name: 'geekbrains',
    displayName: 'GeekBrains',
    websiteUrl: 'https://geekbrains.ru',
    logoUrl: 'https://geekbrains.ru/favicon.ico',
    description: 'IT-обучение на русском: программирование, разработка',
    category: 'IT - Programming',
    authType: 'api_key',
    isGlobal: false,
    supportedLanguages: ['ru'],
  },
  
  // ===== QA & TESTING =====
  {
    id: 'lambdatest',
    name: 'lambdatest',
    displayName: 'LambdaTest',
    websiteUrl: 'https://www.lambdatest.com',
    logoUrl: 'https://www.lambdatest.com/favicon.ico',
    description: 'QA тестирование: Selenium, Playwright, Cypress, Appium',
    category: 'QA Testing',
    authType: 'api_key',
    isGlobal: true,
    supportedLanguages: ['en'],
  },
  {
    id: 'browserstack',
    name: 'browserstack',
    displayName: 'BrowserStack',
    websiteUrl: 'https://www.browserstack.com',
    logoUrl: 'https://www.browserstack.com/favicon.ico',
    description: 'Автоматическое тестирование веб и мобильных приложений',
    category: 'QA Testing',
    authType: 'api_key',
    isGlobal: true,
    supportedLanguages: ['en'],
  },
  {
    id: 'edureka',
    name: 'edureka',
    displayName: 'Edureka',
    websiteUrl: 'https://www.edureka.co',
    logoUrl: 'https://www.edureka.co/favicon.ico',
    description: 'QA курсы: Selenium, TestNG, Automation Testing',
    category: 'QA Testing',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['en'],
  },
  {
    id: 'test-automation-u',
    name: 'test-automation-u',
    displayName: 'Test Automation University',
    websiteUrl: 'https://testautomationu.applitools.com',
    logoUrl: 'https://testautomationu.applitools.com/favicon.ico',
    description: 'Бесплатные курсы по автоматизации тестирования',
    category: 'QA Testing',
    authType: 'none',
    isGlobal: true,
    supportedLanguages: ['en'],
  },
  {
    id: 'testpro-io',
    name: 'testpro-io',
    displayName: 'TestPro.io',
    websiteUrl: 'https://testpro.io',
    logoUrl: 'https://testpro.io/favicon.ico',
    description: 'Автоматизированное тестирование: Selenium, webdriverio',
    category: 'QA Testing',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['en', 'ru'],
  },

  // Category mapping helper
  // (After migration: platforms will have categoryId in database)
  {
    id: 'skillshare',
    name: 'skillshare',
    displayName: 'Skillshare',
    websiteUrl: 'https://www.skillshare.com',
    logoUrl: 'https://static.skillshare.com/assets/images/skillshare-logo-color-small-93caf6f.svg',
    description: 'Дизайн, фото, видео, иллюстрация',
    category: 'Art & Design',
    authType: 'api_key',
    isGlobal: true,
    supportedLanguages: ['en', 'es', 'pt', 'fr', 'de'],
  },
  {
    id: 'domestika',
    name: 'domestika',
    displayName: 'Domestika',
    websiteUrl: 'https://www.domestika.org',
    logoUrl: 'https://www.domestika.org/favicon.ico',
    description: 'Творческие курсы: иллюстрация, дизайн, ремесла',
    category: 'Art & Design',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['en', 'es', 'de', 'fr', 'pt', 'it', 'ja'],
  },
  {
    id: 'masterclass',
    name: 'masterclass',
    displayName: 'MasterClass',
    websiteUrl: 'https://www.masterclass.com',
    logoUrl: 'https://www.masterclass.com/favicon.ico',
    description: 'Уроки от знаменитостей: дизайн, искусство, кино',
    category: 'Art & Design',
    authType: 'api_key',
    isGlobal: true,
    supportedLanguages: ['en'],
  },
  {
    id: 'linkedin-learning',
    name: 'linkedin-learning',
    displayName: 'LinkedIn Learning',
    websiteUrl: 'https://www.linkedin.com/learning',
    logoUrl: 'https://static.licdn.com/aero-v1/sc/h/al2o9zrvru7aqj8e1x2rzsrca',
    description: 'Профессиональные курсы: дизайн, видео, фото',
    category: 'Art & Design',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['en', 'de', 'fr', 'es', 'pt', 'ja', 'zh'],
  },
  {
    id: 'creativelive',
    name: 'creativelive',
    displayName: 'CreativeLive',
    websiteUrl: 'https://www.creativelive.com',
    logoUrl: 'https://www.creativelive.com/favicon.ico',
    description: 'Живые классы: фотография, видео, дизайн',
    category: 'Art & Design',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['en'],
  },

  // ===== MUSIC =====
  {
    id: 'berklee-music',
    name: 'berklee-music',
    displayName: 'Berklee College of Music',
    websiteUrl: 'https://www.berklee.edu',
    logoUrl: 'https://www.berklee.edu/favicon.ico',
    description: 'Музыкальное образование: production, composition, performance',
    category: 'Music',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['en'],
  },
  {
    id: 'coursera-music',
    name: 'coursera-music',
    displayName: 'Coursera - Music Production',
    websiteUrl: 'https://www.coursera.org/courses?query=music+production',
    logoUrl: 'https://d3njjcbhbojbot.cloudfront.net/web/images/favicons/favicon-v2-194x194.png',
    description: 'Музыкальное производство и composition',
    category: 'Music',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['en', 'ru', 'es', 'fr'],
  },
  {
    id: 'noiselab',
    name: 'noiselab',
    displayName: 'Noiselab',
    websiteUrl: 'https://www.noiselab.io',
    logoUrl: 'https://www.noiselab.io/favicon.ico',
    description: 'Электронная музыка и production',
    category: 'Music',
    authType: 'api_key',
    isGlobal: true,
    supportedLanguages: ['en'],
  },
  {
    id: 'splice-learn',
    name: 'splice-learn',
    displayName: 'Splice - Learning',
    websiteUrl: 'https://splice.com',
    logoUrl: 'https://splice.com/favicon.ico',
    description: 'Музыкальные инструменты, production, обучение',
    category: 'Music',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['en'],
  },

  // ===== KIDS EDUCATION =====
  {
    id: 'khan-academy',
    name: 'khan-academy',
    displayName: 'Khan Academy',
    websiteUrl: 'https://www.khanacademy.org',
    logoUrl: 'https://cdn.kastatic.org/images/khan-logo-vertical-transparent.png',
    description: 'Бесплатное образование K-12 для всех',
    category: 'Kids Education',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['en', 'ru', 'es', 'fr', 'de', 'pt', 'zh', 'ar', 'hi', 'ja'],
  },
  {
    id: 'khan-academy-kids',
    name: 'khan-academy-kids',
    displayName: 'Khan Academy Kids',
    websiteUrl: 'https://www.khanacademy.org/kids',
    logoUrl: 'https://cdn.kastatic.org/images/khan-logo-vertical-transparent.png',
    description: 'Обучение для детей 2-8 лет',
    category: 'Kids Education',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['en', 'es', 'fr', 'de'],
  },
  {
    id: 'splashlearn',
    name: 'splashlearn',
    displayName: 'SplashLearn',
    websiteUrl: 'https://www.splashlearn.com',
    logoUrl: 'https://www.splashlearn.com/favicon.ico',
    description: 'Игровое обучение для детей K-5',
    category: 'Kids Education',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['en', 'es', 'de'],
  },
  {
    id: 'ixl',
    name: 'ixl',
    displayName: 'IXL Learning',
    websiteUrl: 'https://www.ixl.com',
    logoUrl: 'https://www.ixl.com/favicon.ico',
    description: 'Адаптивное обучение K-12',
    category: 'Kids Education',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['en', 'es'],
  },
  {
    id: 'code-org',
    name: 'code-org',
    displayName: 'Code.org',
    websiteUrl: 'https://www.code.org',
    logoUrl: 'https://www.code.org/favicon.ico',
    description: 'Компьютерные науки для детей',
    category: 'Kids Education',
    authType: 'none',
    isGlobal: true,
    supportedLanguages: ['en', 'es', 'fr', 'de', 'pt', 'ja', 'zh', 'ru'],
  },
  {
    id: 'prodigy',
    name: 'prodigy',
    displayName: 'Prodigy',
    websiteUrl: 'https://www.prodigygame.com',
    logoUrl: 'https://www.prodigygame.com/favicon.ico',
    description: 'Игровое обучение математике',
    category: 'Kids Education',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['en', 'fr'],
  },
  {
    id: 'jetlearn',
    name: 'jetlearn',
    displayName: 'JetLearn',
    websiteUrl: 'https://www.jetlearn.com',
    logoUrl: 'https://www.jetlearn.com/favicon.ico',
    description: 'Кодирование и робототехника для детей',
    category: 'Kids Education',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['en'],
  },
  {
    id: 'codakid',
    name: 'codakid',
    displayName: 'CodaKid',
    websiteUrl: 'https://www.codakid.com',
    logoUrl: 'https://www.codakid.com/favicon.ico',
    description: 'Кодирование Minecraft и Roblox для детей',
    category: 'Kids Education',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['en'],
  },

  // ===== LANGUAGE LEARNING =====
  {
    id: 'duolingo',
    name: 'duolingo',
    displayName: 'Duolingo',
    websiteUrl: 'https://www.duolingo.com',
    logoUrl: 'https://www.duolingo.com/favicon.ico',
    description: '41+ языков в игровой форме',
    category: 'Language Learning',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['en', 'ru', 'es', 'de', 'fr', 'pt', 'ja', 'ko', 'zh'],
  },
  {
    id: 'babbel',
    name: 'babbel',
    displayName: 'Babbel',
    websiteUrl: 'https://www.babbel.com',
    logoUrl: 'https://www.babbel.com/favicon.ico',
    description: '14 языков с интерактивными уроками',
    category: 'Language Learning',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['en', 'de', 'fr', 'es', 'pt', 'it', 'ja', 'ko', 'ru'],
  },
  {
    id: 'busuu',
    name: 'busuu',
    displayName: 'Busuu',
    websiteUrl: 'https://www.busuu.com',
    logoUrl: 'https://www.busuu.com/favicon.ico',
    description: 'Изучение языков с носителями',
    category: 'Language Learning',
    authType: 'api_key',
    isGlobal: true,
    supportedLanguages: ['en', 'es', 'de', 'fr', 'pt', 'ru', 'zh', 'ja'],
  },
  {
    id: 'italki',
    name: 'italki',
    displayName: 'italki',
    websiteUrl: 'https://www.italki.com',
    logoUrl: 'https://www.italki.com/favicon.ico',
    description: '150+ языков с живыми репетиторами',
    category: 'Language Learning',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['en', 'es', 'de', 'fr', 'pt', 'ru', 'zh', 'ja', 'ko'],
  },
  {
    id: 'preply',
    name: 'preply',
    displayName: 'Preply',
    websiteUrl: 'https://preply.com',
    logoUrl: 'https://preply.com/favicon.ico',
    description: 'Персональные уроки языков онлайн',
    category: 'Language Learning',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['en', 'de', 'fr', 'es', 'pt', 'ru', 'zh', 'ja'],
  },
  {
    id: 'memrise',
    name: 'memrise',
    displayName: 'Memrise',
    websiteUrl: 'https://www.memrise.com',
    logoUrl: 'https://www.memrise.com/favicon.ico',
    description: 'Запоминание слов и фраз',
    category: 'Language Learning',
    authType: 'api_key',
    isGlobal: true,
    supportedLanguages: ['en', 'es', 'de', 'fr', 'pt', 'ru', 'zh', 'ja', 'ko'],
  },
  {
    id: 'mondly',
    name: 'mondly',
    displayName: 'Mondly',
    websiteUrl: 'https://www.mondly.com',
    logoUrl: 'https://www.mondly.com/favicon.ico',
    description: '41 язык с AR и VR',
    category: 'Language Learning',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['en', 'de', 'fr', 'es', 'pt', 'ru', 'zh', 'ja', 'ko'],
  },
  {
    id: 'lingoda',
    name: 'lingoda',
    displayName: 'Lingoda',
    websiteUrl: 'https://www.lingoda.com',
    logoUrl: 'https://www.lingoda.com/favicon.ico',
    description: 'Живые классы языков с сертифицированными учителями',
    category: 'Language Learning',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['en', 'de', 'fr', 'es', 'pt', 'ru'],
  },
  {
    id: 'rosetta-stone',
    name: 'rosetta-stone',
    displayName: 'Rosetta Stone',
    websiteUrl: 'https://www.rosettastone.com',
    logoUrl: 'https://www.rosettastone.com/favicon.ico',
    description: 'Комплексное обучение языкам',
    category: 'Language Learning',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['en', 'es', 'de', 'fr', 'pt', 'ru', 'zh', 'ja'],
  },

  // ===== PROFESSIONAL & GENERAL =====
  {
    id: 'stepik',
    name: 'stepik',
    displayName: 'Stepik',
    websiteUrl: 'https://stepik.org',
    logoUrl: 'https://stepik.org/static/social/png/stepik-logo-large.png',
    description: 'Российская платформа с курсами от ВШЭ, МФТИ',
    category: 'Professional',
    authType: 'oauth',
    isGlobal: false,
    supportedLanguages: ['ru', 'en'],
  },
  {
    id: 'skillbox',
    name: 'skillbox',
    displayName: 'Skillbox',
    websiteUrl: 'https://skillbox.ru',
    logoUrl: 'https://skillbox.ru/favicon.ico',
    description: 'Онлайн-университет профессий на русском',
    category: 'Professional',
    authType: 'api_key',
    isGlobal: false,
    supportedLanguages: ['ru'],
  },
  {
    id: 'netology',
    name: 'netology',
    displayName: 'Нетология',
    websiteUrl: 'https://netology.ru',
    logoUrl: 'https://netology.ru/favicon.ico',
    description: 'Digital-профессии на русском',
    category: 'Professional',
    authType: 'api_key',
    isGlobal: false,
    supportedLanguages: ['ru'],
  },
  {
    id: 'mit-ocw',
    name: 'mit-ocw',
    displayName: 'MIT OpenCourseWare',
    websiteUrl: 'https://ocw.mit.edu',
    logoUrl: 'https://ocw.mit.edu/favicon.ico',
    description: 'Бесплатные материалы курсов MIT',
    category: 'Professional',
    authType: 'none',
    isGlobal: true,
    supportedLanguages: ['en'],
  },
  {
    id: 'futurelearn',
    name: 'futurelearn',
    displayName: 'FutureLearn',
    websiteUrl: 'https://www.futurelearn.com',
    logoUrl: 'https://www.futurelearn.com/favicon.ico',
    description: 'Курсы от британских университетов',
    category: 'Professional',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['en'],
  },
  {
    id: 'youtube-learning',
    name: 'youtube-learning',
    displayName: 'YouTube Learning',
    websiteUrl: 'https://www.youtube.com/learning',
    logoUrl: 'https://www.youtube.com/favicon.ico',
    description: 'Образовательные каналы на YouTube',
    category: 'Professional',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['en', 'ru', 'es', 'de', 'fr', 'pt', 'ja', 'ko', 'zh', 'hi'],
  },
  {
    id: 'brilliant',
    name: 'brilliant',
    displayName: 'Brilliant',
    websiteUrl: 'https://brilliant.org',
    logoUrl: 'https://brilliant.org/favicon.ico',
    description: 'Интерактивные курсы по математике и науке',
    category: 'Professional',
    authType: 'api_key',
    isGlobal: true,
    supportedLanguages: ['en'],
  },
  {
    id: 'alison',
    name: 'alison',
    displayName: 'Alison',
    websiteUrl: 'https://alison.com',
    logoUrl: 'https://alison.com/favicon.ico',
    description: 'Бесплатные дипломные курсы',
    category: 'Professional',
    authType: 'none',
    isGlobal: true,
    supportedLanguages: ['en', 'es', 'fr', 'de', 'pt', 'ar'],
  },
  {
    id: 'openuned',
    name: 'openuned',
    displayName: 'OpenUNED',
    websiteUrl: 'https://www.uned.es',
    logoUrl: 'https://www.uned.es/favicon.ico',
    description: 'Испанский университет дистанционного образования',
    category: 'Professional',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['es', 'en'],
  },

  // ===== EUROPEAN PLATFORMS =====
  {
    id: 'coursera-eu',
    name: 'coursera-eu',
    displayName: 'Coursera EU',
    websiteUrl: 'https://www.coursera.org',
    logoUrl: 'https://d3njjcbhbojbot.cloudfront.net/web/images/favicons/favicon-v2-194x194.png',
    description: 'Европейские университеты: Cambridge, Oxford, Sorbonne',
    category: 'Professional',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['en', 'de', 'fr', 'es', 'it'],
  },
  {
    id: 'lecturio',
    name: 'lecturio',
    displayName: 'Lecturio',
    websiteUrl: 'https://www.lecturio.com',
    logoUrl: 'https://www.lecturio.com/favicon.ico',
    description: 'Немецкая платформа: медицина, бизнес, право',
    category: 'Professional',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['de', 'en'],
  },
  {
    id: 'iversity',
    name: 'iversity',
    displayName: 'iversity',
    websiteUrl: 'https://iversity.org',
    logoUrl: 'https://iversity.org/favicon.ico',
    description: 'Немецкая MOOC платформа: инженерия, право, экономика',
    category: 'Professional',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['de', 'en'],
  },
  {
    id: 'coursera-fr',
    name: 'coursera-fr',
    displayName: 'Coursera France',
    websiteUrl: 'https://www.coursera.org/browse?languages=fr',
    logoUrl: 'https://d3njjcbhbojbot.cloudfront.net/web/images/favicons/favicon-v2-194x194.png',
    description: 'Французская версия: Sorbonne, École Polytechnique',
    category: 'Professional',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['fr', 'en'],
  },
  {
    id: 'france-education',
    name: 'france-education',
    displayName: 'France Education Platform',
    websiteUrl: 'https://www.my-mooc.com',
    logoUrl: 'https://www.my-mooc.com/favicon.ico',
    description: 'Французские курсы от французских университетов',
    category: 'Professional',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['fr'],
  },
  {
    id: 'open-education-eu',
    name: 'open-education-eu',
    displayName: 'Open Education EU',
    websiteUrl: 'https://www.openeducationeuropa.eu',
    logoUrl: 'https://www.openeducationeuropa.eu/favicon.ico',
    description: 'Европейская платформа открытого образования',
    category: 'Professional',
    authType: 'none',
    isGlobal: true,
    supportedLanguages: ['en', 'de', 'fr', 'es', 'it', 'pl', 'nl'],
  },
  {
    id: 'akademy-net',
    name: 'akademy-net',
    displayName: 'Akademy.net',
    websiteUrl: 'https://akademy.net',
    logoUrl: 'https://akademy.net/favicon.ico',
    description: 'Чешская платформа: IT, бизнес, язык',
    category: 'Professional',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['cs', 'en'],
  },
  {
    id: 'polskamoodle',
    name: 'polskamoodle',
    displayName: 'Polska Moodle',
    websiteUrl: 'https://www.e-learning.pl',
    logoUrl: 'https://www.e-learning.pl/favicon.ico',
    description: 'Польская платформа e-learning',
    category: 'Professional',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['pl', 'en'],
  },
  {
    id: 'learning-hub-nl',
    name: 'learning-hub-nl',
    displayName: 'Learning Hub Netherlands',
    websiteUrl: 'https://www.learning.nl',
    logoUrl: 'https://www.learning.nl/favicon.ico',
    description: 'Нидерландская платформа: IT, дизайн, бизнес',
    category: 'Professional',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['nl', 'en'],
  },
  {
    id: 'edassist',
    name: 'edassist',
    displayName: 'EdAssist',
    websiteUrl: 'https://edassist.com',
    logoUrl: 'https://edassist.com/favicon.ico',
    description: 'Британская платформа профессионального развития',
    category: 'Professional',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['en'],
  },

  // ===== ASIAN PLATFORMS =====
  {
    id: 'byju',
    name: 'byju',
    displayName: 'BYJU\'S',
    websiteUrl: 'https://www.byjus.com',
    logoUrl: 'https://www.byjus.com/favicon.ico',
    description: 'Индийская платформа: K-12, иностранные языки',
    category: 'Kids Education',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['en', 'hi', 'ta', 'te', 'mr'],
  },
  {
    id: 'upgrad',
    name: 'upgrad',
    displayName: 'Upgrad',
    websiteUrl: 'https://www.upgrad.com',
    logoUrl: 'https://www.upgrad.com/favicon.ico',
    description: 'Индийский онлайн-университет: IT, бизнес, наука',
    category: 'Professional',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['en', 'hi'],
  },
  {
    id: 'vedantu',
    name: 'vedantu',
    displayName: 'Vedantu',
    websiteUrl: 'https://www.vedantu.com',
    logoUrl: 'https://www.vedantu.com/favicon.ico',
    description: 'Индийская платформа: школа, JEE, NEET, языки',
    category: 'Kids Education',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['en', 'hi'],
  },
  {
    id: 'zhihu-learning',
    name: 'zhihu-learning',
    displayName: 'Zhihu Learning',
    websiteUrl: 'https://www.zhihu.com',
    logoUrl: 'https://www.zhihu.com/favicon.ico',
    description: 'Китайская платформа знаний: технология, бизнес, наука',
    category: 'Professional',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['zh', 'en'],
  },
  {
    id: 'netease-cloud',
    name: 'netease-cloud',
    displayName: 'Netease Cloud Classroom',
    websiteUrl: 'https://study.163.com',
    logoUrl: 'https://study.163.com/favicon.ico',
    description: 'Китайская платформа: IT, программирование, язык',
    category: 'IT - Programming',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['zh', 'en'],
  },
  {
    id: 'tencent-class',
    name: 'tencent-class',
    displayName: 'Tencent Classroom',
    websiteUrl: 'https://classroom.qq.com',
    logoUrl: 'https://classroom.qq.com/favicon.ico',
    description: 'Китайская платформа: образование, IT, дизайн',
    category: 'Professional',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['zh'],
  },
  {
    id: 'udemy-jp',
    name: 'udemy-jp',
    displayName: 'Udemy Japan',
    websiteUrl: 'https://www.udemy.com/ja',
    logoUrl: 'https://www.udemy.com/staticx/udemy/images/v7/logo-udemy.svg',
    description: 'Японская версия Udemy: IT, дизайн, язык',
    category: 'Professional',
    authType: 'api_key',
    isGlobal: true,
    supportedLanguages: ['ja', 'en'],
  },
  {
    id: 'schoo',
    name: 'schoo',
    displayName: 'Schoo',
    websiteUrl: 'https://schoo.jp',
    logoUrl: 'https://schoo.jp/favicon.ico',
    description: 'Японская платформа: IT, маркетинг, медиа',
    category: 'Professional',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['ja'],
  },
  {
    id: 'inflearn',
    name: 'inflearn',
    displayName: 'Inflearn',
    websiteUrl: 'https://www.inflearn.com',
    logoUrl: 'https://www.inflearn.com/favicon.ico',
    description: 'Южнокорейская платформа: IT, программирование, веб',
    category: 'IT - Programming',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['ko', 'en'],
  },
  {
    id: 'fastcampus',
    name: 'fastcampus',
    displayName: 'FastCampus',
    websiteUrl: 'https://www.fastcampus.co.kr',
    logoUrl: 'https://www.fastcampus.co.kr/favicon.ico',
    description: 'Южнокорейская платформа: программирование, дизайн',
    category: 'IT - Programming',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['ko', 'en'],
  },
  {
    id: 'codecamp',
    name: 'codecamp',
    displayName: 'CodeCamp',
    websiteUrl: 'https://codecamp.jp',
    logoUrl: 'https://codecamp.jp/favicon.ico',
    description: 'Японская платформа программирования',
    category: 'IT - Programming',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['ja', 'en'],
  },
  {
    id: 'coursera-sg',
    name: 'coursera-sg',
    displayName: 'Coursera Singapore',
    websiteUrl: 'https://www.coursera.org',
    logoUrl: 'https://d3njjcbhbojbot.cloudfront.net/web/images/favicons/favicon-v2-194x194.png',
    description: 'Курсы юго-восточной Азии',
    category: 'Professional',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['en', 'zh', 'ms'],
  },
  {
    id: 'kickstart-id',
    name: 'kickstart-id',
    displayName: 'Kickstart.id',
    websiteUrl: 'https://www.kickstart.id',
    logoUrl: 'https://www.kickstart.id/favicon.ico',
    description: 'Индонезийская платформа: IT, цифровой маркетинг',
    category: 'Professional',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['id', 'en'],
  },
  {
    id: 'edukasyon-ph',
    name: 'edukasyon-ph',
    displayName: 'Edukasyon.ph',
    websiteUrl: 'https://www.edukasyon.ph',
    logoUrl: 'https://www.edukasyon.ph/favicon.ico',
    description: 'Филиппинская платформа высшего образования',
    category: 'Professional',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['tl', 'en'],
  },
  {
    id: 'thai-mooc',
    name: 'thai-mooc',
    displayName: 'Thai MOOC',
    websiteUrl: 'https://www.thaicourse.com',
    logoUrl: 'https://www.thaicourse.com/favicon.ico',
    description: 'Таиландская платформа открытого образования',
    category: 'Professional',
    authType: 'none',
    isGlobal: true,
    supportedLanguages: ['th', 'en'],
  },

  // ===== RUSSIAN-SPECIFIC PLATFORMS =====
  {
    id: 'foxford',
    name: 'foxford',
    displayName: 'Фоксфорд',
    websiteUrl: 'https://foxford.ru',
    logoUrl: 'https://foxford.ru/favicon.ico',
    description: 'Школьное и вузовское образование на русском',
    category: 'Kids Education',
    authType: 'oauth',
    isGlobal: false,
    supportedLanguages: ['ru'],
  },
  {
    id: 'yandex-praktikum',
    name: 'yandex-praktikum',
    displayName: 'Яндекс.Практикум',
    websiteUrl: 'https://practicum.yandex.ru',
    logoUrl: 'https://practicum.yandex.ru/favicon.ico',
    description: 'IT-профессии от Яндекса: frontend, backend, data science',
    category: 'IT - Programming',
    authType: 'oauth',
    isGlobal: false,
    supportedLanguages: ['ru'],
  },
  {
    id: 'lms-msu',
    name: 'lms-msu',
    displayName: 'LMS МГУ',
    websiteUrl: 'https://lms.msu.ru',
    logoUrl: 'https://lms.msu.ru/favicon.ico',
    description: 'Обучающая платформа Московского государственного университета',
    category: 'Professional',
    authType: 'oauth',
    isGlobal: false,
    supportedLanguages: ['ru'],
  },
  {
    id: 'hse-online',
    name: 'hse-online',
    displayName: 'ВШЭ Online',
    websiteUrl: 'https://online.hse.ru',
    logoUrl: 'https://online.hse.ru/favicon.ico',
    description: 'Бесплатные и платные курсы от ВШЭ',
    category: 'Professional',
    authType: 'oauth',
    isGlobal: false,
    supportedLanguages: ['ru', 'en'],
  },
  {
    id: 'mfti-courses',
    name: 'mfti-courses',
    displayName: 'МФТИ Онлайн',
    websiteUrl: 'https://online.mipt.ru',
    logoUrl: 'https://online.mipt.ru/favicon.ico',
    description: 'Курсы от Московского физико-технического института',
    category: 'Professional',
    authType: 'oauth',
    isGlobal: false,
    supportedLanguages: ['ru'],
  },
  {
    id: 'lectorium',
    name: 'lectorium',
    displayName: 'Лекториум',
    websiteUrl: 'https://www.lektorium.tv',
    logoUrl: 'https://www.lektorium.tv/favicon.ico',
    description: 'Видеолекции от ведущих вузов России',
    category: 'Professional',
    authType: 'none',
    isGlobal: false,
    supportedLanguages: ['ru'],
  },
  {
    id: 'universarium',
    name: 'universarium',
    displayName: 'Универсариум',
    websiteUrl: 'https://universarium.org',
    logoUrl: 'https://universarium.org/favicon.ico',
    description: 'Массовые открытые онлайн-курсы (MOOC)',
    category: 'Professional',
    authType: 'oauth',
    isGlobal: false,
    supportedLanguages: ['ru'],
  },
  {
    id: 'coursera-ru',
    name: 'coursera-ru',
    displayName: 'Coursera Russia',
    websiteUrl: 'https://www.coursera.org/browse?languages=ru',
    logoUrl: 'https://d3njjcbhbojbot.cloudfront.net/web/images/favicons/favicon-v2-194x194.png',
    description: 'Русские версии курсов Coursera',
    category: 'Professional',
    authType: 'oauth',
    isGlobal: false,
    supportedLanguages: ['ru', 'en'],
  },
  {
    id: 'opencourses',
    name: 'opencourses',
    displayName: 'OpenCourses',
    websiteUrl: 'https://ocourses.ru',
    logoUrl: 'https://ocourses.ru/favicon.ico',
    description: 'Открытое образование: видеолекции от российских вузов',
    category: 'Professional',
    authType: 'none',
    isGlobal: false,
    supportedLanguages: ['ru'],
  },
  {
    id: 'maksimum',
    name: 'maksimum',
    displayName: 'Максимум',
    websiteUrl: 'https://maksimum.online',
    logoUrl: 'https://maksimum.online/favicon.ico',
    description: 'Подготовка к ОГЭ и ЕГЭ на русском',
    category: 'Kids Education',
    authType: 'oauth',
    isGlobal: false,
    supportedLanguages: ['ru'],
  },
  {
    id: 'tutor-online',
    name: 'tutor-online',
    displayName: 'Tutor Online',
    websiteUrl: 'https://www.tutoronline.ru',
    logoUrl: 'https://www.tutoronline.ru/favicon.ico',
    description: 'Онлайн-репетиторство и школьные предметы',
    category: 'Kids Education',
    authType: 'oauth',
    isGlobal: false,
    supportedLanguages: ['ru'],
  },
  {
    id: 'lavush',
    name: 'lavush',
    displayName: 'Lavush',
    websiteUrl: 'https://lavush.io',
    logoUrl: 'https://lavush.io/favicon.ico',
    description: 'Российская платформа по веб-разработке и дизайну',
    category: 'IT - Programming',
    authType: 'oauth',
    isGlobal: false,
    supportedLanguages: ['ru'],
  },
  {
    id: 'skill-branch',
    name: 'skill-branch',
    displayName: 'SkillBranch',
    websiteUrl: 'https://skillbranch.com',
    logoUrl: 'https://skillbranch.com/favicon.ico',
    description: 'Интерактивные курсы по программированию (RU/EN)',
    category: 'IT - Programming',
    authType: 'oauth',
    isGlobal: false,
    supportedLanguages: ['ru', 'en'],
  },
];

const categoryColors: Record<string, string> = {
  'IT - General': 'bg-blue-500 text-white',
  'IT - Programming': 'bg-blue-400 text-white',
  'IT - Data Science': 'bg-blue-600 text-white',
  'QA Testing': 'bg-red-500 text-white',
  'Art & Design': 'bg-pink-500 text-white',
  'Music': 'bg-purple-500 text-white',
  'Kids Education': 'bg-green-500 text-white',
  'Language Learning': 'bg-yellow-500 text-black',
  'Professional': 'bg-indigo-500 text-white',
};

interface PlatformCategory {
  id: string;
  code: string;
  name: string;
  displayName: string;
  color: string;
  icon: string;
  sortOrder: number;
}

interface Region {
  id: string;
  code: string;
  displayName: string;
  color: string;
}

export function PlatformsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [connectedPlatforms, setConnectedPlatforms] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<PlatformCategory[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [dbPlatforms, setDbPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [platformInfo, setPlatformInfo] = useState<any>(null);

  useEffect(() => {
    fetchCategoriesAndPlatforms();
  }, []);

  useEffect(() => {
    if (selectedPlatform) {
      fetch(`/api/platforms/${selectedPlatform.id}/extended`)
        .then(res => res.json())
        .then(data => setPlatformInfo(data))
        .catch(err => console.error('Error fetching extended info:', err));
    }
  }, [selectedPlatform]);

  const fetchCategoriesAndPlatforms = async () => {
    try {
      // Fetch categories from API
      const catResponse = await fetch('/api/platforms/categories');
      if (catResponse.ok) {
        const catData = await catResponse.json();
        setCategories(catData);
      }
      
      // Fetch regions from API
      const regResponse = await fetch('/api/platforms/regions');
      if (regResponse.ok) {
        const regData = await regResponse.json();
        setRegions(regData);
      }
      
      // Fetch all platforms from API
      const platResponse = await fetch('/api/platforms');
      if (platResponse.ok) {
        const platData = await platResponse.json();
        setDbPlatforms(platData);
      }
      
      // Fetch connected platforms
      const token = localStorage.getItem('accessToken');
      const connResponse = await fetch('/api/platforms/connected', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (connResponse.ok) {
        const data = await connResponse.json();
        setConnectedPlatforms(new Set(data.map((p: any) => p.platformId)));
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };


  const handleConnect = async (platform: Platform) => {
    if (platform.authType === 'none') {
      window.open(platform.websiteUrl, '_blank');
      return;
    }
    
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/platforms/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ platformId: platform.id }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.authUrl) {
          window.open(data.authUrl, '_blank');
        }
        setConnectedPlatforms(prev => new Set(Array.from(prev).concat(platform.id)));
      }
    } catch (err) {
      console.error('Error connecting platform:', err);
    }
  };

  // Use dbPlatforms if available, otherwise fallback to globalPlatforms
  const platformsToUse = dbPlatforms.length > 0 ? dbPlatforms : globalPlatforms;
  
  const filteredPlatforms = platformsToUse
    .filter(p => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          p.displayName?.toLowerCase().includes(query) ||
          p.name?.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.category?.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .filter(p => {
      if (selectedCategory === 'all') return true;
      if (selectedCategory === 'connected') return connectedPlatforms.has(p.id);
      // Find category ID by displayName match
      const categoryObj = categories.find(c => c.displayName === selectedCategory);
      if (categoryObj) {
        return p.categoryId === categoryObj.id;
      }
      return p.category === selectedCategory;
    })
    .filter(p => {
      if (selectedRegion === 'all') return true;
      return p.region === selectedRegion || (p.regionId && p.regionId === selectedRegion);
    });

  const dbCategories = categories.length > 0 
    ? categories.map(c => c.displayName)
    : Array.from(new Set(platformsToUse.map(p => p.category).filter(Boolean)));

  const stats = {
    total: platformsToUse.length,
    connected: connectedPlatforms.size,
    global: platformsToUse.filter(p => p.isGlobal).length,
    russian: platformsToUse.filter(p => !p.isGlobal).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6" />
            Образовательные платформы
          </h1>
          <p className="text-muted-foreground mt-1">
            {stats.total} платформ • {stats.connected} подключено • {stats.global} глобальных
          </p>
        </div>
        <AddPlatformModal onPlatformAdded={fetchCategoriesAndPlatforms} />
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск платформ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm font-medium text-muted-foreground mb-2">Регионы:</p>
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <Button
            variant={selectedRegion === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedRegion('all')}
          >
            Все регионы
          </Button>
          {regions.map((reg) => (
            <Button
              key={reg.id}
              variant={selectedRegion === reg.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedRegion(reg.id)}
              style={selectedRegion === reg.id ? { backgroundColor: reg.color } : {}}
            >
              {reg.displayName}
            </Button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm font-medium text-muted-foreground mb-2">Категории:</p>
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
          >
            Все ({stats.total})
          </Button>
          <Button
            variant={selectedCategory === 'connected' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('connected')}
          >
            Подключённые ({stats.connected})
          </Button>
          {dbCategories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {filteredPlatforms.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Globe className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Платформы не найдены</h3>
          <p className="text-muted-foreground">
            Попробуйте изменить параметры поиска
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlatforms.map((platform) => {
            const isConnected = connectedPlatforms.has(platform.id);
            const categoryId = platform.categoryId || (platform as any).category;
            const categoryObj = categories.find(c => c.id === categoryId);
            const categoryName = categoryObj?.displayName || platform.category || 'Other';
            const displayName = platform.displayName || platform.name || 'Unknown';
            
            return (
              <Card 
                key={platform.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedPlatform(platform)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {platform.logoUrl ? (
                        <img 
                          src={platform.logoUrl} 
                          alt={displayName}
                          className="w-8 h-8 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <BookOpen className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base flex items-center gap-2">
                        {displayName}
                        {isConnected && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </CardTitle>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <Badge className={categoryColors[categoryName] || 'bg-gray-100'}>
                          {categoryName}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-3 line-clamp-2">
                    {platform.description || 'Образовательная платформа'}
                  </CardDescription>
                  
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    {isConnected ? (
                      <Button variant="outline" size="sm" className="flex-1" disabled>
                        <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                        Подключено
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleConnect(platform)}
                      >
                        <LinkIcon className="h-4 w-4 mr-1" />
                        Подключить
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(platform.websiteUrl, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {selectedPlatform && (
        <Dialog open={!!selectedPlatform} onOpenChange={() => setSelectedPlatform(null)}>
          <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
            <div className="flex items-start gap-4">
              <div className="w-24 h-24 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                {selectedPlatform.logoUrl ? (
                  <img 
                    src={selectedPlatform.logoUrl} 
                    alt={selectedPlatform.name}
                    className="w-16 h-16 object-contain"
                  />
                ) : (
                  <BookOpen className="h-12 w-12 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">{selectedPlatform.name}</h2>
                <p className="text-muted-foreground mb-4">{selectedPlatform.description}</p>
                <div className="flex gap-2 mb-4">
                  <Badge className="bg-blue-100 text-blue-800">
                    {categories.find(c => c.id === selectedPlatform.categoryId)?.displayName || 'Other'}
                  </Badge>
                  {selectedPlatform.regionId && (
                    <Badge className="bg-green-100 text-green-800">
                      {regions.find(r => r.id === selectedPlatform.regionId)?.displayName}
                    </Badge>
                  )}
                </div>

                {platformInfo?.supportedLanguages && (
                  <div className="mb-3">
                    <p className="text-sm font-medium mb-1">Языки поддержки:</p>
                    <div className="flex flex-wrap gap-1">
                      {platformInfo.supportedLanguages.map((lang: string) => (
                        <Badge key={lang} variant="secondary" className="text-xs">{lang}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {platformInfo?.keyFeatures && (
                  <div className="mb-3">
                    <p className="text-sm font-medium mb-1">Основные возможности:</p>
                    <ul className="text-sm list-disc list-inside">
                      {platformInfo.keyFeatures.map((feature: string) => (
                        <li key={feature} className="text-muted-foreground">{feature}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {platformInfo?.bestFor && (
                  <div className="mb-3 p-2 bg-blue-50 rounded">
                    <p className="text-sm"><strong>Для кого:</strong> {platformInfo.bestFor}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  {connectedPlatforms.has(selectedPlatform.id) ? (
                    <Button disabled>
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      Подключено
                    </Button>
                  ) : (
                    <Button onClick={() => handleConnect(selectedPlatform)}>
                      <LinkIcon className="h-4 w-4 mr-2" />
                      Подключить
                    </Button>
                  )}
                  <Button 
                    variant="outline"
                    onClick={() => window.open(selectedPlatform.websiteUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Посетить сайт
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
