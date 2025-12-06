import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlatformSelector } from './PlatformSelector';

interface CourseFormData {
  platformId: string;
  title: string;
  description: string;
  instructor: string;
  imageUrl: string;
  courseUrl: string;
  category: string;
  difficulty: string;
  duration: string;
  cost: string;
  tags: string;
}

interface Platform {
  id: string;
  name: string;
  color: string;
}

interface AddCourseModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: Partial<CourseFormData>;
  isEditing?: boolean;
  platforms?: Platform[];
}

const categories = [
  'Программирование',
  'Data Science',
  'Веб-разработка',
  'Мобильная разработка',
  'Дизайн',
  'Маркетинг',
  'Бизнес',
  'Языки',
  'Математика',
  'Физика',
  'Другое',
];

export function AddCourseModal({ 
  open, 
  onClose, 
  onSubmit, 
  initialData,
  isEditing = false,
  platforms = []
}: AddCourseModalProps) {
  const [formData, setFormData] = useState<CourseFormData>({
    platformId: '',
    title: '',
    description: '',
    instructor: '',
    imageUrl: '',
    courseUrl: '',
    category: '',
    difficulty: '',
    duration: '',
    cost: '',
    tags: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPlatformSelector, setShowPlatformSelector] = useState(false);
  const [connectedPlatforms, setConnectedPlatforms] = useState<Set<string>>(new Set());
  const [allPlatforms, setAllPlatforms] = useState<any[]>([]);

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
    }
  };

  const fetchAllPlatforms = async () => {
    try {
      const response = await fetch('/api/platforms');
      if (response.ok) {
        const data = await response.json();
        setAllPlatforms(data);
      }
    } catch (err) {
      console.error('Error fetching platforms:', err);
    }
  };

  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          platformId: (initialData as any).platformId || '',
          title: initialData.title || '',
          description: initialData.description || '',
          instructor: initialData.instructor || '',
          imageUrl: initialData.imageUrl || '',
          courseUrl: initialData.courseUrl || '',
          category: initialData.category || '',
          difficulty: initialData.difficulty || '',
          duration: initialData.duration || '',
          cost: (initialData as any).cost || '',
          tags: initialData.tags || '',
        });
      } else {
        setFormData({
          platformId: '',
          title: '',
          description: '',
          instructor: '',
          imageUrl: '',
          courseUrl: '',
          category: '',
          difficulty: '',
          duration: '',
          cost: '',
          tags: '',
        });
      }
      setErrors({});
      fetchConnectedPlatforms();
      fetchAllPlatforms();
    }
  }, [open, initialData]);

  const handleChange = (field: keyof CourseFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Название курса обязательно';
    }
    
    if (formData.courseUrl && !isValidUrl(formData.courseUrl)) {
      newErrors.courseUrl = 'Неверный формат URL';
    }
    
    if (formData.imageUrl && !isValidUrl(formData.imageUrl)) {
      newErrors.imageUrl = 'Неверный формат URL изображения';
    }
    
    if (formData.duration && isNaN(parseInt(formData.duration))) {
      newErrors.duration = 'Длительность должна быть числом';
    }

    if (formData.cost && isNaN(parseFloat(formData.cost))) {
      newErrors.cost = 'Стоимость должна быть числом';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    
    setIsSubmitting(true);
    
    try {
      const submitData = {
        platformId: formData.platformId || undefined,
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        instructor: formData.instructor.trim() || undefined,
        imageUrl: formData.imageUrl.trim() || undefined,
        courseUrl: formData.courseUrl.trim() || undefined,
        category: formData.category || undefined,
        difficulty: formData.difficulty || undefined,
        duration: formData.duration ? parseInt(formData.duration) : undefined,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      };
      
      await onSubmit(submitData);
      onClose();
      setFormData({
        platformId: '',
        title: '',
        description: '',
        instructor: '',
        imageUrl: '',
        courseUrl: '',
        category: '',
        difficulty: '',
        duration: '',
        cost: '',
        tags: '',
      });
    } catch (error) {
      console.error('Error submitting course:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Редактировать курс' : 'Добавить новый курс'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="platform">Образовательная платформа *</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPlatformSelector(true)}
                  className="flex-1 justify-start text-left truncate"
                >
                  {formData.platformId && (allPlatforms.find(p => p.id === formData.platformId) || platforms.find(p => p.id === formData.platformId))
                    ? (allPlatforms.find(p => p.id === formData.platformId) || platforms.find(p => p.id === formData.platformId))?.displayName || (allPlatforms.find(p => p.id === formData.platformId) || platforms.find(p => p.id === formData.platformId))?.name
                    : 'Выбрать платформу'}
                </Button>
                {formData.platformId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleChange('platformId', '')}
                  >
                    ✕
                  </Button>
                )}
              </div>
              {formData.platformId && (
                <p className="text-xs text-green-600">
                  ✓ Платформа выбрана: {(allPlatforms.find(p => p.id === formData.platformId) || platforms.find(p => p.id === formData.platformId))?.displayName || (allPlatforms.find(p => p.id === formData.platformId) || platforms.find(p => p.id === formData.platformId))?.name}
                </p>
              )}
              {!formData.platformId && (
                <p className="text-xs text-amber-600">
                  Выберите платформу, чтобы начать добавление курса
                </p>
              )}
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="title">Название курса *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Введите название курса"
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Краткое описание курса"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="instructor">Преподаватель</Label>
              <Input
                id="instructor"
                value={formData.instructor}
                onChange={(e) => handleChange('instructor', e.target.value)}
                placeholder="Имя преподавателя"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Длительность (мин)</Label>
              <Input
                id="duration"
                type="number"
                value={formData.duration}
                onChange={(e) => handleChange('duration', e.target.value)}
                placeholder="60"
                className={errors.duration ? 'border-red-500' : ''}
              />
              {errors.duration && (
                <p className="text-sm text-red-500">{errors.duration}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost">Стоимость курса (₽)</Label>
            <Input
              id="cost"
              type="number"
              step="0.01"
              value={formData.cost}
              onChange={(e) => handleChange('cost', e.target.value)}
              placeholder="0 - бесплатный курс"
              className={errors.cost ? 'border-red-500' : ''}
            />
            <p className="text-xs text-muted-foreground">
              Оставьте пустым или введите 0 для бесплатного курса
            </p>
            {errors.cost && (
              <p className="text-sm text-red-500">{errors.cost}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Категория</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => handleChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Сложность</Label>
              <Select 
                value={formData.difficulty} 
                onValueChange={(value) => handleChange('difficulty', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите уровень" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Начинающий</SelectItem>
                  <SelectItem value="intermediate">Средний</SelectItem>
                  <SelectItem value="advanced">Продвинутый</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="courseUrl">Ссылка на курс</Label>
            <Input
              id="courseUrl"
              value={formData.courseUrl}
              onChange={(e) => handleChange('courseUrl', e.target.value)}
              placeholder="https://example.com/course"
              className={errors.courseUrl ? 'border-red-500' : ''}
            />
            {errors.courseUrl && (
              <p className="text-sm text-red-500">{errors.courseUrl}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="imageUrl">URL изображения</Label>
            <Input
              id="imageUrl"
              value={formData.imageUrl}
              onChange={(e) => handleChange('imageUrl', e.target.value)}
              placeholder="https://example.com/image.jpg"
              className={errors.imageUrl ? 'border-red-500' : ''}
            />
            {errors.imageUrl && (
              <p className="text-sm text-red-500">{errors.imageUrl}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Теги (через запятую)</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => handleChange('tags', e.target.value)}
              placeholder="python, machine learning, ai"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Сохранение...' : (isEditing ? 'Сохранить' : 'Добавить')}
          </Button>
        </DialogFooter>
      </DialogContent>

      <PlatformSelector
        open={showPlatformSelector}
        onClose={() => setShowPlatformSelector(false)}
        onSelect={(platformId) => handleChange('platformId', platformId)}
        connectedPlatforms={connectedPlatforms}
        platforms={allPlatforms.length > 0 ? allPlatforms : undefined}
      />
    </Dialog>
  );
}
