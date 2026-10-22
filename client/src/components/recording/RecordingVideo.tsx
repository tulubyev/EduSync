import { useEffect, useState } from 'react';
import { ExternalLink, Loader } from 'lucide-react';
import { authService } from '@/services/authService';
import type { RecordingRef } from './recordingLink';

/**
 * Видео записи по ссылке из библиотеки: при показе запрашивает свежую ссылку на файл
 * (GET /api/recording/tasks/:id/download — только владелец записи или администратор).
 */
export function RecordingVideo({ recording }: { recording: RecordingRef }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    setError(null);
    const q = recording.video ? `?video=${encodeURIComponent(recording.video)}` : '';
    authService.authenticatedFetch(`/api/recording/tasks/${recording.taskId}/download${q}`, { method: 'GET' })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (r.ok && data.url) setUrl(data.url);
        else if (r.status === 404) setError('Запись удалена или файлов у неё нет');
        else if (r.status === 403) setError('Нет доступа к этой записи');
        else setError(data.message || 'Не удалось получить ссылку на видео');
      })
      .catch(() => { if (!cancelled) setError('Нет связи с сервером'); });
    return () => { cancelled = true; };
  }, [recording.taskId, recording.video]);

  const page = `/recordings?task=${recording.taskId}`;
  return (
    <div className="space-y-2">
      {url && <video key={url} src={url} controls playsInline preload="metadata" className="max-w-full max-h-96 rounded border bg-black" />}
      {!url && !error && (
        <p className="flex items-center gap-2 text-sm text-gray-500"><Loader className="h-4 w-4 animate-spin" /> Загружаем видео…</p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <a href={page} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 underline">
        Открыть в «Записи по расписанию» <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}
