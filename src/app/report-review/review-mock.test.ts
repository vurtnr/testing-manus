import test from 'node:test';
import assert from 'node:assert/strict';

import { buildIssueSummary, MOCK_REVIEW_ISSUES } from './review-mock.ts';

test('buildIssueSummary aggregates issue counts by severity', () => {
  const summary = buildIssueSummary(MOCK_REVIEW_ISSUES);

  assert.deepEqual(summary, {
    high: 2,
    medium: 2,
    low: 2,
  });
});
