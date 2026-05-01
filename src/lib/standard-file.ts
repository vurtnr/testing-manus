import path from 'path';

export interface StandardFileCandidate {
  filename: string;
  standardNumber?: string | null;
}

const DASH_VARIANTS = /[‐‑‒–—―﹘﹣－_]+/g;
const SPACE_VARIANTS = /\s+/g;
const VERSION_SUFFIX_PATTERN = /[（(][^)）]*(扫描|修订|发布|报批|送审|征求意见|英文|中英文)[^)）]*[)）]/gi;
const STANDARD_NUMBER_PATTERN = /\bgb\s*\/?\s*t\s*\d+(?:\.\d+)?\s*[-_—–]?\s*\d{4}\b/i;

function normalizeSource(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(DASH_VARIANTS, '-')
    .replace(SPACE_VARIANTS, ' ')
    .trim();
}

function normalizeStandardNumber(raw: string): string {
  const normalized = normalizeSource(raw).replace(/\s+/g, '');
  return normalized
    .replace(/^gbt/, 'gb/t')
    .replace(/gb\/t-?/, 'gb/t')
    .replace(/(gb\/t\d+(?:\.\d+)?)-?(\d{4})/, '$1-$2');
}

function normalizeFilenameStem(filename: string): string {
  return normalizeSource(path.parse(filename).name)
    .replace(VERSION_SUFFIX_PATTERN, '')
    .replace(/[《》()\[\]{}]/g, '')
    .replace(/[^\p{Script=Han}\p{Letter}\p{Number}]+/gu, '');
}

export function extractStandardNumber(value: string): string | undefined {
  const normalized = normalizeSource(value);
  const match = normalized.match(STANDARD_NUMBER_PATTERN);
  return match ? normalizeStandardNumber(match[0]) : undefined;
}

export function buildStandardFileKey(filename: string, standardNumber?: string | null): string {
  const normalizedStandard = standardNumber
    ? extractStandardNumber(standardNumber) ?? normalizeStandardNumber(standardNumber)
    : extractStandardNumber(filename);

  if (normalizedStandard) return normalizedStandard;
  return normalizeFilenameStem(filename);
}

export function findDuplicateStandardFile<T extends StandardFileCandidate>(
  filename: string,
  existingFiles: T[],
  standardNumber?: string | null
): T | undefined {
  const incomingKey = buildStandardFileKey(filename, standardNumber);
  if (!incomingKey) return undefined;

  return existingFiles.find((file) => (
    buildStandardFileKey(file.filename, file.standardNumber) === incomingKey
  ));
}
