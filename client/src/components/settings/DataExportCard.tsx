import { useState } from 'react';
import { Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { authService } from '@/services/authService';
import { useLang } from '@/i18n';

/** «Скачать мои данные» — ZIP со всеми данными ученика (#44, GET /api/profile/export) */
export function DataExportCard() {
  const t = useLang().m.settings.dataExport;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await authService.authenticatedFetch('/api/profile/export');
      if (r.status === 429) {
        const d = await r.json().catch(() => ({}));
        return setError(t.tooOften(Math.max(1, Math.ceil((Number(d.retryAfter) || 600) / 60))));
      }
      if (!r.ok) throw new Error(String(r.status));
      const blob = await r.blob();
      const name = /filename="([^"]+)"/.exec(r.headers.get('Content-Disposition') ?? '')?.[1] ?? 'myepa-data.zip';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError(t.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          {t.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{t.text}</p>
        <Button onClick={download} disabled={busy} className="gap-2">
          <Download className="h-4 w-4" /> {busy ? t.preparing : t.button}
        </Button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
}
