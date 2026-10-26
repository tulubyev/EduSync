/** Запись ZIP для выгрузки данных (npm test) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inflateRawSync } from 'zlib';
import { buildZip, crc32 } from './zip';

/** Чтение архива по центральному каталогу — проверка того, что записал buildZip */
function readZip(zip: Buffer): Map<string, Buffer> {
  const end = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  assert.ok(end >= 0, 'нет конца центрального каталога');
  const count = zip.readUInt16LE(end + 10);
  let p = zip.readUInt32LE(end + 16);
  const out = new Map<string, Buffer>();
  for (let i = 0; i < count; i++) {
    assert.equal(zip.readUInt32LE(p), 0x02014b50);
    const method = zip.readUInt16LE(p + 10);
    const crc = zip.readUInt32LE(p + 16);
    const size = zip.readUInt32LE(p + 20);
    const nameLen = zip.readUInt16LE(p + 28);
    const local = zip.readUInt32LE(p + 42);
    const name = zip.subarray(p + 46, p + 46 + nameLen).toString('utf8');
    const dataStart = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
    const body = zip.subarray(dataStart, dataStart + size);
    const raw = method === 8 ? inflateRawSync(body) : Buffer.from(body);
    assert.equal(crc32(raw), crc, name);
    out.set(name, raw);
    p += 46 + nameLen;
  }
  return out;
}

test('crc32 совпадает с эталоном', () => {
  assert.equal(crc32(Buffer.from('123456789')), 0xcbf43926);
  assert.equal(crc32(Buffer.alloc(0)), 0);
});

test('архив читается: сжатые и несжатые файлы, имена в UTF-8', () => {
  const text = 'Привет, мир! '.repeat(200);
  const random = Buffer.from(Array.from({ length: 300 }, (_, i) => (i * 7919) % 251));
  const zip = buildZip([
    { name: 'profile.json', data: '{"a":1}' },
    { name: 'заметки/урок 1.txt', data: text },
    { name: 'image.bin', data: random },
    { name: 'empty.txt', data: '' },
  ]);
  const files = readZip(zip);
  assert.deepEqual([...files.keys()], ['profile.json', 'заметки/урок 1.txt', 'image.bin', 'empty.txt']);
  assert.equal(files.get('заметки/урок 1.txt')!.toString('utf8'), text);
  assert.deepEqual(files.get('image.bin'), random);
  assert.equal(files.get('empty.txt')!.length, 0);
  assert.ok(zip.length < text.length, 'текст сжат');
});
