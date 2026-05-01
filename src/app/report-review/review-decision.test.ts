import test from 'node:test';
import assert from 'node:assert/strict';

import { canSubmitDecision } from './review-decision.ts';

test('approve is blocked when high-risk issues remain', () => {
  assert.equal(
    canSubmitDecision('approve', { high: 2, medium: 1, low: 0 }, ''),
    false
  );
  assert.equal(
    canSubmitDecision('approve', { high: 0, medium: 1, low: 0 }, ''),
    true
  );
});

test('revision and reject require reviewer comment', () => {
  assert.equal(
    canSubmitDecision('revise', { high: 0, medium: 2, low: 1 }, ''),
    false
  );
  assert.equal(
    canSubmitDecision('revise', { high: 0, medium: 2, low: 1 }, '请补充标准编号'),
    true
  );
  assert.equal(
    canSubmitDecision('reject', { high: 1, medium: 0, low: 0 }, ''),
    false
  );
  assert.equal(
    canSubmitDecision('reject', { high: 1, medium: 0, low: 0 }, '关键字段冲突'),
    true
  );
});
