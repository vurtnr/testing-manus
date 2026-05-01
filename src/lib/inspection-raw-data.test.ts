import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canSubmitInspectionRawData,
  markInspectionRawDataIssue,
  normalizeInspectionRawDataPreview,
  updateInspectionRawDataCell,
} from './inspection-raw-data.ts';

function createPreview() {
  return {
    headers: [
      '组号',
      '试件长(mm)',
      '试件宽(mm)',
      '破坏荷载(kN)',
      '抗压强度(MPa)',
    ],
    rows: [
      ['1', '150', '150', '726.8', '32.3'],
      ['2', '150', '150', '682.1', '30.3'],
    ],
  };
}

test('normalizeInspectionRawDataPreview accepts both direct and legacy nested preview shapes', () => {
  const direct = normalizeInspectionRawDataPreview(createPreview());
  assert.deepEqual(direct?.headers, createPreview().headers);

  const nested = normalizeInspectionRawDataPreview({
    preview: createPreview(),
  });
  assert.deepEqual(nested?.rows, createPreview().rows);

  const serialized = normalizeInspectionRawDataPreview(JSON.stringify(createPreview()));
  assert.deepEqual(serialized?.headers, createPreview().headers);
});

test('markInspectionRawDataIssue picks a deterministic editable cell and marks it unresolved', () => {
  const flagged = markInspectionRawDataIssue(createPreview(), () => 0);

  assert.deepEqual(flagged.issueCell, {
    rowIndex: 0,
    cellIndex: 1,
    originalValue: '150',
    currentValue: '150',
    resolved: false,
  });
});

test('updateInspectionRawDataCell resolves the flagged issue after the cell value changes', () => {
  const flagged = markInspectionRawDataIssue(createPreview(), () => 0);
  const updated = updateInspectionRawDataCell(flagged, 0, 1, '151');

  assert.equal(updated.rows[0]?.[1], '151');
  assert.equal(updated.issueCell?.currentValue, '151');
  assert.equal(updated.issueCell?.resolved, true);
});

test('canSubmitInspectionRawData requires completed AI review and a resolved flagged cell', () => {
  const flagged = markInspectionRawDataIssue(createPreview(), () => 0);
  assert.equal(canSubmitInspectionRawData(flagged, false), false);
  assert.equal(canSubmitInspectionRawData(flagged, true), false);

  const resolved = updateInspectionRawDataCell(flagged, 0, 1, '151');
  assert.equal(canSubmitInspectionRawData(resolved, true), true);
});
