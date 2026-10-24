import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validationRules } from './validationRules.ts';

test('телефон: международный формат E.164', () => {
  for (const ok of ['+79001234567', '+442079460958', '+14155550100']) {
    assert.ok(validationRules.phone.safeParse(ok).success, ok);
  }
  for (const bad of ['89001234567', '+0123456789', '+12345', '+7 900 123 45 67']) {
    assert.ok(!validationRules.phone.safeParse(bad).success, bad);
  }
});

test('страна: код ISO 3166-1 alpha-2', () => {
  assert.ok(validationRules.country.safeParse('RU').success);
  assert.ok(validationRules.country.safeParse('GB').success);
  assert.ok(!validationRules.country.safeParse('gb').success);
  assert.ok(!validationRules.country.safeParse('RUS').success);
});
