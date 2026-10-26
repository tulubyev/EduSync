import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EVENT_PRIORITIES, EVENT_TYPES, type EventPriority, type EventType } from '@shared/learningEvents';
import { useLang } from '@/i18n';
import { tzShort } from './tzLabels';
import { utcToZonedInput, zonedInputToUtcIso, type TimeZoneChoice } from '../recording/timezones';
import { authService } from '@/services/authService';
import { createEvent, updateEvent, type EventInput, type LearningEventDto } from './eventsApi';

/** Поля формы; start — на часах выбранного пояса («2026-10-25T19:00») */
export interface EventFormValues {
  type: EventType;
  title: string;
  start: string;
  durationMinutes: string;
  courseId: string;
  programTitle: string;
  moduleTitle: string;
  lessonUrl: string;
  materialsUrl: string;
  joinUrl: string;
  priority: EventPriority;
  description: string;
}

export const emptyEventForm = (start = ''): EventFormValues => ({
  type: 'deadline', title: '', start, durationMinutes: '', courseId: '', programTitle: '', moduleTitle: '',
  lessonUrl: '', materialsUrl: '', joinUrl: '', priority: 'medium', description: '',
});

export function eventToForm(e: LearningEventDto, tz: TimeZoneChoice): EventFormValues {
  return {
    type: e.type,
    title: e.title,
    start: utcToZonedInput(e.startsAt, tz),
    durationMinutes: e.durationMinutes ? String(e.durationMinutes) : '',
    courseId: e.courseId ?? '',
    programTitle: e.programTitle ?? '',
    moduleTitle: e.moduleTitle ?? '',
    lessonUrl: e.lessonUrl ?? '',
    materialsUrl: e.materialsUrl ?? '',
    joinUrl: e.joinUrl ?? '',
    priority: e.priority,
    description: e.description ?? '',
  };
}

const NO_COURSE = 'none';


interface EventFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  timeZone: TimeZoneChoice;
  /** Правка существующего события; без него — новое */
  event?: LearningEventDto | null;
  initial?: EventFormValues | null;
}

export function EventFormDialog({ open, onClose, onSaved, timeZone, event, initial }: EventFormDialogProps) {
  const { m } = useLang();
  const f = m.events.form;
  const [form, setForm] = useState<EventFormValues>(emptyEventForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courses, setCourses] = useState<Array<{ id: string; title: string }>>([]);
  const fromPlatform = !!event && event.source !== 'manual';

  useEffect(() => {
    if (open) {
      setForm(event ? eventToForm(event, timeZone) : initial ?? emptyEventForm());
      setError(null);
      // курсы ученика — чтобы связать событие с программой
      authService.authenticatedFetch('/api/courses')
        .then((r) => (r.ok ? r.json() : []))
        .then((list) => setCourses(Array.isArray(list) ? list.map((c: any) => ({ id: c.id, title: c.title })) : []))
        .catch(() => setCourses([]));
    }
  }, [open]);

  const chooseCourse = (id: string) => {
    const course = courses.find((c) => c.id === id);
    setForm((f) => ({
      ...f,
      courseId: course ? course.id : '',
      // название программы подставляется из курса, если ученик не задал своё
      programTitle: course && (!f.programTitle || courses.some((c) => c.title === f.programTitle)) ? course.title : f.programTitle,
    }));
  };

  const set = <K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    const startsAt = zonedInputToUtcIso(form.start, timeZone);
    if (!form.title.trim()) return setError(f.errTitle);
    if (!startsAt) return setError(f.errStart);
    const duration = form.durationMinutes.trim() ? Number(form.durationMinutes) : null;
    if (duration !== null && (!Number.isInteger(duration) || duration < 1 || duration > 1440)) {
      return setError(f.errDuration);
    }
    const data: EventInput = {
      type: form.type,
      title: form.title.trim(),
      startsAt,
      durationMinutes: duration,
      courseId: form.courseId || null,
      programTitle: form.programTitle,
      moduleTitle: form.moduleTitle,
      lessonUrl: form.lessonUrl,
      materialsUrl: form.materialsUrl,
      joinUrl: form.joinUrl,
      priority: form.priority,
      description: form.description,
    };
    setSaving(true);
    setError(null);
    try {
      if (event) await updateEvent(event.id, data);
      else await createEvent(data);
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : f.errSave);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{event ? f.titleEdit : f.titleNew}</DialogTitle>
        </DialogHeader>
        {fromPlatform && (
          <p className="text-sm text-gray-500">{f.fromPlatform}</p>
        )}
        <div className="grid gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>{f.type}</Label>
              <Select value={form.type} onValueChange={(v) => set('type', v as EventType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{m.events.types[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{f.priority}</Label>
              <Select value={form.priority} onValueChange={(v) => set('priority', v as EventPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{m.events.priorities[p]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="ev-title">{f.name}</Label>
            <Input id="ev-title" value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={500} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_8rem]">
            <div>
              <Label htmlFor="ev-start">{['assignment', 'exam', 'deadline'].includes(form.type) ? f.due : f.start} ({tzShort(timeZone, m)})</Label>
              <Input id="ev-start" type="datetime-local" value={form.start} onChange={(e) => set('start', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ev-duration">{f.minutes}</Label>
              <Input id="ev-duration" inputMode="numeric" value={form.durationMinutes} onChange={(e) => set('durationMinutes', e.target.value)} placeholder="60" />
            </div>
          </div>
          {courses.length > 0 && (
            <div>
              <Label>{f.course}</Label>
              <Select value={form.courseId || NO_COURSE} onValueChange={(v) => chooseCourse(v === NO_COURSE ? '' : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_COURSE}>{f.noCourse}</SelectItem>
                  {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="ev-program">{f.program}</Label>
              <Input id="ev-program" value={form.programTitle} onChange={(e) => set('programTitle', e.target.value)} maxLength={500} />
            </div>
            <div>
              <Label htmlFor="ev-module">{f.module}</Label>
              <Input id="ev-module" value={form.moduleTitle} onChange={(e) => set('moduleTitle', e.target.value)} maxLength={500} />
            </div>
          </div>
          <div>
            <Label htmlFor="ev-lesson">{f.lessonUrl}</Label>
            <Input id="ev-lesson" type="url" value={form.lessonUrl} onChange={(e) => set('lessonUrl', e.target.value)} placeholder="https://" />
          </div>
          <div>
            <Label htmlFor="ev-materials">{f.materials}</Label>
            <Input id="ev-materials" type="url" value={form.materialsUrl} onChange={(e) => set('materialsUrl', e.target.value)} placeholder="https://" />
          </div>
          {form.type === 'webinar' && (
            <div>
              <Label htmlFor="ev-join">{f.joinUrl}</Label>
              <Input id="ev-join" type="url" value={form.joinUrl} onChange={(e) => set('joinUrl', e.target.value)} placeholder="https://" />
            </div>
          )}
          <div>
            <Label htmlFor="ev-desc">{f.note}</Label>
            <Textarea id="ev-desc" value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{m.common.cancel}</Button>
          <Button onClick={save} disabled={saving}>{saving ? m.common.saving : m.common.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
