import type { RecordingHint } from '@shared/recordingHints';
import type { Messages } from '@/locales';

/** Причина подсказки на языке ученика: «пересекается с «…»», «в рабочее время», «вне ваших удобных часов» */
export function hintReason(hint: RecordingHint, m: Messages): string {
  if (hint.kind === 'conflict') return m.hints.reason.conflict(hint.withTitle);
  return hint.kind === 'work' ? m.hints.reason.work : m.hints.reason.night;
}
