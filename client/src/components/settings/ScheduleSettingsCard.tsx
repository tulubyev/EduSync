import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { DEFAULT_SCHEDULE_PREFS, type SchedulePrefs } from '@shared/recordingHints';
import { authService } from '@/services/authService';
import { useLang } from '@/i18n';
import { DAY_PERIODS, isDayPeriod } from '@shared/weekPlan';
import { setSchedulePrefs, useSchedulePrefs } from '../events/useRecordingHints';
import { weekdaysShort } from '../events/eventTime';

const toInput = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
/** «22:00» → 1320; «00:00» в поле «до» — конец дня (1440) */
const fromInput = (v: string, end = false) => {
  const [h, m] = v.split(':').map(Number);
  const min = (h || 0) * 60 + (m || 0);
  return end && min === 0 ? 24 * 60 : min;
};

const WORK_DEFAULT = { workFrom: 9 * 60, workTo: 18 * 60 };
/** Варианты времени на учёбу в день (#20), минуты */
const STUDY_MINUTES = [0, 30, 45, 60, 90, 120, 180, 240, 300, 360];

/** Удобные и рабочие часы и подсказки записать вебинар в неудобное время (#48) */
export function ScheduleSettingsCard() {
  const { m, lang } = useLang();
  const t = m.hints.settings;
  const p = m.plan.settings;
  const loaded = useSchedulePrefs();
  const [form, setForm] = useState<SchedulePrefs>(DEFAULT_SCHEDULE_PREFS);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => { if (loaded) setForm(loaded); }, [loaded]);

  const work = form.workFrom !== null && form.workTo !== null;
  const set = (patch: Partial<SchedulePrefs>) => { setForm((f) => ({ ...f, ...patch })); setStatus(null); };

  const save = async () => {
    if (form.comfortFrom >= form.comfortTo || (work && form.workFrom! >= form.workTo!)) {
      return setStatus({ ok: false, text: t.errOrder });
    }
    setBusy(true);
    try {
      const r = await authService.authenticatedFetch('/api/profile/schedule', { method: 'PUT', body: JSON.stringify(form) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || t.errSave);
      setSchedulePrefs(d);
      setStatus({ ok: true, text: t.saved });
    } catch (e) {
      setStatus({ ok: false, text: e instanceof Error ? e.message : t.errSave });
    } finally {
      setBusy(false);
    }
  };

  const range = (fromMin: number, toMin: number, onChange: (from: number, to: number) => void, id: string, disabled = false) => (
    <div className="flex items-center gap-2 text-sm">
      <span>{t.from}</span>
      <Input id={`${id}-from`} type="time" className="w-28" disabled={disabled} value={toInput(fromMin)} onChange={(e) => onChange(fromInput(e.target.value), toMin)} />
      <span>{t.to}</span>
      <Input id={`${id}-to`} type="time" className="w-28" disabled={disabled} value={toInput(toMin)} onChange={(e) => onChange(fromMin, fromInput(e.target.value, true))} />
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {t.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{t.intro}</p>
        <div className="space-y-1">
          <p className="text-sm font-medium">{t.comfort}</p>
          {range(form.comfortFrom, form.comfortTo, (comfortFrom, comfortTo) => set({ comfortFrom, comfortTo }), 'comfort')}
        </div>
        <div className="space-y-1">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="h-4 w-4 accent-purple-600"
              checked={work}
              onChange={(e) => set(e.target.checked ? WORK_DEFAULT : { workFrom: null, workTo: null })}
            />
            {t.work}
          </label>
          {work && range(form.workFrom!, form.workTo!, (workFrom, workTo) => set({ workFrom, workTo }), 'work')}
        </div>
        <div className="space-y-3 rounded-lg border p-3">
          <p className="text-sm font-semibold">{p.title}</p>
          <label className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{p.minutes}</span>
            <select
              className="rounded-md border border-gray-300 bg-white px-2 py-1"
              value={form.studyMinutes}
              onChange={(e) => set({ studyMinutes: Number(e.target.value) })}
            >
              {STUDY_MINUTES.map((n) => <option key={n} value={n}>{m.plan.duration(n)}</option>)}
            </select>
          </label>
          <div className="space-y-1">
            <p className="text-sm font-medium">{p.days}</p>
            <div className="flex flex-wrap gap-1" role="group" aria-label={p.days}>
              {weekdaysShort(lang).map((name, i) => {
                const wd = i + 1;
                const on = form.studyDays.includes(wd);
                return (
                  <button
                    key={wd}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set({ studyDays: on ? form.studyDays.filter((d) => d !== wd) : [...form.studyDays, wd].sort() })}
                    className={`min-h-9 min-w-10 rounded-md border px-2 text-sm ${on ? 'border-purple-600 bg-purple-600 text-white' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{p.preferred}</span>
            <select
              className="rounded-md border border-gray-300 bg-white px-2 py-1"
              value={form.preferredStudyTime ?? ''}
              onChange={(e) => set({ preferredStudyTime: isDayPeriod(e.target.value) ? e.target.value : null })}
            >
              <option value="">{p.any}</option>
              {DAY_PERIODS.map((d) => <option key={d} value={d}>{p[d]}</option>)}
            </select>
          </label>
        </div>
        <label className="flex items-center justify-between gap-4 rounded-lg border bg-gray-50 p-3">
          <span className="text-sm font-medium">{t.hints}</span>
          <Switch checked={form.recordingHints} onCheckedChange={(v) => set({ recordingHints: v })} />
        </label>
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={busy}>{t.save}</Button>
          {status && <span className={`text-sm ${status.ok ? 'text-green-700' : 'text-red-600'}`}>{status.text}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
