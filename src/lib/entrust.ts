import type { InspectionAiReviewTraceItem } from './inspection-ai-review';
import {
  normalizeInspectionRawDataPreview,
  type InspectionRawDataTable,
} from './inspection-raw-data';

export type InspectionTaskStatus =
  | 'pending_claim'
  | 'in_experiment'
  | 'awaiting_raw_data'
  | 'awaiting_review'
  | 'awaiting_issue'
  | 'issued';

export function normalizeInspectionTaskStatus(
  status: InspectionTaskStatus | 'experiment_completed' | null | undefined
): InspectionTaskStatus {
  if (status === 'experiment_completed') return 'awaiting_raw_data';
  if (
    status === 'pending_claim' ||
    status === 'in_experiment' ||
    status === 'awaiting_raw_data' ||
    status === 'awaiting_review' ||
    status === 'awaiting_issue' ||
    status === 'issued'
  ) {
    return status;
  }
  return 'pending_claim';
}

export interface EntrustFormData {
  orderNo: string;
  paperEntrustNo: string;
  contractNo: string;
  clientName: string;
  constructionUnit: string;
  supervisionUnit: string;
  contractorUnit: string;
  projectName: string;
  projectLocation: string;
  witnessName: string;
  witnessPhone: string;
  samplerName: string;
  samplerPhone: string;
  sampleName: string;
  sampleCount: number;
  sampleSpec: string;
  sampleBatch: string;
  engineeringPart: string;
  manufacturer: string;
  representativeQuantity: string;
  productionDate: string;
  testItems: string;
  testStandard: string;
  sampleCode: string;
  contactName: string;
  contactPhone: string;
  receivedAt: string;
  note: string;
  status: 'pending_acceptance' | 'queued';
  taskStatus: InspectionTaskStatus;
  experimenterName: string;
  assignedEquipmentId: string;
  assignedEquipmentName: string;
  pickupDepartment: string;
  ocrSourceName: string;
  sourceImageName: string;
  sourceImagePath: string;
}

export interface EntrustOcrResult {
  sourceName: string;
  confidence: number;
  rawText?: string;
  fields: Omit<
    EntrustFormData,
    | 'status'
    | 'orderNo'
    | 'taskStatus'
    | 'experimenterName'
    | 'assignedEquipmentId'
    | 'assignedEquipmentName'
    | 'pickupDepartment'
    | 'rawDataImagePath'
    | 'rawDataImageName'
    | 'rawDataPreviewJson'
    | 'aiReviewTraceJson'
    | 'aiReviewSummary'
    | 'aiReviewPassed'
    | 'reviewComment'
    | 'reviewedAt'
  >;
}

export interface EntrustOrderRecord extends EntrustFormData {
  id: string;
  rawDataImagePath: string;
  rawDataImageName: string;
  rawDataPreviewJson: Record<string, unknown> | null;
  aiReviewTraceJson: Array<Record<string, unknown>> | null;
  aiReviewSummary: string;
  aiReviewPassed: boolean;
  reviewComment: string;
  reviewedAt: string;
  issuedDocumentName: string;
  issuedDocumentUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface InspectionTaskItem {
  id: string;
  orderNo: string;
  title: string;
  status: 'pending' | 'processing' | 'completed';
  taskStatus: InspectionTaskStatus;
  experimenterName: string;
  assigneeLabel: string;
  dueLabel: string;
  summary: string;
  createdAt: string;
  sampleName: string;
  sampleCount: number;
  testItems: string;
  testStandard: string;
  assignedEquipmentId: string;
  assignedEquipmentName: string;
  pickupDepartment: string;
  aiReviewSummary: string;
  aiReviewPassed: boolean;
  issuedDocumentName?: string;
  issuedDocumentUrl?: string;
}

export interface InspectionTaskDetail extends InspectionTaskItem {
  paperEntrustNo: string;
  contractNo: string;
  clientName: string;
  constructionUnit: string;
  supervisionUnit: string;
  contractorUnit: string;
  projectName: string;
  projectLocation: string;
  witnessName: string;
  witnessPhone: string;
  samplerName: string;
  samplerPhone: string;
  sampleSpec: string;
  sampleBatch: string;
  engineeringPart: string;
  manufacturer: string;
  representativeQuantity: string;
  productionDate: string;
  sampleCode: string;
  contactName: string;
  contactPhone: string;
  receivedAt: string;
  note: string;
  rawDataImagePath: string;
  rawDataImageName: string;
  rawDataPreview: InspectionRawDataTable | null;
  aiReviewTrace: InspectionAiReviewTraceItem[] | null;
  reviewComment: string;
  reviewedAt: string;
  issuedDocumentName: string;
  issuedDocumentUrl: string;
}

function titleCaseToken(token: string): string {
  if (!token) return token;
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

function formatDateStamp(value: Date): string {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}${month}${day}`;
}

function deriveProjectName(filename: string): string {
  const stem = filename.replace(/\.[^.]+$/, '');
  const tokens = stem.split(/[-_\s]+/).filter(Boolean);
  if (tokens.length === 0) return '新建检测项目';
  return `${titleCaseToken(tokens[0])} 样品检测`;
}

function deriveSampleName(filename: string): string {
  if (/混凝土|concrete/i.test(filename)) return '混凝土试块';
  if (/钢筋|rebar|steel/i.test(filename)) return '钢筋拉伸样品';
  if (/砂浆|mortar/i.test(filename)) return '砂浆抗压样品';
  return '送检材料样品';
}

function deriveTestItems(filename: string): string {
  if (/抗压|pressure/i.test(filename)) return '抗压';
  if (/拉伸|tension/i.test(filename)) return '屈服强度、抗拉强度';
  return '外观检查、尺寸复核、基础性能检测';
}

export function createMockEntrustOcrResult(filename: string, now: Date = new Date()): EntrustOcrResult {
  const receivedAt = now.toISOString().slice(0, 16);
  const projectName = deriveProjectName(filename);

  return {
    sourceName: filename,
    confidence: 0.93,
    rawText: '',
    fields: {
      paperEntrustNo: '',
      contractNo: `HT-${formatDateStamp(now)}-01`,
      clientName: '华东建工材料有限公司',
      constructionUnit: '华东建工材料有限公司',
      supervisionUnit: '常州亿诺监理咨询有限公司',
      contractorUnit: '华东路桥工程有限公司',
      projectName,
      projectLocation: '项目现场',
      witnessName: '张工',
      witnessPhone: '13800138000',
      samplerName: '张工',
      samplerPhone: '13800138000',
      sampleName: deriveSampleName(filename),
      sampleCount: 1,
      sampleSpec: '100mm x 100mm x 100mm',
      sampleBatch: '',
      engineeringPart: '门卫承台',
      manufacturer: '无锡某混凝土有限公司',
      representativeQuantity: '25 方',
      productionDate: now.toISOString().slice(0, 10),
      testItems: deriveTestItems(filename),
      testStandard: 'GB/T 50081-2019',
      sampleCode: '',
      contactName: '张工',
      contactPhone: '13800138000',
      receivedAt,
      note: '',
      ocrSourceName: filename,
      sourceImageName: filename,
      sourceImagePath: '',
    },
  };
}

export function buildEntrustOrderNo(now: Date = new Date(), sequence: number = 1): string {
  return `WT-${formatDateStamp(now)}-${`${sequence}`.padStart(3, '0')}`;
}

export function normalizeEntrustReceivedAt(value: string, fallback: Date = new Date()): string {
  const trimmed = value.trim();
  if (!trimmed) return fallback.toISOString();

  const normalized = trimmed
    .replace(/年|\/|\./g, '-')
    .replace(/月/g, '-')
    .replace(/日/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const dateOnlyMatch = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T09:00:00+08:00`;
  }

  const dateTimeMatch = normalized.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?$/
  );
  if (dateTimeMatch) {
    const [, year, month, day, hour, minute = '00', second = '00'] = dateTimeMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}+08:00`;
  }

  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return fallback.toISOString();
}

export function buildInspectionTask(record: EntrustOrderRecord): InspectionTaskItem {
  const taskStatus = normalizeInspectionTaskStatus(record.taskStatus);
  const displayByStatus: Record<
    InspectionTaskStatus,
    { status: InspectionTaskItem['status']; dueLabel: string; assigneeLabel: string }
  > = {
    pending_claim: {
      status: 'pending',
      dueLabel: '待选择设备并开始实验',
      assigneeLabel: '待实验人员领取',
    },
    in_experiment: {
      status: 'processing',
      dueLabel: '实验进行中',
      assigneeLabel: record.experimenterName || '实验人员待补录',
    },
    awaiting_raw_data: {
      status: 'completed',
      dueLabel: '待录入原始数据',
      assigneeLabel: record.experimenterName || '待录入原始数据',
    },
    awaiting_review: {
      status: 'completed',
      dueLabel: '待审核',
      assigneeLabel: record.experimenterName || '待审核',
    },
    awaiting_issue: {
      status: 'completed',
      dueLabel: '待签发',
      assigneeLabel: record.experimenterName || '待签发',
    },
    issued: {
      status: 'completed',
      dueLabel: '已签发',
      assigneeLabel: record.experimenterName || '已签发',
    },
  };
  const display = displayByStatus[taskStatus];

  return {
    id: record.id,
    orderNo: record.orderNo,
    title: `${record.orderNo} · ${record.sampleName}`,
    status: display.status,
    taskStatus,
    experimenterName: record.experimenterName,
    assigneeLabel: display.assigneeLabel,
    dueLabel: display.dueLabel,
    summary: `${record.clientName} · ${record.projectName} · ${record.testItems}`,
    createdAt: record.createdAt,
    sampleName: record.sampleName,
    sampleCount: record.sampleCount,
    testItems: record.testItems,
    testStandard: record.testStandard,
    assignedEquipmentId: record.assignedEquipmentId,
    assignedEquipmentName: record.assignedEquipmentName,
    pickupDepartment: record.pickupDepartment,
    aiReviewSummary: record.aiReviewSummary,
    aiReviewPassed: record.aiReviewPassed,
    issuedDocumentName: record.issuedDocumentName,
    issuedDocumentUrl: record.issuedDocumentUrl,
  };
}

export function buildInspectionTaskDetail(record: EntrustOrderRecord): InspectionTaskDetail {
  const task = buildInspectionTask(record);
  const preview = normalizeInspectionRawDataPreview(record.rawDataPreviewJson);

  return {
    ...task,
    paperEntrustNo: record.paperEntrustNo,
    contractNo: record.contractNo,
    clientName: record.clientName,
    constructionUnit: record.constructionUnit,
    supervisionUnit: record.supervisionUnit,
    contractorUnit: record.contractorUnit,
    projectName: record.projectName,
    projectLocation: record.projectLocation,
    witnessName: record.witnessName,
    witnessPhone: record.witnessPhone,
    samplerName: record.samplerName,
    samplerPhone: record.samplerPhone,
    sampleSpec: record.sampleSpec,
    sampleBatch: record.sampleBatch,
    engineeringPart: record.engineeringPart,
    manufacturer: record.manufacturer,
    representativeQuantity: record.representativeQuantity,
    productionDate: record.productionDate,
    sampleCode: record.sampleCode,
    contactName: record.contactName,
    contactPhone: record.contactPhone,
    receivedAt: record.receivedAt,
    note: record.note,
    rawDataImagePath: record.rawDataImagePath,
    rawDataImageName: record.rawDataImageName,
    rawDataPreview: preview,
    aiReviewTrace: (record.aiReviewTraceJson as InspectionAiReviewTraceItem[] | null) ?? null,
    reviewComment: record.reviewComment,
    reviewedAt: record.reviewedAt,
    issuedDocumentName: record.issuedDocumentName,
    issuedDocumentUrl: record.issuedDocumentUrl,
  };
}
