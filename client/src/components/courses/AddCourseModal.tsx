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
import { useLang } from '@/i18n';
import { COURSE_CATEGORIES } from '@/locales/courses';

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

export function AddCourseModal({ 
  open, 
  onClose, 
  onSubmit, 
  initialData,
  isEditing = false,
  platforms = []
}: AddCourseModalProps) {
  const { m } = useLang();
  const f = m.courses.form;
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
      newErrors.title = f.errTitle;
    }
    
    if (formData.courseUrl && !isValidUrl(formData.courseUrl)) {
      newErrors.courseUrl = f.errUrl;
    }
    
    if (formData.imageUrl && !isValidUrl(formData.imageUrl)) {
      newErrors.imageUrl = f.errImageUrl;
    }
    
    if (formData.duration && isNaN(parseInt(formData.duration))) {
      newErrors.duration = f.errDuration;
    }

    if (formData.cost && isNaN(parseFloat(formData.cost))) {
      newErrors.cost = f.errCost;
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
            {isEditing ? f.titleEdit : f.titleNew}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="platform">{f.platform}</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPlatformSelector(true)}
                  className="flex-1 justify-start text-left truncate"
                >
                  {formData.platformId && (allPlatforms.find(p => p.id === formData.platformId) || platforms.find(p => p.id === formData.platformId))
                    ? (allPlatforms.find(p => p.id === formData.platformId) || platforms.find(p => p.id === formData.platformId))?.displayName || (allPlatforms.find(p => p.id === formData.platformId) || platforms.find(p => p.id === formData.platformId))?.name
                    : f.choosePlatform}
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
                  {f.platformChosen((allPlatforms.find(p => p.id === formData.platformId) || platforms.find(p => p.id === formData.platformId))?.displayName || (allPlatforms.find(p => p.id === formData.platformId) || platforms.find(p => p.id === formData.platformId))?.name || '')}
                </p>
              )}
              {!formData.platformId && (
                <p className="text-xs text-amber-600">
                  {f.choosePlatformHint}
                </p>
              )}
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="title">{f.title}</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder={f.titlePlaceholder}
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{f.description}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder={f.descriptionPlaceholder}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="instructor">{f.instructor}</Label>
              <Input
                id="instructor"
                value={formData.instructor}
                onChange={(e) => handleChange('instructor', e.target.value)}
                placeholder={f.instructorPlaceholder}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">{f.duration}</Label>
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
            <Label htmlFor="cost">{f.cost}</Label>
            <Input
              id="cost"
              type="number"
              step="0.01"
              value={formData.cost}
              onChange={(e) => handleChange('cost', e.target.value)}
              placeholder={f.costPlaceholder}
              className={errors.cost ? 'border-red-500' : ''}
            />
            <p className="text-xs text-muted-foreground">
              {f.costHint}
            </p>
            {errors.cost && (
              <p className="text-sm text-red-500">{errors.cost}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">{f.category}</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => handleChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={f.categoryPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {COURSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{m.courses.categories[cat] ?? cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">{f.difficulty}</Label>
              <Select 
                value={formData.difficulty} 
                onValueChange={(value) => handleChange('difficulty', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={f.difficultyPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {(['beginner', 'intermediate', 'advanced'] as const).map((d) => (
                    <SelectItem key={d} value={d}>{m.courses.difficulty[d]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="courseUrl">{f.courseUrl}</Label>
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
            <Label htmlFor="imageUrl">{f.imageUrl}</Label>
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
            <Label htmlFor="tags">{f.tags}</Label>
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
            {m.common.cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? m.common.saving : (isEditing ? m.common.save : m.common.add)}
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
