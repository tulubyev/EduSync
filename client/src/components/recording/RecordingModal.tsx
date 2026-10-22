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
import { Checkbox } from '@/components/ui/checkbox';
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
  error?: string | null;
}

export interface RecordingData {
  title: string;
  description?: string;
  streamUrl: string;
  streamPassword?: string;
  joinName?: string;
  joinEmail?: string;
  joinPhone?: string;
  scheduledTime: string;
  duration?: number;
  saveTarget: 'yandex_disk' | 'library' | 'beget';
  /** Пользователь подтвердил, что вправе записывать событие */
  rightsConfirmed?: boolean;
}

export function RecordingModal({ open, onClose, onSubmit, isLoading, error }: RecordingModalProps) {
  const [formData, setFormData] = useState<RecordingData>({
    title: '',
    description: '',
    streamUrl: '',
    streamPassword: '',
    joinName: '',
    joinEmail: '',
    joinPhone: '',
    scheduledTime: '',
    duration: 60,
    saveTarget: 'beget',
    rightsConfirmed: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) {
      setFormData({ title: '', description: '', streamUrl: '', streamPassword: '', joinName: '', joinEmail: '', joinPhone: '', scheduledTime: '', duration: 60, saveTarget: 'beget', rightsConfirmed: false });
      setErrors({});
    }
  }, [open]);

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

    if (!formData.rightsConfirmed) {
      newErrors.rightsConfirmed = 'Подтвердите, что вы вправе записывать это событие';
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
      onSubmit({
        ...formData,
        joinName: formData.joinName?.trim() || undefined,
        joinEmail: formData.joinEmail?.trim() || undefined,
        joinPhone: formData.joinPhone?.trim() || undefined,
        streamPassword: formData.streamPassword?.trim() || undefined,
        description: formData.description?.trim() || undefined,
      });
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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Записать трансляцию</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
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
              className="min-h-[60px]"
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

          {/* Данные для входа в вебинар */}
          <div className="border border-gray-200 rounded-lg p-3 space-y-3 bg-gray-50">
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
              Данные для регистрации на вебинар (Bizon365 и др.)
            </p>

            <div className="space-y-2">
              <Label htmlFor="joinName">Имя участника</Label>
              <Input
                id="joinName"
                placeholder="Александр"
                value={formData.joinName}
                onChange={(e) => setFormData({ ...formData, joinName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="joinEmail">Email участника</Label>
              <Input
                id="joinEmail"
                type="email"
                placeholder="example@mail.ru"
                value={formData.joinEmail}
                onChange={(e) => setFormData({ ...formData, joinEmail: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="joinPhone">Телефон участника</Label>
              <Input
                id="joinPhone"
                type="tel"
                placeholder="+79001234567"
                value={formData.joinPhone}
                onChange={(e) => setFormData({ ...formData, joinPhone: e.target.value })}
              />
            </div>
          </div>

          {/* Время трансляции */}
          <div className="space-y-2">
            <Label htmlFor="scheduledTime">
              Время начала трансляции{' '}
              <span className="text-xs font-normal text-gray-500">(по Москве, UTC+3)</span>
            </Label>
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
            <Label htmlFor="saveTarget">Где сохранить запись</Label>
            <Select value={formData.saveTarget} onValueChange={(value: any) => setFormData({ ...formData, saveTarget: value })}>
              <SelectTrigger id="saveTarget">
                <SelectValue placeholder="Выберите место..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beget">На Beget S3 (рекомендуется)</SelectItem>
                <SelectItem value="yandex_disk">На Яндекс.Диск</SelectItem>
                <SelectItem value="library">В библиотеке материалов</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Информационное сообщение */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              ℹ️ Запись начнётся автономно в назначенное время. Длинные записи автоматически разбиваются на части по 20 минут.
              {formData.saveTarget === 'beget' && ' Видео будет загружено на Beget S3 хранилище.'}
              {formData.saveTarget === 'yandex_disk' && ' Файлы будут загружены на ваш Яндекс.Диск.'}
            </p>
          </div>

          {/* Право на запись */}
          <div className="space-y-1">
            <div className="flex items-start gap-2">
              <Checkbox
                id="rightsConfirmed"
                checked={!!formData.rightsConfirmed}
                onCheckedChange={(v) => {
                  setFormData({ ...formData, rightsConfirmed: v === true });
                  if (errors.rightsConfirmed) setErrors({ ...errors, rightsConfirmed: '' });
                }}
                className="mt-0.5"
              />
              <Label htmlFor="rightsConfirmed" className="text-sm font-normal leading-snug">
                Я вправе записывать это событие: я его участник, а запись нужна мне для личного использования
                или организатор разрешил запись
              </Label>
            </div>
            {errors.rightsConfirmed && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.rightsConfirmed}
              </p>
            )}
          </div>

          {/* Ошибка от сервера */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
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
