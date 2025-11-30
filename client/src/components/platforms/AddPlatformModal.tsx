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

interface AddPlatformModalProps {
  onPlatformAdded?: () => void;
}

const AUTH_TYPES = [
  { value: 'oauth', label: 'OAuth' },
  { value: 'api_key', label: 'API Key' },
  { value: 'manual', label: 'Ручной ввод' },
  { value: 'none', label: 'Не требуется' },
];

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
        alert('✅ Платформа успешно добавлена!');
      } else {
        const error = await response.json();
        alert(`❌ Ошибка: ${error.message || 'Не удалось добавить платформу'}`);
      }
    } catch (error) {
      console.error('Error adding platform:', error);
      alert('❌ Ошибка при добавлении платформы');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Добавить платформу
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Добавить новую платформу</DialogTitle>
          <DialogDescription>
            Добавьте образовательную платформу в каталог My EPA
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Название платформы *</Label>
            <Input
              id="name"
              placeholder="Например: Skillbox"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="code">Код платформы *</Label>
            <Input
              id="code"
              placeholder="skillbox (будет преобразован в lowercase)"
              value={formData.code}
              onChange={(e) => handleInputChange('code', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="website">Веб-сайт платформы *</Label>
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
            <Label htmlFor="category">Категория *</Label>
            <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Выберите категорию" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="authType">Тип авторизации *</Label>
            <Select value={formData.authType} onValueChange={(value) => handleInputChange('authType', value)}>
              <SelectTrigger id="authType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUTH_TYPES.map((auth) => (
                  <SelectItem key={auth.value} value={auth.value}>
                    {auth.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Описание</Label>
            <Input
              id="description"
              placeholder="Краткое описание платформы"
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
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '⏳ Добавляем...' : '✨ Добавить'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
