import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canConfirmIssueTask,
  getDefaultIssueTaskId,
  getIssueDocumentZoom,
  getIssuedQueue,
  getIssueQueue,
  isIssuedIssueTask,
  shouldShowIssuedDownload,
} from './issue-tasks-helpers.ts';

test('getIssueQueue keeps only awaiting issue tasks', () => {
  const queue = getIssueQueue([
    { id: 'a', orderNo: 'WT-1', taskStatus: 'awaiting_review' } as any,
    { id: 'b', orderNo: 'WT-2', taskStatus: 'awaiting_issue' } as any,
    { id: 'c', orderNo: 'WT-3', taskStatus: 'issued' } as any,
  ]);

  assert.deepEqual(queue.map((task) => task.orderNo), ['WT-2']);
});

test('getIssuedQueue keeps only issued tasks for signed-record downloads', () => {
  const queue = getIssuedQueue([
    { id: 'a', orderNo: 'WT-1', taskStatus: 'awaiting_issue' } as any,
    { id: 'b', orderNo: 'WT-2', taskStatus: 'issued' } as any,
    { id: 'c', orderNo: 'WT-3', taskStatus: 'issued' } as any,
  ]);

  assert.deepEqual(queue.map((task) => task.orderNo), ['WT-2', 'WT-3']);
});

test('getDefaultIssueTaskId keeps current selection when still visible and falls back to first queue item', () => {
  const queue = getIssueQueue([
    { id: 'b', orderNo: 'WT-2', taskStatus: 'awaiting_issue' } as any,
    { id: 'd', orderNo: 'WT-4', taskStatus: 'awaiting_issue' } as any,
  ]);

  assert.equal(getDefaultIssueTaskId(queue, 'd'), 'd');
  assert.equal(getDefaultIssueTaskId(queue, 'missing'), 'b');
  assert.equal(getDefaultIssueTaskId([], 'missing'), '');
});

test('canConfirmIssueTask requires an awaiting issue task and a passing AI review result', () => {
  assert.equal(
    canConfirmIssueTask(
      { taskStatus: 'awaiting_issue' } as any,
      { passed: true, trace: [], summary: '' }
    ),
    true
  );
  assert.equal(
    canConfirmIssueTask(
      { taskStatus: 'awaiting_issue' } as any,
      { passed: false, trace: [], summary: '' }
    ),
    false
  );
  assert.equal(
    canConfirmIssueTask(
      { taskStatus: 'issued' } as any,
      { passed: true, trace: [], summary: '' }
    ),
    false
  );
  assert.equal(canConfirmIssueTask(null, null), false);
});

test('shouldShowIssuedDownload requires an issued task with a document url', () => {
  assert.equal(
    shouldShowIssuedDownload({
      taskStatus: 'issued',
      issuedDocumentUrl: '/temp.docx',
    } as any),
    true
  );
  assert.equal(
    shouldShowIssuedDownload({
      taskStatus: 'issued',
      issuedDocumentUrl: '',
    } as any),
    false
  );
  assert.equal(
    shouldShowIssuedDownload({
      taskStatus: 'awaiting_issue',
      issuedDocumentUrl: '/temp.docx',
    } as any),
    false
  );
});

test('isIssuedIssueTask only returns true for issued records', () => {
  assert.equal(isIssuedIssueTask({ taskStatus: 'issued' } as any), true);
  assert.equal(isIssuedIssueTask({ taskStatus: 'awaiting_issue' } as any), false);
  assert.equal(isIssuedIssueTask(null), false);
});

test('getIssueDocumentZoom scales oversized pages down to fit the modal viewport', () => {
  assert.equal(getIssueDocumentZoom(1200, 800), 0.64);
  assert.equal(getIssueDocumentZoom(700, 800), 1);
  assert.equal(getIssueDocumentZoom(0, 800), 1);
});
