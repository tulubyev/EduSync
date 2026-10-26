import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useLang } from '@/i18n';

interface AddPlatformModalProps {
  onPlatformAdded?: () => void;
}

const AUTH_TYPES = ['oauth', 'api_key', 'manual', 'none'] as const;

// Значения категорий уходят на сервер как есть; подписи — m.platforms.add.categoryOptions в том же порядке
const CATEGORIES = [
  'Университеты',
  'Маркетплейс',
  'Технические',
  'Программирование',
  'Творческие',
  'Data Science',
  'Бесплатные',
  'Науки',
  'Языки',
  'Профессиональные',
];

export function AddPlatformModal({ onPlatformAdded }: AddPlatformModalProps) {
  const { m } = useLang();
  const a = m.platforms.add;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    websiteUrl: '',
    category: '',
    authType: 'manual',
    description: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/platforms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          code: formData.code.toLowerCase().replace(/\s+/g, '_'),
          websiteUrl: formData.websiteUrl,
          description: formData.description,
          category: formData.category,
          apiType: formData.authType,
          isActive: true,
        }),
      });

      if (response.ok) {
        setFormData({
          name: '',
          code: '',
          websiteUrl: '',
          category: '',
          authType: 'manual',
          description: '',
        });
        setOpen(false);
        onPlatformAdded?.();
        alert(a.success);
      } else {
        const error = await response.json();
        alert(a.error(error.message || a.errorDefault));
      }
    } catch (error) {
      console.error('Error adding platform:', error);
      alert(a.errorGeneric);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          {a.button}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{a.title}</DialogTitle>
          <DialogDescription>
            {a.description}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">{a.name}</Label>
            <Input
              id="name"
              placeholder={a.namePlaceholder}
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="code">{a.code}</Label>
            <Input
              id="code"
              placeholder={a.codePlaceholder}
              value={formData.code}
              onChange={(e) => handleInputChange('code', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="website">{a.website}</Label>
            <Input
              id="website"
              type="url"
              placeholder="https://skillbox.ru"
              value={formData.websiteUrl}
              onChange={(e) => handleInputChange('websiteUrl', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="category">{a.category}</Label>
            <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
              <SelectTrigger id="category">
                <SelectValue placeholder={a.categoryPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat, i) => (
                  <SelectItem key={cat} value={cat}>
                    {a.categoryOptions[i] ?? cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="authType">{a.authType}</Label>
            <Select value={formData.authType} onValueChange={(value) => handleInputChange('authType', value)}>
              <SelectTrigger id="authType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUTH_TYPES.map((auth) => (
                  <SelectItem key={auth} value={auth}>
                    {a.authTypes[auth]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">{a.descriptionLabel}</Label>
            <Input
              id="description"
              placeholder={a.descriptionPlaceholder}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              {m.common.cancel}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? a.adding : a.submit}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
