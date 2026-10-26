import { useEffect, useState } from 'react';
import { authService } from '@/services/authService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Bell } from 'lucide-react';
import { useLang } from '@/i18n';

/** Письма об итогах записей по расписанию (user_settings.email_notifications). */
export function NotificationSettingsCard() {
  const n = useLang().m.settings.notifications;
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    authService
      .authenticatedFetch('/api/recording/notify-settings')
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.message || n.errLoad);
        setEnabled(d.emailNotifications !== false);
      })
      .catch((e) => setError((e as Error).message));
  }, []);

  const toggle = async (value: boolean) => {
    setSaving(true);
    setError('');
    const prev = enabled;
    setEnabled(value);
    try {
      const r = await authService.authenticatedFetch('/api/recording/notify-settings', {
        method: 'PUT',
        body: JSON.stringify({ emailNotifications: value }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || n.errSave);
    } catch (e) {
      setEnabled(prev);
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          {n.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <label className="flex items-center justify-between gap-4 p-4 rounded-lg bg-gray-50 border cursor-pointer">
          <div>
            <p className="text-base font-semibold">{n.recordingEmails}</p>
            <p className="text-sm text-muted-foreground">
              {n.recordingEmailsHint}
            </p>
          </div>
          <Switch checked={enabled ?? true} disabled={enabled === null || saving} onCheckedChange={toggle} />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
}
