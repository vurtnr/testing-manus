import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildInspectionAiReviewNarrative,
  buildInspectionAiReviewResult,
  buildInspectionAiReviewQuestion,
  getInspectionAiReviewTotalDuration,
  hydrateInspectionAiReviewNarrative,
} from './inspection-ai-review.ts';

test('buildInspectionAiReviewNarrative covers prompt, thinking, rag, web, compare and conclusion', () => {
  const narrative = buildInspectionAiReviewNarrative({
    sampleName: '混凝土试块',
    testItems: '抗压强度',
    testStandard: 'GB/T 50081-2019',
  });

  assert.deepEqual(
    narrative.map((step) => step.id),
    ['prompt', 'thinking', 'rag', 'web', 'compare', 'conclusion']
  );
  assert.equal(narrative[0].label, 'Prompt');
  assert.match(narrative[1].detail, /思考模式/);
  assert.match(narrative[2].detail, /知识库/);
  assert.match(narrative[3].detail, /外部标准检索/);
  assert.match(narrative[4].detail, /逐组比对/);
  assert.match(narrative[5].detail, /最终结论/);
});

test('buildInspectionAiReviewQuestion embeds the current task context', () => {
  const question = buildInspectionAiReviewQuestion({
    sampleName: '混凝土试块',
    testItems: '抗压强度',
    testStandard: 'GB/T 50081-2019',
  });

  assert.match(question, /混凝土试块/);
  assert.match(question, /抗压强度/);
  assert.match(question, /GB\/T 50081-2019/);
});

test('buildInspectionAiReviewResult returns the same six-step trace and a standards-based summary', () => {
  const result = buildInspectionAiReviewResult({
    sampleName: '混凝土试块',
    testItems: '抗压强度',
    testStandard: 'GB/T 50081-2019',
    rawDataPreview: {
      headers: ['组号', '试件长(mm)', '破坏荷载(kN)'],
      rows: [['1', '150', '726.8']],
    },
    random: () => 0,
  });

  assert.equal(result.trace.length, 6);
  assert.equal(result.passed, true);
  assert.deepEqual(result.issueCell, {
    rowIndex: 0,
    cellIndex: 1,
    originalValue: '150',
    currentValue: '150',
    resolved: false,
  });
  assert.match(result.summary, /人工核查/);
  assert.match(result.summary, /提交/);
});

test('getInspectionAiReviewTotalDuration sums all narrative durations', () => {
  const narrative = buildInspectionAiReviewNarrative({
    sampleName: '混凝土试块',
    testItems: '抗压强度',
    testStandard: 'GB/T 50081-2019',
  });

  assert.equal(
    getInspectionAiReviewTotalDuration(narrative),
    narrative.reduce((total, step) => total + step.durationMs, 0)
  );
});

test('hydrateInspectionAiReviewNarrative preserves phases while applying returned trace details', () => {
  const hydrated = hydrateInspectionAiReviewNarrative(
    {
      sampleName: '混凝土试块',
      testItems: '抗压强度',
      testStandard: 'GB/T 50081-2019',
    },
    [
      { id: 'web', label: 'Web', detail: '已完成外部标准检索。' },
      { id: 'conclusion', label: 'AI', detail: '最终结论已经生成。' },
    ]
  );

  assert.equal(hydrated.find((step) => step.id === 'web')?.phase, 'web');
  assert.equal(hydrated.find((step) => step.id === 'conclusion')?.detail, '最终结论已经生成。');
});
