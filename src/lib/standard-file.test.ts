import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildStandardFileKey,
  findDuplicateStandardFile,
} from './standard-file.ts';

test('buildStandardFileKey normalizes standard numbers across filename variants', () => {
  assert.equal(buildStandardFileKey('GB/T 21149-2019.pdf'), 'gb/t21149-2019');
  assert.equal(
    buildStandardFileKey('GB／T21149—2019（扫描版）.docx'),
    'gb/t21149-2019'
  );
});

test('findDuplicateStandardFile matches existing uploaded standard files', () => {
  const duplicate = findDuplicateStandardFile('GB/T 21149-2019（修订版）.pdf', [
    { filename: 'GBT 15036.1-2018.pdf', standardNumber: 'GB/T 15036.1-2018' },
    { filename: '8、18477_1-2007-gbt-e-300.pdf', standardNumber: null },
    { filename: 'GB／T21149—2019（扫描版）.docx', standardNumber: null },
  ]);

  assert.deepEqual(duplicate, {
    filename: 'GB／T21149—2019（扫描版）.docx',
    standardNumber: null,
  });
});
