import type { FileItem } from '../../lib/api';

const DASH_VARIANTS = /[‐‑‒–—―﹘﹣－_]+/g;
const SPACE_VARIANTS = /\s+/g;

function normalizeHistoryValue(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(DASH_VARIANTS, '-')
    .replace(SPACE_VARIANTS, ' ')
    .trim();
}

function buildHistoryKey(value: string): string {
  return normalizeHistoryValue(value)
    .replace(/\.[^.]+$/, '')
    .replace(/[《》()\[\]{}]/g, '')
    .replace(/[^\p{Script=Han}\p{Letter}\p{Number}]+/gu, '');
}

export function isDuplicateReviewUploadError(message: string | null | undefined): boolean {
  if (!message) return false;
  return message.includes('已存在');
}

export function findReviewHistory(
  files: FileItem[],
  filename: string,
  standardNumber?: string | null
): FileItem[] {
  const incomingNameKey = buildHistoryKey(filename);
  const incomingStandardKey = standardNumber ? buildHistoryKey(standardNumber) : null;

  return files
    .filter((file) => {
      const fileNameKey = buildHistoryKey(file.filename);
      const fileStandardKey = file.standardNumber ? buildHistoryKey(file.standardNumber) : null;

      if (incomingStandardKey && fileStandardKey) {
        return incomingStandardKey === fileStandardKey;
      }

      return incomingNameKey === fileNameKey;
    })
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}
