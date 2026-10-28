import { useEffect, useState } from 'react';
import { authService } from '@/services/authService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Bell } from 'lucide-react';
import { useLang } from '@/i18n';
import { ADVANCE_HOURS } from '@shared/reminders';

type Reminders = { enabled: boolean; advanceHours: number };

/** Письма об итогах записей (user_settings.email_notifications) и напоминания о занятиях и сроках (#18). */
export function NotificationSettingsCard() {
  const n = useLang().m.settings.notifications;
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [reminders, setReminders] = useState<Reminders | null>(null);

  useEffect(() => {
    authService
      .authenticatedFetch('/api/recording/notify-settings')
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.message || n.errLoad);
        setEnabled(d.emailNotifications !== false);
      })
      .catch((e) => setError((e as Error).message));
    authService
      .authenticatedFetch('/api/profile/reminders')
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.message || n.errLoad);
        setReminders(d);
      })
      .catch((e) => setError((e as Error).message));
  }, []);

  const saveReminders = async (next: Reminders) => {
    setSaving(true);
    setError('');
    const prev = reminders;
    setReminders(next);
    try {
      const r = await authService.authenticatedFetch('/api/profile/reminders', { method: 'PUT', body: JSON.stringify(next) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || n.errSave);
    } catch (e) {
      setReminders(prev);
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

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
        <div className="space-y-3 rounded-lg border bg-gray-50 p-4">
          <label className="flex cursor-pointer items-center justify-between gap-4">
            <div>
              <p className="text-base font-semibold">{n.reminders}</p>
              <p className="text-sm text-muted-foreground">{n.remindersHint}</p>
            </div>
            <Switch
              checked={reminders?.enabled ?? true}
              disabled={!reminders || saving}
              onCheckedChange={(v) => reminders && saveReminders({ ...reminders, enabled: v })}
            />
          </label>
          {reminders?.enabled && (
            <label className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{n.advance}</span>
              <select
                className="rounded-md border border-gray-300 bg-white px-2 py-1"
                value={reminders.advanceHours}
                disabled={saving}
                onChange={(e) => saveReminders({ ...reminders, advanceHours: Number(e.target.value) })}
              >
                {ADVANCE_HOURS.map((h) => <option key={h} value={h}>{n.hours(h)}</option>)}
              </select>
            </label>
          )}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
}
