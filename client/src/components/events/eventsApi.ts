import { authService } from '@/services/authService';
import type { EventPriority, EventType } from '@shared/learningEvents';

/** Событие ленты, как его отдаёт /api/events (время — ISO в UTC) */
export interface LearningEventDto {
  id: string;
  type: EventType;
  title: string;
  description: string | null;
  startsAt: string;
  durationMinutes: number | null;
  timeZone: string | null;
  programTitle: string | null;
  moduleTitle: string | null;
  courseId: string | null;
  courseTitle?: string | null;
  lessonUrl: string | null;
  materialsUrl: string | null;
  joinUrl: string | null;
  source: string;
  status: 'pending' | 'completed' | 'cancelled';
  priority: EventPriority;
  recordingTaskId: string | null;
}

export type EventInput = Partial<Omit<LearningEventDto, 'id' | 'source' | 'courseTitle'>>;

async function call<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await authService.authenticatedFetch(url, init);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as any).message || `Ошибка ${res.status}`);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export const fetchEvents = (fromIso: string, toIso: string) =>
  call<LearningEventDto[]>(`/api/events?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`);

export const createEvent = (data: EventInput) =>
  call<LearningEventDto>('/api/events', { method: 'POST', body: JSON.stringify(data) });

export const updateEvent = (id: string, data: EventInput) =>
  call<LearningEventDto>(`/api/events/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const deleteEvent = (id: string) => call<void>(`/api/events/${id}`, { method: 'DELETE' });

/** Событие уже прошло: дедлайн — после срока, урок и вебинар — после окончания */
export function isPast(e: LearningEventDto, now: number = Date.now()): boolean {
  const end = new Date(e.startsAt).getTime() + (e.durationMinutes ?? 0) * 60_000;
  return end < now;
}
