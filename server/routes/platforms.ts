import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { authenticateToken } from "../middleware/auth";
import { requireAdmin } from "../middleware/adminAuth";
import { encryptionService } from "../services/EncryptionService";

interface AuthRequest extends Request {
  user?: { id: string; role?: string | null };
}

const router = Router();

const GLOBAL_PLATFORMS = [
  { code: 'coursera', name: 'Coursera', country: 'США', languages: ['en', 'ru', 'zh'], color: '#22e768', apiType: 'oauth' as const },
  { code: 'edx', name: 'edX', country: 'США', languages: ['en', 'es', 'fr'], color: '#e13377', apiType: 'oauth' as const },
  { code: 'udemy', name: 'Udemy', country: 'США', languages: ['en', 'ru', 'es'], color: '#ecc297', apiType: 'api_key' as const },
  { code: 'pluralsight', name: 'Pluralsight', country: 'США', languages: ['en'], color: '#b94248', apiType: 'api_key' as const },
  { code: 'codecademy', name: 'Codecademy', country: 'США', languages: ['en'], color: '#fa20a4', apiType: 'oauth' as const },
  { code: 'freecodecamp', name: 'freeCodeCamp', country: 'США', languages: ['en', 'es', 'zh'], color: '#7a1eff', apiType: 'none' as const },
  { code: 'sololearn', name: 'SoloLearn', country: 'США', languages: ['en'], color: '#6afb54', apiType: 'api_key' as const },
  { code: 'treehouse', name: 'Treehouse', country: 'США', languages: ['en'], color: '#8e4ed1', apiType: 'api_key' as const },
  { code: 'udacity', name: 'Udacity', country: 'США', languages: ['en'], color: '#5f3ec2', apiType: 'oauth' as const },
  { code: 'datacamp', name: 'DataCamp', country: 'США', languages: ['en'], color: '#8b2e6a', apiType: 'api_key' as const },
  { code: 'geekbrains', name: 'GeekBrains', country: 'Россия', languages: ['ru'], color: '#ea2c2c', apiType: 'api_key' as const },
  { code: 'lambdatest', name: 'LambdaTest', country: 'США', languages: ['en'], color: '#f8bb96', apiType: 'api_key' as const },
  { code: 'browserstack', name: 'BrowserStack', country: 'США', languages: ['en'], color: '#9d7e76', apiType: 'api_key' as const },
  { code: 'edureka', name: 'Edureka', country: 'США', languages: ['en'], color: '#d76b4e', apiType: 'oauth' as const },
  { code: 'test-automation-u', name: 'Test Automation University', country: 'США', languages: ['en'], color: '#e00f00', apiType: 'none' as const },
  { code: 'testpro-io', name: 'TestPro.io', country: 'США', languages: ['en', 'ru'], color: '#1c1d1f', apiType: 'oauth' as const },
  { code: 'skillshare', name: 'Skillshare', country: 'США', languages: ['en', 'es', 'pt'], color: '#04da03', apiType: 'api_key' as const },
  { code: 'domestika', name: 'Domestika', country: 'Испания', languages: ['en', 'es', 'de'], color: '#f1421c', apiType: 'oauth' as const },
  { code: 'masterclass', name: 'MasterClass', country: 'США', languages: ['en'], color: '#d4af37', apiType: 'api_key' as const },
  { code: 'linkedin-learning', name: 'LinkedIn Learning', country: 'США', languages: ['en', 'de', 'fr'], color: '#00a0df', apiType: 'oauth' as const },
  { code: 'creativelive', name: 'CreativeLive', country: 'США', languages: ['en'], color: '#a2a9b1', apiType: 'oauth' as const },
  { code: 'berklee-music', name: 'Berklee College of Music', country: 'США', languages: ['en'], color: '#4a4a4a', apiType: 'oauth' as const },
  { code: 'coursera-music', name: 'Coursera - Music Production', country: 'США', languages: ['en', 'ru', 'es'], color: '#8b4513', apiType: 'oauth' as const },
  { code: 'noiselab', name: 'Noiselab', country: 'США', languages: ['en'], color: '#f39c12', apiType: 'api_key' as const },
  { code: 'splice-learn', name: 'Splice - Learning', country: 'США', languages: ['en'], color: '#1abc9c', apiType: 'oauth' as const },
  { code: 'khan-academy', name: 'Khan Academy', country: 'США', languages: ['en', 'ru', 'es'], color: '#00b4cc', apiType: 'oauth' as const },
  { code: 'khan-academy-kids', name: 'Khan Academy Kids', country: 'США', languages: ['en', 'es', 'fr'], color: '#ffc000', apiType: 'oauth' as const },
  { code: 'splashlearn', name: 'SplashLearn', country: 'США', languages: ['en', 'es', 'de'], color: '#ff6b6b', apiType: 'oauth' as const },
  { code: 'ixl', name: 'IXL Learning', country: 'США', languages: ['en', 'es'], color: '#34495e', apiType: 'oauth' as const },
  { code: 'code-org', name: 'Code.org', country: 'США', languages: ['en', 'es', 'fr'], color: '#00adbc', apiType: 'none' as const },
  { code: 'prodigy', name: 'Prodigy', country: 'США', languages: ['en', 'fr'], color: '#7c4dff', apiType: 'oauth' as const },
  { code: 'jetlearn', name: 'JetLearn', country: 'США', languages: ['en'], color: '#26a69a', apiType: 'oauth' as const },
  { code: 'codakid', name: 'CodaKid', country: 'США', languages: ['en'], color: '#e74c3c', apiType: 'oauth' as const },
  { code: 'duolingo', name: 'Duolingo', country: 'США', languages: ['en', 'ru', 'es'], color: '#58cc02', apiType: 'oauth' as const },
  { code: 'babbel', name: 'Babbel', country: 'США', languages: ['en', 'de', 'fr'], color: '#ff6600', apiType: 'oauth' as const },
  { code: 'busuu', name: 'Busuu', country: 'США', languages: ['en', 'es', 'de'], color: '#00b4cc', apiType: 'api_key' as const },
  { code: 'italki', name: 'italki', country: 'США', languages: ['en', 'es', 'de'], color: '#2fa360', apiType: 'oauth' as const },
  { code: 'preply', name: 'Preply', country: 'США', languages: ['en', 'de', 'fr'], color: '#4c51bf', apiType: 'oauth' as const },
  { code: 'memrise', name: 'Memrise', country: 'США', languages: ['en', 'es', 'de'], color: '#16bf63', apiType: 'api_key' as const },
  { code: 'mondly', name: 'Mondly', country: 'США', languages: ['en', 'de', 'fr'], color: '#24a0ed', apiType: 'oauth' as const },
  { code: 'lingoda', name: 'Lingoda', country: 'США', languages: ['en', 'de', 'fr'], color: '#ff7a00', apiType: 'oauth' as const },
  { code: 'rosetta-stone', name: 'Rosetta Stone', country: 'США', languages: ['en', 'es', 'de'], color: '#ff0000', apiType: 'oauth' as const },
  { code: 'stepik', name: 'Stepik', country: 'Россия', languages: ['ru', 'en'], color: '#66a13e', apiType: 'oauth' as const },
  { code: 'skillbox', name: 'Skillbox', country: 'Россия', languages: ['ru'], color: '#ff5c00', apiType: 'api_key' as const },
  { code: 'netology', name: 'Нетология', country: 'Россия', languages: ['ru'], color: '#6b4fbb', apiType: 'api_key' as const },
  { code: 'mit-ocw', name: 'MIT OpenCourseWare', country: 'США', languages: ['en'], color: '#a31f34', apiType: 'none' as const },
  { code: 'futurelearn', name: 'FutureLearn', country: 'Великобритания', languages: ['en'], color: '#de00a5', apiType: 'oauth' as const },
  { code: 'youtube-learning', name: 'YouTube Learning', country: 'США', languages: ['en', 'ru', 'es'], color: '#ff0000', apiType: 'oauth' as const },
  { code: 'brilliant', name: 'Brilliant', country: 'США', languages: ['en'], color: '#fb9400', apiType: 'api_key' as const },
  { code: 'alison', name: 'Alison', country: 'Ирландия', languages: ['en', 'es', 'fr'], color: '#00a3e0', apiType: 'none' as const },
  { code: 'openuned', name: 'OpenUNED', country: 'Испания', languages: ['es', 'en'], color: '#d32f2f', apiType: 'oauth' as const },
  { code: 'coursera-eu', name: 'Coursera EU', country: 'Великобритания', languages: ['en', 'de', 'fr'], color: '#0056d2', apiType: 'oauth' as const },
  { code: 'lecturio', name: 'Lecturio', country: 'Германия', languages: ['de', 'en'], color: '#2196f3', apiType: 'oauth' as const },
  { code: 'iversity', name: 'iversity', country: 'Германия', languages: ['de', 'en'], color: '#3498db', apiType: 'oauth' as const },
  { code: 'coursera-fr', name: 'Coursera France', country: 'Франция', languages: ['fr'], color: '#00aae4', apiType: 'oauth' as const },
  { code: 'swayam', name: 'SWAYAM', country: 'Индия', languages: ['en', 'hi'], color: '#1e88e5', apiType: 'manual' as const },
  { code: 'nptel', name: 'NPTEL', country: 'Индия', languages: ['en', 'hi'], color: '#ff6f00', apiType: 'manual' as const },
  { code: 'xuetangx', name: 'XuetangX (学堂在线)', country: 'Китай', languages: ['zh', 'en'], color: '#e62b1e', apiType: 'manual' as const },
  { code: 'icourse163', name: 'iCourse163 (中国大学MOOC)', country: 'Китай', languages: ['zh'], color: '#00bfff', apiType: 'manual' as const },
  { code: 'jmooc', name: 'JMOOC', country: 'Япония', languages: ['ja'], color: '#e60012', apiType: 'manual' as const },
  { code: 'kmooc', name: 'K-MOOC', country: 'Южная Корея', languages: ['ko'], color: '#003878', apiType: 'manual' as const },
  { code: 'fun_mooc', name: 'FUN MOOC', country: 'Франция', languages: ['fr', 'en'], color: '#ed1c24', apiType: 'manual' as const },
  { code: 'miriadax', name: 'MiríadaX', country: 'Испания', languages: ['es', 'pt'], color: '#00b8c4', apiType: 'manual' as const },
  { code: 'eduonix', name: 'Eduonix', country: 'Индия', languages: ['en'], color: '#ff6b35', apiType: 'api_key' as const },
  { code: 'foxford', name: 'Фоксфорд', country: 'Россия', languages: ['ru'], color: '#e45a3d', apiType: 'oauth' as const },
  { code: 'yandex-praktikum', name: 'Яндекс.Практикум', country: 'Россия', languages: ['ru'], color: '#ffcc00', apiType: 'oauth' as const },
  { code: 'lms-msu', name: 'LMS МГУ', country: 'Россия', languages: ['ru'], color: '#d32f2f', apiType: 'oauth' as const },
  { code: 'hse-online', name: 'ВШЭ Online', country: 'Россия', languages: ['ru', 'en'], color: '#00796b', apiType: 'oauth' as const },
  { code: 'mfti-courses', name: 'МФТИ Онлайн', country: 'Россия', languages: ['ru'], color: '#0288d1', apiType: 'oauth' as const },
  { code: 'lectorium', name: 'Лекториум', country: 'Россия', languages: ['ru'], color: '#7e57c2', apiType: 'none' as const },
  { code: 'universarium', name: 'Универсариум', country: 'Россия', languages: ['ru'], color: '#26a69a', apiType: 'oauth' as const },
  { code: 'coursera-ru', name: 'Coursera Russia', country: 'Россия', languages: ['ru', 'en'], color: '#0056d2', apiType: 'oauth' as const },
  { code: 'opencourses', name: 'OpenCourses', country: 'Россия', languages: ['ru'], color: '#ff7043', apiType: 'none' as const },
  { code: 'maksimum', name: 'Максимум', country: 'Россия', languages: ['ru'], color: '#5e35b1', apiType: 'oauth' as const },
  { code: 'tutor-online', name: 'Tutor Online', country: 'Россия', languages: ['ru'], color: '#00796b', apiType: 'oauth' as const },
  { code: 'lavush', name: 'Lavush', country: 'Россия', languages: ['ru'], color: '#ff6f00', apiType: 'oauth' as const },
  { code: 'skill-branch', name: 'SkillBranch', country: 'Россия', languages: ['ru', 'en'], color: '#5e35b1', apiType: 'oauth' as const },
];

router.get('/', async (req, res: Response) => {
  try {
    const platforms = await storage.getPlatforms();
    
    if (platforms.length === 0) {
      return res.json(GLOBAL_PLATFORMS.map(p => ({
        id: null,
        ...p,
        isActive: true,
        logoUrl: null,
        websiteUrl: getWebsiteUrl(p.code),
        description: getDescription(p.code),
      })));
    }
    
    res.json(platforms);
  } catch (error) {
    console.error('Error fetching platforms:', error);
    res.status(500).json({ message: 'Ошибка получения платформ' });
  }
});

router.get('/available', async (req, res: Response) => {
  try {
    res.json(GLOBAL_PLATFORMS.map(p => ({
      ...p,
      websiteUrl: getWebsiteUrl(p.code),
      description: getDescription(p.code),
    })));
  } catch (error) {
    console.error('Error fetching available platforms:', error);
    res.status(500).json({ message: 'Ошибка получения доступных платформ' });
  }
});

router.get('/by-region', async (req, res: Response) => {
  try {
    const regions: Record<string, typeof GLOBAL_PLATFORMS> = {
      'Северная Америка': GLOBAL_PLATFORMS.filter(p => ['США'].includes(p.country)),
      'Европа': GLOBAL_PLATFORMS.filter(p => ['Великобритания', 'Ирландия', 'Франция', 'Испания'].includes(p.country)),
      'Россия и СНГ': GLOBAL_PLATFORMS.filter(p => ['Россия'].includes(p.country)),
      'Азия': GLOBAL_PLATFORMS.filter(p => ['Индия', 'Китай', 'Япония', 'Южная Корея'].includes(p.country)),
    };
    
    res.json(regions);
  } catch (error) {
    console.error('Error fetching platforms by region:', error);
    res.status(500).json({ message: 'Ошибка получения платформ по регионам' });
  }
});

router.get('/categories', async (req, res: Response) => {
  try {
    const categoryData = [
      { id: 'afab14bc-46e9-44e1-8b52-97de4171f968', code: 'it-general', displayName: 'IT - General', color: '#3B82F6' },
      { id: 'dc066b60-378a-4926-ba6f-f84807e9df57', code: 'it-programming', displayName: 'IT - Programming', color: '#60A5FA' },
      { id: '16f94774-90b4-4e0e-aea8-2169b1d9067f', code: 'it-data-science', displayName: 'IT - Data Science', color: '#2563EB' },
      { id: '98e151bf-f8f8-4744-976a-75476c19c5cb', code: 'qa-testing', displayName: 'QA Testing', color: '#EF4444' },
      { id: '771670ad-15df-4ac0-96de-fdf1a402b4dc', code: 'art-design', displayName: 'Art & Design', color: '#EC4899' },
      { id: '1d9b29ad-856f-496f-abc7-cbbbf66120bb', code: 'music', displayName: 'Music', color: '#A855F7' },
      { id: 'f911b8f4-ffeb-4d1d-9de5-cb2ceff71e70', code: 'kids-education', displayName: 'Kids Education', color: '#22C55E' },
      { id: '8a57d24e-b372-4698-8063-d6cb79bf9e12', code: 'language-learning', displayName: 'Language Learning', color: '#EAB308' },
      { id: 'dd2365ea-2230-4335-a5dd-d2e0af8a3b2f', code: 'professional', displayName: 'Professional', color: '#6366F1' },
    ];
    res.json(categoryData);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Ошибка получения категорий' });
  }
});

router.get('/by-language/:lang', async (req, res: Response) => {
  try {
    const { lang } = req.params;
    const filteredPlatforms = GLOBAL_PLATFORMS.filter(p => 
      p.languages.includes(lang) || p.languages.includes('multi')
    );
    
    res.json(filteredPlatforms.map(p => ({
      ...p,
      websiteUrl: getWebsiteUrl(p.code),
      description: getDescription(p.code),
    })));
  } catch (error) {
    console.error('Error fetching platforms by language:', error);
    res.status(500).json({ message: 'Ошибка получения платформ по языку' });
  }
});

router.get('/regions', async (req, res: Response) => {
  try {
    const regions = await storage.getRegions();
    res.json(regions);
  } catch (error) {
    console.error('Error fetching regions:', error);
    res.status(500).json({ message: 'Ошибка получения регионов' });
  }
});

router.get('/by-region/:regionId', async (req, res: Response) => {
  try {
    const { regionId } = req.params;
    const platforms = await storage.getPlatformsByRegion(regionId);
    res.json(platforms);
  } catch (error) {
    console.error('Error fetching platforms by region:', error);
    res.status(500).json({ message: 'Ошибка получения платформ по региону' });
  }
});

router.get('/connected', async (req, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Не авторизован' });
    }
    const connected = await storage.getConnectedPlatforms(userId);
    res.json(connected);
  } catch (error) {
    console.error('Error fetching connected platforms:', error);
    res.status(500).json({ message: 'Ошибка получения подключённых платформ' });
  }
});

router.get('/:id/extended', async (req, res: Response) => {
  try {
    const { id } = req.params;
    const { platformInfoService } = await import('../services/PlatformInfoService');
    const platformInfo = await platformInfoService.getPlatformInfo(id);
    
    if (!platformInfo) {
      return res.status(404).json({ message: 'Платформа не найдена' });
    }
    
    res.json(platformInfo);
  } catch (error) {
    console.error('Error fetching platform info:', error);
    res.status(500).json({ message: 'Ошибка получения информации о платформе' });
  }
});

router.get('/:id', async (req, res: Response) => {
  try {
    const { id } = req.params;
    const platform = await storage.getPlatform(id);
    
    if (!platform) {
      return res.status(404).json({ message: 'Платформа не найдена' });
    }
    
    res.json(platform);
  } catch (error) {
    console.error('Error fetching platform:', error);
    res.status(500).json({ message: 'Ошибка получения платформы' });
  }
});

router.post('/', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const { name, code, websiteUrl, description, category, apiType, isActive } = req.body;

    if (!name || !code || !websiteUrl) {
      return res.status(400).json({ message: 'Название, код и веб-сайт обязательны' });
    }

    const platform = await storage.createPlatform({
      code: code.toLowerCase().replace(/\s+/g, '_'),
      name,
      websiteUrl,
      description: description || '',
      color: '#667eea',
      apiType: (apiType as 'oauth' | 'api_key' | 'manual') || 'manual',
      isActive: isActive !== false,
    });

    res.status(201).json({
      message: 'Платформа успешно добавлена',
      platform,
    });
  } catch (error) {
    console.error('Error creating platform:', error);
    res.status(500).json({ message: 'Ошибка создания платформы' });
  }
});

router.post('/seed', authenticateToken as any, requireAdmin as any, async (req: AuthRequest, res: Response) => {
  try {
    const createdPlatforms = [];
    
    for (const platformData of GLOBAL_PLATFORMS) {
      const platform = await storage.createPlatform({
        code: platformData.code,
        name: platformData.name,
        color: platformData.color,
        apiType: platformData.apiType,
        websiteUrl: getWebsiteUrl(platformData.code),
        description: getDescription(platformData.code),
        isActive: true,
      });
      createdPlatforms.push(platform);
    }
    
    res.status(201).json({
      message: `Создано ${createdPlatforms.length} платформ`,
      platforms: createdPlatforms
    });
  } catch (error) {
    console.error('Error seeding platforms:', error);
    res.status(500).json({ message: 'Ошибка создания платформ' });
  }
});

function getWebsiteUrl(code: string): string {
  const urls: Record<string, string> = {
    coursera: 'https://www.coursera.org',
    edx: 'https://www.edx.org',
    udemy: 'https://www.udemy.com',
    skillshare: 'https://www.skillshare.com',
    linkedin_learning: 'https://www.linkedin.com/learning',
    pluralsight: 'https://www.pluralsight.com',
    codecademy: 'https://www.codecademy.com',
    khan_academy: 'https://www.khanacademy.org',
    udacity: 'https://www.udacity.com',
    futurelearn: 'https://www.futurelearn.com',
    open_university: 'https://www.open.ac.uk',
    stepik: 'https://stepik.org',
    geekbrains: 'https://geekbrains.ru',
    skillbox: 'https://skillbox.ru',
    netology: 'https://netology.ru',
    hexlet: 'https://ru.hexlet.io',
    yandex_practicum: 'https://practicum.yandex.ru',
    alison: 'https://alison.com',
    swayam: 'https://swayam.gov.in',
    nptel: 'https://nptel.ac.in',
    xuetangx: 'https://www.xuetangx.com',
    icourse163: 'https://www.icourse163.org',
    jmooc: 'https://www.jmooc.jp',
    kmooc: 'https://www.kmooc.kr',
    fun_mooc: 'https://www.fun-mooc.fr',
    miriadax: 'https://miriadax.net',
    eduonix: 'https://www.eduonix.com',
    datacamp: 'https://www.datacamp.com',
    treehouse: 'https://teamtreehouse.com',
    brilliant: 'https://brilliant.org',
    masterclass: 'https://www.masterclass.com',
    domestika: 'https://www.domestika.org',
    youtube_learning: 'https://www.youtube.com/learning',
    mit_ocw: 'https://ocw.mit.edu',
    harvard_online: 'https://online-learning.harvard.edu',
    stanford_online: 'https://online.stanford.edu',
  };
  return urls[code] || '';
}

function getDescription(code: string): string {
  const descriptions: Record<string, string> = {
    coursera: 'Ведущая платформа онлайн-образования с курсами от топовых университетов мира',
    edx: 'Бесплатные онлайн-курсы от MIT, Harvard и других ведущих университетов',
    udemy: 'Крупнейший маркетплейс онлайн-курсов по всем направлениям',
    skillshare: 'Творческие курсы по дизайну, иллюстрации, фотографии и маркетингу',
    linkedin_learning: 'Профессиональное обучение с интеграцией в LinkedIn',
    pluralsight: 'Технические курсы для IT-специалистов и разработчиков',
    codecademy: 'Интерактивное обучение программированию для начинающих',
    khan_academy: 'Бесплатное образование мирового класса для всех',
    udacity: 'Нанодипломы в области технологий и бизнеса',
    futurelearn: 'Онлайн-курсы от британских университетов',
    stepik: 'Российская платформа с курсами по программированию и математике',
    geekbrains: 'Онлайн-университет digital-профессий',
    skillbox: 'Онлайн-университет востребованных профессий',
    netology: 'Образовательная платформа для digital-специалистов',
    hexlet: 'Практические курсы программирования',
    yandex_practicum: 'Образовательный сервис от Яндекса',
    datacamp: 'Обучение Data Science и аналитике данных',
    brilliant: 'Интерактивное изучение математики и наук',
    masterclass: 'Курсы от мировых экспертов в своих областях',
    domestika: 'Творческие курсы от профессионалов индустрии',
    mit_ocw: 'Бесплатные материалы курсов MIT',
    harvard_online: 'Онлайн-курсы Гарвардского университета',
    stanford_online: 'Онлайн-обучение от Стэнфордского университета',
  };
  return descriptions[code] || 'Образовательная платформа';
}

export default router;

router.get('/regions', async (req, res: Response) => {
  try {
    const regions = [
      { id: 'e5e2301c-04a2-44c7-a1ab-cd193df86b93', code: 'global', displayName: 'Global', color: '#3B82F6' },
      { id: 'b842ceb7-eb25-47bc-89c8-cd24027b568d', code: 'european', displayName: 'European', color: '#10B981' },
      { id: '82a10db3-2978-4a7b-89a1-5db7c03d1e33', code: 'asian', displayName: 'Asian', color: '#F59E0B' },
      { id: 'ccbca2ab-a637-4d00-8f14-87f73205d82c', code: 'russian', displayName: 'Russian', color: '#EF4444' },
    ];
    res.json(regions);
  } catch (error) {
    console.error('Error fetching regions:', error);
    res.status(500).json({ message: 'Ошибка получения регионов' });
  }
});

router.get('/by-region/:regionId', async (req, res: Response) => {
  try {
    const { regionId } = req.params;
    const platforms = await storage.getPlatformsByRegion(regionId);
    res.json(platforms || []);
  } catch (error) {
    console.error('Error fetching platforms by region:', error);
    res.status(500).json({ message: 'Ошибка получения платформ по регионам' });
  }
});

// Authorization endpoint - save encrypted credentials
router.post('/authorize', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const { platformId, authType, credentials } = req.body;
    const userId = (req as any).user?.id;

    if (!platformId || !authType || !credentials) {
      return res.status(400).json({ message: 'Отсутствуют необходимые поля' });
    }

    if (!userId) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    // 1. Verify platform exists
    const platform = await storage.getPlatform(platformId);
    if (!platform) {
      return res.status(404).json({ message: 'Платформа не найдена' });
    }

    // 2. Serialize and encrypt credentials based on auth type
    let credentialsToEncrypt = '';
    if (authType === 'username_password') {
      credentialsToEncrypt = JSON.stringify({
        username: credentials.username,
        password: credentials.password,
      });
    } else if (authType === 'api_key') {
      credentialsToEncrypt = JSON.stringify({
        apiKey: credentials.apiKey,
      });
    } else {
      return res.status(400).json({ message: 'Неподдерживаемый тип авторизации' });
    }

    const encryptedData = encryptionService.serializeEncrypted(credentialsToEncrypt);

    // 3. Save encrypted credentials to database
    const connection = await storage.savePlatformConnection(
      userId,
      platformId,
      authType,
      encryptedData
    );

    console.log('✅ Platform credentials encrypted and saved:', {
      userId,
      platformId,
      authType,
      connectionId: connection.id,
    });

    res.status(201).json({
      message: 'Учетные данные успешно сохранены и зашифрованы',
      data: {
        connectionId: connection.id,
        platformId,
        authType,
        status: 'active',
        encryptedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Error authorizing platform:', error);
    res.status(500).json({ message: 'Ошибка сохранения учетных данных' });
  }
});

// Get credentials for platform - retrieve and decrypt
router.get('/:platformId/credentials', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const { platformId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    const connection = await storage.getPlatformConnection(userId, platformId);
    
    if (!connection || !connection.encryptedData) {
      return res.status(404).json({ message: 'Учетные данные не найдены' });
    }

    // Decrypt credentials
    const decryptedCredentials = encryptionService.deserializeEncrypted(connection.encryptedData);

    console.log('🔓 Platform credentials retrieved and decrypted:', {
      userId,
      platformId,
      authType: connection.authType,
    });

    res.json({
      platformId,
      authType: connection.authType,
      credentials: JSON.parse(decryptedCredentials),
      lastUpdated: connection.updatedAt || connection.createdAt,
    });
  } catch (error) {
    console.error('Error retrieving platform credentials:', error);
    res.status(500).json({ message: 'Ошибка получения учетных данных' });
  }
});
