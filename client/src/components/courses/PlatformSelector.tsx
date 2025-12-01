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
import { CheckCircle, Link as LinkIcon, Search } from 'lucide-react';

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
}

const globalPlatforms: Platform[] = [
  { id: 'coursera', displayName: 'Coursera', name: 'coursera', description: 'Курсы от лучших университетов мира', category: 'Университеты', websiteUrl: 'https://www.coursera.org', authType: 'oauth' },
  { id: 'udemy', displayName: 'Udemy', name: 'udemy', description: 'Крупнейшая платформа онлайн-курсов', category: 'Маркетплейс', websiteUrl: 'https://www.udemy.com', authType: 'api_key' },
  { id: 'edx', displayName: 'edX', name: 'edx', description: 'Курсы от MIT, Harvard, Berkeley', category: 'Университеты', websiteUrl: 'https://www.edx.org', authType: 'oauth' },
  { id: 'stepik', displayName: 'Stepik', name: 'stepik', description: 'Российская платформа с курсами', category: 'Университеты', websiteUrl: 'https://stepik.org', authType: 'oauth' },
  { id: 'skillbox', displayName: 'SkillBox', name: 'skillbox', description: 'Профессиональные курсы в России', category: 'Профессиональные', websiteUrl: 'https://skillbox.ru', authType: 'oauth' },
  { id: 'khan-academy', displayName: 'Khan Academy', name: 'khan-academy', description: 'Бесплатное образование мирового класса', category: 'Бесплатные', websiteUrl: 'https://www.khanacademy.org', authType: 'oauth' },
  { id: 'linkedin-learning', displayName: 'LinkedIn Learning', name: 'linkedin-learning', description: 'Профессиональные курсы', category: 'Профессиональные', websiteUrl: 'https://www.linkedin.com/learning', authType: 'oauth' },
  { id: 'pluralsight', displayName: 'Pluralsight', name: 'pluralsight', description: 'Технические навыки для IT', category: 'Технические', websiteUrl: 'https://www.pluralsight.com', authType: 'api_key' },
  { id: 'codecademy', displayName: 'Codecademy', name: 'codecademy', description: 'Интерактивное обучение программированию', category: 'Программирование', websiteUrl: 'https://www.codecademy.com', authType: 'oauth' },
  { id: 'skillshare', displayName: 'Skillshare', name: 'skillshare', description: 'Творческие курсы', category: 'Творческие', websiteUrl: 'https://www.skillshare.com', authType: 'api_key' },
  { id: 'udacity', displayName: 'Udacity', name: 'udacity', description: 'Нанодипломы в AI, Data Science', category: 'Технические', websiteUrl: 'https://www.udacity.com', authType: 'oauth' },
  { id: 'datacamp', displayName: 'DataCamp', name: 'datacamp', description: 'Data Science, Machine Learning', category: 'Data Science', websiteUrl: 'https://www.datacamp.com', authType: 'api_key' },
  { id: 'duolingo', displayName: 'Duolingo', name: 'duolingo', description: 'Изучение языков в игровой форме', category: 'Языки', websiteUrl: 'https://www.duolingo.com', authType: 'oauth' },
];

interface PlatformSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (platformId: string) => void;
  connectedPlatforms?: Set<string>;
}

export function PlatformSelector({
  open,
  onClose,
  onSelect,
  connectedPlatforms = new Set(),
}: PlatformSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [requestingConnect, setRequestingConnect] = useState<string | null>(null);

  const connected = globalPlatforms.filter(p => connectedPlatforms.has(p.id));
  const available = globalPlatforms.filter(p => !connectedPlatforms.has(p.id));

  const filterPlatforms = (platforms: Platform[]) => {
    if (!searchQuery) return platforms;
    const query = searchQuery.toLowerCase();
    return platforms.filter(p =>
      p.displayName.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query)
    );
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
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Выберите образовательную платформу</DialogTitle>
        </DialogHeader>

        <div className="px-4 relative mb-2">
          <Search className="absolute left-7 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск платформы..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="flex-1 px-4 overflow-y-auto">
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
                          <div className="font-medium text-green-900">{platform.displayName}</div>
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
                          <div className="font-medium">{platform.displayName}</div>
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
