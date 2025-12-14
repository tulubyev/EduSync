export interface RecordingPart {
  partNumber: number;
  fileName: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  status: 'pending' | 'recording' | 'uploading' | 'completed' | 'failed';
  yandexPath?: string;
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
  scheduledTime: Date;
  duration: number;
  maxPartDuration: number;
  status: 'ready' | 'in_progress' | 'uploading' | 'completed' | 'failed' | 'cancelled';
  saveTarget: 'library' | 'yandex_disk' | 'beget';
  currentPart: number;
  totalParts: number;
  parts: RecordingPart[];
  playlistUrl?: string;
  libraryNoteId?: string;
  errorMessage?: string;
  begetUrl?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface RecordingConfig {
  maxPartDurationMs: number;
  outputDir: string;
  chromiumPath?: string;
  headless: boolean;
  viewport: { width: number; height: number };
}
