import { useState } from 'react';
import { authService } from '@/services/authService';
import { RecordingModal, type RecordingData } from '../recording/RecordingModal';
import { utcToZonedInput, zonedInputToUtcIso, type TimeZoneChoice } from '../recording/timezones';
import { EventFormDialog, type EventFormValues } from './EventFormDialog';
import { updateEvent, type LearningEventDto } from './eventsApi';
import { useLang } from '@/i18n';

/**
 * Окна событий для календаря и «Сегодня»: правка, новое событие и «Не смогу прийти → Записать».
 * Запись идёт обычным POST /api/recording/schedule (Help Recorder); у события сохраняется id записи.
 */
export function useEventDialogs(timeZone: TimeZoneChoice, reload: () => void) {
  const { m } = useLang();
  const [editing, setEditing] = useState<LearningEventDto | null>(null);
  const [initial, setInitial] = useState<EventFormValues | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [recording, setRecording] = useState<LearningEventDto | null>(null);
  const [recordBusy, setRecordBusy] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);

  const openEdit = (e: LearningEventDto) => { setEditing(e); setInitial(null); setFormOpen(true); };
  const openNew = (values: EventFormValues) => { setEditing(null); setInitial(values); setFormOpen(true); };
  const openRecord = (e: LearningEventDto) => { setRecording(e); setRecordError(null); };

  const submitRecording = async (data: RecordingData) => {
    if (!recording) return;
    setRecordBusy(true);
    setRecordError(null);
    try {
      const res = await authService.authenticatedFetch('/api/recording/schedule', {
        method: 'POST',
        body: JSON.stringify({ ...data, timeZone: undefined, scheduledTime: zonedInputToUtcIso(data.scheduledTime, data.timeZone ?? timeZone) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body as any).message || m.events.record.httpError(res.status));
      await updateEvent(recording.id, { recordingTaskId: (body as any).taskId });
      setRecording(null);
      reload();
    } catch (e) {
      setRecordError(e instanceof Error ? e.message : m.events.record.failed);
    } finally {
      setRecordBusy(false);
    }
  };

  const dialogs = (
    <>
      <EventFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={reload}
        timeZone={timeZone}
        event={editing}
        initial={initial}
      />
      <RecordingModal
        open={!!recording}
        onClose={() => setRecording(null)}
        onSubmit={submitRecording}
        isLoading={recordBusy}
        error={recordError}
        initial={recording ? {
          title: recording.title,
          description: recording.programTitle ?? '',
          streamUrl: recording.joinUrl ?? '',
          scheduledTime: utcToZonedInput(recording.startsAt, timeZone),
          duration: recording.durationMinutes ?? 60,
        } : undefined}
      />
    </>
  );

  return { openEdit, openNew, openRecord, dialogs };
}
