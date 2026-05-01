import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import JSZip from 'jszip';

import { buildIssueDocumentBuffer, buildIssueDocumentFilename } from './issue-document-template.ts';

test('buildIssueDocumentFilename derives a stable task-specific docx filename', () => {
  assert.equal(
    buildIssueDocumentFilename({
      orderNo: 'WT-20260421-004',
      sampleName: '混凝土试块',
    } as any),
    'WT-20260421-004-混凝土试块-签发文档.docx'
  );
});

test('buildIssueDocumentBuffer injects task facts and raw-data table into the template docx', async () => {
  const template = readFileSync('public/temp.docx');

  const buffer = await buildIssueDocumentBuffer(template, {
    orderNo: 'WT-20260421-004',
    paperEntrustNo: 'WT-20260421-004',
    contractNo: 'HT-20260421-004',
    clientName: '华东建工材料有限公司',
    contactName: '李工',
    receivedAt: '2026-04-21T09:30:00+08:00',
    projectName: '泓元研发楼',
    projectLocation: '常州武进区',
    constructionUnit: '华东建工材料有限公司',
    contractorUnit: '江苏一建',
    supervisionUnit: '泓元监理',
    manufacturer: '泓元建材',
    sampleName: '混凝土试块',
    sampleSpec: '150mm x 150mm x 150mm',
    sampleCode: 'SN-004',
    sampleCount: 3,
    engineeringPart: '地下室承台',
    testItems: '抗压',
    testStandard: 'GB/T 50081-2019',
    assignedEquipmentName: '全自动压力试验机 01',
    rawDataPreview: {
      headers: ['组号', '破坏荷载(kN)', '抗压强度(MPa)'],
      rows: [
        ['1', '726.8', '32.3'],
        ['2', '682.1', '30.3'],
        ['3', '713.6', '31.7'],
      ],
    },
  } as any, {
    generatedAt: new Date('2026-04-22T09:00:00+08:00'),
  });

  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file('word/document.xml')!.async('string');

  assert.match(xml, /混凝土试块检测报告/);
  assert.match(xml, /华东建工材料有限公司/);
  assert.match(xml, /WT-20260421-004/);
  assert.match(xml, /GB\/T 50081-2019/);
  assert.match(xml, /全自动压力试验机 01/);
  assert.match(xml, /726\.8/);
  assert.match(xml, /抗压强度\(MPa\)/);
  assert.match(xml, /2026-04-22/);

  assert.doesNotMatch(xml, /江苏泓元检测认证有限公司/);
  assert.doesNotMatch(xml, /建筑用轻钢龙骨检测报告/);
  assert.doesNotMatch(xml, /2025-03-04/);
  assert.doesNotMatch(xml, /2025-03-05/);
  assert.doesNotMatch(xml, /2023-03-15/);
});
