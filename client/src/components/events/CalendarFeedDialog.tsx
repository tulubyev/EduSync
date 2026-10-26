import { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authService } from '@/services/authService';
import { useLang } from '@/i18n';
import { feedUrl, googleAddUrl, webcalUrl } from './calendarFeedLinks';


/** Подписка на расписание в Google, Яндекс, Apple и Outlook (#18, docs/CALENDAR-FEED.md) */
export function CalendarFeedDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { m } = useLang();
  const t = m.calendarFeed;
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const call = async (method: 'GET' | 'POST' | 'DELETE') => {
    setBusy(true);
    setError(null);
    try {
      const r = await authService.authenticatedFetch('/api/calendar/feed', { method });
      if (!r.ok) throw new Error(String(r.status));
      const d = await r.json();
      setToken(d.token ?? null);
    } catch {
      setError(t.error);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (open) {
      setCopied(false);
      call('GET');
    }
  }, [open]);

  const url = token ? feedUrl(token) : '';
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.intro}</DialogDescription>
        </DialogHeader>

        {!token ? (
          <Button onClick={() => call('POST')} disabled={busy}>{t.create}</Button>
        ) : (
          <div className="space-y-3">
            <div>
              <label htmlFor="feed-url" className="mb-1 block text-sm font-medium">{t.link}</label>
              <div className="flex gap-2">
                <Input id="feed-url" readOnly value={url} onFocus={(e) => e.target.select()} className="font-mono text-xs" />
                <Button variant="outline" onClick={copy} className="shrink-0 gap-1">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? t.copied : t.copy}
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild className="gap-1">
                <a href={googleAddUrl(url)} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /> {t.google}</a>
              </Button>
              <Button asChild variant="outline">
                <a href={webcalUrl(url)}>{t.apple}</a>
              </Button>
            </div>
            <p className="text-sm text-gray-600">{t.other}</p>
            <p className="text-xs text-gray-500">{t.refresh}</p>
            <p className="text-xs text-amber-700">{t.secret}</p>
            <div className="flex gap-2 border-t pt-3">
              <Button variant="outline" size="sm" disabled={busy} onClick={() => window.confirm(t.reissueConfirm) && call('POST')}>{t.reissue}</Button>
              <Button variant="ghost" size="sm" disabled={busy} className="text-red-600" onClick={() => window.confirm(t.disableConfirm) && call('DELETE')}>{t.disable}</Button>
            </div>
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
