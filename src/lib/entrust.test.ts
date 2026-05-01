import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildEntrustOrderNo,
  buildInspectionTask,
  buildInspectionTaskDetail,
  createMockEntrustOcrResult,
  normalizeInspectionTaskStatus,
  type EntrustOrderRecord,
  normalizeEntrustReceivedAt,
} from './entrust.ts';

test('createMockEntrustOcrResult derives editable fields from uploaded image name', () => {
  const result = createMockEntrustOcrResult('混凝土-抗压-委托单.jpg', new Date('2026-04-20T09:30:00Z'));

  assert.equal(result.sourceName, '混凝土-抗压-委托单.jpg');
  assert.equal(result.fields.sampleName, '混凝土试块');
  assert.equal(result.fields.testItems, '抗压');
  assert.equal(result.fields.contractNo, 'HT-20260420-01');
  assert.equal(result.fields.testStandard, 'GB/T 50081-2019');
  assert.equal(result.fields.sourceImageName, '混凝土-抗压-委托单.jpg');
});

test('buildEntrustOrderNo creates stable daily sequence ids', () => {
  assert.equal(
    buildEntrustOrderNo(new Date('2026-04-20T09:30:00Z'), 7),
    'WT-20260420-007'
  );
});

test('normalizeEntrustReceivedAt accepts paper-form date strings', () => {
  assert.equal(
    normalizeEntrustReceivedAt('2024年06月03日', new Date('2026-04-20T09:30:00Z')),
    '2024-06-03T09:00:00+08:00'
  );
  assert.equal(
    normalizeEntrustReceivedAt('2026.4.3', new Date('2026-04-20T09:30:00Z')),
    '2026-04-03T09:00:00+08:00'
  );
});

test('normalizeInspectionTaskStatus maps legacy experiment_completed to awaiting_raw_data', () => {
  assert.equal(normalizeInspectionTaskStatus('experiment_completed'), 'awaiting_raw_data');
  assert.equal(normalizeInspectionTaskStatus('awaiting_review'), 'awaiting_review');
  assert.equal(normalizeInspectionTaskStatus('issued' as any), 'issued');
  assert.equal(normalizeInspectionTaskStatus(undefined), 'pending_claim');
});

test('buildInspectionTask maps entrust orders into my tasks items', () => {
  const baseRecord: EntrustOrderRecord = {
    id: 'entrust-1',
    orderNo: 'WT-20260420-001',
    paperEntrustNo: '35X',
    contractNo: 'HT-20260420-01',
    clientName: '华东建工材料有限公司',
    constructionUnit: '华东建工材料有限公司',
    supervisionUnit: '常州亿诺监理咨询有限公司',
    contractorUnit: '华东路桥工程有限公司',
    projectName: '混凝土样品检测',
    projectLocation: '项目现场',
    witnessName: '张工',
    witnessPhone: '13800138000',
    samplerName: '张工',
    samplerPhone: '13800138000',
    sampleName: '混凝土试块',
    sampleCount: 3,
    sampleSpec: '100mm x 100mm x 100mm',
    sampleBatch: '',
    engineeringPart: '门卫承台',
    manufacturer: '无锡某混凝土有限公司',
    representativeQuantity: '25 方',
    productionDate: '2026-04-20',
    testItems: '抗压',
    testStandard: 'GB/T 50081-2019',
    sampleCode: '4076-611',
    contactName: '张工',
    contactPhone: '13800138000',
    receivedAt: '2026-04-20T09:30',
    note: '',
    status: 'pending_acceptance',
    taskStatus: 'pending_claim',
    experimenterName: '',
    assignedEquipmentId: '',
    assignedEquipmentName: '',
    pickupDepartment: '材料所',
    rawDataImagePath: '',
    rawDataImageName: '',
    rawDataPreviewJson: null,
    aiReviewTraceJson: null,
    aiReviewSummary: '',
    aiReviewPassed: false,
    reviewComment: '',
    reviewedAt: '',
    ocrSourceName: '混凝土-抗压-委托单.jpg',
    sourceImageName: '混凝土-抗压-委托单.jpg',
    sourceImagePath: 'entrust/mock.jpg',
    createdAt: '2026-04-20T09:40:00Z',
    updatedAt: '2026-04-20T09:40:00Z',
  };
  const task = buildInspectionTask(baseRecord);

  assert.equal(task.status, 'pending');
  assert.equal(task.taskStatus, 'pending_claim');
  assert.equal(task.sampleCount, 3);
  assert.match(task.summary, /混凝土样品检测/);
  assert.equal(task.assignedEquipmentId, '');
  assert.equal(task.assignedEquipmentName, '');
  assert.equal(task.pickupDepartment, '材料所');

  const inExperimentTask = buildInspectionTask({
    ...baseRecord,
    id: 'entrust-1-running',
    taskStatus: 'in_experiment',
    experimenterName: '实验员A',
  });

  assert.equal(inExperimentTask.status, 'processing');
  assert.equal(inExperimentTask.dueLabel, '实验进行中');
});

test('buildInspectionTask maps completed tasks and keeps equipment snapshot', () => {
  const task = buildInspectionTask({
    id: 'entrust-2',
    orderNo: 'WT-20260420-002',
    paperEntrustNo: '36X',
    contractNo: 'HT-20260420-02',
    clientName: '华东建工材料有限公司',
    constructionUnit: '华东建工材料有限公司',
    supervisionUnit: '常州亿诺监理咨询有限公司',
    contractorUnit: '华东路桥工程有限公司',
    projectName: '水泥胶砂样品检测',
    projectLocation: '项目现场',
    witnessName: '张工',
    witnessPhone: '13800138000',
    samplerName: '张工',
    samplerPhone: '13800138000',
    sampleName: '水泥胶砂',
    sampleCount: 1,
    sampleSpec: '40mm x 40mm x 160mm',
    sampleBatch: '',
    engineeringPart: '主体结构',
    manufacturer: '无锡某水泥有限公司',
    representativeQuantity: '1 组',
    productionDate: '2026-04-20',
    testItems: '抗压、抗折',
    testStandard: 'GB/T 17671-2021',
    sampleCode: 'SJ-001',
    contactName: '张工',
    contactPhone: '13800138000',
    receivedAt: '2026-04-20T09:30:00+08:00',
    note: '',
    status: 'pending_acceptance',
    taskStatus: 'awaiting_raw_data',
    experimenterName: '实验员A',
    assignedEquipmentId: 'equipment-1',
    assignedEquipmentName: '全自动压力试验机 01',
    pickupDepartment: '材料所',
    rawDataImagePath: '',
    rawDataImageName: '',
    rawDataPreviewJson: null,
    aiReviewTraceJson: null,
    aiReviewSummary: '',
    aiReviewPassed: false,
    reviewComment: '',
    reviewedAt: '',
    ocrSourceName: '水泥胶砂-委托单.jpg',
    sourceImageName: '水泥胶砂-委托单.jpg',
    sourceImagePath: 'entrust/mock-2.jpg',
    createdAt: '2026-04-20T09:40:00Z',
    updatedAt: '2026-04-20T10:30:00Z',
  });

  assert.equal(task.status, 'completed');
  assert.equal(task.taskStatus, 'awaiting_raw_data');
  assert.equal(task.dueLabel, '待录入原始数据');
  assert.equal(task.assignedEquipmentName, '全自动压力试验机 01');
});

test('buildInspectionTask maps raw-data and review workflow states', () => {
  const awaitingRawDataRecord: EntrustOrderRecord = {
    id: 'entrust-raw',
    orderNo: 'WT-20260420-010',
    paperEntrustNo: '',
    contractNo: 'HT-20260420-10',
    clientName: '华东建工材料有限公司',
    constructionUnit: '',
    supervisionUnit: '',
    contractorUnit: '',
    projectName: '混凝土样品检测',
    projectLocation: '项目现场',
    witnessName: '',
    witnessPhone: '',
    samplerName: '',
    samplerPhone: '',
    sampleName: '混凝土试块',
    sampleCount: 3,
    sampleSpec: '150mm x 150mm x 150mm',
    sampleBatch: '',
    engineeringPart: '',
    manufacturer: '',
    representativeQuantity: '',
    productionDate: '',
    testItems: '抗压',
    testStandard: 'GB/T 50081-2019',
    sampleCode: '',
    contactName: '张工',
    contactPhone: '13800138000',
    receivedAt: '2026-04-20T09:30:00+08:00',
    note: '',
    status: 'pending_acceptance',
    taskStatus: 'awaiting_raw_data',
    experimenterName: '实验员A',
    assignedEquipmentId: 'equipment-1',
    assignedEquipmentName: '全自动压力试验机 01',
    pickupDepartment: '材料所',
    rawDataImagePath: '',
    rawDataImageName: '',
    rawDataPreviewJson: null,
    aiReviewTraceJson: null,
    aiReviewSummary: '',
    aiReviewPassed: false,
    reviewComment: '',
    reviewedAt: '',
    ocrSourceName: 'mock.jpg',
    sourceImageName: 'mock.jpg',
    sourceImagePath: 'entrust/mock.jpg',
    createdAt: '2026-04-20T09:40:00Z',
    updatedAt: '2026-04-20T10:30:00Z',
  };
  const awaitingRawData = buildInspectionTask(awaitingRawDataRecord);

  assert.equal(awaitingRawData.taskStatus, 'awaiting_raw_data');
  assert.equal(awaitingRawData.status, 'completed');
  assert.equal(awaitingRawData.dueLabel, '待录入原始数据');

  const awaitingReview = buildInspectionTask({
    ...awaitingRawDataRecord,
    id: 'entrust-review',
    taskStatus: 'awaiting_review',
  });
  assert.equal(awaitingReview.dueLabel, '待审核');

  const awaitingIssue = buildInspectionTask({
    ...awaitingRawDataRecord,
    id: 'entrust-issue',
    taskStatus: 'awaiting_issue',
  });
  assert.equal(awaitingIssue.dueLabel, '待签发');

  const issued = buildInspectionTask({
    ...awaitingRawDataRecord,
    id: 'entrust-issued',
    taskStatus: 'issued' as any,
  });
  assert.equal(issued.dueLabel, '已签发');
});

test('buildInspectionTask ignores stored raw-data metadata when deriving list display', () => {
  const task = buildInspectionTask({
    id: 'entrust-meta',
    orderNo: 'WT-20260420-011',
    paperEntrustNo: '',
    contractNo: 'HT-20260420-11',
    clientName: '华东建工材料有限公司',
    constructionUnit: '',
    supervisionUnit: '',
    contractorUnit: '',
    projectName: '混凝土样品检测',
    projectLocation: '',
    witnessName: '',
    witnessPhone: '',
    samplerName: '',
    samplerPhone: '',
    sampleName: '混凝土试块',
    sampleCount: 3,
    sampleSpec: '150 x 150 x 150',
    sampleBatch: '',
    engineeringPart: '',
    manufacturer: '',
    representativeQuantity: '',
    productionDate: '',
    testItems: '抗压',
    testStandard: 'GB/T 50081-2019',
    sampleCode: '',
    contactName: '张工',
    contactPhone: '13800138000',
    receivedAt: '2026-04-20T09:30:00+08:00',
    note: '',
    status: 'pending_acceptance',
    taskStatus: 'awaiting_review',
    experimenterName: '实验员A',
    assignedEquipmentId: 'equipment-1',
    assignedEquipmentName: '全自动压力试验机 01',
    pickupDepartment: '材料所',
    rawDataImagePath: 'inspection/raw-1.png',
    rawDataImageName: 'raw-1.png',
    rawDataPreviewJson: { groups: 3 },
    aiReviewTraceJson: [{ step: 'ocr' }],
    aiReviewSummary: '可进入下一步签发',
    aiReviewPassed: true,
    reviewComment: '',
    reviewedAt: '',
    ocrSourceName: 'mock.jpg',
    sourceImageName: 'mock.jpg',
    sourceImagePath: 'entrust/mock.jpg',
    createdAt: '2026-04-20T09:40:00Z',
    updatedAt: '2026-04-20T10:30:00Z',
  });

  assert.equal(task.orderNo, 'WT-20260420-011');
  assert.equal(task.dueLabel, '待审核');
});

test('buildInspectionTaskDetail includes raw-data and review metadata for selected task views', () => {
  const detail = buildInspectionTaskDetail({
    id: 'entrust-detail',
    orderNo: 'WT-20260420-012',
    paperEntrustNo: '',
    contractNo: 'HT-20260420-12',
    clientName: '华东建工材料有限公司',
    constructionUnit: '华东建工材料有限公司',
    supervisionUnit: '',
    contractorUnit: '',
    projectName: '混凝土样品检测',
    projectLocation: '项目现场',
    witnessName: '',
    witnessPhone: '',
    samplerName: '',
    samplerPhone: '',
    sampleName: '混凝土试块',
    sampleCount: 3,
    sampleSpec: '150 x 150 x 150',
    sampleBatch: 'B-001',
    engineeringPart: '地下室',
    manufacturer: '无锡某混凝土有限公司',
    representativeQuantity: '1组',
    productionDate: '2026-04-20',
    testItems: '抗压',
    testStandard: 'GB/T 50081-2019',
    sampleCode: 'SN-001',
    contactName: '张工',
    contactPhone: '13800138000',
    receivedAt: '2026-04-20T09:30:00+08:00',
    note: '样品完整',
    status: 'pending_acceptance',
    taskStatus: 'awaiting_issue',
    experimenterName: '实验员A',
    assignedEquipmentId: 'equipment-1',
    assignedEquipmentName: '全自动压力试验机 01',
    pickupDepartment: '材料所',
    rawDataImagePath: 'inspection/raw-1.png',
    rawDataImageName: 'raw-1.png',
    rawDataPreviewJson: {
      headers: ['编号', '破坏荷载(kN)'],
      rows: [['1', '726.8']],
      issueCell: {
        rowIndex: 0,
        cellIndex: 1,
        originalValue: '726.8',
        currentValue: '726.8',
        resolved: false,
      },
    },
    aiReviewTraceJson: [{ id: 'compare', label: 'AI', detail: '可进入下一步签发。' }],
    aiReviewSummary: '可进入下一步签发。',
    aiReviewPassed: true,
    reviewComment: '人工审核通过',
    reviewedAt: '2026-04-20T12:00:00+08:00',
    ocrSourceName: 'mock.jpg',
    sourceImageName: 'mock.jpg',
    sourceImagePath: 'entrust/mock.jpg',
    createdAt: '2026-04-20T09:40:00Z',
    updatedAt: '2026-04-20T10:30:00Z',
  });

  assert.equal(detail.taskStatus, 'awaiting_issue');
  assert.equal(detail.rawDataImageName, 'raw-1.png');
  assert.deepEqual(detail.rawDataPreview?.headers, ['编号', '破坏荷载(kN)']);
  assert.equal(detail.rawDataPreview?.issueCell?.cellIndex, 1);
  assert.equal(detail.rawDataPreview?.issueCell?.resolved, false);
  assert.equal(detail.reviewComment, '人工审核通过');
  assert.equal(detail.aiReviewTrace?.[0]?.id, 'compare');
  assert.equal(detail.assignedEquipmentName, '全自动压力试验机 01');
});
