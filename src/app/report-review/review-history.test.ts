import test from 'node:test';
import assert from 'node:assert/strict';

import type { FileItem } from '../../lib/api.ts';
import { findReviewHistory, isDuplicateReviewUploadError } from './review-history.ts';

const FILES: FileItem[] = [
  {
    id: 'file-1',
    filename: 'JGJ/T 294-2013 高强回弹检测报告-v1.docx',
    fileType: 'docx',
    fileSize: 1024,
    uploadStatus: 'ready',
    createdAt: '2026-04-18T09:00:00.000Z',
    standardNumber: 'JGJ/T 294-2013',
    errorMessage: null,
  },
  {
    id: 'file-2',
    filename: 'JGJT294-2013高强回弹检测报告.docx',
    fileType: 'docx',
    fileSize: 2048,
    uploadStatus: 'failed',
    createdAt: '2026-04-19T08:00:00.000Z',
    standardNumber: 'JGJ/T 294-2013',
    errorMessage: '解析失败',
  },
  {
    id: 'file-3',
    filename: 'GB 50010-2010 混凝土结构设计规范.pdf',
    fileType: 'pdf',
    fileSize: 4096,
    uploadStatus: 'ready',
    createdAt: '2026-04-17T08:00:00.000Z',
    standardNumber: 'GB 50010-2010',
    errorMessage: null,
  },
];

test('findReviewHistory returns matching reports in reverse chronological order', () => {
  const history = findReviewHistory(FILES, 'JGJT294-2013高强回弹检测报告.docx');

  assert.deepEqual(
    history.map((file) => file.id),
    ['file-2']
  );
});

test('isDuplicateReviewUploadError only flags duplicate upload errors', () => {
  assert.equal(isDuplicateReviewUploadError('标准文件已存在：JGJ/T 294-2013 高强回弹检测报告.docx'), true);
  assert.equal(isDuplicateReviewUploadError('上传失败，请重试'), false);
  assert.equal(isDuplicateReviewUploadError(null), false);
});
