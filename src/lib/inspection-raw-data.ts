export interface InspectionRawDataIssueCell {
  rowIndex: number;
  cellIndex: number;
  originalValue: string;
  currentValue: string;
  resolved: boolean;
}

export interface InspectionRawDataTable {
  headers: string[];
  rows: string[][];
  issueCell?: InspectionRawDataIssueCell | null;
}

function normalizeRows(rows: unknown): string[][] {
  if (!Array.isArray(rows)) return [];

  return rows.map((row) => {
    if (!Array.isArray(row)) return [];
    return row.map((cell) => `${cell ?? ''}`);
  });
}

function normalizeHeaders(headers: unknown): string[] {
  if (!Array.isArray(headers)) return [];
  return headers.map((header) => `${header ?? ''}`);
}

function getCellValue(rows: string[][], rowIndex: number, cellIndex: number) {
  return rows[rowIndex]?.[cellIndex] ?? '';
}

function syncIssueCell(
  rows: string[][],
  issueCell: InspectionRawDataIssueCell | null | undefined
): InspectionRawDataIssueCell | null {
  if (!issueCell) return null;

  const currentValue = getCellValue(rows, issueCell.rowIndex, issueCell.cellIndex);
  if (currentValue === '') return null;

  return {
    ...issueCell,
    currentValue,
    resolved: currentValue !== issueCell.originalValue,
  };
}

export function normalizeInspectionRawDataPreview(input: unknown): InspectionRawDataTable | null {
  if (typeof input === 'string') {
    try {
      return normalizeInspectionRawDataPreview(JSON.parse(input));
    } catch {
      return null;
    }
  }

  if (!input || typeof input !== 'object') return null;

  const record = input as Record<string, unknown>;
  const rawTable =
    record.preview && typeof record.preview === 'object'
      ? (record.preview as Record<string, unknown>)
      : record;

  const headers = normalizeHeaders(rawTable.headers);
  const rows = normalizeRows(rawTable.rows);

  if (headers.length === 0 && rows.length === 0) return null;

  const rawIssue = rawTable.issueCell;
  const issueCell =
    rawIssue && typeof rawIssue === 'object'
      ? syncIssueCell(rows, {
          rowIndex: Number((rawIssue as Record<string, unknown>).rowIndex ?? -1),
          cellIndex: Number((rawIssue as Record<string, unknown>).cellIndex ?? -1),
          originalValue: `${(rawIssue as Record<string, unknown>).originalValue ?? ''}`,
          currentValue: `${(rawIssue as Record<string, unknown>).currentValue ?? ''}`,
          resolved: Boolean((rawIssue as Record<string, unknown>).resolved),
        })
      : null;

  return {
    headers,
    rows,
    issueCell,
  };
}

function getReviewableCells(table: InspectionRawDataTable) {
  const candidates: Array<{ rowIndex: number; cellIndex: number; value: string }> = [];

  table.rows.forEach((row, rowIndex) => {
    row.forEach((cell, cellIndex) => {
      if (cellIndex === 0) return;
      if (`${cell}`.trim() === '') return;
      candidates.push({ rowIndex, cellIndex, value: `${cell}` });
    });
  });

  return candidates;
}

export function markInspectionRawDataIssue(
  input: InspectionRawDataTable,
  random: () => number = Math.random
): InspectionRawDataTable {
  const table = normalizeInspectionRawDataPreview(input) ?? {
    headers: [],
    rows: [],
    issueCell: null,
  };
  const candidates = getReviewableCells(table);

  if (candidates.length === 0) {
    return {
      ...table,
      issueCell: null,
    };
  }

  const index = Math.max(0, Math.min(candidates.length - 1, Math.floor(random() * candidates.length)));
  const candidate = candidates[index];

  return {
    headers: table.headers,
    rows: table.rows,
    issueCell: {
      rowIndex: candidate.rowIndex,
      cellIndex: candidate.cellIndex,
      originalValue: candidate.value,
      currentValue: candidate.value,
      resolved: false,
    },
  };
}

export function updateInspectionRawDataCell(
  input: InspectionRawDataTable,
  rowIndex: number,
  cellIndex: number,
  value: string
): InspectionRawDataTable {
  const table = normalizeInspectionRawDataPreview(input) ?? {
    headers: [],
    rows: [],
    issueCell: null,
  };

  const rows = table.rows.map((row, currentRowIndex) => {
    if (currentRowIndex !== rowIndex) return [...row];
    return row.map((cell, currentCellIndex) =>
      currentCellIndex === cellIndex ? value : cell
    );
  });

  return {
    headers: table.headers,
    rows,
    issueCell: syncIssueCell(rows, table.issueCell),
  };
}

export function hasPendingInspectionRawDataIssue(table: InspectionRawDataTable | null | undefined) {
  return Boolean(table?.issueCell && !table.issueCell.resolved);
}

export function canSubmitInspectionRawData(
  table: InspectionRawDataTable | null | undefined,
  aiReviewPassed: boolean
) {
  if (!table || !aiReviewPassed) return false;
  return !hasPendingInspectionRawDataIssue(table);
}
