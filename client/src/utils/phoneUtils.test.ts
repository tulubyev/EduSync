import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidInternationalPhone, normalizePhone } from './phoneUtils.ts';

test('российские номера без плюса приводятся к +7', () => {
  assert.equal(normalizePhone('8 (900) 123-45-67'), '+79001234567');
  assert.equal(normalizePhone('79001234567'), '+79001234567');
});

test('международные номера сохраняют код страны', () => {
  assert.equal(normalizePhone('+44 20 7946 0958'), '+442079460958');
  assert.equal(normalizePhone('+1 (415) 555-0100'), '+14155550100');
  assert.equal(normalizePhone('+7 900 123 45 67'), '+79001234567');
});

test('пустой номер остаётся пустым', () => {
  assert.equal(normalizePhone(''), '');
  assert.equal(normalizePhone('   '), '');
});

test('проверка формата E.164', () => {
  assert.ok(isValidInternationalPhone('+79001234567'));
  assert.ok(isValidInternationalPhone('+442079460958'));
  assert.ok(!isValidInternationalPhone('+0123456789'));
  assert.ok(!isValidInternationalPhone('+12345'));
  assert.ok(!isValidInternationalPhone('79001234567'));
});
