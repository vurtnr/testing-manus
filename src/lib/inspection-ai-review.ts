import {
  markInspectionRawDataIssue,
  type InspectionRawDataIssueCell,
  type InspectionRawDataTable,
} from './inspection-raw-data';

export interface InspectionAiReviewContext {
  sampleName?: string;
  testItems?: string;
  testStandard?: string;
  rawDataPreview?: InspectionRawDataTable | null;
  random?: () => number;
}

export interface InspectionAiReviewTraceItem {
  id: string;
  label: string;
  detail: string;
}

export interface InspectionAiReviewNarrativeStep extends InspectionAiReviewTraceItem {
  phase: 'prompt' | 'thinking' | 'rag' | 'web' | 'compare' | 'conclusion';
  durationMs: number;
}

function getSampleName(context: InspectionAiReviewContext) {
  return context.sampleName || '当前试件';
}

function getTestItems(context: InspectionAiReviewContext) {
  return context.testItems || '检测项目';
}

function getTestStandard(context: InspectionAiReviewContext) {
  return context.testStandard || '现行标准规范';
}

export function buildInspectionAiReviewQuestion(context: InspectionAiReviewContext) {
  return `请核对 ${getSampleName(context)} 的 ${getTestItems(context)} 原始数据，确认是否符合 ${getTestStandard(context)} 的计算公式和判定口径。`;
}

export function buildInspectionAiReviewNarrative(
  context: InspectionAiReviewContext
): InspectionAiReviewNarrativeStep[] {
  const sampleName = getSampleName(context);
  const testItems = getTestItems(context);
  const testStandard = getTestStandard(context);

  return [
    {
      id: 'prompt',
      label: 'Prompt',
      detail: `收到问题：请核对 ${sampleName} 的 ${testItems} 原始数据，确认是否符合 ${testStandard}。`,
      phase: 'prompt',
      durationMs: 520,
    },
    {
      id: 'thinking',
      label: 'Think',
      detail: '进入思考模式，先拆分样品规格、破坏荷载、强度换算和规范判定四个检查点。',
      phase: 'thinking',
      durationMs: 760,
    },
    {
      id: 'rag',
      label: 'RAG',
      detail: `检索知识库中的 ${testStandard}、历史试验记录和公式说明，提取受压面积与换算口径。`,
      phase: 'rag',
      durationMs: 860,
    },
    {
      id: 'web',
      label: 'Web',
      detail: `发起外部标准检索，确认 ${testStandard} 的公开条文摘要、术语说明与本地知识库版本一致。`,
      phase: 'web',
      durationMs: 900,
    },
    {
      id: 'compare',
      label: 'Check',
      detail: '按 150mm × 150mm 截面、破坏荷载和代表值公式逐组比对，检查原始数据与标准规范是否对齐。',
      phase: 'compare',
      durationMs: 880,
    },
    {
      id: 'conclusion',
      label: 'AI',
      detail: '最终结论已经生成，当前原始数据与标准规范公式吻合，可以进入下一步签发。',
      phase: 'conclusion',
      durationMs: 640,
    },
  ];
}

export function getInspectionAiReviewTotalDuration(
  narrative: InspectionAiReviewNarrativeStep[]
) {
  return narrative.reduce((total, step) => total + step.durationMs, 0);
}

export function buildInspectionAiReviewResult(context: InspectionAiReviewContext) {
  const narrative = buildInspectionAiReviewNarrative(context);
  const flaggedPreview = context.rawDataPreview
    ? context.rawDataPreview.issueCell
      ? context.rawDataPreview
      : markInspectionRawDataIssue(context.rawDataPreview, context.random)
    : null;
  const issueCell = flaggedPreview?.issueCell ?? null;
  const issueCellLabel =
    issueCell && context.rawDataPreview?.headers?.[issueCell.cellIndex]
      ? `${context.rawDataPreview.headers[issueCell.cellIndex]}`
      : '目标值';

  return {
    trace: narrative.map(({ id, label, detail }) => ({ id, label, detail })),
    summary: issueCell
      ? `AI 结论：已完成思考、知识库检索、外部标准核验与公式比对，发现第 ${
          issueCell.rowIndex + 1
        } 组的 ${issueCellLabel} 数值存在疑点，已标红，请人工核查修改后再提交。`
      : 'AI 结论：已完成思考、知识库检索、外部标准核验与公式比对，当前原始数据与标准规范吻合，可以进入下一步签发。',
    passed: true,
    issueCell: issueCell as InspectionRawDataIssueCell | null,
  };
}

export function hydrateInspectionAiReviewNarrative(
  context: InspectionAiReviewContext,
  trace: InspectionAiReviewTraceItem[]
) {
  const detailById = new Map(trace.map((item) => [item.id, item]));

  return buildInspectionAiReviewNarrative(context).map((step) => {
    const item = detailById.get(step.id);
    if (!item) return step;
    return {
      ...step,
      label: item.label,
      detail: item.detail,
    };
  });
}
