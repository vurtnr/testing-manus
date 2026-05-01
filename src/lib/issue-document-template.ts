import JSZip from 'jszip';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

const TEMPLATE_DOC_PATH = 'word/document.xml';

interface TemplateLikeTaskDetail {
  orderNo: string;
  sampleName: string;
  paperEntrustNo?: string;
  contractNo?: string;
  clientName?: string;
  contactName?: string;
  witnessName?: string;
  samplerName?: string;
  receivedAt?: string;
  projectName?: string;
  projectLocation?: string;
  constructionUnit?: string;
  contractorUnit?: string;
  supervisionUnit?: string;
  manufacturer?: string;
  sampleSpec?: string;
  sampleCode?: string;
  productionDate?: string;
  engineeringPart?: string;
  testStandard?: string;
  assignedEquipmentName?: string;
  testItems?: string;
  rawDataPreview?: {
    headers: string[];
    rows: string[][];
  } | null;
}

function sanitizeFilenameSegment(value: string) {
  return value
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatDate(value: string | undefined) {
  if (!value) return '/';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
}

function formatCurrentDocumentDate(now: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now);
}

function buildReportTitle(detail: TemplateLikeTaskDetail) {
  return `${detail.sampleName || '送检材料样品'}检测报告`;
}

function buildEquipmentLine(detail: TemplateLikeTaskDetail) {
  return detail.assignedEquipmentName?.trim() || '待补录';
}

function buildFactReplacements(
  detail: TemplateLikeTaskDetail,
  documentDate: string
) {
  return [
    ['江苏泓元检测认证有限公司', detail.clientName || '待补录'],
    ['章雯', detail.contactName || detail.witnessName || detail.samplerName || '待补录'],
    ['2025-03-04', documentDate],
    ['B04570012504025', detail.orderNo],
    ['M2025002', detail.paperEntrustNo || detail.orderNo],
    ['建筑用轻钢龙骨检测报告', buildReportTitle(detail)],
    ['建筑用轻钢龙骨', detail.sampleName || '待补录'],
    ['DU50*15*1.2', detail.sampleSpec || '待补录'],
    ['mn25425', detail.sampleCode || '待补录'],
    ['2025-03-05', documentDate],
    ['报告日期：2023-03-15', `报告日期：${documentDate}`],
    ['2023-03-15', documentDate],
    ['GB/T 11981-2024《建筑用轻钢龙骨》', detail.testStandard || '待补录'],
    ['GB/T11981-2024《建筑用轻钢龙骨》', detail.testStandard || '待补录'],
    ['轻钢龙骨检测平台(FP144)、秒表（LY06) 、百分表（LS65-5～8）、百分表（LS131）、百分表（LS132）、钢卷尺（LS122）、千分尺（LS72）', buildEquipmentLine(detail)],
    ['工程名称 /', `工程名称 ${detail.projectName?.trim() || '/'}`],
    ['工程地址 /', `工程地址 ${detail.projectLocation?.trim() || '/'}`],
    ['建设单位 /', `建设单位 ${detail.constructionUnit?.trim() || '/'}`],
    ['施工单位 /', `施工单位 ${detail.contractorUnit?.trim() || '/'}`],
    ['监理单位 /', `监理单位 ${detail.supervisionUnit?.trim() || '/'}`],
    ['生产厂家 /', `生产厂家 ${detail.manufacturer?.trim() || '/'}`],
    ['样品名称 建筑用轻钢龙骨', `样品名称 ${detail.sampleName?.trim() || '待补录'}`],
    ['规格型号DU50*15*1.2', `规格型号${detail.sampleSpec?.trim() || '待补录'}`],
    ['样品编号 mn25425', `样品编号 ${detail.sampleCode?.trim() || '待补录'}`],
    ['结构部位 /', `结构部位 ${detail.engineeringPart?.trim() || '/'}`],
  ] as const;
}

function collectTextNodes(root: Element) {
  const nodes: Element[] = [];
  const walker = (node: Node) => {
    if (node.nodeType === node.ELEMENT_NODE) {
      const element = node as Element;
      if (element.tagName === 'w:t') {
        nodes.push(element);
      }
      for (let i = 0; i < element.childNodes.length; i += 1) {
        walker(element.childNodes[i]!);
      }
    }
  };
  walker(root);
  return nodes;
}

function replaceTextSequence(root: Element, source: string, replacement: string) {
  if (!source || source === replacement) return false;

  const nodes = collectTextNodes(root);
  const texts = nodes.map((node) => node.textContent ?? '');

  for (let start = 0; start < texts.length; start += 1) {
    let combined = '';

    for (let end = start; end < texts.length; end += 1) {
      combined += texts[end];

      if (combined === source) {
        nodes[start].textContent = replacement;
        if (replacement.startsWith(' ') || replacement.endsWith(' ')) {
          nodes[start].setAttribute('xml:space', 'preserve');
        }
        for (let index = start + 1; index <= end; index += 1) {
          nodes[index].textContent = '';
        }
        return true;
      }

      if (!source.startsWith(combined)) {
        break;
      }
    }
  }

  return false;
}

function createTableCell(doc: Document, text: string, { bold = false } = {}) {
  const tc = doc.createElement('w:tc');
  const tcPr = doc.createElement('w:tcPr');
  const tcW = doc.createElement('w:tcW');
  tcW.setAttribute('w:w', '1800');
  tcW.setAttribute('w:type', 'dxa');
  tcPr.appendChild(tcW);
  tc.appendChild(tcPr);

  const p = doc.createElement('w:p');
  const r = doc.createElement('w:r');
  if (bold) {
    const rPr = doc.createElement('w:rPr');
    const b = doc.createElement('w:b');
    rPr.appendChild(b);
    r.appendChild(rPr);
  }
  const t = doc.createElement('w:t');
  t.appendChild(doc.createTextNode(text));
  r.appendChild(t);
  p.appendChild(r);
  tc.appendChild(p);

  return tc;
}

function buildRawDataTable(doc: Document, detail: TemplateLikeTaskDetail) {
  const table = doc.createElement('w:tbl');

  const tblPr = doc.createElement('w:tblPr');
  const tblW = doc.createElement('w:tblW');
  tblW.setAttribute('w:w', '0');
  tblW.setAttribute('w:type', 'auto');
  tblPr.appendChild(tblW);

  const borders = doc.createElement('w:tblBorders');
  for (const side of ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']) {
    const border = doc.createElement(`w:${side}`);
    border.setAttribute('w:val', 'single');
    border.setAttribute('w:sz', '8');
    border.setAttribute('w:space', '0');
    border.setAttribute('w:color', '808080');
    borders.appendChild(border);
  }
  tblPr.appendChild(borders);
  table.appendChild(tblPr);

  const preview = detail.rawDataPreview;
  const headers = preview?.headers?.length ? preview.headers : ['字段', '值'];
  const rows = preview?.rows?.length
    ? preview.rows
    : [
        ['当前任务', detail.sampleName || '待补录'],
        ['检测项目', detail.testItems || '待补录'],
      ];

  const tblGrid = doc.createElement('w:tblGrid');
  headers.forEach(() => {
    const gridCol = doc.createElement('w:gridCol');
    gridCol.setAttribute('w:w', '1800');
    tblGrid.appendChild(gridCol);
  });
  table.appendChild(tblGrid);

  const headerRow = doc.createElement('w:tr');
  headers.forEach((header) => {
    headerRow.appendChild(createTableCell(doc, header, { bold: true }));
  });
  table.appendChild(headerRow);

  rows.forEach((row) => {
    const tr = doc.createElement('w:tr');
    headers.forEach((_, index) => {
      tr.appendChild(createTableCell(doc, row[index] ?? ''));
    });
    table.appendChild(tr);
  });

  return table;
}

function replaceFirstTable(doc: Document, detail: TemplateLikeTaskDetail) {
  const tables = doc.getElementsByTagName('w:tbl');
  if (!tables.length) return;

  const existing = tables[0]!;
  const replacement = buildRawDataTable(doc, detail);
  existing.parentNode?.replaceChild(replacement, existing);
}

export function buildIssueDocumentFilename(detail: TemplateLikeTaskDetail) {
  return `${sanitizeFilenameSegment(detail.orderNo)}-${sanitizeFilenameSegment(detail.sampleName)}-签发文档.docx`;
}

export function getIssueDocumentFileUrl(taskId: string) {
  return `/api/inspection-tasks/${taskId}/issue-document-file`;
}

export async function buildIssueDocumentBuffer(
  templateBuffer: Buffer,
  detail: TemplateLikeTaskDetail,
  options?: {
    generatedAt?: Date;
  }
) {
  const zip = await JSZip.loadAsync(templateBuffer);
  const xml = await zip.file(TEMPLATE_DOC_PATH)?.async('string');
  if (!xml) {
    throw new Error('签发模板缺少 document.xml');
  }

  const parser = new DOMParser();
  const serializer = new XMLSerializer();
  const doc = parser.parseFromString(xml, 'application/xml');
  const root = doc.documentElement;
  const documentDate = formatCurrentDocumentDate(options?.generatedAt);

  buildFactReplacements(detail, documentDate).forEach(([source, replacement]) => {
    replaceTextSequence(root, source, replacement);
  });

  replaceFirstTable(doc, detail);

  zip.file(TEMPLATE_DOC_PATH, serializer.serializeToString(doc));
  return Buffer.from(await zip.generateAsync({ type: 'nodebuffer' }));
}
