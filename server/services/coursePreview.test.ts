/** Курс по ссылке: загрузка страницы и защита от SSRF на локальном сервере (#19, npm test) */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { gzipSync } from 'zlib';
import type { AddressInfo } from 'net';
import { fetchCoursePage, previewCourse, PreviewError } from './coursePreview';

let server: http.Server;
let base = '';

before(async () => {
  server = http.createServer((req, res) => {
    if (req.url === '/course') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Encoding': 'gzip' });
      return res.end(gzipSync('<head><meta property="og:title" content="Курс по Python"><meta property="og:image" content="/c.png"></head>'));
    }
    if (req.url === '/moved') { res.writeHead(301, { Location: '/course' }); return res.end(); }
    if (req.url === '/to-metadata') { res.writeHead(302, { Location: 'http://169.254.169.254/latest/meta-data' }); return res.end(); }
    if (req.url === '/json') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end('{}'); }
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end('nope');
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => { server.close(); });

const code = async (p: Promise<unknown>) => {
  try { await p; return 'ok'; } catch (e) { return e instanceof PreviewError ? e.code : String(e); }
};

test('страница читается: gzip, редирект, обложка относительно страницы', async () => {
  const p = await previewCourse(`${base}/moved`, [], { allowPrivate: true });
  assert.equal(p.title, 'Курс по Python');
  assert.equal(p.imageUrl, `${base}/c.png`);
  assert.equal(p.courseUrl, `${base}/course`);
  assert.equal(p.partial, false);
});

test('без разрешения локальные и служебные адреса закрыты — и напрямую, и через редирект', async () => {
  assert.equal(await code(fetchCoursePage(`${base}/course`)), 'blocked');
  assert.equal(await code(fetchCoursePage('http://localhost/')), 'blocked');
  assert.equal(await code(fetchCoursePage('http://169.254.169.254/latest/meta-data')), 'blocked');
  assert.equal(await code(fetchCoursePage('http://[::1]/')), 'blocked');
  assert.equal(await code(fetchCoursePage('https://example.com:8443/')), 'blocked');
  assert.equal(await code(fetchCoursePage('file:///etc/passwd')), 'invalid_url');
  assert.equal(await code(fetchCoursePage('https://user:pw@example.com/')), 'invalid_url');
  // previewCourse не превращает запрет в «частичный» ответ: закрытый адрес — ошибка, а не название из адреса
  assert.equal(await code(previewCourse(`${base}/to-metadata`, [])), 'blocked');
});

test('не HTML или ошибка — название и площадка из адреса, без падения', async () => {
  const p = await previewCourse(`${base}/json`, [{ code: 'local', name: 'Локальная', websiteUrl: base }], { allowPrivate: true });
  assert.equal(p.partial, true);
  assert.equal(p.title, 'Json');
  assert.equal(p.platform?.code, 'local');
});
