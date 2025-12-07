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
import { AlertCircle } from 'lucide-react';

interface RecordingModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: RecordingData) => void;
  isLoading?: boolean;
}

export interface RecordingData {
  title: string;
  description?: string;
  streamUrl: string;
  streamPassword?: string;
  scheduledTime: string;
  duration?: number;
  platform: 'yandex_disk' | 'library';
}

export function RecordingModal({ open, onClose, onSubmit, isLoading }: RecordingModalProps) {
  const [formData, setFormData] = useState<RecordingData>({
    title: '',
    description: '',
    streamUrl: '',
    streamPassword: '',
    scheduledTime: '',
    duration: 60,
    platform: 'library',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Название обязательно';
    }

    if (!formData.streamUrl.trim()) {
      newErrors.streamUrl = 'Ссылка на трансляцию обязательна';
    } else if (!isValidUrl(formData.streamUrl)) {
      newErrors.streamUrl = 'Некорректная ссылка';
    }

    if (!formData.scheduledTime) {
      newErrors.scheduledTime = 'Время трансляции обязательно';
    }

    if (formData.duration && (formData.duration < 1 || formData.duration > 1440)) {
      newErrors.duration = 'Длительность должна быть от 1 до 1440 минут';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(formData);
      setFormData({
        title: '',
        description: '',
        streamUrl: '',
        streamPassword: '',
        scheduledTime: '',
        duration: 60,
        platform: 'library',
      });
      setErrors({});
      onClose();
    }
  };

  const handleDateTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, scheduledTime: e.target.value });
    if (errors.scheduledTime) {
      setErrors({ ...errors, scheduledTime: '' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Записать трансляцию</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Название */}
          <div className="space-y-2">
            <Label htmlFor="title">Название трансляции</Label>
            <Input
              id="title"
              placeholder="Введите название..."
              value={formData.title}
              onChange={(e) => {
                setFormData({ ...formData, title: e.target.value });
                if (errors.title) setErrors({ ...errors, title: '' });
              }}
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.title}
              </p>
            )}
          </div>

          {/* Описание */}
          <div className="space-y-2">
            <Label htmlFor="description">Описание (опционально)</Label>
            <Textarea
              id="description"
              placeholder="Описание трансляции..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="min-h-[100px]"
            />
          </div>

          {/* Ссылка на трансляцию */}
          <div className="space-y-2">
            <Label htmlFor="streamUrl">Ссылка на трансляцию</Label>
            <Input
              id="streamUrl"
              type="url"
              placeholder="https://example.com/stream"
              value={formData.streamUrl}
              onChange={(e) => {
                setFormData({ ...formData, streamUrl: e.target.value });
                if (errors.streamUrl) setErrors({ ...errors, streamUrl: '' });
              }}
              className={errors.streamUrl ? 'border-red-500' : ''}
            />
            {errors.streamUrl && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.streamUrl}
              </p>
            )}
          </div>

          {/* Пароль */}
          <div className="space-y-2">
            <Label htmlFor="streamPassword">Пароль для входа (опционально)</Label>
            <Input
              id="streamPassword"
              type="password"
              placeholder="Пароль если требуется..."
              value={formData.streamPassword}
              onChange={(e) => setFormData({ ...formData, streamPassword: e.target.value })}
            />
          </div>

          {/* Время трансляции */}
          <div className="space-y-2">
            <Label htmlFor="scheduledTime">Время начала трансляции</Label>
            <Input
              id="scheduledTime"
              type="datetime-local"
              value={formData.scheduledTime}
              onChange={handleDateTimeChange}
              className={errors.scheduledTime ? 'border-red-500' : ''}
            />
            {errors.scheduledTime && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.scheduledTime}
              </p>
            )}
          </div>

          {/* Длительность */}
          <div className="space-y-2">
            <Label htmlFor="duration">Ожидаемая длительность (минут)</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              max="1440"
              value={formData.duration}
              onChange={(e) => {
                setFormData({ ...formData, duration: parseInt(e.target.value) || 60 });
                if (errors.duration) setErrors({ ...errors, duration: '' });
              }}
              className={errors.duration ? 'border-red-500' : ''}
            />
            {errors.duration && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.duration}
              </p>
            )}
          </div>

          {/* Место сохранения */}
          <div className="space-y-2">
            <Label htmlFor="platform">Где сохранить запись</Label>
            <Select value={formData.platform} onValueChange={(value: any) => setFormData({ ...formData, platform: value })}>
              <SelectTrigger id="platform">
                <SelectValue placeholder="Выберите место..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="library">В библиотеке материалов</SelectItem>
                <SelectItem value="yandex_disk">На Яндекс.Диск</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Информационное сообщение */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              ℹ️ Запись начнётся в назначенное время. Убедитесь, что система имеет доступ к трансляции.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Планирование записи...' : 'Запланировать запись'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
