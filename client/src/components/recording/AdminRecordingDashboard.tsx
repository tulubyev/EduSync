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
interface WorkerEntry {
  workerId: string;
  isActive: boolean | null;
  dbConnected: boolean | null;
  s3Connected: boolean | null;
  activeTaskId: string | null;
  currentTaskTitle: string | null;
  tasksProcessed: number | null;
  tasksSuccessful: number | null;
  tasksFailed: number | null;
  lastError: string | null;
  lastErrorAt: string | null;
  lastSeenAt: string | null;
  startedAt: string | null;
  buildVersion: string | null;
  isOnline: boolean;
  secondsAgo: number | null;
  healthStatus: string;
}

interface WorkerStatusData {
  workers: WorkerEntry[];
  summary: { activeWorkers: number; totalWorkers: number; allHealthy: boolean };
  timestamp: string;
}


interface TaskLog {
  id: string;
  timestamp: string;
  event: string;
  part: number | null;
  message: string;
  error: string | null;
  fileSize: number | null;
  duration: number | null;
}

interface SyncCheckResult {
  healthy: boolean;
  issueCount: number;
  issues: Array<{ type: string; message: string; taskId?: string; workerId?: string }>;
  timestamp: string;
}

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
  s3Prefix?: string | null;
  s3Filename?: string | null;
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

interface PlaywrightHealth {
  status: 'recording' | 'idle' | 'not_launched' | 'executor_stopped' | 'error';
  browserAlive: boolean;
  pageAlive: boolean;
  isRecording: boolean;
  frameCount: number;
  elapsedMs: number | null;
  currentUrl: string | null;
  taskId: string | null;
  error?: string;
}

interface HealthData {
  timestamp: string;
  services: { database?: HealthService; s3?: HealthService; playwright?: PlaywrightHealth };
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
  actionBtn: (variant: 'history' | 'retry' | 'cancel' | 'delete'): React.CSSProperties => {
    const map: Record<string, { bg: string; color: string; border: string }> = {
      history: { bg: '#1e3a5f', color: '#93c5fd', border: '1px solid #2563eb' },
      retry:   { bg: '#064e3b', color: '#6ee7b7', border: '1px solid #059669' },
      cancel:  { bg: '#431407', color: '#fdba74', border: '1px solid #ea580c' },
      delete:  { bg: '#450a0a', color: '#fca5a5', border: '1px solid #dc2626' },
    };
    const v = map[variant] || map.history;
    return {
      fontSize: 13, padding: '4px 9px', borderRadius: 7, border: v.border,
      cursor: 'pointer', transition: 'opacity .15s, filter .15s',
      background: v.bg, color: v.color, fontWeight: 600,
      display: 'inline-flex', alignItems: 'center', gap: 4, lineHeight: 1,
    };
  },
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
  const [s3RefreshKey, setS3RefreshKey] = useState(0);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate]   = useState('');

  const [editTask, setEditTask]       = useState<AdminTask | null>(null);
  const [editForm, setEditForm]       = useState<Partial<AdminTask>>({});
  const [isSaving, setIsSaving]       = useState(false);
  const [saveStatus, setSaveStatus]   = useState<'idle' | 'ok' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');

  const [workerStatus, setWorkerStatus]     = useState<WorkerStatusData | null>(null);
  const [executorRunning, setExecutorRunning] = useState<boolean | null>(null);
  const [executorAction, setExecutorAction]   = useState<'start' | 'stop' | null>(null);
  const [errorDetail, setErrorDetail] = useState<{ taskId: string; taskTitle: string; message: string } | null>(null);
  const [historyTaskId, setHistoryTaskId]   = useState<string | null>(null);
  const [historyTaskTitle, setHistoryTaskTitle] = useState('');
  const [historyLogs, setHistoryLogs]       = useState<TaskLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [syncCheckResult, setSyncCheckResult]   = useState<SyncCheckResult | null>(null);
  const [syncCheckLoading, setSyncCheckLoading] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; title: string; message: string;
    confirmLabel: string; onConfirm: () => void;
  }>({ open: false, title: '', message: '', confirmLabel: 'Подтвердить', onConfirm: () => {} });

  const showConfirm = (opts: { title: string; message: string; confirmLabel: string; onConfirm: () => void }) => {
    setConfirmDialog({ open: true, ...opts });
  };
  const closeConfirm = () => setConfirmDialog(prev => ({ ...prev, open: false }));
  const [clearResult, setClearResult] = useState<string | null>(null);

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

  const fetchWorkerStatus = useCallback(async () => {
    const r = await fetch('/api/recording/monitor/worker-status', { headers: authHdr() });
    if (r.ok) setWorkerStatus(await r.json());
  }, []);

  const fetchExecutorStatus = useCallback(async () => {
    const r = await fetch('/api/recording/admin/executor/status', { headers: authHdr() });
    if (r.ok) { const d = await r.json(); setExecutorRunning(d.executor?.isRunning ?? null); }
  }, []);

  const handleStartExecutor = async () => {
    setExecutorAction('start');
    try {
      const r = await fetch('/api/recording/admin/executor/start', { method: 'POST', headers: jsonHdr() });
      const d = await r.json();
      setExecutorRunning(d.executor?.isRunning ?? true);
    } finally { setExecutorAction(null); }
  };

  const handleStopExecutor = async () => {
    setExecutorAction('stop');
    try {
      const r = await fetch('/api/recording/admin/executor/stop', { method: 'POST', headers: jsonHdr() });
      const d = await r.json();
      setExecutorRunning(d.executor?.isRunning ?? false);
    } finally { setExecutorAction(null); }
  };


  const openHistory = async (taskId: string, taskTitle: string) => {
    setHistoryTaskId(taskId);
    setHistoryTaskTitle(taskTitle);
    setHistoryLogs([]);
    setHistoryLoading(true);
    try {
      const r = await fetch(`/api/recording/logs/${taskId}`, { headers: authHdr() });
      if (r.ok) { const d = await r.json(); setHistoryLogs(d.logs || []); }
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSyncCheck = async () => {
    setSyncCheckLoading(true);
    setSyncCheckResult(null);
    try {
      const r = await fetch('/api/recording/monitor/sync-check', { headers: authHdr() });
      if (r.ok) setSyncCheckResult(await r.json());
    } finally {
      setSyncCheckLoading(false);
    }
  };

  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([fetchStats(), fetchHealth(), fetchTasks(), fetchWorkerStatus(), fetchExecutorStatus()]);
    setS3RefreshKey(k => k + 1);
    setLastUpdate(new Date().toLocaleTimeString('ru-RU'));
    setIsRefreshing(false);
  }, [fetchStats, fetchHealth, fetchTasks, fetchWorkerStatus, fetchExecutorStatus]);

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
  const handleCancel = (id: string) => {
    showConfirm({
      title: 'Отменить задачу?',
      message: 'Задача будет переведена в статус "Отменена".',
      confirmLabel: 'Отменить',
      onConfirm: async () => {
        closeConfirm();
        await fetch(`/api/recording/admin/tasks/${id}/cancel`, { method: 'PATCH', headers: jsonHdr() });
        fetchTasks(); fetchStats();
      },
    });
  };
  const handleDelete = (id: string, title: string) => {
    showConfirm({
      title: 'Удалить задачу?',
      message: `Задача "${title.slice(0, 40)}" будет безвозвратно удалена из базы данных.`,
      confirmLabel: 'Удалить',
      onConfirm: async () => {
        closeConfirm();
        await fetch(`/api/recording/admin/tasks/${id}`, { method: 'DELETE', headers: jsonHdr() });
        fetchTasks(); fetchStats();
      },
    });
  };
  const handleClearFailed = () => {
    showConfirm({
      title: 'Очистить ошибки?',
      message: 'Все задачи со статусом "failed" будут удалены из базы данных.',
      confirmLabel: 'Удалить все',
      onConfirm: async () => {
        closeConfirm();
        const r = await fetch('/api/recording/admin/tasks/failed/clear', { method: 'DELETE', headers: jsonHdr() });
        if (r.ok) { const d = await r.json(); setClearResult(`Удалено: ${d.deleted} задач`); }
        fetchTasks(); fetchStats();
      },
    });
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* ── Executor Start/Stop ── */}
          {executorRunning !== false ? (
            <button
              onClick={handleStopExecutor}
              disabled={!!executorAction}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 22px', borderRadius: 24, border: '1px solid #7f1d1d',
                background: executorAction ? '#2d1515' : '#3b0d0d',
                color: executorAction ? '#9ca3af' : '#fca5a5',
                fontSize: 13, fontWeight: 700, cursor: executorAction ? 'not-allowed' : 'pointer',
                transition: 'all .2s', letterSpacing: '.3px',
                boxShadow: executorAction ? 'none' : '0 0 12px rgba(239,68,68,.15)',
              }}
            >
              <span style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: executorAction ? '#6b7280' : '#ef4444',
                animation: executorAction ? 'none' : 'pulse 1.4s ease-in-out infinite',
              }} />
              {executorAction === 'stop' ? 'Останавливаю...' : '⏹ Остановить воркер'}
            </button>
          ) : (
            <button
              onClick={handleStartExecutor}
              disabled={!!executorAction}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 22px', borderRadius: 24, border: '1px solid #166534',
                background: executorAction ? '#0a1a10' : '#052e16',
                color: executorAction ? '#9ca3af' : '#4ade80',
                fontSize: 13, fontWeight: 700, cursor: executorAction ? 'not-allowed' : 'pointer',
                transition: 'all .2s', letterSpacing: '.3px',
                boxShadow: executorAction ? 'none' : '0 0 12px rgba(34,197,94,.15)',
              }}
            >
              <span style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: executorAction ? '#6b7280' : '#22c55e',
              }} />
              {executorAction === 'start' ? 'Запускаю...' : '▶ Запустить воркер'}
            </button>
          )}

          {/* ── Refresh ── */}
          <button style={S.refreshBtn(isRefreshing)} onClick={refreshAll} disabled={isRefreshing}>
            <span style={{ display: 'inline-block', animation: isRefreshing ? 'spin .6s linear infinite' : 'none' }}>↻</span>
            Обновить
          </button>
        </div>
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

      {/* ── Состояние сервисов (PostgreSQL + S3 + Worker) ────────── */}
      <div style={{ ...S.card, marginBottom: 16 }}>
        <div style={S.cardHead}>
          <span style={S.h2}>Состояние сервисов</span>
          <button
            onClick={handleSyncCheck}
            disabled={syncCheckLoading}
            style={{
              fontSize: 11, padding: '3px 12px', borderRadius: 6, border: '1px solid #2d3748',
              background: '#1a1f2e', color: '#94a3b8', cursor: syncCheckLoading ? 'default' : 'pointer',
              opacity: syncCheckLoading ? .6 : 1,
            }}
          >
            {syncCheckLoading ? '⏳ Проверка...' : '🔍 Проверить статус'}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14, padding: '14px 18px' }}>
          <HealthRow label="PostgreSQL" service={db} />
          <HealthRow label="Beget S3" service={s3} />
          <WorkerCell
            worker={workerStatus?.workers[0] ?? null}
            loading={!workerStatus}
          />
          <PlaywrightCell playwright={health?.services?.playwright} />
        </div>
        {syncCheckResult && (
          <div style={{
            margin: '0 18px 14px', padding: '8px 12px', borderRadius: 8,
            background: syncCheckResult.healthy ? '#052e16' : '#1f0a0a',
            border: `1px solid ${syncCheckResult.healthy ? '#166534' : '#7f1d1d'}`,
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: syncCheckResult.healthy ? '#4ade80' : '#f87171', marginBottom: 2 }}>
              {syncCheckResult.healthy ? '✓ Всё в порядке' : `⚠ Найдено проблем: ${syncCheckResult.issueCount}`}
            </div>
            {syncCheckResult.issues.map((issue, i) => (
              <div key={i} style={{ fontSize: 11, color: '#f87171', marginTop: 2 }}>
                [{issue.type}] {issue.message}
              </div>
            ))}
            <div style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>
              Проверено: {fmtDateFull(syncCheckResult.timestamp)}
            </div>
          </div>
        )}
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
                  onHistory={(id, title) => openHistory(id, title)}
                  onErrorClick={(taskId, taskTitle, msg) => setErrorDetail({ taskId, taskTitle, message: msg })}
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
        </div>
        <div style={{ padding: '8px 18px 16px' }}>
          <S3TreeBrowser refreshKey={s3RefreshKey} />
        </div>
      </div>

      <style>{`
        @keyframes spin  { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
      `}</style>

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

              {(editTask.s3Filename || editTask.s3Prefix) && (
                <ModalSection title="S3-путь (заранее запланирован)">
                  {editTask.s3Filename && (
                    <ModalField label="Имя файла (базовое)" full>
                      <DarkInput value={editTask.s3Filename} readOnly mono />
                    </ModalField>
                  )}
                  {editTask.s3Prefix && (
                    <ModalField label="Папка в S3" full>
                      <DarkInput value={editTask.s3Prefix} readOnly mono />
                    </ModalField>
                  )}
                  {editTask.s3Filename && (
                    <ModalField label="Файл (часть 1)" full>
                      <DarkInput value={`${editTask.s3Prefix || ''}${editTask.s3Filename}_part001.mp4`} readOnly mono />
                    </ModalField>
                  )}
                </ModalSection>
              )}

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

      {/* ── History Modal ───────────────────────────────────────── */}
      <Dialog open={!!historyTaskId} onOpenChange={open => { if (!open) { setHistoryTaskId(null); setHistoryLogs([]); } }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" style={{ background: '#1a1f2e', border: '1px solid #2d3748', color: '#e2e8f0' }}>
          <DialogHeader>
            <DialogTitle style={{ color: '#fff', fontSize: 15 }}>История: {historyTaskTitle}</DialogTitle>
            <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b', marginTop: 2 }}>{historyTaskId}</p>
          </DialogHeader>
          <div style={{ paddingTop: 8 }}>
            {historyLoading ? (
              <div style={{ textAlign: 'center', padding: 32, color: '#64748b', fontSize: 13 }}>Загрузка...</div>
            ) : historyLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: '#64748b', fontSize: 13 }}>Нет событий для этой задачи</div>
            ) : (
              <div style={{ position: 'relative' }}>
                {/* Timeline vertical line */}
                <div style={{ position: 'absolute', left: 15, top: 8, bottom: 8, width: 2, background: '#1e2535' }} />
                {historyLogs.map((log, i) => (
                  <div key={log.id} style={{ display: 'flex', gap: 16, marginBottom: 16, position: 'relative' }}>
                    {/* Dot */}
                    <div style={{ width: 32, flexShrink: 0, display: 'flex', justifyContent: 'center', paddingTop: 2 }}>
                      <div style={{
                        width: 10, height: 10, borderRadius: '50%', marginTop: 3,
                        background: log.error ? '#ef4444' : i === historyLogs.length - 1 ? '#3b82f6' : '#475569',
                        boxShadow: log.error ? '0 0 6px #ef444480' : 'none',
                        flexShrink: 0,
                      }} />
                    </div>
                    {/* Content */}
                    <div style={{ flex: 1, background: '#0f1117', borderRadius: 8, padding: '10px 14px', border: '1px solid #1e2535' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                        <EventTypeBadge eventType={log.event} />
                        {log.part != null && (
                          <span style={{ fontSize: 10, color: '#64748b', background: '#1e2535', padding: '2px 7px', borderRadius: 4 }}>часть {log.part}</span>
                        )}
                        <span style={{ fontSize: 11, color: '#475569', marginLeft: 'auto' }}>{fmtDateFull(log.timestamp)}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#e2e8f0' }}>{log.message}</div>
                      {log.error && (
                        <div style={{ marginTop: 6, fontSize: 11, color: '#f87171', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                          {log.error}
                        </div>
                      )}
                      {(log.fileSize || log.duration) && (
                        <div style={{ marginTop: 4, fontSize: 11, color: '#64748b' }}>
                          {log.fileSize ? `Размер: ${fmtSize(log.fileSize)}` : ''}{log.fileSize && log.duration ? '  •  ' : ''}{log.duration ? `Длит.: ${log.duration}s` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter style={{ borderTop: '1px solid #2d3748', paddingTop: 14 }}>
            <button
              style={{ background: '#1e2535', color: '#94a3b8', border: 'none', padding: '8px 20px', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}
              onClick={() => { setHistoryTaskId(null); setHistoryLogs([]); }}
            >
              Закрыть
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ConfirmDialog */}
      <Dialog open={confirmDialog.open} onOpenChange={closeConfirm}>
        <DialogContent style={{ background: '#1a1f2e', border: '1px solid #2d3748', maxWidth: 420 }}>
          <DialogHeader>
            <DialogTitle style={{ color: '#e2e8f0' }}>{confirmDialog.title}</DialogTitle>
            <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>{confirmDialog.message}</p>
          </DialogHeader>
          <DialogFooter style={{ gap: 10, paddingTop: 8 }}>
            <button
              style={{ background: '#1e2535', color: '#94a3b8', border: 'none', padding: '7px 18px', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}
              onClick={closeConfirm}
            >
              Отмена
            </button>
            <button
              style={{ background: '#7f1d1d', color: '#fca5a5', border: 'none', padding: '7px 18px', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              onClick={confirmDialog.onConfirm}
            >
              {confirmDialog.confirmLabel}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Error Detail Modal ──────────────────────────────────── */}
      <Dialog open={!!errorDetail} onOpenChange={open => { if (!open) setErrorDetail(null); }}>
        <DialogContent style={{ background: '#1a1f2e', border: '1px solid #7f1d1d', maxWidth: 560 }}>
          <DialogHeader>
            <DialogTitle style={{ color: '#fca5a5', fontSize: 15 }}>⚠ Ошибка задачи</DialogTitle>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 2, fontFamily: 'monospace' }}>
              {errorDetail?.taskTitle}
            </p>
          </DialogHeader>
          <div style={{
            background: '#0f1117', borderRadius: 8, padding: 14, margin: '4px 0 12px',
            fontFamily: 'monospace', fontSize: 12, color: '#f87171',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 320, overflowY: 'auto',
            border: '1px solid #450a0a',
          }}>
            {errorDetail?.message || '—'}
          </div>
          <DialogFooter style={{ gap: 10, paddingTop: 4 }}>
            <button
              style={{ background: '#1e3a5f', color: '#93c5fd', border: '1px solid #2563eb', padding: '7px 16px', borderRadius: 7, fontSize: 13, cursor: 'pointer', fontWeight: 500 }}
              onClick={() => {
                if (errorDetail) { openHistory(errorDetail.taskId, errorDetail.taskTitle); setErrorDetail(null); }
              }}
            >
              📋 Открыть полный лог
            </button>
            <button
              style={{ background: '#1e2535', color: '#94a3b8', border: 'none', padding: '7px 18px', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}
              onClick={() => setErrorDetail(null)}
            >
              Закрыть
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {clearResult && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#052e16', border: '1px solid #166534', borderRadius: 8, padding: '10px 18px', color: '#4ade80', fontSize: 13, zIndex: 9999, cursor: 'pointer' }}
          onClick={() => setClearResult(null)}
        >
          ✓ {clearResult}
        </div>
      )}
    </div>
  );
}

/* ─── sub-components ────────────────────────────────────────── */
// ── S3 Tree Browser ────────────────────────────────────────────────────────

interface S3NodeData {
  folders: string[];
  files: S3File[];
  isExpanded: boolean;
  isLoading: boolean;
  isLoaded: boolean;
}

const S3_ROOT = 'myepa/';

function S3TreeBrowser({ refreshKey }: { refreshKey: number }) {
  const [nodes, setNodes] = React.useState<Record<string, S3NodeData>>({});
  const nodesRef = React.useRef<Record<string, S3NodeData>>({});
  nodesRef.current = nodes;

  // Token is read inline on each fetch — no closure dependency, no re-renders from auth changes
  const loadNode = React.useCallback(async (path: string, expandOverride?: boolean) => {
    const tok = localStorage.getItem('accessToken');
    const hdrs = { 'Authorization': `Bearer ${tok}` };
    const currentExpand = expandOverride !== undefined ? expandOverride : (nodesRef.current[path]?.isExpanded ?? true);

    setNodes(prev => ({
      ...prev,
      [path]: { ...(prev[path] ?? { folders: [], files: [], isLoaded: false }), isExpanded: currentExpand, isLoading: true },
    }));

    try {
      const r = await fetch(`/api/recording/admin/s3-files?prefix=${encodeURIComponent(path)}`, { headers: hdrs });
      const expand = nodesRef.current[path]?.isExpanded ?? currentExpand;
      if (r.ok) {
        const d = await r.json();
        setNodes(prev => ({
          ...prev,
          [path]: { folders: d.folders || [], files: d.files || [], isExpanded: expand, isLoading: false, isLoaded: true },
        }));
      } else {
        setNodes(prev => ({ ...prev, [path]: { ...(prev[path] ?? { folders: [], files: [] }), isLoading: false, isLoaded: true } }));
      }
    } catch {
      setNodes(prev => ({ ...prev, [path]: { ...(prev[path] ?? { folders: [], files: [] }), isLoading: false, isLoaded: true } }));
    }
  }, []); // ← no external deps: token and nodes are read via ref/localStorage each time

  const isFirstRender = React.useRef(true);
  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      loadNode(S3_ROOT, true);
      return;
    }
    // On periodic refresh: reload only already-loaded paths, preserving expand state
    const current = nodesRef.current;
    const loaded = Object.keys(current).filter(p => current[p].isLoaded);
    (loaded.length > 0 ? loaded : [S3_ROOT]).forEach(p => loadNode(p));
  }, [refreshKey]); // ← only refreshKey triggers this, NOT loadNode

  const toggle = (path: string) => {
    const node = nodesRef.current[path];
    if (!node || !node.isLoaded) {
      loadNode(path, true);
    } else if (!node.isLoading) {
      setNodes(prev => ({ ...prev, [path]: { ...prev[path], isExpanded: !prev[path].isExpanded } }));
    }
  };

  const renderLevel = (path: string, depth: number): React.ReactNode => {
    const node = nodes[path];
    if (!node || !node.isLoaded) return null;
    const pl = depth * 20 + 4;

    return (
      <div>
        {node.folders.map(folder => {
          const label = folder.replace(path, '').replace(/\/$/, '');
          const child = nodes[folder];
          const expanded = child?.isExpanded ?? false;
          const loading  = child?.isLoading  ?? false;
          return (
            <div key={folder}>
              <div
                onClick={() => toggle(folder)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  paddingTop: 7, paddingBottom: 7, paddingLeft: pl,
                  borderBottom: '1px solid #1e2535',
                  cursor: loading ? 'default' : 'pointer',
                  userSelect: 'none',
                }}
                onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLDivElement).style.background = 'rgba(59,130,246,.05)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
              >
                <span style={{ fontSize: 13, width: 18, textAlign: 'center', flexShrink: 0 }}>
                  {loading ? '⏳' : expanded ? '📂' : '📁'}
                </span>
                <span style={{ color: '#60a5fa', fontSize: 13, fontFamily: 'monospace', flex: 1 }}>{label}/</span>
                <span style={{ color: '#475569', fontSize: 11, marginRight: 6 }}>
                  {!loading && (expanded ? '▼' : '▶')}
                </span>
              </div>
              {expanded && !loading && renderLevel(folder, depth + 1)}
            </div>
          );
        })}

        {node.files.map(f => {
          const name = f.key.split('/').pop() || f.key;
          return (
            <div
              key={f.key}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                paddingTop: 6, paddingBottom: 6, paddingLeft: pl,
                borderBottom: '1px solid #1e2535',
              }}
            >
              <span style={{ fontSize: 13, width: 18, textAlign: 'center', flexShrink: 0 }}>🎬</span>
              <span
                style={{ color: '#94a3b8', fontSize: 12, fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                title={f.key}
              >{name}</span>
              <span style={{ color: '#64748b', fontSize: 11, flexShrink: 0 }}>{fmtSize(f.size)}</span>
              {f.lastModified && <span style={{ color: '#475569', fontSize: 11, flexShrink: 0 }}>{fmtDate(f.lastModified)}</span>}
              <a href={f.url} target="_blank" rel="noopener noreferrer"
                style={{ color: '#3b82f6', fontSize: 12, flexShrink: 0, textDecoration: 'none' }}
                title="Открыть"
              >▶</a>
            </div>
          );
        })}

        {node.isLoaded && node.folders.length === 0 && node.files.length === 0 && (
          <div style={{ paddingLeft: pl, color: '#475569', fontSize: 12, paddingTop: 8, paddingBottom: 8, borderBottom: '1px solid #1e2535' }}>
            Пусто
          </div>
        )}
      </div>
    );
  };

  const root = nodes[S3_ROOT];

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        paddingTop: 8, paddingBottom: 10, borderBottom: '1px solid #2d3748', marginBottom: 2,
      }}>
        <span style={{ fontSize: 14 }}>🪣</span>
        <span style={{ color: '#e2e8f0', fontSize: 13, fontFamily: 'monospace', fontWeight: 600 }}>myepa/</span>
        {root?.isLoading && <span style={{ color: '#64748b', fontSize: 11, marginLeft: 4 }}>загрузка...</span>}
      </div>
      {!root && <div style={{ color: '#64748b', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>⏳ Загрузка...</div>}
      {root?.isLoaded && renderLevel(S3_ROOT, 0)}
    </div>
  );
}

function PlaywrightCell({ playwright }: { playwright?: PlaywrightHealth }) {
  const status = playwright?.status;

  let dotColor = '#64748b';
  let dotGlow  = 'none';
  let dotAnim  = '';
  let label    = '...';
  let sub      = '';

  if (!playwright) {
    label = 'Playwright';
    sub   = '...';
  } else if (status === 'recording') {
    dotColor = '#22c55e';
    dotGlow  = '0 0 8px #22c55e99';
    dotAnim  = 'pwPulse 1.2s ease-in-out infinite';
    label    = 'Playwright · Запись';
    const elMin = playwright.elapsedMs != null ? Math.floor(playwright.elapsedMs / 60000) : 0;
    const elSec = playwright.elapsedMs != null ? Math.floor((playwright.elapsedMs % 60000) / 1000) : 0;
    sub = `${playwright.frameCount} фреймов · ${elMin > 0 ? `${elMin}м ` : ''}${elSec}с`;
  } else if (status === 'idle') {
    dotColor = '#f59e0b';
    dotGlow  = '0 0 6px #f59e0b66';
    label    = 'Playwright · Ожидание';
    sub      = 'Браузер запущен, задач нет';
  } else if (status === 'not_launched') {
    dotColor = '#64748b';
    label    = 'Playwright';
    sub      = 'Браузер не инициализирован';
  } else if (status === 'executor_stopped') {
    dotColor = '#475569';
    label    = 'Playwright';
    sub      = 'Воркер остановлен';
  } else if (status === 'error') {
    dotColor = '#ef4444';
    dotGlow  = '0 0 8px #ef444466';
    label    = 'Playwright · Ошибка';
    sub      = playwright.error || 'Неизвестная ошибка';
  }

  const urlLine = playwright?.currentUrl && playwright.currentUrl !== 'about:blank'
    ? playwright.currentUrl.replace(/^https?:\/\//, '').slice(0, 38) + (playwright.currentUrl.length > 45 ? '…' : '')
    : null;

  return (
    <>
      <style>{`@keyframes pwPulse { 0%,100%{opacity:1;} 50%{opacity:.35;} }`}</style>
      <div style={{ background: '#0f1117', borderRadius: 8, padding: 14, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 3,
          background: dotColor, boxShadow: dotGlow,
          animation: dotAnim || undefined,
        }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{sub}</div>
          {urlLine && (
            <div style={{ fontSize: 10, color: '#475569', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={playwright?.currentUrl ?? ''}>
              🌐 {urlLine}
            </div>
          )}
        </div>
      </div>
    </>
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

function TaskRow({ task, onOpen, onReset, onCancel, onDelete, onHistory, onErrorClick }: {
  task: AdminTask;
  onOpen: (id: string) => void;
  onReset: (id: string) => void;
  onCancel: (id: string) => void;
  onDelete: (id: string, title: string) => void;
  onHistory: (id: string, title: string) => void;
  onErrorClick: (taskId: string, taskTitle: string, message: string) => void;
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
      <td style={{ ...S.td, maxWidth: 200 }}>
        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={task.title}>{task.title}</span>
        {task.s3Filename && (
          <span
            style={{ display: 'block', fontFamily: 'monospace', fontSize: 10, color: '#4a6fa5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            title={`${task.s3Prefix || ''}${task.s3Filename}_part001.mp4`}
          >
            📄 {task.s3Filename}
          </span>
        )}
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
        {task.errorMessage ? (
          <button
            onClick={() => onErrorClick(task.id, task.title, task.errorMessage!)}
            title="Нажмите для просмотра полной ошибки"
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', width: '100%',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <span style={{ color: '#f87171', fontSize: 11, flexShrink: 0 }}>⚠</span>
            <span style={{
              color: '#f87171', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap', display: 'block', textDecoration: 'underline dotted',
            }}>
              {task.errorMessage.slice(0, 55)}{task.errorMessage.length > 55 ? '…' : ''}
            </span>
          </button>
        ) : (
          <span style={{ color: '#2d3748' }}>—</span>
        )}
      </td>
      <td style={{ ...S.td, whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', gap: 5 }}>
          <button style={S.actionBtn('history')} onClick={() => onHistory(task.id, task.title)} title="История событий">
            📋 <span style={{ fontSize: 11 }}>Лог</span>
          </button>
          {['failed', 'in_progress'].includes(task.status) && (
            <button style={S.actionBtn('retry')} onClick={() => onReset(task.id)} title="Повторить запись">
              🔄 <span style={{ fontSize: 11 }}>Повтор</span>
            </button>
          )}
          {['ready', 'in_progress', 'scheduled'].includes(task.status) && (
            <button style={S.actionBtn('cancel')} onClick={() => onCancel(task.id)} title="Отменить задачу">
              🛑 <span style={{ fontSize: 11 }}>Стоп</span>
            </button>
          )}
          <button style={S.actionBtn('delete')} onClick={() => onDelete(task.id, task.title)} title="Удалить из БД">
            🗑️ <span style={{ fontSize: 11 }}>Удалить</span>
          </button>
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

function WorkerCell({ worker, loading }: { worker: WorkerEntry | null; loading: boolean }) {
  if (loading) {
    return (
      <div style={{ background: '#0f1117', borderRadius: 8, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: '#334155' }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>Recording Worker</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>...</div>
        </div>
      </div>
    );
  }
  if (!worker) {
    return (
      <div style={{ background: '#0f1117', borderRadius: 8, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: '#64748b' }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>Recording Worker</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Нет воркеров</div>
        </div>
      </div>
    );
  }
  const online = worker.isOnline;
  const dotColor = online ? '#22c55e' : '#ef4444';
  const dotGlow  = online ? '0 0 8px #22c55e66' : '0 0 8px #ef444466';
  const minutesAgo = worker.secondsAgo != null ? Math.floor(worker.secondsAgo / 60) : null;
  const parts: string[] = [online ? 'Online' : 'Offline'];
  if (minutesAgo != null) parts.push(`${minutesAgo}м назад`);
  parts.push(`✓${worker.tasksSuccessful ?? 0} / ✗${worker.tasksFailed ?? 0}`);
  const subtitle = parts.join(' · ');
  const tooltip = worker.currentTaskTitle ? `▶ ${worker.currentTaskTitle}` : undefined;
  return (
    <div style={{ background: '#0f1117', borderRadius: 8, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }} title={tooltip}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: dotColor, boxShadow: dotGlow }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>Recording Worker</div>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{subtitle}</div>
      </div>
    </div>
  );
}

const EVENT_TYPE_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  task_created:         { bg: '#1d3461', color: '#60a5fa', label: 'Создана' },
  task_started:         { bg: '#1d3461', color: '#60a5fa', label: 'Запущена' },
  recording_started:    { bg: '#3d2a00', color: '#fbbf24', label: 'Запись' },
  recording_completed:  { bg: '#052e16', color: '#4ade80', label: 'Завершена' },
  upload_started:       { bg: '#2e1a5b', color: '#a78bfa', label: 'Загрузка' },
  upload_completed:     { bg: '#052e16', color: '#4ade80', label: 'Загружено' },
  upload_failed:        { bg: '#3b0d0d', color: '#f87171', label: 'Ошибка загр.' },
  browser_error:        { bg: '#3b0d0d', color: '#f87171', label: 'Браузер' },
  task_failed:          { bg: '#3b0d0d', color: '#f87171', label: 'Ошибка' },
  task_cancelled:       { bg: '#1e2535', color: '#94a3b8', label: 'Отменена' },
  auto_recovery:        { bg: '#1c2a1c', color: '#86efac', label: 'Авто-возврат' },
};

function EventTypeBadge({ eventType }: { eventType: string }) {
  const style = EVENT_TYPE_COLORS[eventType] || { bg: '#1e2535', color: '#94a3b8', label: eventType };
  return (
    <span style={{
      display: 'inline-block', fontSize: 10, fontWeight: 600,
      padding: '2px 8px', borderRadius: 20,
      background: style.bg, color: style.color,
      whiteSpace: 'nowrap',
    }}>
      {style.label}
    </span>
  );
}
