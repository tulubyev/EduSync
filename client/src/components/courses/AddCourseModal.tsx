import { useState } from 'react';
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

interface CourseFormData {
  title: string;
  description: string;
  instructor: string;
  imageUrl: string;
  courseUrl: string;
  category: string;
  difficulty: string;
  duration: string;
  tags: string;
}

interface AddCourseModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: Partial<CourseFormData>;
  isEditing?: boolean;
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
  isEditing = false 
}: AddCourseModalProps) {
  const [formData, setFormData] = useState<CourseFormData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    instructor: initialData?.instructor || '',
    imageUrl: initialData?.imageUrl || '',
    courseUrl: initialData?.courseUrl || '',
    category: initialData?.category || '',
    difficulty: initialData?.difficulty || '',
    duration: initialData?.duration || '',
    tags: initialData?.tags || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        instructor: formData.instructor.trim() || undefined,
        imageUrl: formData.imageUrl.trim() || undefined,
        courseUrl: formData.courseUrl.trim() || undefined,
        category: formData.category || undefined,
        difficulty: formData.difficulty || undefined,
        duration: formData.duration ? parseInt(formData.duration) : undefined,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      };
      
      await onSubmit(submitData);
      onClose();
      setFormData({
        title: '',
        description: '',
        instructor: '',
        imageUrl: '',
        courseUrl: '',
        category: '',
        difficulty: '',
        duration: '',
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
    </Dialog>
  );
}
