import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { authenticateToken } from "../middleware/auth";
import { requireAdmin } from "../middleware/adminAuth";

interface AuthRequest extends Request {
  user?: { id: string; role?: string | null };
}

const router = Router();

const GLOBAL_PLATFORMS = [
  { code: 'coursera', name: 'Coursera', country: 'США', languages: ['en', 'ru', 'es', 'zh'], color: '#0056D2', apiType: 'oauth' as const },
  { code: 'edx', name: 'edX', country: 'США', languages: ['en', 'es', 'zh'], color: '#02262B', apiType: 'oauth' as const },
  { code: 'udemy', name: 'Udemy', country: 'США', languages: ['en', 'ru', 'de', 'es', 'pt', 'ja', 'zh'], color: '#A435F0', apiType: 'api_key' as const },
  { code: 'skillshare', name: 'Skillshare', country: 'США', languages: ['en'], color: '#00FF84', apiType: 'oauth' as const },
  { code: 'linkedin_learning', name: 'LinkedIn Learning', country: 'США', languages: ['en', 'de', 'fr', 'es', 'pt', 'ja', 'zh'], color: '#0A66C2', apiType: 'oauth' as const },
  { code: 'pluralsight', name: 'Pluralsight', country: 'США', languages: ['en'], color: '#F15B2A', apiType: 'api_key' as const },
  { code: 'codecademy', name: 'Codecademy', country: 'США', languages: ['en'], color: '#1F4056', apiType: 'oauth' as const },
  { code: 'khan_academy', name: 'Khan Academy', country: 'США', languages: ['en', 'ru', 'es', 'pt', 'de', 'fr', 'hi'], color: '#14BF96', apiType: 'oauth' as const },
  { code: 'udacity', name: 'Udacity', country: 'США', languages: ['en'], color: '#02B3E4', apiType: 'api_key' as const },
  { code: 'futurelearn', name: 'FutureLearn', country: 'Великобритания', languages: ['en'], color: '#DE00A5', apiType: 'oauth' as const },
  { code: 'open_university', name: 'Open University', country: 'Великобритания', languages: ['en'], color: '#003C71', apiType: 'manual' as const },
  { code: 'stepik', name: 'Stepik', country: 'Россия', languages: ['ru', 'en'], color: '#66A13E', apiType: 'oauth' as const },
  { code: 'geekbrains', name: 'GeekBrains', country: 'Россия', languages: ['ru'], color: '#6E44FF', apiType: 'manual' as const },
  { code: 'skillbox', name: 'Skillbox', country: 'Россия', languages: ['ru'], color: '#FF5C00', apiType: 'manual' as const },
  { code: 'netology', name: 'Нетология', country: 'Россия', languages: ['ru'], color: '#6B4FBB', apiType: 'manual' as const },
  { code: 'hexlet', name: 'Hexlet', country: 'Россия', languages: ['ru', 'en'], color: '#5B9A68', apiType: 'manual' as const },
  { code: 'yandex_practicum', name: 'Яндекс Практикум', country: 'Россия', languages: ['ru'], color: '#FFCC00', apiType: 'oauth' as const },
  { code: 'alison', name: 'Alison', country: 'Ирландия', languages: ['en', 'es', 'fr', 'de', 'pt'], color: '#00A3E0', apiType: 'manual' as const },
  { code: 'swayam', name: 'SWAYAM', country: 'Индия', languages: ['en', 'hi'], color: '#1E88E5', apiType: 'manual' as const },
  { code: 'nptel', name: 'NPTEL', country: 'Индия', languages: ['en', 'hi'], color: '#FF6F00', apiType: 'manual' as const },
  { code: 'xuetangx', name: 'XuetangX (学堂在线)', country: 'Китай', languages: ['zh', 'en'], color: '#E62B1E', apiType: 'manual' as const },
  { code: 'icourse163', name: 'iCourse163 (中国大学MOOC)', country: 'Китай', languages: ['zh'], color: '#00BFFF', apiType: 'manual' as const },
  { code: 'jmooc', name: 'JMOOC', country: 'Япония', languages: ['ja'], color: '#E60012', apiType: 'manual' as const },
  { code: 'kmooc', name: 'K-MOOC', country: 'Южная Корея', languages: ['ko'], color: '#003878', apiType: 'manual' as const },
  { code: 'fun_mooc', name: 'FUN MOOC', country: 'Франция', languages: ['fr', 'en'], color: '#ED1C24', apiType: 'manual' as const },
  { code: 'miriadax', name: 'MiríadaX', country: 'Испания', languages: ['es', 'pt'], color: '#00B8C4', apiType: 'manual' as const },
  { code: 'eduonix', name: 'Eduonix', country: 'Индия', languages: ['en'], color: '#FF6B35', apiType: 'api_key' as const },
  { code: 'datacamp', name: 'DataCamp', country: 'США', languages: ['en'], color: '#03EF62', apiType: 'oauth' as const },
  { code: 'treehouse', name: 'Treehouse', country: 'США', languages: ['en'], color: '#5FCF80', apiType: 'api_key' as const },
  { code: 'brilliant', name: 'Brilliant', country: 'США', languages: ['en'], color: '#FB9400', apiType: 'manual' as const },
  { code: 'masterclass', name: 'MasterClass', country: 'США', languages: ['en'], color: '#000000', apiType: 'manual' as const },
  { code: 'domestika', name: 'Domestika', country: 'Испания', languages: ['es', 'en', 'pt', 'de', 'fr', 'it'], color: '#F9423A', apiType: 'manual' as const },
  { code: 'youtube_learning', name: 'YouTube Learning', country: 'США', languages: ['multi'], color: '#FF0000', apiType: 'oauth' as const },
  { code: 'mit_ocw', name: 'MIT OpenCourseWare', country: 'США', languages: ['en'], color: '#A31F34', apiType: 'manual' as const },
  { code: 'harvard_online', name: 'Harvard Online', country: 'США', languages: ['en'], color: '#A51C30', apiType: 'manual' as const },
  { code: 'stanford_online', name: 'Stanford Online', country: 'США', languages: ['en'], color: '#8C1515', apiType: 'manual' as const },
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
