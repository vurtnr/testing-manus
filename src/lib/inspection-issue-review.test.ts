import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildInspectionIssueReviewNarrative,
  buildInspectionIssueReviewResult,
  buildInspectionIssueReviewQuestion,
  getInspectionIssueReviewTotalDuration,
  hydrateInspectionIssueReviewNarrative,
} from './inspection-issue-review.ts';

test('buildInspectionIssueReviewNarrative covers standards, sample count, equipment and reference checks', () => {
  const narrative = buildInspectionIssueReviewNarrative({
    sampleName: '混凝土试块',
    sampleCount: 3,
    testItems: '抗压强度',
    testStandard: 'GB/T 50081-2019',
    assignedEquipmentName: '全自动压力试验机 01',
  });

  assert.deepEqual(
    narrative.map((step) => step.id),
    ['prompt', 'thinking', 'formula', 'sample-count', 'equipment', 'standard-reference', 'suggestion', 'conclusion']
  );
  assert.match(narrative[1].detail, /思考模式/);
  assert.match(narrative[2].detail, /标准公式/);
  assert.match(narrative[3].detail, /样品数量/);
  assert.match(narrative[4].detail, /设备/);
  assert.match(narrative[5].detail, /引用标准/);
  assert.match(narrative[6].detail, /签发建议/);
  assert.match(narrative[7].detail, /最终结论/);
});

test('buildInspectionIssueReviewQuestion embeds sign-off context', () => {
  const question = buildInspectionIssueReviewQuestion({
    sampleName: '混凝土试块',
    sampleCount: 3,
    testItems: '抗压强度',
    testStandard: 'GB/T 50081-2019',
    assignedEquipmentName: '全自动压力试验机 01',
  });

  assert.match(question, /混凝土试块/);
  assert.match(question, /3 组/);
  assert.match(question, /全自动压力试验机 01/);
});

test('buildInspectionIssueReviewResult produces a passing sign-off result with a final recommendation', () => {
  const result = buildInspectionIssueReviewResult({
    sampleName: '混凝土试块',
    sampleCount: 3,
    testItems: '抗压强度',
    testStandard: 'GB/T 50081-2019',
    assignedEquipmentName: '全自动压力试验机 01',
  });

  assert.equal(result.trace.length, 8);
  assert.equal(result.passed, true);
  assert.match(result.summary, /可进入最终签发/);
});

test('getInspectionIssueReviewTotalDuration sums all sign-off narrative durations', () => {
  const narrative = buildInspectionIssueReviewNarrative({
    sampleName: '混凝土试块',
    sampleCount: 3,
    testItems: '抗压强度',
    testStandard: 'GB/T 50081-2019',
    assignedEquipmentName: '全自动压力试验机 01',
  });

  assert.equal(
    getInspectionIssueReviewTotalDuration(narrative),
    narrative.reduce((total, step) => total + step.durationMs, 0)
  );
});

test('hydrateInspectionIssueReviewNarrative keeps phases while applying returned trace details', () => {
  const hydrated = hydrateInspectionIssueReviewNarrative(
    {
      sampleName: '混凝土试块',
      sampleCount: 3,
      testItems: '抗压强度',
      testStandard: 'GB/T 50081-2019',
      assignedEquipmentName: '全自动压力试验机 01',
    },
    [
      { id: 'suggestion', label: 'AI Suggestion', detail: '已经形成签发建议。' },
      { id: 'conclusion', label: 'AI Conclusion', detail: '最终结论已经生成。' },
    ]
  );

  assert.equal(hydrated.find((step) => step.id === 'thinking')?.phase, 'thinking');
  assert.equal(hydrated.find((step) => step.id === 'suggestion')?.detail, '已经形成签发建议。');
  assert.equal(hydrated.find((step) => step.id === 'conclusion')?.detail, '最终结论已经生成。');
});
