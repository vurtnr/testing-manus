import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildInspectionTaskFactItems,
  getInspectionRawDataCellState,
} from './inspection-task-readonly-panel.ts';

test('buildInspectionTaskFactItems returns the review/issue detail facts in stable order', () => {
  const items = buildInspectionTaskFactItems({
    contractNo: 'HT-20260421-04',
    clientName: '华东建工材料有限公司',
    sampleCount: 3,
    testItems: '抗压',
    testStandard: 'GB/T 50081-2019',
    assignedEquipmentName: '全自动压力试验机 01',
    experimenterName: '实验员A',
    sampleSpec: '150mm x 150mm x 150mm',
    engineeringPart: '地下室承台',
    sampleCode: 'SN-004',
    receivedAt: '2026-04-21T09:30:00+08:00',
  } as any);

  assert.deepEqual(items.map((item) => item.label), [
    '合同编号',
    '委托单位',
    '样品数量',
    '检测项目',
    '引用标准',
    '使用设备',
    '实验人员',
    '样品规格',
    '工程部位',
    '样品编号',
    '收样时间',
  ]);
  assert.equal(items[0]?.value, 'HT-20260421-04');
  assert.equal(items[6]?.value, '实验员A');
});

test('getInspectionRawDataCellState reflects flagged and resolved issue cells', () => {
  const flaggedPreview = {
    headers: ['组号', '占设计强度值(%)'],
    rows: [['1', '105.6']],
    issueCell: {
      rowIndex: 0,
      cellIndex: 1,
      originalValue: '105.6',
      currentValue: '105.6',
      resolved: false,
    },
  };

  assert.equal(getInspectionRawDataCellState(flaggedPreview as any, 0, 1), 'flagged');

  const resolvedPreview = {
    ...flaggedPreview,
    issueCell: {
      ...flaggedPreview.issueCell,
      currentValue: '104.2',
      resolved: true,
    },
  };

  assert.equal(getInspectionRawDataCellState(resolvedPreview as any, 0, 1), 'resolved');
  assert.equal(getInspectionRawDataCellState(resolvedPreview as any, 0, 0), 'plain');
});
