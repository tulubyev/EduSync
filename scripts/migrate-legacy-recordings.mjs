#!/usr/bin/env node
/**
 * Перенос записей из прежнего хранилища (например, s3.baikal.link) в текущее (BEGET_S3_*).
 *
 * Запуск в контейнере приложения (там уже есть переменные базы и хранилища):
 *   docker exec myepa-app node scripts/migrate-legacy-recordings.mjs           — только проверка
 *   docker exec myepa-app node scripts/migrate-legacy-recordings.mjs --apply   — перенос
 *
 * Что делает:
 *  1. Находит в базе ссылки на файлы записей (/myepa/recordings/...), которые ведут не в текущее
 *     хранилище и не на CDN: recording_tasks (begetUrl, части, склейка) и библиотека (notes).
 *  2. Проверяет каждую ссылку: файл есть (размер) / нет (404) / нет доступа / хранилище не отвечает.
 *  3. С --apply: скачивает найденные файлы, кладёт в текущий бакет под тем же ключом, сверяет
 *     размер и заменяет ссылки в базе на адрес BEGET_S3_PUBLIC_URL. Отсутствующие файлы не трогает —
 *     только перечисляет задачи, чтобы их можно было удалить в кабинете.
 *
 * Повторный запуск безопасен: перенесённые ссылки уже указывают на текущее хранилище.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import pg from 'pg';
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';

const APPLY = process.argv.includes('--apply');
const KEY_PREFIX = 'myepa/recordings/';
const PART_BYTES = 50 * 1024 * 1024;

const env = (...names) => names.map((n) => process.env[n]).find(Boolean);
const endpoint = env('BEGET_S3_ENDPOINT');
const bucket = env('BEGET_S3_BUCKET');
const publicBase = (env('BEGET_S3_PUBLIC_URL') || '').replace(/\/+$/, '');
const accessKeyId = env('BEGET_S3_ACCESS_KEY', 'BEGET_S3_ACCESS_KEY_ID');
const secretAccessKey = env('BEGET_S3_SECRET_KEY', 'BEGET_S3_SECRET_ACCESS_KEY');

if (!process.env.DATABASE_URL) fail('Нет DATABASE_URL');
if (APPLY && (!endpoint || !bucket || !publicBase || !accessKeyId || !secretAccessKey)) {
  fail('Для --apply нужны BEGET_S3_ENDPOINT, BEGET_S3_BUCKET, BEGET_S3_PUBLIC_URL и ключи доступа');
}

function fail(msg) {
  console.error(`✖ ${msg}`);
  process.exit(1);
}

const hostOf = (u) => {
  try { return new URL(u).host; } catch { return ''; }
};
const currentHosts = new Set([hostOf(publicBase), hostOf(endpoint)].filter(Boolean));

/** Ключ объекта: путь после хоста, начиная с myepa/recordings/ (как в BegetStorage). */
function keyOf(url) {
  try {
    const p = decodeURIComponent(new URL(url).pathname);
    const i = p.indexOf(`/${KEY_PREFIX}`);
    return i >= 0 ? p.slice(i + 1) : null;
  } catch {
    return null;
  }
}

/** Адрес для запроса: кириллица и пробелы в пути — в %-кодировке. */
function requestUrl(url) {
  const u = new URL(url);
  u.pathname = decodeURIComponent(u.pathname).split('/').map(encodeURIComponent).join('/');
  return u.toString();
}

const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} МБ`;

async function probe(url) {
  try {
    let r = await fetch(requestUrl(url), { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(30_000) });
    if (r.status === 405 || r.status === 501) {
      r = await fetch(requestUrl(url), { headers: { Range: 'bytes=0-0' }, signal: AbortSignal.timeout(30_000) });
      await r.body?.cancel();
      const total = Number((r.headers.get('content-range') || '').split('/')[1]);
      return { ok: r.ok, status: r.status, size: Number.isFinite(total) ? total : undefined };
    }
    const len = Number(r.headers.get('content-length'));
    return { ok: r.ok, status: r.status, size: Number.isFinite(len) && len > 0 ? len : undefined };
  } catch (e) {
    return { ok: false, status: 0, error: e?.cause?.code || e?.message || String(e) };
  }
}

function describe(p) {
  if (p.ok) return `есть${p.size ? `, ${mb(p.size)}` : ''}`;
  if (p.status === 404) return 'НЕТ ФАЙЛА (404)';
  if (p.status === 403) return 'нет доступа (403) — файла нет или бакет закрыт';
  if (p.status === 0) return `хранилище не отвечает (${p.error})`;
  return `ошибка ${p.status}`;
}

let s3;
function client() {
  s3 ??= new S3Client({
    endpoint,
    region: env('BEGET_S3_REGION') || 'us-east-1',
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
    // Beget S3 (Ceph) не принимает потоковые загрузки с контрольными суммами SHA256
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  return s3;
}

async function upload(file, key) {
  const size = fs.statSync(file).size;
  const ContentType = key.endsWith('.webm') ? 'video/webm' : 'video/mp4';
  if (size < 100 * 1024 * 1024) {
    await client().send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: fs.readFileSync(file), ContentLength: size, ContentType }));
    return size;
  }
  const { UploadId } = await client().send(new CreateMultipartUploadCommand({ Bucket: bucket, Key: key, ContentType }));
  const fd = fs.openSync(file, 'r');
  try {
    const parts = [];
    for (let n = 1, pos = 0; pos < size; n++, pos += PART_BYTES) {
      const len = Math.min(PART_BYTES, size - pos);
      const buf = Buffer.alloc(len);
      fs.readSync(fd, buf, 0, len, pos);
      const { ETag } = await client().send(
        new UploadPartCommand({ Bucket: bucket, Key: key, UploadId, PartNumber: n, Body: buf, ContentLength: len }),
      );
      parts.push({ ETag, PartNumber: n });
      process.stdout.write(`    загружено ${mb(pos + len)} из ${mb(size)}\r`);
    }
    await client().send(new CompleteMultipartUploadCommand({ Bucket: bucket, Key: key, UploadId, MultipartUpload: { Parts: parts } }));
    process.stdout.write('\n');
    return size;
  } catch (e) {
    await client().send(new AbortMultipartUploadCommand({ Bucket: bucket, Key: key, UploadId })).catch(() => {});
    throw e;
  } finally {
    fs.closeSync(fd);
  }
}

async function migrateFile(url, key) {
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'legacy-')), 'file');
  try {
    const r = await fetch(requestUrl(url), { signal: AbortSignal.timeout(6 * 3600_000) });
    if (!r.ok || !r.body) throw new Error(`скачивание: HTTP ${r.status}`);
    await pipeline(Readable.fromWeb(r.body), fs.createWriteStream(tmp));
    const size = await upload(tmp, key);
    const head = await client().send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    if (Number(head.ContentLength) !== size) throw new Error(`размер не совпал: ${head.ContentLength} ≠ ${size}`);
    return size;
  } finally {
    fs.rmSync(path.dirname(tmp), { recursive: true, force: true });
  }
}

const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  // Все ссылки на файлы записей и где они встречаются
  const { rows: tasks } = await db.query(
    `SELECT id, title, status, beget_url, parts, metadata FROM recording_tasks
      WHERE coalesce(beget_url,'') LIKE '%/${KEY_PREFIX}%'
         OR coalesce(parts::text,'') LIKE '%/${KEY_PREFIX}%'
         OR coalesce(metadata::text,'') LIKE '%/${KEY_PREFIX}%'`,
  );
  const { rows: notes } = await db.query(`SELECT id, title, resource_url FROM notes WHERE resource_url LIKE '%/${KEY_PREFIX}%'`);

  const urls = new Map(); // url → Set(где)
  const add = (u, where) => {
    if (typeof u !== 'string' || !u.includes(`/${KEY_PREFIX}`)) return;
    const h = hostOf(u);
    if (!h || currentHosts.has(h)) return;
    if (!urls.has(u)) urls.set(u, new Set());
    urls.get(u).add(where);
  };
  for (const t of tasks) {
    const where = `запись «${t.title}» (${t.status}, ${t.id})`;
    add(t.beget_url, where);
    for (const p of Array.isArray(t.parts) ? t.parts : []) add(p?.publicUrl, where);
    add(t.metadata?.mergedUrl, where);
    for (const s of Array.isArray(t.metadata?.mergeSources) ? t.metadata.mergeSources : []) add(s?.url, where);
  }
  for (const n of notes) add(n.resource_url, `библиотека «${n.title}» (${n.id})`);

  console.log(`Текущее хранилище: ${[...currentHosts].join(', ') || '(не задано)'}`);
  if (urls.size === 0) {
    console.log('✔ Ссылок на прежнее хранилище не найдено — переносить нечего.');
    return;
  }
  console.log(`Найдено ссылок на прежнее хранилище: ${urls.size}\n`);

  const found = [];
  const missing = [];
  for (const [url, where] of urls) {
    const p = await probe(url);
    console.log(`• ${decodeURIComponent(url)}\n    ${describe(p)}\n    ${[...where].join('\n    ')}`);
    (p.ok ? found : missing).push({ url, where, probe: p });
  }

  console.log(`\nИтого: есть — ${found.length}, недоступно — ${missing.length}`);
  if (!APPLY) {
    if (found.length) console.log('Для переноса найденных файлов запустите с --apply');
    return;
  }

  let moved = 0;
  for (const { url } of found) {
    const key = keyOf(url);
    if (!key) {
      console.log(`✖ не удалось определить ключ: ${url}`);
      continue;
    }
    const newUrl = `${publicBase}/${key}`;
    console.log(`→ ${key}`);
    try {
      const size = await migrateFile(url, key);
      // Замена ссылки везде, где она встречается (jsonb хранит ссылки как есть)
      const r1 = await db.query(
        `UPDATE recording_tasks
            SET beget_url = replace(beget_url, $1, $2),
                parts = replace(parts::text, $1, $2)::jsonb,
                metadata = replace(metadata::text, $1, $2)::jsonb,
                updated_at = now()
          WHERE beget_url = $1 OR parts::text LIKE '%' || $1 || '%' OR metadata::text LIKE '%' || $1 || '%'`,
        [url, newUrl],
      );
      const r2 = await db.query(`UPDATE notes SET resource_url = $2 WHERE resource_url = $1`, [url, newUrl]);
      moved++;
      console.log(`  ✔ ${mb(size)} перенесено, обновлено записей: ${r1.rowCount}, в библиотеке: ${r2.rowCount}`);
    } catch (e) {
      console.log(`  ✖ ${e.message}`);
    }
  }
  console.log(`\nПеренесено файлов: ${moved} из ${found.length}`);
  if (missing.length) {
    console.log('Файлы, которых нет в прежнем хранилище, не тронуты — такие записи можно удалить в кабинете:');
    for (const m of missing) console.log(`  ${[...m.where].join('; ')}`);
  }
}

main()
  .catch((e) => fail(e.stack || e.message))
  .finally(() => db.end());
