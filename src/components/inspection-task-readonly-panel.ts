interface InspectionTaskReadonlyDetailLike {
  contractNo: string;
  clientName: string;
  sampleCount: number;
  testItems: string;
  testStandard: string;
  assignedEquipmentName: string;
  experimenterName: string;
  sampleSpec: string;
  engineeringPart: string;
  sampleCode: string;
  receivedAt: string;
}

interface InspectionRawDataPreviewLike {
  issueCell?: {
    rowIndex: number;
    cellIndex: number;
    resolved: boolean;
  } | null;
}

export interface InspectionTaskFactItem {
  label: string;
  value: string;
}

function fallback(value: string | null | undefined, empty = '待补录') {
  return value && value.trim() ? value : empty;
}

export function buildInspectionTaskFactItems(
  detail: InspectionTaskReadonlyDetailLike
): InspectionTaskFactItem[] {
  return [
    { label: '合同编号', value: fallback(detail.contractNo) },
    { label: '委托单位', value: fallback(detail.clientName) },
    { label: '样品数量', value: `${detail.sampleCount} 组` },
    { label: '检测项目', value: fallback(detail.testItems) },
    { label: '引用标准', value: fallback(detail.testStandard) },
    { label: '使用设备', value: fallback(detail.assignedEquipmentName) },
    { label: '实验人员', value: fallback(detail.experimenterName, '实验人员待补录') },
    { label: '样品规格', value: fallback(detail.sampleSpec) },
    { label: '工程部位', value: fallback(detail.engineeringPart) },
    { label: '样品编号', value: fallback(detail.sampleCode) },
    { label: '收样时间', value: fallback(detail.receivedAt) },
  ];
}

export function getInspectionRawDataCellState(
  preview: InspectionRawDataPreviewLike,
  rowIndex: number,
  cellIndex: number
) {
  const issueCell = preview.issueCell;
  if (!issueCell) return 'plain';
  if (issueCell.rowIndex !== rowIndex || issueCell.cellIndex !== cellIndex) return 'plain';
  return issueCell.resolved ? 'resolved' : 'flagged';
}
