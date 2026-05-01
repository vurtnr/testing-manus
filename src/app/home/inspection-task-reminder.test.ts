import test from 'node:test';
import assert from 'node:assert/strict';

import { getInspectionTaskReminder } from './inspection-task-reminder.ts';

test('getInspectionTaskReminder counts only pending-claim and awaiting-raw-data tasks and uses latest created task status', () => {
  const result = getInspectionTaskReminder([
    {
      id: 'old-pending',
      orderNo: 'WT-001',
      taskStatus: 'pending_claim',
      createdAt: '2026-04-20T08:00:00Z',
    } as any,
    {
      id: 'new-raw',
      orderNo: 'WT-002',
      taskStatus: 'awaiting_raw_data',
      createdAt: '2026-04-20T10:00:00Z',
    } as any,
    {
      id: 'reviewed',
      orderNo: 'WT-003',
      taskStatus: 'awaiting_review',
      createdAt: '2026-04-20T11:00:00Z',
    } as any,
    {
      id: 'issue',
      orderNo: 'WT-004',
      taskStatus: 'awaiting_issue',
      createdAt: '2026-04-20T12:00:00Z',
    } as any,
    {
      id: 'issued',
      orderNo: 'WT-005',
      taskStatus: 'issued',
      createdAt: '2026-04-20T13:00:00Z',
    } as any,
  ]);

  assert.equal(result.inspectionBadge.visible, true);
  assert.equal(result.inspectionBadge.count, 4);
  assert.equal(result.inspectionBadge.statusLabel, '待签发');
  assert.equal(result.inspectionBadge.latestTask?.orderNo, 'WT-004');
  assert.equal(result.taskBadge.visible, true);
  assert.equal(result.taskBadge.count, 2);
  assert.equal(result.taskBadge.statusLabel, '待录入原始数据');
  assert.equal(result.reviewBadge.visible, true);
  assert.equal(result.reviewBadge.count, 1);
  assert.equal(result.reviewBadge.statusLabel, '待审核');
  assert.equal(result.issueBadge.visible, true);
  assert.equal(result.issueBadge.count, 1);
  assert.equal(result.issueBadge.statusLabel, '待签发');
  assert.equal(result.issueBadge.latestTask?.orderNo, 'WT-004');
});

test('getInspectionTaskReminder surfaces a dedicated review badge for awaiting review tasks', () => {
  const result = getInspectionTaskReminder([
    {
      id: 'reviewed',
      orderNo: 'WT-010',
      taskStatus: 'awaiting_review',
      createdAt: '2026-04-20T10:00:00Z',
    } as any,
  ]);

  assert.equal(result.inspectionBadge.visible, true);
  assert.equal(result.inspectionBadge.count, 1);
  assert.equal(result.inspectionBadge.statusLabel, '待审核');
  assert.equal(result.taskBadge.visible, false);
  assert.equal(result.reviewBadge.visible, true);
  assert.equal(result.reviewBadge.statusLabel, '待审核');
  assert.equal(result.reviewBadge.latestTask?.orderNo, 'WT-010');
  assert.equal(result.issueBadge.visible, false);
});

test('getInspectionTaskReminder hides issued tasks from all active reminder badges', () => {
  const result = getInspectionTaskReminder([
    {
      id: 'issued',
      orderNo: 'WT-099',
      taskStatus: 'issued',
      createdAt: '2026-04-20T10:00:00Z',
    } as any,
  ]);

  assert.equal(result.inspectionBadge.visible, false);
  assert.equal(result.taskBadge.visible, false);
  assert.equal(result.reviewBadge.visible, false);
  assert.equal(result.issueBadge.visible, false);
});
