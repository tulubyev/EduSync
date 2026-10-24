import crypto from 'crypto';

// Параметр state для OAuth Stepik: привязан к пользователю My EPA и подписан HMAC,
// поэтому ответ Stepik нельзя подставить другому пользователю (защита от CSRF).
// Формат: <userId>.<время выдачи, мс>.<подпись>

const STATE_TTL_MS = 15 * 60 * 1000;

function sign(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(`stepik-oauth:${payload}`).digest('base64url');
}

export function createStepikState(userId: string, secret: string, now = Date.now()): string {
  const payload = `${userId}.${now}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyStepikState(state: string, userId: string, secret: string, now = Date.now()): boolean {
  const parts = state.split('.');
  if (parts.length !== 3) return false;
  const [stateUserId, issuedAt, signature] = parts;
  if (stateUserId !== userId) return false;
  const issued = Number(issuedAt);
  if (!Number.isFinite(issued) || now - issued > STATE_TTL_MS || issued > now + 60_000) return false;
  const expected = sign(`${stateUserId}.${issuedAt}`, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
