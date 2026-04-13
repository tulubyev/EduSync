import React, { useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/* ─── types ─────────────────────────────────────────────────── */
interface AdminTask {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  streamUrl: string;
  streamPassword?: string | null;
  scheduledTime: string | null;
  duration: number | null;
  saveTarget: string | null;
  status: string;
  workerId?: string | null;
  lastHeartbeat?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  begetUrl?: string | null;
  fileSize?: number | null;
  errorMessage?: string | null;
  urlCheckStatus?: string | null;
  urlCheckMessage?: string | null;
  urlCheckedAt?: string | null;
  attemptCount?: number | null;
  currentPart?: number | null;
  totalParts?: number | null;
  createdAt: string;
  updatedAt: string;
}

interface S3File {
  key: string;
  size: number;
  lastModified: string | null;
  url: string;
}

interface S3Data {
  prefix: string;
  folders: string[];
  files: S3File[];
  configured: boolean;
  message?: string;
}

interface HealthService {
  status: 'ok' | 'error' | 'not_configured';
  error?: string;
  bucket?: string;
}

interface HealthData {
  timestamp: string;
  services: { database?: HealthService; s3?: HealthService };
}

interface StatEntry { status: string; count: number; }

/* ─── constants ─────────────────────────────────────────────── */
const ALL_STATUSES = ['scheduled', 'ready', 'in_progress', 'uploading', 'completed', 'failed', 'cancelled'];

const STAT_COLORS: Record<string, { num: string }> = {
  scheduled: { num: '#64748b' },
  ready:      { num: '#3b82f6' },
  in_progress:{ num: '#f59e0b' },
  uploading:  { num: '#8b5cf6' },
  completed:  { num: '#22c55e' },
  failed:     { num: '#ef4444' },
  cancelled:  { num: '#94a3b8' },
};

const BADGE_STYLES: Record<string, React.CSSProperties> = {
  scheduled:   { background: '#1e2535', color: '#64748b' },
  ready:       { background: '#1d3461', color: '#60a5fa' },
  in_progress: { background: '#3d2a00', color: '#fbbf24' },
  uploading:   { background: '#2e1a5b', color: '#a78bfa' },
  completed:   { background: '#052e16', color: '#4ade80' },
  failed:      { background: '#3b0d0d', color: '#f87171' },
  cancelled:   { background: '#1e2535', color: '#94a3b8' },
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled', ready: 'Ready', in_progress: 'In Progress',
  uploading: 'Uploading', completed: 'Completed', failed: 'Failed', cancelled: 'Cancelled',
};

/* ─── helpers ───────────────────────────────────────────────── */
function fmtDuration(minutes: number | null): string {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return h > 0 ? `${h}ч ${m}м` : `${m}м`;
}
function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function fmtDateFull(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function fmtSize(bytes: number | null | undefined): string {
  if (!bytes) return '';
  if (bytes > 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
  if (bytes > 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1024).toFixed(0) + ' KB';
}
function toDatetimeLocal(d: string | null | undefined): string {
  if (!d) return '';
  const dt = new Date(d);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

/* ─── inline style tokens ───────────────────────────────────── */
const S = {
  root:      { background: '#0f1117', borderRadius: 12, padding: 20, minHeight: 400 } as React.CSSProperties,
  card:      { background: '#1a1f2e', border: '1px solid #2d3748', borderRadius: 10, overflow: 'hidden' } as React.CSSProperties,
  cardHead:  { padding: '12px 18px', borderBottom: '1px solid #2d3748', display: 'flex', alignItems: 'center', justifyContent: 'space-between' } as React.CSSProperties,
  h2:        { fontSize: 13, fontWeight: 600, color: '#e2e8f0', margin: 0 } as React.CSSProperties,
  th:        { padding: '9px 14px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.5px', color: '#64748b', borderBottom: '1px solid #1e2535', whiteSpace: 'nowrap' } as React.CSSProperties,
  td:        { padding: '10px 14px', borderBottom: '1px solid #1a2035', verticalAlign: 'middle', color: '#e2e8f0', fontSize: 13 } as React.CSSProperties,
  tdMuted:   { padding: '10px 14px', borderBottom: '1px solid #1a2035', verticalAlign: 'middle', color: '#94a3b8', fontSize: 12 } as React.CSSProperties,
  badge:     { display: 'inline-block', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' } as React.CSSProperties,
  filterBtn: (active: boolean): React.CSSProperties => ({
    fontSize: 12, padding: '4px 12px', borderRadius: 6,
    border: active ? '1px solid #3b82f6' : '1px solid #2d3748',
    background: active ? '#3b82f6' : '#0f1117',
    color: active ? '#fff' : '#94a3b8',
    cursor: 'pointer', transition: 'all .15s',
  }),
  actionBtn: (variant: 'reset' | 'cancel' | 'delete'): React.CSSProperties => ({
    fontSize: 11, padding: '3px 9px', borderRadius: 6, border: 'none', cursor: 'pointer', transition: 'opacity .15s',
    background: variant === 'reset' ? '#1d3461' : variant === 'cancel' ? '#3b0d0d' : '#1e2535',
    color: variant === 'reset' ? '#60a5fa' : variant === 'cancel' ? '#f87171' : '#64748b',
  }),
  refreshBtn: (spinning: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500,
    padding: '6px 14px', borderRadius: 8, border: '1px solid #3b82f6',
    background: '#1d3461', color: '#60a5fa', cursor: 'pointer', transition: 'background .15s',
    opacity: spinning ? .7 : 1,
  }),
  clearBtn: { fontSize: 11, padding: '4px 12px', borderRadius: 6, border: 'none', background: '#1e2535', color: '#64748b', cursor: 'pointer' } as React.CSSProperties,
  loadMoreBtn: { fontSize: 12, padding: '6px 18px', borderRadius: 7, border: '1px solid #2d3748', background: '#1a1f2e', color: '#94a3b8', cursor: 'pointer', margin: '12px auto', display: 'block' } as React.CSSProperties,
};

/* ═══════════════════════════════════════════════════════════════
   Main component
═══════════════════════════════════════════════════════════════ */
export function AdminRecordingDashboard() {
  const [tasks, setTasks]             = useState<AdminTask[]>([]);
  const [tasksTotal, setTasksTotal]   = useState(0);
  const [taskLimit, setTaskLimit]     = useState(100);
  const [stats, setStats]             = useState<Record<string, number>>({});
  const [health, setHealth]           = useState<HealthData | null>(null);
  const [s3Data, setS3Data]           = useState<S3Data>({ prefix: 'epa/', folders: [], files: [], configured: true });
  const [s3Prefix, setS3Prefix]       = useState('epa/');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate]   = useState('');

  const [editTask, setEditTask]       = useState<AdminTask | null>(null);
  const [editForm, setEditForm]       = useState<Partial<AdminTask>>({});
  const [isSaving, setIsSaving]       = useState(false);
  const [saveStatus, setSaveStatus]   = useState<'idle' | 'ok' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');

  const token   = () => localStorage.getItem('accessToken');
  const authHdr = () => ({ 'Authorization': `Bearer ${token()}` });
  const jsonHdr = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` });

  const fetchStats = useCallback(async () => {
    const r = await fetch('/api/recording/admin/stats', { headers: authHdr() });
    if (r.ok) {
      const d = await r.json();
      const map: Record<string, number> = {};
      (d.stats || []).forEach((s: StatEntry) => { map[s.status] = s.count; });
      setStats(map);
    }
  }, []);

  const fetchHealth = useCallback(async () => {
    const r = await fetch('/api/recording/admin/health', { headers: authHdr() });
    if (r.ok) setHealth(await r.json());
  }, []);

  const fetchTasks = useCallback(async () => {
    const url = filterStatus
      ? `/api/recording/admin/tasks?status=${filterStatus}&limit=${taskLimit}`
      : `/api/recording/admin/tasks?limit=${taskLimit}`;
    const r = await fetch(url, { headers: authHdr() });
    if (r.ok) {
      const d = await r.json();
      setTasks(d.tasks || []);
      setTasksTotal(d.total ?? d.tasks?.length ?? 0);
    }
  }, [filterStatus, taskLimit]);

  const fetchS3Files = useCallback(async (prefix?: string) => {
    const p = prefix ?? s3Prefix;
    const r = await fetch(`/api/recording/admin/s3-files?prefix=${encodeURIComponent(p)}`, { headers: authHdr() });
    if (r.ok) {
      const d = await r.json();
      setS3Data({
        prefix: d.prefix ?? p,
        folders: d.folders || [],
        files: d.files || [],
        configured: d.configured !== false,
        message: d.message,
      });
    }
  }, [s3Prefix]);

  const navigateS3 = useCallback((newPrefix: string) => {
    setS3Prefix(newPrefix);
    fetchS3Files(newPrefix);
  }, [fetchS3Files]);

  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([fetchStats(), fetchHealth(), fetchTasks(), fetchS3Files()]);
    setLastUpdate(new Date().toLocaleTimeString('ru-RU'));
    setIsRefreshing(false);
  }, [fetchStats, fetchHealth, fetchTasks, fetchS3Files]);

  useEffect(() => {
    refreshAll();
    const iv = setInterval(refreshAll, 15000);
    return () => clearInterval(iv);
  }, [refreshAll]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  /* actions */
  const handleReset = async (id: string) => {
    await fetch(`/api/recording/admin/tasks/${id}/reset`, { method: 'PATCH', headers: jsonHdr() });
    fetchTasks(); fetchStats();
  };
  const handleCancel = async (id: string) => {
    if (!confirm('Отменить задачу?')) return;
    await fetch(`/api/recording/admin/tasks/${id}/cancel`, { method: 'PATCH', headers: jsonHdr() });
    fetchTasks(); fetchStats();
  };
  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Удалить задачу "${title.slice(0, 40)}" из БД?`)) return;
    await fetch(`/api/recording/admin/tasks/${id}`, { method: 'DELETE', headers: jsonHdr() });
    fetchTasks(); fetchStats();
  };
  const handleClearFailed = async () => {
    if (!confirm('Удалить все задачи со статусом "failed"?')) return;
    const r = await fetch('/api/recording/admin/tasks/failed/clear', { method: 'DELETE', headers: jsonHdr() });
    if (r.ok) { const d = await r.json(); alert(`Удалено: ${d.deleted} задач`); }
    fetchTasks(); fetchStats();
  };

  /* modal */
  const openEdit = async (id: string) => {
    const r = await fetch(`/api/recording/admin/tasks/${id}`, { headers: authHdr() });
    if (r.ok) {
      const d = await r.json();
      setEditTask(d.task); setEditForm({ ...d.task });
      setSaveStatus('idle'); setSaveMessage('');
    }
  };
  const handleSave = async () => {
    if (!editTask) return;
    setIsSaving(true); setSaveStatus('idle');
    const payload = {
      title: editForm.title, description: editForm.description || null,
      streamUrl: editForm.streamUrl, streamPassword: editForm.streamPassword || null,
      duration: editForm.duration, scheduledTime: editForm.scheduledTime || null,
      saveTarget: editForm.saveTarget || null, status: editForm.status,
      begetUrl: editForm.begetUrl || null, errorMessage: editForm.errorMessage || null,
    };
    try {
      const r = await fetch(`/api/recording/admin/tasks/${editTask.id}`, { method: 'PATCH', headers: jsonHdr(), body: JSON.stringify(payload) });
      const d = await r.json();
      if (!d.success) throw new Error(d.message || 'Ошибка');
      setSaveStatus('ok'); setSaveMessage('Сохранено');
      fetchTasks(); fetchStats();
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (e: unknown) {
      setSaveStatus('error'); setSaveMessage(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally { setIsSaving(false); }
  };

  const totalCount = Object.values(stats).reduce((a, b) => a + b, 0);
  const db = health?.services?.database;
  const s3 = health?.services?.s3;

  return (
    <div style={S.root}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <span style={{ fontSize: 12, color: '#64748b' }}>
          {lastUpdate ? `Обновлено: ${lastUpdate}` : 'Загрузка...'}
        </span>
        <button style={S.refreshBtn(isRefreshing)} onClick={refreshAll} disabled={isRefreshing}>
          <span style={{ display: 'inline-block', animation: isRefreshing ? 'spin .6s linear infinite' : 'none' }}>↻</span>
          Обновить
        </button>
      </div>

      {/* ── Stats grid ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12, marginBottom: 20 }}>
        {ALL_STATUSES.map(s => (
          <div key={s}
            onClick={() => setFilterStatus(filterStatus === s ? null : s)}
            style={{
              background: '#1a1f2e',
              border: filterStatus === s ? '1px solid #3b82f6' : '1px solid #2d3748',
              borderRadius: 10, padding: '14px 12px', textAlign: 'center', cursor: 'pointer',
              boxShadow: filterStatus === s ? '0 0 0 1px #3b82f6' : 'none',
              transition: 'all .15s',
            }}
          >
            <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1, color: STAT_COLORS[s]?.num || '#e2e8f0' }}>
              {stats[s] || 0}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 5, textTransform: 'uppercase', letterSpacing: '.5px' }}>
              {STATUS_LABELS[s]}
            </div>
          </div>
        ))}
        <div
          onClick={() => setFilterStatus(null)}
          style={{
            background: '#1a1f2e',
            border: filterStatus === null ? '1px solid #3b82f6' : '1px solid #2d3748',
            borderRadius: 10, padding: '14px 12px', textAlign: 'center', cursor: 'pointer',
            boxShadow: filterStatus === null ? '0 0 0 1px #3b82f6' : 'none',
            transition: 'all .15s',
          }}
        >
          <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1, color: '#e2e8f0' }}>{totalCount}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 5, textTransform: 'uppercase', letterSpacing: '.5px' }}>Всего</div>
        </div>
      </div>

      {/* ── Health ─────────────────────────────────────────────── */}
      <div style={{ ...S.card, marginBottom: 16 }}>
        <div style={S.cardHead}><span style={S.h2}>Состояние сервисов</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, padding: 18 }}>
          <HealthRow label="PostgreSQL" service={db} />
          <HealthRow label="Beget S3" service={s3} />
        </div>
      </div>

      {/* ── Tasks table ────────────────────────────────────────── */}
      <div style={{ ...S.card, marginBottom: 16 }}>
        <div style={S.cardHead}>
          <span style={S.h2}>
            Задачи записи
            <span style={{ color: '#64748b', fontWeight: 400, marginLeft: 8 }}>
              ({tasks.length}{tasksTotal > tasks.length ? ` из ${tasksTotal}` : ''})
            </span>
          </span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* filter pills */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button style={S.filterBtn(filterStatus === null)} onClick={() => setFilterStatus(null)}>Все</button>
              {ALL_STATUSES.map(s => (
                <button key={s} style={S.filterBtn(filterStatus === s)} onClick={() => setFilterStatus(s)}>
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
            <button style={S.clearBtn} onClick={handleClearFailed}>🗑 Очистить failed</button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['ID', 'Название', 'Статус', 'Длит.', 'Воркер', 'Heartbeat', 'URL записи', 'Ошибка', 'Действия'].map(h => (
                  <th key={h} style={S.th as React.CSSProperties}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 32, color: '#64748b', fontSize: 13 }}>Нет задач</td>
                </tr>
              ) : tasks.map(t => (
                <TaskRow
                  key={t.id} task={t}
                  onOpen={openEdit}
                  onReset={handleReset}
                  onCancel={handleCancel}
                  onDelete={handleDelete}
                />
              ))}
            </tbody>
          </table>
        </div>

        {tasksTotal > tasks.length && (
          <button style={S.loadMoreBtn} onClick={() => setTaskLimit(l => l + 100)}>
            Загрузить ещё (показано {tasks.length} из {tasksTotal})
          </button>
        )}
      </div>

      {/* ── S3 Browser ─────────────────────────────────────────── */}
      <div style={S.card}>
        <div style={S.cardHead}>
          <span style={S.h2}>Файлы в S3</span>
          <button
            style={{ ...S.clearBtn, fontSize: 12 }}
            onClick={() => navigateS3('epa/')}
          >
            ↺ Сброс
          </button>
        </div>
        <div style={{ padding: '8px 18px 16px' }}>
          {!s3Data.configured ? (
            <div style={{ color: '#64748b', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>{s3Data.message || 'S3 не настроен'}</div>
          ) : (
            <>
              {/* Breadcrumbs */}
              <S3Breadcrumbs prefix={s3Data.prefix} onNavigate={navigateS3} />

              {/* Folders */}
              {s3Data.folders.map(folder => {
                const label = folder.replace(s3Data.prefix, '').replace(/\/$/, '') || folder;
                return (
                  <div
                    key={folder}
                    onClick={() => navigateS3(folder)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid #1e2535', cursor: 'pointer' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(59,130,246,.04)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                  >
                    <span style={{ fontSize: 14 }}>📁</span>
                    <span style={{ color: '#60a5fa', fontSize: 13, fontFamily: 'monospace' }}>{label}/</span>
                  </div>
                );
              })}

              {/* Files */}
              {s3Data.files.map(f => {
                const name = f.key.split('/').pop() || f.key;
                return (
                  <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid #1e2535' }}>
                    <span style={{ fontSize: 14 }}>🎬</span>
                    <span style={{ color: '#94a3b8', fontSize: 12, fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.key}>{name}</span>
                    <span style={{ color: '#64748b', fontSize: 11, flexShrink: 0 }}>{fmtSize(f.size)}</span>
                    {f.lastModified && (
                      <span style={{ color: '#475569', fontSize: 11, flexShrink: 0 }}>{fmtDate(f.lastModified)}</span>
                    )}
                    <a href={f.url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', fontSize: 12, flexShrink: 0, textDecoration: 'none' }}>▶</a>
                  </div>
                );
              })}

              {s3Data.folders.length === 0 && s3Data.files.length === 0 && (
                <div style={{ color: '#64748b', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>Папка пуста</div>
              )}
            </>
          )}
        </div>
      </div>

      {/* spin keyframe */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* ── Edit Modal ─────────────────────────────────────────── */}
      <Dialog open={!!editTask} onOpenChange={open => { if (!open) setEditTask(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" style={{ background: '#1a1f2e', border: '1px solid #2d3748', color: '#e2e8f0' }}>
          <DialogHeader>
            <DialogTitle style={{ color: '#fff', fontSize: 15 }} className="truncate">{editTask?.title || 'Задача'}</DialogTitle>
            <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b', marginTop: 2 }}>{editTask?.id}</p>
          </DialogHeader>

          {editTask && (
            <div className="space-y-5 py-2">
              <ModalSection title="Основное">
                <ModalField label="Название">
                  <DarkInput value={editForm.title || ''} onChange={v => setEditForm(f => ({ ...f, title: v }))} />
                </ModalField>
                <ModalField label="Описание" full>
                  <DarkTextarea value={editForm.description || ''} onChange={v => setEditForm(f => ({ ...f, description: v }))} />
                </ModalField>
              </ModalSection>

              <ModalSection title="Трансляция">
                <ModalField label="URL источника" full>
                  <DarkInput value={editForm.streamUrl || ''} onChange={v => setEditForm(f => ({ ...f, streamUrl: v }))} mono />
                </ModalField>
                <ModalField label="Пароль">
                  <DarkInput value={editForm.streamPassword || ''} onChange={v => setEditForm(f => ({ ...f, streamPassword: v }))} />
                </ModalField>
                <ModalField label="Длительность (мин)">
                  <DarkInput type="number" value={String(editForm.duration || '')} onChange={v => setEditForm(f => ({ ...f, duration: v ? Number(v) : null }))} />
                </ModalField>
                <ModalField label="Время начала">
                  <DarkInput type="datetime-local" value={toDatetimeLocal(editForm.scheduledTime)} onChange={v => setEditForm(f => ({ ...f, scheduledTime: v ? new Date(v).toISOString() : null }))} />
                </ModalField>
              </ModalSection>

              <ModalSection title="Хранилище и статус">
                <ModalField label="Сохранить в">
                  <Select value={editForm.saveTarget || ''} onValueChange={v => setEditForm(f => ({ ...f, saveTarget: v || null }))}>
                    <SelectTrigger style={{ background: '#0f1117', border: '1px solid #2d3748', color: '#e2e8f0', fontSize: 13 }}>
                      <SelectValue placeholder="Выберите..." />
                    </SelectTrigger>
                    <SelectContent style={{ background: '#1a1f2e', border: '1px solid #2d3748', color: '#e2e8f0' }}>
                      <SelectItem value="beget_s3">Beget S3</SelectItem>
                      <SelectItem value="yandex_disk">Yandex Disk</SelectItem>
                      <SelectItem value="local">Local</SelectItem>
                    </SelectContent>
                  </Select>
                </ModalField>
                <ModalField label="Статус">
                  <Select value={editForm.status || ''} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger style={{ background: '#0f1117', border: '1px solid #2d3748', color: '#e2e8f0', fontSize: 13 }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent style={{ background: '#1a1f2e', border: '1px solid #2d3748', color: '#e2e8f0' }}>
                      {ALL_STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </ModalField>
                <ModalField label="URL файла (begetUrl)" full>
                  <DarkInput value={editForm.begetUrl || ''} onChange={v => setEditForm(f => ({ ...f, begetUrl: v || null }))} mono />
                </ModalField>
                <ModalField label="Сообщение об ошибке" full>
                  <DarkTextarea value={editForm.errorMessage || ''} onChange={v => setEditForm(f => ({ ...f, errorMessage: v || null }))} />
                </ModalField>
              </ModalSection>

              <ModalSection title="Системная информация (только чтение)">
                <ModalField label="ID пользователя">
                  <DarkInput value={editTask.userId} readOnly mono />
                </ModalField>
                <ModalField label="Воркер">
                  <DarkInput value={editTask.workerId || ''} readOnly mono />
                </ModalField>
                <ModalField label="Создана">
                  <DarkInput value={fmtDateFull(editTask.createdAt)} readOnly />
                </ModalField>
                <ModalField label="Обновлена">
                  <DarkInput value={fmtDateFull(editTask.updatedAt)} readOnly />
                </ModalField>
                <ModalField label="Начата">
                  <DarkInput value={fmtDateFull(editTask.startedAt)} readOnly />
                </ModalField>
                <ModalField label="Завершена">
                  <DarkInput value={fmtDateFull(editTask.completedAt)} readOnly />
                </ModalField>
                <ModalField label="Последний heartbeat">
                  <DarkInput value={fmtDateFull(editTask.lastHeartbeat)} readOnly />
                </ModalField>
                {editTask.urlCheckStatus && (
                  <ModalField label="URL-проверка">
                    <DarkInput value={`${editTask.urlCheckStatus}${editTask.urlCheckMessage ? ' — ' + editTask.urlCheckMessage : ''}`} readOnly />
                  </ModalField>
                )}
                {(editTask.attemptCount != null) && (
                  <ModalField label="Попыток / Часть / Всего">
                    <DarkInput value={`${editTask.attemptCount} / ${editTask.currentPart ?? '—'} / ${editTask.totalParts ?? '—'}`} readOnly />
                  </ModalField>
                )}
              </ModalSection>
            </div>
          )}

          <DialogFooter style={{ borderTop: '1px solid #2d3748', paddingTop: 14, gap: 10 }}>
            {saveStatus !== 'idle' && (
              <span style={{ fontSize: 12, color: saveStatus === 'ok' ? '#4ade80' : '#f87171', alignSelf: 'center', marginRight: 'auto' }}>
                {saveMessage}
              </span>
            )}
            <button style={{ background: '#1e2535', color: '#94a3b8', border: 'none', padding: '8px 20px', borderRadius: 7, fontSize: 13, cursor: 'pointer' }} onClick={() => setEditTask(null)}>
              Закрыть
            </button>
            <button
              style={{ background: isSaving ? '#1e2535' : '#1d4ed8', color: isSaving ? '#64748b' : '#fff', border: 'none', padding: '8px 20px', borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: isSaving ? 'default' : 'pointer' }}
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Сохранение...' : '💾 Сохранить'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── sub-components ────────────────────────────────────────── */
function S3Breadcrumbs({ prefix, onNavigate }: { prefix: string; onNavigate: (p: string) => void }) {
  const parts = prefix.replace(/\/$/, '').split('/').filter(Boolean);
  const crumbs: { label: string; path: string }[] = [{ label: '/', path: '' }];
  parts.forEach((part, i) => {
    crumbs.push({ label: part, path: parts.slice(0, i + 1).join('/') + '/' });
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 0 12px', flexWrap: 'wrap' }}>
      {crumbs.map((c, i) => (
        <span key={c.path} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {i > 0 && <span style={{ color: '#2d3748' }}>›</span>}
          <button
            onClick={() => onNavigate(c.path || '')}
            style={{ background: 'none', border: 'none', padding: '2px 4px', borderRadius: 4, cursor: 'pointer', fontSize: 12, color: i === crumbs.length - 1 ? '#e2e8f0' : '#3b82f6', fontFamily: 'monospace' }}
          >
            {c.label}
          </button>
        </span>
      ))}
    </div>
  );
}

function HealthRow({ label, service }: { label: string; service?: HealthService }) {
  const isOk  = service?.status === 'ok';
  const isNA  = service?.status === 'not_configured';
  const dotColor = isOk ? '#22c55e' : isNA ? '#64748b' : '#ef4444';
  const dotGlow  = isOk ? '0 0 8px #22c55e66' : isNA ? 'none' : '0 0 8px #ef444466';
  return (
    <div style={{ background: '#0f1117', borderRadius: 8, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: dotColor, boxShadow: dotGlow }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>{label}</div>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
          {service ? (isOk ? (service.bucket ? `Bucket: ${service.bucket}` : 'Подключено') : isNA ? 'Не настроен' : service.error || 'Ошибка') : '...'}
        </div>
      </div>
    </div>
  );
}

function TaskRow({ task, onOpen, onReset, onCancel, onDelete }: {
  task: AdminTask;
  onOpen: (id: string) => void;
  onReset: (id: string) => void;
  onCancel: (id: string) => void;
  onDelete: (id: string, title: string) => void;
}) {
  const badge = BADGE_STYLES[task.status] || { background: '#1e2535', color: '#94a3b8' };
  return (
    <tr style={{ borderBottom: '1px solid #1a2035' }}
      onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(59,130,246,.04)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
    >
      <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 12 }}>
        <button
          onClick={() => onOpen(task.id)}
          title={task.id}
          style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', padding: 0, fontFamily: 'monospace', fontSize: 12 }}
        >
          {task.id.slice(0, 14)}…
        </button>
      </td>
      <td style={{ ...S.td, maxWidth: 180 }}>
        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={task.title}>{task.title}</span>
      </td>
      <td style={S.td}>
        <span style={{ ...S.badge, ...badge }}>{STATUS_LABELS[task.status] || task.status}</span>
      </td>
      <td style={S.tdMuted}>{fmtDuration(task.duration)}</td>
      <td style={{ ...S.tdMuted, fontFamily: 'monospace', maxWidth: 120 }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
          {task.workerId ? task.workerId.slice(-12) : '—'}
        </span>
      </td>
      <td style={S.tdMuted}>{fmtDate(task.lastHeartbeat)}</td>
      <td style={S.td}>
        {task.begetUrl
          ? <a href={task.begetUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', fontSize: 12, textDecoration: 'none' }}>▶ Открыть</a>
          : <span style={{ color: '#2d3748' }}>—</span>}
      </td>
      <td style={{ ...S.td, maxWidth: 160 }}>
        {task.errorMessage && (
          <span style={{ color: '#ef4444', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }} title={task.errorMessage}>
            {task.errorMessage.slice(0, 60)}
          </span>
        )}
      </td>
      <td style={{ ...S.td, whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {['failed', 'in_progress'].includes(task.status) && (
            <button style={S.actionBtn('reset')} onClick={() => onReset(task.id)} title="Повторить">↺ Повтор</button>
          )}
          {['ready', 'in_progress', 'scheduled'].includes(task.status) && (
            <button style={S.actionBtn('cancel')} onClick={() => onCancel(task.id)} title="Отменить">✕</button>
          )}
          <button style={S.actionBtn('delete')} onClick={() => onDelete(task.id, task.title)} title="Удалить из БД">🗑</button>
        </div>
      </td>
    </tr>
  );
}

function ModalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.7px', color: '#64748b', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid #1e2535' }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{children}</div>
    </div>
  );
}

function ModalField({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: full ? '1 / -1' : undefined }}>
      <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}

function DarkInput({ value, onChange, readOnly, mono, type }: {
  value: string; onChange?: (v: string) => void; readOnly?: boolean; mono?: boolean; type?: string;
}) {
  return (
    <input
      type={type || 'text'}
      value={value}
      readOnly={readOnly}
      onChange={e => onChange?.(e.target.value)}
      style={{
        background: '#0f1117', border: '1px solid #2d3748', borderRadius: 6,
        color: readOnly ? '#64748b' : '#e2e8f0', fontSize: mono ? 12 : 13,
        fontFamily: mono ? 'monospace' : 'inherit',
        padding: '7px 10px', outline: 'none', width: '100%',
        cursor: readOnly ? 'default' : 'text',
      }}
    />
  );
}

function DarkTextarea({ value, onChange }: { value: string; onChange?: (v: string) => void }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange?.(e.target.value)}
      rows={2}
      style={{
        background: '#0f1117', border: '1px solid #2d3748', borderRadius: 6,
        color: '#e2e8f0', fontSize: 13, padding: '7px 10px', outline: 'none',
        width: '100%', resize: 'vertical', fontFamily: 'inherit',
      }}
    />
  );
}
