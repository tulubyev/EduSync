import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, Link as LinkIcon, Search, Globe } from 'lucide-react';

interface Platform {
  id: string;
  displayName: string;
  name: string;
  description?: string;
  category: string;
  logoUrl?: string;
  websiteUrl: string;
  authType: string;
  isConnected?: boolean;
  isGlobal?: boolean;
}

const globalPlatforms: Platform[] = [
  { id: 'coursera', displayName: 'Coursera', name: 'coursera', description: 'Курсы от лучших университетов мира', category: 'IT - General', websiteUrl: 'https://www.coursera.org', authType: 'oauth', isGlobal: true },
  { id: 'udemy', displayName: 'Udemy', name: 'udemy', description: 'Крупнейшая платформа с курсами', category: 'Professional', websiteUrl: 'https://www.udemy.com', authType: 'api_key', isGlobal: true },
  { id: 'edx', displayName: 'edX', name: 'edx', description: 'Курсы от MIT, Harvard, Berkeley', category: 'IT - General', websiteUrl: 'https://www.edx.org', authType: 'oauth', isGlobal: true },
  { id: 'stepik', displayName: 'Stepik', name: 'stepik', description: 'Российская платформа с курсами', category: 'IT - Programming', websiteUrl: 'https://stepik.org', authType: 'oauth', isGlobal: false },
  { id: 'skillbox', displayName: 'SkillBox', name: 'skillbox', description: 'Профессиональные курсы', category: 'Professional', websiteUrl: 'https://skillbox.ru', authType: 'oauth', isGlobal: false },
  { id: 'khan-academy', displayName: 'Khan Academy', name: 'khan-academy', description: 'Бесплатные курсы мирового класса', category: 'IT - General', websiteUrl: 'https://www.khanacademy.org', authType: 'oauth', isGlobal: true },
  { id: 'linkedin-learning', displayName: 'LinkedIn Learning', name: 'linkedin-learning', description: 'Профессиональное развитие', category: 'Professional', websiteUrl: 'https://www.linkedin.com/learning', authType: 'oauth', isGlobal: true },
  { id: 'pluralsight', displayName: 'Pluralsight', name: 'pluralsight', description: 'Технические навыки для IT', category: 'IT - Programming', websiteUrl: 'https://www.pluralsight.com', authType: 'api_key', isGlobal: true },
  { id: 'codecademy', displayName: 'Codecademy', name: 'codecademy', description: 'Интерактивное программирование', category: 'IT - Programming', websiteUrl: 'https://www.codecademy.com', authType: 'oauth', isGlobal: true },
  { id: 'skillshare', displayName: 'Skillshare', name: 'skillshare', description: 'Творческие курсы', category: 'Art & Design', websiteUrl: 'https://www.skillshare.com', authType: 'api_key', isGlobal: true },
  { id: 'udacity', displayName: 'Udacity', name: 'udacity', description: 'Нанодипломы в AI, Data Science', category: 'IT - Data Science', websiteUrl: 'https://www.udacity.com', authType: 'oauth', isGlobal: true },
  { id: 'datacamp', displayName: 'DataCamp', name: 'datacamp', description: 'Data Science и Machine Learning', category: 'IT - Data Science', websiteUrl: 'https://www.datacamp.com', authType: 'api_key', isGlobal: true },
  { id: 'duolingo', displayName: 'Duolingo', name: 'duolingo', description: 'Изучение языков в игровой форме', category: 'Language Learning', websiteUrl: 'https://www.duolingo.com', authType: 'oauth', isGlobal: true },
];

interface PlatformSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (platformId: string) => void;
  connectedPlatforms?: Set<string>;
  platforms?: Platform[];
}

export function PlatformSelector({
  open,
  onClose,
  onSelect,
  connectedPlatforms = new Set(),
  platforms,
}: PlatformSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [requestingConnect, setRequestingConnect] = useState<string | null>(null);

  // Use provided platforms or fallback to globalPlatforms
  const allPlatforms = platforms || globalPlatforms;
  
  // Extract unique categories from platforms
  const categories = Array.from(new Set(allPlatforms.map(p => p.category).filter(Boolean))).sort();
  
  // Determine if showing global/russian filter (useful for large lists)
  const hasGlobal = allPlatforms.some(p => (p as any).isGlobal === true);
  const hasRussian = allPlatforms.some(p => (p as any).isGlobal === false);
  
  const connected = allPlatforms.filter(p => connectedPlatforms.has(p.id));
  const available = allPlatforms.filter(p => !connectedPlatforms.has(p.id));

  const filterPlatforms = (platforms: Platform[]) => {
    return platforms.filter(p => {
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          p.displayName.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      
      // Filter by category
      if (selectedCategory !== 'all' && selectedCategory !== 'global' && selectedCategory !== 'russian') {
        if (p.category !== selectedCategory) return false;
      }
      
      // Filter by region type
      if (selectedCategory === 'global' && (p as any).isGlobal !== true) return false;
      if (selectedCategory === 'russian' && (p as any).isGlobal !== false) return false;
      
      return true;
    });
  };

  const handleConnect = async (platform: Platform) => {
    setRequestingConnect(platform.id);
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
      }
    } catch (err) {
      console.error('Error connecting platform:', err);
    } finally {
      setRequestingConnect(null);
    }
  };

  const filteredConnected = filterPlatforms(connected);
  const filteredAvailable = filterPlatforms(available);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] h-[90vh] flex flex-col p-0">
        <div className="px-6 pt-6 pb-3 border-b flex-shrink-0">
          <DialogTitle>Выберите образовательную платформу</DialogTitle>
        </div>

        <div className="px-4 py-3 border-b flex-shrink-0 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск платформы..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="flex flex-nowrap gap-2 overflow-x-auto pb-2 scrollbar-thin">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              className="text-xs h-7 shrink-0"
              onClick={() => setSelectedCategory('all')}
            >
              Все ({allPlatforms.length})
            </Button>
            <Button
              variant={selectedCategory === 'global' ? 'default' : 'outline'}
              size="sm"
              className="text-xs h-7 whitespace-nowrap shrink-0"
              onClick={() => setSelectedCategory('global')}
            >
              <Globe className="h-3 w-3 mr-1" />
              Глобальные
            </Button>
            <Button
              variant={selectedCategory === 'russian' ? 'default' : 'outline'}
              size="sm"
              className="text-xs h-7 whitespace-nowrap shrink-0"
              onClick={() => setSelectedCategory('russian')}
            >
              <Globe className="h-3 w-3 mr-1" />
              Русские
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                size="sm"
                className="text-xs h-7 whitespace-nowrap shrink-0"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        <ScrollArea className="flex-1 overflow-y-auto px-4">
          <div className="space-y-4 pr-4">
            {/* Connected Platforms */}
            {filteredConnected.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Подключенные платформы
                </h3>
                <div className="space-y-2">
                  {filteredConnected.map((platform) => (
                    <button
                      key={platform.id}
                      onClick={() => {
                        onSelect(platform.id);
                        onClose();
                      }}
                      className="w-full text-left p-3 rounded-lg border-2 border-green-200 bg-green-50 hover:bg-green-100 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-green-900">{platform.displayName || platform.name}</div>
                          <div className="text-xs text-green-700">{platform.description}</div>
                        </div>
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Available Platforms */}
            {filteredAvailable.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  Доступные платформы
                </h3>
                <div className="space-y-2">
                  {filteredAvailable.map((platform) => (
                    <div
                      key={platform.id}
                      className="p-3 rounded-lg border-2 border-border bg-card hover:bg-accent transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-medium">{platform.displayName || platform.name}</div>
                          <div className="text-xs text-muted-foreground">{platform.description}</div>
                          <Badge variant="outline" className="mt-2 text-xs">
                            {platform.category}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => {
                            onSelect(platform.id);
                            onClose();
                          }}
                          className="flex-1"
                        >
                          Использовать
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleConnect(platform)}
                          disabled={requestingConnect === platform.id}
                        >
                          {requestingConnect === platform.id ? 'Подключение...' : 'Подключить'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filteredConnected.length === 0 && filteredAvailable.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                Платформы не найдены
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
