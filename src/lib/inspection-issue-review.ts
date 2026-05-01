import type { InspectionAiReviewResult } from './api';
import type { InspectionAiReviewTraceItem } from './inspection-ai-review';

export interface InspectionIssueReviewContext {
  sampleName?: string;
  sampleCount?: number;
  testItems?: string;
  testStandard?: string;
  assignedEquipmentName?: string;
}

export interface InspectionIssueReviewNarrativeStep extends InspectionAiReviewTraceItem {
  phase:
    | 'prompt'
    | 'thinking'
    | 'formula'
    | 'sample-count'
    | 'equipment'
    | 'standard-reference'
    | 'suggestion'
    | 'conclusion';
  durationMs: number;
}

function getSampleName(context: InspectionIssueReviewContext) {
  return context.sampleName || '当前试件';
}

function getSampleCount(context: InspectionIssueReviewContext) {
  return context.sampleCount ?? 0;
}

function getTestItems(context: InspectionIssueReviewContext) {
  return context.testItems || '检测项目';
}

function getTestStandard(context: InspectionIssueReviewContext) {
  return context.testStandard || '现行标准规范';
}

function getEquipment(context: InspectionIssueReviewContext) {
  return context.assignedEquipmentName || '当前设备';
}

export function buildInspectionIssueReviewQuestion(context: InspectionIssueReviewContext) {
  return `请确认 ${getSampleName(context)} 的 ${getTestItems(context)} 是否可以最终签发，重点核对 ${getSampleCount(context)} 组样品、${getEquipment(context)} 和 ${getTestStandard(context)} 的适配关系。`;
}

export function buildInspectionIssueReviewNarrative(
  context: InspectionIssueReviewContext
): InspectionIssueReviewNarrativeStep[] {
  const sampleName = getSampleName(context);
  const sampleCount = getSampleCount(context);
  const testItems = getTestItems(context);
  const testStandard = getTestStandard(context);
  const equipment = getEquipment(context);

  return [
    {
      id: 'prompt',
      label: 'Prompt',
      detail: `收到签发问题：核对 ${sampleName} 的 ${testItems}，确认 ${sampleCount} 组样品、设备和引用标准都满足最终签发要求。`,
      phase: 'prompt',
      durationMs: 420,
    },
    {
      id: 'thinking',
      label: 'Think',
      detail: '进入思考模式，先把签发判断拆成原始数据、样品数量、设备适配性和标准引用四个检查维度。',
      phase: 'thinking',
      durationMs: 620,
    },
    {
      id: 'formula',
      label: 'Check',
      detail: `复核原始数据与 ${testStandard} 中的标准公式和代表值口径，确认计算过程无偏差。`,
      phase: 'formula',
      durationMs: 560,
    },
    {
      id: 'sample-count',
      label: 'Check',
      detail: `检查样品数量，当前为 ${sampleCount} 组，核对是否满足 ${testStandard} 对 ${testItems} 的最小组数要求。`,
      phase: 'sample-count',
      durationMs: 560,
    },
    {
      id: 'equipment',
      label: 'Check',
      detail: `核对设备适配性，确认 ${equipment} 适用于当前 ${testItems}，不存在设备误用风险。`,
      phase: 'equipment',
      durationMs: 560,
    },
    {
      id: 'standard-reference',
      label: 'Check',
      detail: `核对引用标准，确认当前使用的 ${testStandard} 与检测项目、样品类型和签发表述保持一致。`,
      phase: 'standard-reference',
      durationMs: 560,
    },
    {
      id: 'suggestion',
      label: 'AI Suggestion',
      detail: '签发建议已经生成，当前数据链条完整，四项核心检查没有发现阻塞签发的风险点。',
      phase: 'suggestion',
      durationMs: 520,
    },
    {
      id: 'conclusion',
      label: 'AI Conclusion',
      detail: '最终结论已经生成，当前任务可以进入最终签发。',
      phase: 'conclusion',
      durationMs: 460,
    },
  ];
}

export function getInspectionIssueReviewTotalDuration(
  narrative: InspectionIssueReviewNarrativeStep[]
) {
  return narrative.reduce((total, step) => total + step.durationMs, 0);
}

export function buildInspectionIssueReviewResult(
  context: InspectionIssueReviewContext
): InspectionAiReviewResult {
  const narrative = buildInspectionIssueReviewNarrative(context);

  return {
    trace: narrative.map(({ id, label, detail }) => ({ id, label, detail })),
    summary: 'AI 结论：已完成标准公式、样品数量、设备适配和引用标准四项签发校验，当前任务可进入最终签发。',
    passed: true,
  };
}

export function hydrateInspectionIssueReviewNarrative(
  context: InspectionIssueReviewContext,
  trace: InspectionAiReviewTraceItem[]
) {
  const detailById = new Map(trace.map((item) => [item.id, item]));

  return buildInspectionIssueReviewNarrative(context).map((step) => {
    const item = detailById.get(step.id);
    if (!item) return step;
    return {
      ...step,
      label: item.label,
      detail: item.detail,
    };
  });
}
