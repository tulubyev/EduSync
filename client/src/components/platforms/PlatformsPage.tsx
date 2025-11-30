import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  ExternalLink, 
  Globe, 
  BookOpen,
  CheckCircle,
  Link as LinkIcon
} from 'lucide-react';

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
  {
    id: 'coursera',
    name: 'coursera',
    displayName: 'Coursera',
    websiteUrl: 'https://www.coursera.org',
    logoUrl: 'https://d3njjcbhbojbot.cloudfront.net/web/images/favicons/favicon-v2-194x194.png',
    description: 'Курсы от лучших университетов мира: Stanford, Yale, Princeton',
    category: 'Университеты',
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
    description: 'Курсы от MIT, Harvard, Berkeley и других топ-университетов',
    category: 'Университеты',
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
    description: 'Крупнейшая платформа онлайн-курсов с 200,000+ курсов',
    category: 'Маркетплейс',
    authType: 'api_key',
    isGlobal: true,
    supportedLanguages: ['en', 'ru', 'es', 'de', 'fr', 'pt', 'ja', 'ko', 'zh', 'tr'],
  },
  {
    id: 'stepik',
    name: 'stepik',
    displayName: 'Stepik',
    websiteUrl: 'https://stepik.org',
    logoUrl: 'https://stepik.org/static/social/png/stepik-logo-large.png',
    description: 'Российская платформа с курсами от ВШЭ, МФТИ, Яндекс',
    category: 'Университеты',
    authType: 'oauth',
    isGlobal: false,
    supportedLanguages: ['ru', 'en'],
  },
  {
    id: 'khan-academy',
    name: 'khan-academy',
    displayName: 'Khan Academy',
    websiteUrl: 'https://www.khanacademy.org',
    logoUrl: 'https://cdn.kastatic.org/images/khan-logo-vertical-transparent.png',
    description: 'Бесплатное образование мирового класса для всех',
    category: 'Бесплатные',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['en', 'ru', 'es', 'fr', 'de', 'pt', 'zh', 'ar', 'hi', 'ja'],
  },
  {
    id: 'linkedin-learning',
    name: 'linkedin-learning',
    displayName: 'LinkedIn Learning',
    websiteUrl: 'https://www.linkedin.com/learning',
    logoUrl: 'https://static.licdn.com/aero-v1/sc/h/al2o9zrvru7aqj8e1x2rzsrca',
    description: 'Профессиональные курсы от экспертов индустрии',
    category: 'Профессиональные',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['en', 'de', 'fr', 'es', 'pt', 'ja', 'zh'],
  },
  {
    id: 'pluralsight',
    name: 'pluralsight',
    displayName: 'Pluralsight',
    websiteUrl: 'https://www.pluralsight.com',
    logoUrl: 'https://www.pluralsight.com/etc/clientlibs/pluralsight/main/images/favicons/android-chrome-192x192.png',
    description: 'Технические навыки для IT-специалистов',
    category: 'Технические',
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
    description: 'Интерактивное обучение программированию',
    category: 'Программирование',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['en'],
  },
  {
    id: 'skillshare',
    name: 'skillshare',
    displayName: 'Skillshare',
    websiteUrl: 'https://www.skillshare.com',
    logoUrl: 'https://static.skillshare.com/assets/images/skillshare-logo-color-small-93caf6f.svg',
    description: 'Творческие курсы: дизайн, фото, видео, бизнес',
    category: 'Творческие',
    authType: 'api_key',
    isGlobal: true,
    supportedLanguages: ['en', 'es', 'pt', 'fr', 'de'],
  },
  {
    id: 'udacity',
    name: 'udacity',
    displayName: 'Udacity',
    websiteUrl: 'https://www.udacity.com',
    logoUrl: 'https://www.udacity.com/favicon.ico',
    description: 'Нанодипломы в AI, Data Science, программировании',
    category: 'Технические',
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
    category: 'Data Science',
    authType: 'api_key',
    isGlobal: true,
    supportedLanguages: ['en'],
  },
  {
    id: 'freecodecamp',
    name: 'freecodecamp',
    displayName: 'freeCodeCamp',
    websiteUrl: 'https://www.freecodecamp.org',
    logoUrl: 'https://www.freecodecamp.org/favicon.ico',
    description: 'Бесплатное обучение веб-разработке',
    category: 'Бесплатные',
    authType: 'none',
    isGlobal: true,
    supportedLanguages: ['en', 'es', 'zh', 'pt'],
  },
  {
    id: 'mit-ocw',
    name: 'mit-ocw',
    displayName: 'MIT OpenCourseWare',
    websiteUrl: 'https://ocw.mit.edu',
    logoUrl: 'https://ocw.mit.edu/favicon.ico',
    description: 'Бесплатные материалы курсов MIT',
    category: 'Университеты',
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
    category: 'Университеты',
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
    category: 'Бесплатные',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['en', 'ru', 'es', 'de', 'fr', 'pt', 'ja', 'ko', 'zh', 'hi'],
  },
  {
    id: 'treehouse',
    name: 'treehouse',
    displayName: 'Treehouse',
    websiteUrl: 'https://teamtreehouse.com',
    logoUrl: 'https://teamtreehouse.com/favicon.ico',
    description: 'Веб-разработка и дизайн для начинающих',
    category: 'Программирование',
    authType: 'api_key',
    isGlobal: true,
    supportedLanguages: ['en'],
  },
  {
    id: 'brilliant',
    name: 'brilliant',
    displayName: 'Brilliant',
    websiteUrl: 'https://brilliant.org',
    logoUrl: 'https://brilliant.org/favicon.ico',
    description: 'Интерактивные курсы по математике и науке',
    category: 'Науки',
    authType: 'api_key',
    isGlobal: true,
    supportedLanguages: ['en'],
  },
  {
    id: 'masterclass',
    name: 'masterclass',
    displayName: 'MasterClass',
    websiteUrl: 'https://www.masterclass.com',
    logoUrl: 'https://www.masterclass.com/favicon.ico',
    description: 'Уроки от знаменитостей и экспертов',
    category: 'Творческие',
    authType: 'api_key',
    isGlobal: true,
    supportedLanguages: ['en'],
  },
  {
    id: 'duolingo',
    name: 'duolingo',
    displayName: 'Duolingo',
    websiteUrl: 'https://www.duolingo.com',
    logoUrl: 'https://www.duolingo.com/favicon.ico',
    description: 'Изучение иностранных языков в игровой форме',
    category: 'Языки',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['en', 'ru', 'es', 'de', 'fr', 'pt', 'ja', 'ko', 'zh'],
  },
  {
    id: 'busuu',
    name: 'busuu',
    displayName: 'Busuu',
    websiteUrl: 'https://www.busuu.com',
    logoUrl: 'https://www.busuu.com/favicon.ico',
    description: 'Изучение языков с носителями',
    category: 'Языки',
    authType: 'api_key',
    isGlobal: true,
    supportedLanguages: ['en', 'es', 'de', 'fr', 'pt', 'ru', 'zh', 'ja'],
  },
  {
    id: 'memrise',
    name: 'memrise',
    displayName: 'Memrise',
    websiteUrl: 'https://www.memrise.com',
    logoUrl: 'https://www.memrise.com/favicon.ico',
    description: 'Запоминание слов через мнемотехники',
    category: 'Языки',
    authType: 'api_key',
    isGlobal: true,
    supportedLanguages: ['en', 'es', 'de', 'fr', 'pt', 'ru', 'zh', 'ja', 'ko'],
  },
  {
    id: 'openuned',
    name: 'openuned',
    displayName: 'OpenUNED',
    websiteUrl: 'https://www.uned.es',
    logoUrl: 'https://www.uned.es/favicon.ico',
    description: 'Испанский университет дистанционного образования',
    category: 'Университеты',
    authType: 'oauth',
    isGlobal: true,
    supportedLanguages: ['es', 'en'],
  },
  {
    id: 'alison',
    name: 'alison',
    displayName: 'Alison',
    websiteUrl: 'https://alison.com',
    logoUrl: 'https://alison.com/favicon.ico',
    description: 'Бесплатные дипломные курсы',
    category: 'Бесплатные',
    authType: 'none',
    isGlobal: true,
    supportedLanguages: ['en', 'es', 'fr', 'de', 'pt', 'ar'],
  },
  {
    id: 'sololearn',
    name: 'sololearn',
    displayName: 'SoloLearn',
    websiteUrl: 'https://www.sololearn.com',
    logoUrl: 'https://www.sololearn.com/favicon.ico',
    description: 'Мобильное обучение программированию',
    category: 'Программирование',
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
    description: 'IT-образование на русском языке',
    category: 'Технические',
    authType: 'api_key',
    isGlobal: false,
    supportedLanguages: ['ru'],
  },
  {
    id: 'skillbox',
    name: 'skillbox',
    displayName: 'Skillbox',
    websiteUrl: 'https://skillbox.ru',
    logoUrl: 'https://skillbox.ru/favicon.ico',
    description: 'Онлайн-университет профессий',
    category: 'Профессиональные',
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
    description: 'Онлайн-обучение digital-профессиям',
    category: 'Профессиональные',
    authType: 'api_key',
    isGlobal: false,
    supportedLanguages: ['ru'],
  },
];

const categoryColors: Record<string, string> = {
  'Университеты': 'bg-blue-100 text-blue-800',
  'Маркетплейс': 'bg-purple-100 text-purple-800',
  'Технические': 'bg-green-100 text-green-800',
  'Программирование': 'bg-cyan-100 text-cyan-800',
  'Творческие': 'bg-pink-100 text-pink-800',
  'Data Science': 'bg-orange-100 text-orange-800',
  'Бесплатные': 'bg-emerald-100 text-emerald-800',
  'Науки': 'bg-indigo-100 text-indigo-800',
  'Языки': 'bg-yellow-100 text-yellow-800',
  'Профессиональные': 'bg-slate-100 text-slate-800',
};

export function PlatformsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [connectedPlatforms, setConnectedPlatforms] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConnectedPlatforms();
  }, []);

  const fetchConnectedPlatforms = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/platforms/connected', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setConnectedPlatforms(new Set(data.map((p: any) => p.platformId)));
      }
    } catch (err) {
      console.error('Error fetching connected platforms:', err);
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

  const filteredPlatforms = globalPlatforms
    .filter(p => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          p.displayName.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .filter(p => {
      if (selectedCategory === 'all') return true;
      if (selectedCategory === 'connected') return connectedPlatforms.has(p.id);
      if (selectedCategory === 'russian') return !p.isGlobal;
      return p.category === selectedCategory;
    });

  const categories = Array.from(new Set(globalPlatforms.map(p => p.category)));

  const stats = {
    total: globalPlatforms.length,
    connected: connectedPlatforms.size,
    global: globalPlatforms.filter(p => p.isGlobal).length,
    russian: globalPlatforms.filter(p => !p.isGlobal).length,
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
        <Button
          variant={selectedCategory === 'russian' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('russian')}
        >
          🇷🇺 Российские ({stats.russian})
        </Button>
        {categories.map((cat) => (
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
            
            return (
              <Card key={platform.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {platform.logoUrl ? (
                        <img 
                          src={platform.logoUrl} 
                          alt={platform.displayName}
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
                        {platform.displayName}
                        {isConnected && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </CardTitle>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <Badge className={categoryColors[platform.category] || 'bg-gray-100'}>
                          {platform.category}
                        </Badge>
                        {!platform.isGlobal && (
                          <Badge variant="outline">🇷🇺</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-3 line-clamp-2">
                    {platform.description}
                  </CardDescription>
                  
                  <div className="flex flex-wrap gap-1 mb-3">
                    {platform.supportedLanguages.slice(0, 5).map((lang) => (
                      <Badge key={lang} variant="secondary" className="text-xs">
                        {lang.toUpperCase()}
                      </Badge>
                    ))}
                    {platform.supportedLanguages.length > 5 && (
                      <Badge variant="secondary" className="text-xs">
                        +{platform.supportedLanguages.length - 5}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
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
    </div>
  );
}
