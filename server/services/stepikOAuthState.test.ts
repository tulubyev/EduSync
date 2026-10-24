import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStepikState, verifyStepikState } from './stepikOAuthState.ts';

const secret = 'test-secret';
const user = '6f1c2a0e-1111-4222-8333-944455556666';

test('state принимается для того же пользователя', () => {
  const state = createStepikState(user, secret);
  assert.ok(verifyStepikState(state, user, secret));
});

test('state другого пользователя отклоняется', () => {
  const state = createStepikState(user, secret);
  assert.ok(!verifyStepikState(state, 'other-user', secret));
});

test('подделанная подпись и чужой секрет отклоняются', () => {
  const state = createStepikState(user, secret);
  assert.ok(!verifyStepikState(state.slice(0, -2) + 'xx', user, secret));
  assert.ok(!verifyStepikState(state, user, 'another-secret'));
  assert.ok(!verifyStepikState('garbage', user, secret));
});

test('просроченный state отклоняется', () => {
  const issued = Date.now() - 16 * 60 * 1000;
  const state = createStepikState(user, secret, issued);
  assert.ok(!verifyStepikState(state, user, secret));
});
