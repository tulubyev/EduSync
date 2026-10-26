import { useEffect, useState } from 'react';
import { authService } from '@/services/authService';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BookmarkPlus, Download, Loader } from 'lucide-react';
import { useLang } from '@/i18n';
import { videoLabel } from './recordingLink';

interface TaskVideo {
  id: string;
  url: string;
}

interface RecordingPlayerDialogProps {
  taskId: string | null;
  title?: string;
  onClose: () => void;
}

/**
 * Просмотр записи внутри приложения. Видео играет со страницы сайта, поэтому CDN получает
 * Referer сайта (а не самого файла) — так запись открывается и там, где прямая ссылка в новой
 * вкладке не воспроизводится. Здесь же — скачать файл и сохранить запись в библиотеку.
 */
export function RecordingPlayerDialog({ taskId, title, onClose }: RecordingPlayerDialogProps) {
  const { m } = useLang();
  const t = m.recordings.player;
  const [videos, setVideos] = useState<TaskVideo[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<'download' | 'library' | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [playError, setPlayError] = useState(false);

  useEffect(() => {
    if (!taskId) return;
    let cancelled = false;
    setVideos([]);
    setCurrentId(null);
    setMessage(null);
    setPlayError(false);
    setLoading(true);
    authService
      .authenticatedFetch(`/api/recording/tasks/${taskId}/videos`)
      .then(async (r) => {
        const d = await r.json();
        if (cancelled) return;
        if (!r.ok) throw new Error(d.message || t.errLoad);
        setVideos(d.videos ?? []);
        setCurrentId(d.videos?.[0]?.id ?? null);
      })
      .catch((e) => !cancelled && setMessage({ kind: 'error', text: e.message || t.errLoad }))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  const current = videos.find((v) => v.id === currentId) ?? null;
  const partCount = videos.filter((v) => v.id !== 'merged').length;

  const download = async () => {
    if (!taskId || !current) return;
    setBusy('download');
    setMessage(null);
    try {
      const r = await authService.authenticatedFetch(
        `/api/recording/tasks/${taskId}/download?video=${encodeURIComponent(current.id)}`,
      );
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || t.errLink);
      // Подписанная ссылка отдаёт файл с Content-Disposition: attachment — браузер его сохранит
      const a = document.createElement('a');
      a.href = d.url;
      a.download = d.fileName;
      a.rel = 'noopener';
      if (d.direct) a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setMessage({ kind: 'ok', text: t.downloadStarted(d.fileName) });
    } catch (e) {
      setMessage({ kind: 'error', text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const saveToLibrary = async () => {
    if (!taskId || !current) return;
    setBusy('library');
    setMessage(null);
    try {
      const r = await authService.authenticatedFetch(`/api/recording/tasks/${taskId}/save-to-library`, {
        method: 'POST',
        body: JSON.stringify({ video: current.id }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || t.errSave);
      setMessage({ kind: 'ok', text: t.saved });
    } catch (e) {
      setMessage({ kind: 'error', text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={!!taskId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[900px] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-6 break-words">{title || t.title}</DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center h-48 text-gray-500 gap-2">
            <Loader className="h-5 w-5 animate-spin" /> {m.common.loading}
          </div>
        )}

        {!loading && current && (
          <>
            <video
              key={current.url}
              src={current.url}
              controls
              playsInline
              preload="metadata"
              className="w-full max-h-[60vh] rounded bg-black"
              onError={() => setPlayError(true)}
              onLoadedMetadata={() => setPlayError(false)}
            />
            {playError && (
              <p className="text-xs text-red-600">
                {t.playError}
              </p>
            )}

            {videos.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {videos.map((v) => (
                  <Button
                    key={v.id}
                    size="sm"
                    variant={v.id === current.id ? 'default' : 'outline'}
                    onClick={() => {
                      setCurrentId(v.id);
                      setPlayError(false);
                    }}
                  >
                    {videoLabel(v.id, partCount, m.recordings.files)}
                  </Button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <Button onClick={download} disabled={!!busy} className="gap-2">
                {busy === 'download' ? <Loader className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {t.download}
              </Button>
              <Button variant="outline" onClick={saveToLibrary} disabled={!!busy} className="gap-2">
                {busy === 'library' ? <Loader className="h-4 w-4 animate-spin" /> : <BookmarkPlus className="h-4 w-4" />}
                {t.saveToLibrary}
              </Button>
            </div>
          </>
        )}

        {!loading && !current && !message && <p className="text-sm text-gray-500">{t.noFiles}</p>}

        {message && (
          <p className={`text-sm ${message.kind === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{message.text}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
