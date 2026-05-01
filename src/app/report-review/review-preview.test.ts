import test from 'node:test';
import assert from 'node:assert/strict';

import { buildReportReviewPreview } from './review-preview.ts';

test('buildReportReviewPreview creates high-risk issue when standard number is missing', () => {
  const preview = buildReportReviewPreview({
    fileId: 'file-1',
    filename: 'sample.pdf',
    fileType: 'pdf',
    documentTitle: null,
    standardNumber: null,
    chunkCount: 12,
    sectionTitles: ['基本信息', '检测结论'],
  });

  assert.equal(preview.summary.high, 1);
  assert.equal(preview.issues[0]?.severity, 'high');
});

test('buildReportReviewPreview includes extracted sections and issue summary', () => {
  const preview = buildReportReviewPreview({
    fileId: 'file-2',
    filename: 'report.docx',
    fileType: 'docx',
    documentTitle: '混凝土抗压强度检测报告',
    standardNumber: 'JGJ/T 294-2013',
    chunkCount: 48,
    sectionTitles: ['基本信息', '试件信息', '检测结论', '签字盖章'],
  });

  assert.deepEqual(preview.summary, { high: 0, medium: 0, low: 1 });
  assert.equal(preview.sections.length, 4);
});
