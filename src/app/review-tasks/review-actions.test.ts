import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canApproveReviewTask,
  getReviewApprovalRedirect,
} from './review-actions.ts';

test('canApproveReviewTask only allows approval for awaiting review tasks', () => {
  assert.equal(canApproveReviewTask({ taskStatus: 'awaiting_review' } as any), true);
  assert.equal(canApproveReviewTask({ taskStatus: 'awaiting_issue' } as any), false);
});

test('getReviewApprovalRedirect returns the home issue signal for tasks that reached sign-off', () => {
  assert.equal(
    getReviewApprovalRedirect({ taskStatus: 'awaiting_issue' } as any),
    '/?inspectionSignal=issue'
  );
  assert.equal(getReviewApprovalRedirect({ taskStatus: 'awaiting_review' } as any), null);
  assert.equal(getReviewApprovalRedirect({ taskStatus: 'issued' } as any), null);
});
