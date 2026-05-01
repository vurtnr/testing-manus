import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildEntrustOcrProgressSteps,
  getEntrustSubmitHint,
} from './entrust-ocr-progress.ts';

test('buildEntrustOcrProgressSteps provides the staged OCR + LLM analysis narrative', () => {
  const steps = buildEntrustOcrProgressSteps();

  assert.deepEqual(
    steps.map((step) => step.id),
    ['image', 'ocr', 'reasoning', 'structuring', 'ready']
  );
  assert.match(steps[1]?.label || '', /OCR/);
  assert.match(steps[2]?.detail || '', /LLM/);
});

test('getEntrustSubmitHint reflects whether OCR has completed', () => {
  assert.equal(getEntrustSubmitHint(false), '请先完成 OCR 识别后再按照片原件入库');
  assert.equal(getEntrustSubmitHint(true), 'OCR 摘要已就绪，确认后将按照片原件和识别结果一起归档入库');
});
