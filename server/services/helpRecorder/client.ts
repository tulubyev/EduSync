/**
 * Клиент партнёрского API Help Recorder (/partner/v1, docs PARTNERS.md в help-recorder).
 * Ключ — только с сервера (HR_PARTNER_KEY); от чьего имени — X-HR-User (id пользователя My EPA) или общий аккаунт.
 */
import { hrApiUrl } from './config';

export class HrError extends Error {
  constructor(readonly status: number, readonly code: string, message: string, readonly data?: Record<string, unknown>) {
    super(message);
  }
}

export interface HrRequest {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  /** id пользователя My EPA; 'shared' — общий аккаунт My EPA; null — действие партнёра (удаление пользователя) */
  user: string | 'shared' | null;
  body?: unknown;
  idempotencyKey?: string;
  timeoutMs?: number;
}

export async function hrFetch<T = any>(path: string, o: HrRequest): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${(process.env.HR_PARTNER_KEY || '').trim()}`,
    Accept: 'application/json',
  };
  if (o.user === 'shared') headers['X-HR-Account'] = 'shared';
  else if (o.user) headers['X-HR-User'] = o.user;
  if (o.body !== undefined) headers['Content-Type'] = 'application/json';
  if (o.idempotencyKey) headers['Idempotency-Key'] = o.idempotencyKey;

  let res: Response;
  try {
    res = await fetch(`${hrApiUrl()}/partner/v1${path}`, {
      method: o.method ?? 'GET',
      headers,
      body: o.body !== undefined ? JSON.stringify(o.body) : undefined,
      redirect: 'error',
      signal: AbortSignal.timeout(o.timeoutMs ?? 15_000),
    });
  } catch (e) {
    throw new HrError(0, 'network', `Help Recorder недоступен: ${(e as Error).message}`);
  }
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* не JSON */ }
  if (!res.ok) {
    throw new HrError(res.status, typeof json?.error === 'string' ? json.error : `http_${res.status}`,
      typeof json?.message === 'string' ? json.message : `Help Recorder ответил ${res.status}`, json?.data);
  }
  return json as T;
}
