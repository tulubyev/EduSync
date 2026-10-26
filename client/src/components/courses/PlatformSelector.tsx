import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Link as LinkIcon, Search, Globe } from 'lucide-react';
import { useLang } from '@/i18n';

interface ApiPlatform {
  id: string;
  code: string;
  name: string;
  description?: string;
  categoryId?: string;
  regionId?: string | null;
  logoUrl?: string;
  websiteUrl: string;
  apiType: string;
}

interface Category {
  id: string;
  name: string;
  displayName: string;
}

interface NormalizedPlatform {
  id: string;
  displayName: string;
  name: string;
  description?: string;
  category: string;
  categoryId?: string;
  logoUrl?: string;
  websiteUrl: string;
  authType: string;
  isGlobal: boolean;
}

interface PlatformSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (platformId: string) => void;
  connectedPlatforms?: Set<string>;
  platforms?: ApiPlatform[];
}

export function PlatformSelector({
  open,
  onClose,
  onSelect,
  connectedPlatforms = new Set(),
  platforms = [],
}: PlatformSelectorProps) {
  const { m } = useLang();
  const t = m.courses.platformSelector;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [requestingConnect, setRequestingConnect] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (open) {
      fetch('/api/platforms/categories')
        .then(res => res.json())
        .then(data => setCategories(data))
        .catch(err => console.error('Failed to load categories:', err));
    }
  }, [open]);

  const normalizedPlatforms: NormalizedPlatform[] = platforms.map(p => {
    const cat = categories.find(c => c.id === p.categoryId);
    return {
      id: p.id,
      displayName: p.name,
      name: p.code || p.name,
      description: p.description,
      category: cat?.displayName || cat?.name || '',
      categoryId: p.categoryId,
      logoUrl: p.logoUrl,
      websiteUrl: p.websiteUrl,
      authType: p.apiType,
      isGlobal: p.regionId === null || p.regionId === undefined,
    };
  });

  const categoryNames = Array.from(
    new Set(normalizedPlatforms.map(p => p.category).filter(c => c && c.trim() !== ''))
  ).sort();
  
  const connected = normalizedPlatforms.filter(p => connectedPlatforms.has(p.id));
  const available = normalizedPlatforms.filter(p => !connectedPlatforms.has(p.id));

  const filterPlatforms = (platforms: NormalizedPlatform[]) => {
    return platforms.filter(p => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          (p.displayName || '').toLowerCase().includes(query) ||
          (p.name || '').toLowerCase().includes(query) ||
          (p.description || '').toLowerCase().includes(query) ||
          (p.category || '').toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      
      if (selectedCategory === 'global') {
        return p.isGlobal === true;
      }
      if (selectedCategory === 'russian') {
        return p.isGlobal === false;
      }
      if (selectedCategory !== 'all') {
        return p.category === selectedCategory;
      }
      
      return true;
    });
  };

  const handleConnect = async (platform: NormalizedPlatform) => {
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
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] !grid-rows-[auto_auto_1fr] !grid !p-0">
        <div className="px-6 pt-6 pb-4">
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription className="sr-only">
            {t.description}
          </DialogDescription>
        </div>

        <div className="px-4 pb-3 border-b">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="flex flex-wrap gap-2 pb-2">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              className="text-xs h-7"
              onClick={() => setSelectedCategory('all')}
            >
              {t.all(normalizedPlatforms.length)}
            </Button>
            <Button
              variant={selectedCategory === 'global' ? 'default' : 'outline'}
              size="sm"
              className="text-xs h-7"
              onClick={() => setSelectedCategory('global')}
            >
              <Globe className="h-3 w-3 mr-1" />
              {t.global}
            </Button>
            <Button
              variant={selectedCategory === 'russian' ? 'default' : 'outline'}
              size="sm"
              className="text-xs h-7"
              onClick={() => setSelectedCategory('russian')}
            >
              <Globe className="h-3 w-3 mr-1" />
              {t.russian}
            </Button>
            {categoryNames.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                size="sm"
                className="text-xs h-7"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto px-4 py-4">
          <div className="space-y-4 pr-2">
            {filteredConnected.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  {t.connected}
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
                        <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {filteredAvailable.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  {t.available}
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
                          {platform.category && (
                            <Badge variant="outline" className="mt-2 text-xs">
                              {platform.category}
                            </Badge>
                          )}
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
                          {t.use}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleConnect(platform)}
                          disabled={requestingConnect === platform.id}
                        >
                          {requestingConnect === platform.id ? t.connecting : t.connect}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filteredConnected.length === 0 && filteredAvailable.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                {t.notFound}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
