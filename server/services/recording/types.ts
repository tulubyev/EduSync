import type { StartStatus } from './startStatus';

export interface RecordingPart {
  partNumber: number;
  fileName: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  status: 'pending' | 'recording' | 'uploading' | 'completed' | 'failed';
  yandexPath?: string;
  begetPath?: string;
  publicUrl?: string;
  error?: string;
}

export interface RecordingTaskData {
  id: string;
  userId: string;
  title: string;
  description?: string;
  streamUrl: string;
  streamPassword?: string;
  joinName?: string;
  joinEmail?: string;
  joinPhone?: string;
  scheduledTime: Date;
  duration: number;
  maxPartDuration: number;
  status: 'scheduled' | 'ready' | 'in_progress' | 'uploading' | 'completed' | 'failed' | 'cancelled';
  saveTarget: 'library' | 'yandex_disk' | 'beget';
  currentPart: number;
  totalParts: number;
  parts: RecordingPart[];
  playlistUrl?: string;
  begetUrl?: string;
  s3Prefix?: string;
  s3Filename?: string;
  libraryNoteId?: string;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
  workerId?: string;
  attemptCount?: number;
  lastHeartbeat?: Date;
  urlCheckStatus?: 'pending' | 'ok' | 'warning' | 'failed';
  urlCheckMessage?: string;
  urlCheckedAt?: Date;
  mergeStatus?: 'idle' | 'merging' | 'completed' | 'failed';
  mergeProgress?: string;
  mergedUrl?: string;
  mergeError?: string;
  /** Запись стартовала или нет и почему (см. startStatus.ts) */
  start?: StartStatus;
}

export interface RecordingConfig {
  maxPartDurationMs: number;
  outputDir: string;
  chromiumPath?: string;
  headless: boolean;
  viewport: { width: number; height: number };
}
