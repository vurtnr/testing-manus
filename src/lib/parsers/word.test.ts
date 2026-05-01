import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { convertWordToHtml } from './word.ts';

test('convertWordToHtml preserves document structure from temp.docx for online preview', async () => {
  const buffer = readFileSync('public/temp.docx');
  const html = await convertWordToHtml(buffer);

  assert.match(html, /建筑用轻钢龙骨检测报告/);
  assert.match(html, /<table/i);
  assert.match(html, /检测结果/);
});
