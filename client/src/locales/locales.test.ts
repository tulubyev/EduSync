import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LANGS } from '@shared/languages';
import { parseQuickEvent } from '@shared/learningEvents';
import { MESSAGES } from './index';

// Форма словаря: ключи и типы значений (строка или функция с тем же числом аргументов)
function shape(v: unknown): unknown {
  if (typeof v === 'function') return `fn/${v.length}`;
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map((k) => [k, shape((v as any)[k])]));
  return typeof v;
}

test('словари всех языков повторяют русский', () => {
  const ref = shape(MESSAGES.ru);
  for (const lang of LANGS) assert.deepEqual(shape(MESSAGES[lang]), ref, lang);
});

test('строки словарей не пустые', () => {
  const walk = (v: unknown, path: string, lang: string) => {
    if (typeof v === 'string') assert.ok(v.trim(), `${lang}: ${path}`);
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`, lang);
  };
  for (const lang of LANGS) walk(MESSAGES[lang], '', lang);
});

test('пример в поле быстрого ввода разбирается на своём языке', () => {
  const today = { year: 2026, month: 10, day: 24 };
  for (const lang of LANGS) {
    const example = MESSAGES[lang].events.quick.placeholder.replace(/^[^:]*:\s*/, '');
    const d = parseQuickEvent(example, today);
    assert.equal(d.type, 'webinar', `${lang}: ${example}`);
    assert.deepEqual(d.date, { year: 2026, month: 10, day: 25 }, `${lang}: ${example}`);
    assert.ok(d.time && d.time.hour === 19, `${lang}: ${example}`);
    assert.equal(d.durationMinutes, 60, `${lang}: ${example}`);
    assert.ok(/python/i.test(d.title), `${lang}: ${d.title}`);
  }
});
