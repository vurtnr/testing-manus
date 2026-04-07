import * as XLSX from 'xlsx';

export interface ParsedSheet {
  sheetName: string;
  markdown: string;
  rowCount: number;
}

export async function parseExcel(buffer: Buffer): Promise<ParsedSheet[]> {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheets: ParsedSheet[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    if (jsonData.length === 0) continue;

    // Convert to markdown table
    const header = jsonData[0];
    const rows = jsonData.slice(1);

    const markdown = rowsToMarkdown(header, rows);
    sheets.push({
      sheetName,
      markdown,
      rowCount: rows.length,
    });
  }

  return sheets;
}

function rowsToMarkdown(header: string[], rows: string[][]): string {
  const escapeCell = (val: any): string => {
    if (val == null) return '';
    return String(val).replace(/\|/g, '\\|').replace(/\n/g, ' ');
  };

  let md = '| ' + header.map(escapeCell).join(' | ') + ' |\n';
  md += '| ' + header.map(() => '---').join(' | ') + ' |\n';

  for (const row of rows) {
    md += '| ' + row.map(escapeCell).join(' | ') + ' |\n';
  }

  return md;
}
