import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getDefaultWorkbenchTab,
  groupInspectionTasksForWorkbench,
} from './workbench-groups.ts';

test('groupInspectionTasksForWorkbench buckets tasks by next workflow action', () => {
  const grouped = groupInspectionTasksForWorkbench([
    { id: '0', taskStatus: 'pending_claim', orderNo: 'WT-0' } as any,
    { id: '0.5', taskStatus: 'in_experiment', orderNo: 'WT-0.5' } as any,
    { id: '1', taskStatus: 'awaiting_raw_data', orderNo: 'WT-1' } as any,
    { id: '2', taskStatus: 'awaiting_review', orderNo: 'WT-2' } as any,
    { id: '3', taskStatus: 'awaiting_issue', orderNo: 'WT-3' } as any,
    { id: '4', taskStatus: 'issued', orderNo: 'WT-4' } as any,
  ]);

  assert.deepEqual(grouped.pendingClaim.map((task) => task.orderNo), ['WT-0']);
  assert.deepEqual(grouped.inExperiment.map((task) => task.orderNo), ['WT-0.5']);
  assert.deepEqual(grouped.awaitingRawData.map((task) => task.orderNo), ['WT-1']);
  assert.deepEqual(grouped.awaitingReview.map((task) => task.orderNo), ['WT-2']);
  assert.deepEqual(grouped.awaitingIssue.map((task) => task.orderNo), ['WT-3']);
});

test('getDefaultWorkbenchTab falls back to pending-claim when raw-data buckets are empty', () => {
  const grouped = groupInspectionTasksForWorkbench([
    { id: '0', taskStatus: 'pending_claim', orderNo: 'WT-0' } as any,
  ]);

  assert.equal(getDefaultWorkbenchTab(grouped), 'pending_claim');
});

test('getDefaultWorkbenchTab keeps raw-data as the preferred landing tab when available', () => {
  const grouped = groupInspectionTasksForWorkbench([
    { id: '0', taskStatus: 'pending_claim', orderNo: 'WT-0' } as any,
    { id: '1', taskStatus: 'awaiting_raw_data', orderNo: 'WT-1' } as any,
  ]);

  assert.equal(getDefaultWorkbenchTab(grouped), 'awaiting_raw_data');
});
