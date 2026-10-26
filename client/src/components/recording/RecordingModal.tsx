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
import { TIME_ZONE_OPTIONS, browserTimeZone, fmtZoned, useRecordingTimeZone, zonedInputToUtcIso, type TimeZoneChoice } from './timezones';
import { tzOptionLabel } from '../events/tzLabels';
import { useLang } from '@/i18n';

interface RecordingModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: RecordingData) => void;
  isLoading?: boolean;
  error?: string | null;
  /** Поля, заполненные заранее (запись вебинара из календаря); scheduledTime — на часах выбранного пояса */
  initial?: Partial<RecordingData>;
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
  /** Пояс, в котором указано scheduledTime (на сервер уходит уже UTC — RecordingSchedulePage) */
  timeZone?: TimeZoneChoice;
}

export function RecordingModal({ open, onClose, onSubmit, isLoading, error, initial }: RecordingModalProps) {
  const { m } = useLang();
  const t = m.recordings.form;
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
  const [timeZone, setTimeZone] = useRecordingTimeZone();
  const startUtc = zonedInputToUtcIso(formData.scheduledTime, timeZone);

  useEffect(() => {
    if (!open) {
      setFormData({ title: '', description: '', streamUrl: '', streamPassword: '', joinName: '', joinEmail: '', joinPhone: '', scheduledTime: '', duration: 60, saveTarget: 'beget', rightsConfirmed: false });
      setErrors({});
    } else if (initial) {
      setFormData((f) => ({ ...f, ...initial }));
    }
  }, [open]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = t.errName;
    }

    if (!formData.streamUrl.trim()) {
      newErrors.streamUrl = t.errUrl;
    } else if (!isValidUrl(formData.streamUrl)) {
      newErrors.streamUrl = t.errUrlInvalid;
    }

    if (!formData.scheduledTime) {
      newErrors.scheduledTime = t.errStart;
    }

    if (formData.duration && (formData.duration < 1 || formData.duration > 1440)) {
      newErrors.duration = t.errDuration;
    }

    if (!formData.rightsConfirmed) {
      newErrors.rightsConfirmed = t.errRights;
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
        timeZone,
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
          <DialogTitle>{t.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Название */}
          <div className="space-y-2">
            <Label htmlFor="title">{t.name}</Label>
            <Input
              id="title"
              placeholder={t.namePlaceholder}
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
            <Label htmlFor="description">{t.description}</Label>
            <Textarea
              id="description"
              placeholder={t.descriptionPlaceholder}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="min-h-[60px]"
            />
          </div>

          {/* Ссылка на трансляцию */}
          <div className="space-y-2">
            <Label htmlFor="streamUrl">{t.streamUrl}</Label>
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
            <Label htmlFor="streamPassword">{t.password}</Label>
            <Input
              id="streamPassword"
              type="password"
              placeholder={t.passwordPlaceholder}
              value={formData.streamPassword}
              onChange={(e) => setFormData({ ...formData, streamPassword: e.target.value })}
            />
          </div>

          {/* Данные для входа в вебинар */}
          <div className="border border-gray-200 rounded-lg p-3 space-y-3 bg-gray-50">
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
              {t.joinTitle}
            </p>

            <div className="space-y-2">
              <Label htmlFor="joinName">{t.joinName}</Label>
              <Input
                id="joinName"
                placeholder={t.joinNamePlaceholder}
                value={formData.joinName}
                onChange={(e) => setFormData({ ...formData, joinName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="joinEmail">{t.joinEmail}</Label>
              <Input
                id="joinEmail"
                type="email"
                placeholder={t.emailPlaceholder}
                value={formData.joinEmail}
                onChange={(e) => setFormData({ ...formData, joinEmail: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="joinPhone">{t.joinPhone}</Label>
              <Input
                id="joinPhone"
                type="tel"
                placeholder={t.phonePlaceholder}
                value={formData.joinPhone}
                onChange={(e) => setFormData({ ...formData, joinPhone: e.target.value })}
              />
            </div>
          </div>

          {/* Время трансляции */}
          <div className="space-y-2">
            <Label htmlFor="scheduledTime">{t.start}</Label>
            <div className="flex flex-col gap-2">
              <Input
                id="scheduledTime"
                type="datetime-local"
                value={formData.scheduledTime}
                onChange={handleDateTimeChange}
                className={`${errors.scheduledTime ? 'border-red-500' : ''}`}
              />
              <Select value={timeZone} onValueChange={(v) => setTimeZone(v as TimeZoneChoice)}>
                <SelectTrigger aria-label={m.events.calendar.timeZone}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_ZONE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.value === 'local' ? `${m.timeZones.local} (${browserTimeZone()})` : tzOptionLabel(o.value, m)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {startUtc && timeZone !== 'Europe/Moscow' && (
              <p className="text-xs text-gray-500">
                {t.inMoscow(fmtZoned(startUtc, 'Europe/Moscow').date, fmtZoned(startUtc, 'Europe/Moscow').time)}
                {timeZone !== 'UTC' ? `, ${fmtZoned(startUtc, 'UTC').time} UTC` : ''}
              </p>
            )}
            {errors.scheduledTime && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.scheduledTime}
              </p>
            )}
          </div>

          {/* Длительность */}
          <div className="space-y-2">
            <Label htmlFor="duration">{t.duration}</Label>
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
            <Label htmlFor="saveTarget">{t.saveTarget}</Label>
            <Select value={formData.saveTarget} onValueChange={(value: any) => setFormData({ ...formData, saveTarget: value })}>
              <SelectTrigger id="saveTarget">
                <SelectValue placeholder={t.saveTargetPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beget">{t.targetCloud}</SelectItem>
                <SelectItem value="yandex_disk">{t.targetYandex}</SelectItem>
                <SelectItem value="library">{t.targetLibrary}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Информационное сообщение */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              {t.info}
              {formData.saveTarget === 'beget' && t.infoCloud}
              {formData.saveTarget === 'yandex_disk' && t.infoYandex}
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
                {t.rights}
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
            {m.common.cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? t.submitting : t.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
