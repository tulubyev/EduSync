/**
 * Подпись вебхука Help Recorder: X-HR-Signature: t=<unix>,v1=<hex HMAC-SHA256 от "<t>.<сырое тело>"> с HR_WEBHOOK_SECRET.
 * Запросы старше 5 минут отклоняются (повтор перехваченного запроса).
 */
import { createHmac, timingSafeEqual } from 'crypto';

export const MAX_SKEW_SEC = 300;

export function verifyHrSignature(raw: string | Buffer, header: string | undefined, secret: string, nowSec = Math.floor(Date.now() / 1000)): boolean {
  if (!secret) return false;
  const m = /^t=(\d+),v1=([0-9a-f]{64})$/.exec(header ?? '');
  if (!m || Math.abs(nowSec - Number(m[1])) > MAX_SKEW_SEC) return false;
  const want = createHmac('sha256', secret).update(`${m[1]}.`).update(raw).digest();
  return timingSafeEqual(want, Buffer.from(m[2], 'hex'));
}

/** Так подписывает Help Recorder (для проверок) */
export function signHr(body: string, secret: string, t: number): string {
  return `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`;
}
