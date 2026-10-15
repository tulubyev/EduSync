/**
 * Базовый URL для публичных ссылок на записи в S3 (Beget).
 *
 * BEGET_S3_PUBLIC_URL — необязателен. Если не задан (CDN нет), берём адрес бакета на самом S3
 * в path-style: <BEGET_S3_ENDPOINT>/<BEGET_S3_BUCKET>. Бакет должен быть публичным на чтение.
 */
export function resolveBegetPublicUrl(): string {
  const trim = (v: string) => v.replace(/\/+$/, '');
  const explicit = trim(process.env.BEGET_S3_PUBLIC_URL || '');
  if (explicit) return explicit;

  const endpoint = trim(process.env.BEGET_S3_ENDPOINT || 'https://s3.ru1.storage.beget.cloud');
  const bucket = process.env.BEGET_S3_BUCKET || '';
  return bucket ? `${endpoint}/${bucket}` : '';
}
