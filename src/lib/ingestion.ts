import path from 'path';
import fs from 'fs/promises';
import { getDb } from './db';
import { getEnv } from './env';
import { parsePdf, ParsedPage } from './parsers/pdf';
import { parseWord, ParsedSection } from './parsers/word';
import { parseExcel, ParsedSheet } from './parsers/excel';
import { parseImage } from './parsers/image';
import { embedBatch } from './embedding';

const PARENT_MAX_CHARS = 2000;
const CHILD_MAX_CHARS = 600;
const CHILD_OVERLAP = 100;

interface ChunkData {
  content: string;
  sourceLocation: Record<string, any>;
  sectionTitle?: string;
  sectionPath?: string;
  chunkType: 'parent' | 'child';
}

export async function ingestFile(fileId: string): Promise<void> {
  const sql = getDb();
  const env = getEnv();

  try {
    await sql`UPDATE files SET upload_status = 'processing' WHERE id = ${fileId}`;

    const [file] = await sql`SELECT * FROM files WHERE id = ${fileId}`;
    if (!file) throw new Error(`File ${fileId} not found`);

    const filePath = path.join(env.UPLOAD_DIR, file.storage_path);
    const buffer = await fs.readFile(filePath);

    // Parse to raw chunks (parent-sized, max ~2000 chars)
    const rawChunks = await parseAndChunk(file.file_type, file.filename, buffer);

    if (rawChunks.length === 0) {
      await sql`UPDATE files SET upload_status = 'ready', error_message = 'No extractable content' WHERE id = ${fileId}`;
      return;
    }

    // Check if parent_chunk_id column exists (post-migration)
    const hasParentCol = await sql`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'chunks' AND column_name = 'parent_chunk_id'
      LIMIT 1
    `;
    const useParentChild = hasParentCol.length > 0;

    if (!useParentChild) {
      // Legacy path: flat chunks, no parent-child
      const texts = rawChunks.map((c) => c.content);
      const embeddings = await embedBatch(texts);

      for (let i = 0; i < rawChunks.length; i++) {
        const vectorStr = `[${embeddings[i].join(',')}]`;
        await sql`
          INSERT INTO chunks (file_id, chunk_index, content, embedding, source_location, token_count)
          VALUES (${fileId}, ${i}, ${rawChunks[i].content}, ${vectorStr}::vector,
                  ${JSON.stringify(rawChunks[i].sourceLocation)}, ${estimateTokens(rawChunks[i].content)})
        `;
      }
    } else {
      // Parent-Child path:
      // 1) Insert parent rows (no embedding, just reference text)
      // 2) Split each parent into children
      // 3) Embed and insert children pointing to real parent DB IDs
      await ingestWithParentChild(sql, fileId, rawChunks);
    }

    // Extract file-level metadata from first chunk
    const firstText = rawChunks[0]?.content ?? '';
    const docTitle = extractDocumentTitle(firstText, file.filename);
    const standardNum = extractStandardNumber(firstText);

    if (useParentChild && docTitle) {
      await sql`UPDATE files SET document_title = ${docTitle} WHERE id = ${fileId}`;
    }
    if (useParentChild && standardNum) {
      await sql`UPDATE files SET standard_number = ${standardNum} WHERE id = ${fileId}`;
    }

    await sql`UPDATE files SET upload_status = 'ready' WHERE id = ${fileId}`;
  } catch (error: any) {
    await sql`UPDATE files SET upload_status = 'failed', error_message = ${error.message} WHERE id = ${fileId}`;
    throw error;
  }
}

async function ingestWithParentChild(
  sql: any,
  fileId: string,
  rawChunks: ChunkData[]
): Promise<void> {
  // Step 1: Insert parent chunks (no embedding, just reference text)
  const parentDbIds: string[] = [];
  for (let i = 0; i < rawChunks.length; i++) {
    const chunk = rawChunks[i];
    const [row] = await sql`
      INSERT INTO chunks (
        file_id, chunk_index, content, source_location, token_count,
        chunk_type, section_title, section_path
      ) VALUES (
        ${fileId}, ${i}, ${chunk.content},
        ${JSON.stringify(chunk.sourceLocation)}, ${estimateTokens(chunk.content)},
        'parent', ${chunk.sectionTitle ?? null}, ${chunk.sectionPath ?? null}
      )
      RETURNING id
    `;
    parentDbIds.push(row.id);
  }

  // Step 2: Create child chunks from each parent
  interface ChildEntry {
    text: string;
    parentDbId: string;
    sourceLocation: Record<string, any>;
    sectionTitle?: string;
    sectionPath?: string;
    groupKey: number; // index into rawChunks, for sibling grouping
  }

  const childEntries: ChildEntry[] = [];

  for (let i = 0; i < rawChunks.length; i++) {
    const raw = rawChunks[i];
    const parentDbId = parentDbIds[i];

    if (raw.content.length <= CHILD_MAX_CHARS) {
      // Small enough: single child
      childEntries.push({
        text: raw.content,
        parentDbId,
        sourceLocation: raw.sourceLocation,
        sectionTitle: raw.sectionTitle,
        sectionPath: raw.sectionPath,
        groupKey: i,
      });
    } else {
      // Split into child chunks
      const sentences = splitBySentences(raw.content);
      const childTexts: string[] = [];
      let current = '';

      for (const sentence of sentences) {
        if ((current + sentence).length > CHILD_MAX_CHARS && current.length > 0) {
          childTexts.push(current.trim());
          current = current.slice(-CHILD_OVERLAP) + sentence;
        } else {
          current += sentence;
        }
      }
      if (current.trim()) childTexts.push(current.trim());

      for (const childText of childTexts) {
        childEntries.push({
          text: childText,
          parentDbId,
          sourceLocation: raw.sourceLocation,
          sectionTitle: raw.sectionTitle,
          sectionPath: raw.sectionPath,
          groupKey: i,
        });
      }
    }
  }

  if (childEntries.length === 0) return;

  // Step 3: Batch embed all child texts
  const childTexts = childEntries.map((c) => c.text);
  const childEmbeddings = await embedBatch(childTexts);

  // Step 4: Insert child chunks with parent reference
  let chunkIndex = rawChunks.length; // continue after parents
  const childDbIds: string[] = [];

  for (let i = 0; i < childEntries.length; i++) {
    const child = childEntries[i];
    const vectorStr = `[${childEmbeddings[i].join(',')}]`;

    const [row] = await sql`
      INSERT INTO chunks (
        file_id, chunk_index, content, embedding, source_location, token_count,
        parent_chunk_id, chunk_type, section_title, section_path
      ) VALUES (
        ${fileId}, ${chunkIndex}, ${child.text}, ${vectorStr}::vector,
        ${JSON.stringify(child.sourceLocation)}, ${estimateTokens(child.text)},
        ${child.parentDbId}, 'child',
        ${child.sectionTitle ?? null}, ${child.sectionPath ?? null}
      )
      RETURNING id
    `;
    childDbIds.push(row.id);
    chunkIndex++;
  }

  // Step 5: Set prev/next sibling IDs for children within same parent group
  const groupIndices = new Map<number, number[]>(); // groupKey -> indices in childEntries
  for (let i = 0; i < childEntries.length; i++) {
    const key = childEntries[i].groupKey;
    if (!groupIndices.has(key)) groupIndices.set(key, []);
    groupIndices.get(key)!.push(i);
  }

  for (const indices of groupIndices.values()) {
    for (let j = 1; j < indices.length; j++) {
      const prevDbId = childDbIds[indices[j - 1]];
      const currDbId = childDbIds[indices[j]];
      await sql`UPDATE chunks SET next_chunk_id = ${currDbId} WHERE id = ${prevDbId}`;
      await sql`UPDATE chunks SET prev_chunk_id = ${prevDbId} WHERE id = ${currDbId}`;
    }
  }
}

async function parseAndChunk(
  fileType: string,
  filename: string,
  buffer: Buffer
): Promise<ChunkData[]> {
  switch (fileType) {
    case 'pdf':
      return chunkPdf(await parsePdf(buffer));
    case 'docx':
      return chunkWord(await parseWord(buffer));
    case 'xlsx':
      return chunkExcel(await parseExcel(buffer));
    case 'image':
      return chunkImage(await parseImage(buffer), filename);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

function chunkPdf(pages: ParsedPage[]): ChunkData[] {
  const chunks: ChunkData[] = [];

  for (const page of pages) {
    const cleanedText = cleanOcrText(page.text);
    if (!cleanedText.trim()) continue;

    const sectionTitle = extractSectionTitle(cleanedText);

    if (cleanedText.length <= PARENT_MAX_CHARS) {
      chunks.push({
        content: cleanedText,
        sourceLocation: { type: 'pdf', page: page.pageIndex },
        sectionTitle,
        chunkType: 'parent',
      });
    } else {
      const segments = splitBySentences(cleanedText);
      let current = '';

      for (const segment of segments) {
        if ((current + segment).length > PARENT_MAX_CHARS && current.length > 0) {
          chunks.push({
            content: current.trim(),
            sourceLocation: { type: 'pdf', page: page.pageIndex },
            sectionTitle: extractSectionTitle(current),
            chunkType: 'parent',
          });
          current = current.slice(-200) + segment;
        } else {
          current += segment;
        }
      }

      if (current.trim()) {
        chunks.push({
          content: current.trim(),
          sourceLocation: { type: 'pdf', page: page.pageIndex },
          sectionTitle: extractSectionTitle(current),
          chunkType: 'parent',
        });
      }
    }
  }

  buildSectionPaths(chunks);
  return chunks;
}

function chunkWord(sections: ParsedSection[]): ChunkData[] {
  const chunks: ChunkData[] = [];

  for (const section of sections) {
    const text = section.text.trim();
    if (!text) continue;

    if (text.length <= PARENT_MAX_CHARS) {
      chunks.push({
        content: text,
        sourceLocation: { type: 'docx', section: section.heading || '未命名章节' },
        sectionTitle: section.heading || undefined,
        chunkType: 'parent',
      });
    } else {
      const segments = splitBySentences(text);
      let current = '';

      for (const segment of segments) {
        if ((current + segment).length > PARENT_MAX_CHARS && current.length > 0) {
          chunks.push({
            content: current.trim(),
            sourceLocation: { type: 'docx', section: section.heading || '未命名章节' },
            sectionTitle: section.heading || undefined,
            chunkType: 'parent',
          });
          current = current.slice(-200) + segment;
        } else {
          current += segment;
        }
      }

      if (current.trim()) {
        chunks.push({
          content: current.trim(),
          sourceLocation: { type: 'docx', section: section.heading || '未命名章节' },
          sectionTitle: section.heading || undefined,
          chunkType: 'parent',
        });
      }
    }
  }

  buildSectionPaths(chunks);
  return chunks;
}

function chunkExcel(sheets: ParsedSheet[]): ChunkData[] {
  const chunks: ChunkData[] = [];

  for (const sheet of sheets) {
    if (sheet.markdown.length <= PARENT_MAX_CHARS) {
      chunks.push({
        content: sheet.markdown,
        sourceLocation: { type: 'xlsx', sheet: sheet.sheetName, rowRange: [1, sheet.rowCount] },
        sectionTitle: sheet.sheetName,
        chunkType: 'parent',
      });
    } else {
      const rows = sheet.markdown.split('\n');
      const headerLines = 2;
      const windowSize = 512;
      let offset = headerLines;

      while (offset < rows.length) {
        const windowRows = rows.slice(0, headerLines).concat(rows.slice(offset, offset + windowSize));
        const markdown = windowRows.join('\n');
        if (markdown.trim()) {
          chunks.push({
            content: markdown,
            sourceLocation: {
              type: 'xlsx',
              sheet: sheet.sheetName,
              rowRange: [offset - headerLines + 1, Math.min(offset + windowSize - headerLines, sheet.rowCount)],
            },
            sectionTitle: sheet.sheetName,
            chunkType: 'parent',
          });
        }
        offset += windowSize;
      }
    }
  }

  return chunks;
}

function chunkImage(parsed: { ocrText: string }, filename: string): ChunkData[] {
  if (!parsed.ocrText.trim()) return [];

  return [{
    content: cleanOcrText(parsed.ocrText),
    sourceLocation: { type: 'image', filename },
    chunkType: 'parent',
  }];
}

// --- OCR Text Cleaning ---

export function cleanOcrText(text: string): string {
  return text
    // Remove repeated standard number headers (page headers)
    .replace(/^(GB\/T\s+\d+[-—]\d+|ICS\s+[\d.]+|Q\s+\d+)$/gm, '')
    // Remove standalone page numbers
    .replace(/^\s*\d{1,3}\s*$/gm, '')
    // Remove copyright notices
    .replace(/版权所有[\s\S]*?不得转载/g, '')
    // Remove repeated document identifiers
    .replace(/^(GB\/T\s+\d+[-—]\d+)\s*$/gm, '')
    // Collapse excessive blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// --- Section Title Extraction ---

const SECTION_PATTERN = /^(\d+(?:\.\d+)*)\s+(.+)$/;

function extractSectionTitle(text: string): string | undefined {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 3)) {
    const match = line.match(SECTION_PATTERN);
    if (match) {
      return match[2].trim();
    }
  }
  return undefined;
}

function buildSectionPaths(chunks: ChunkData[]): void {
  const pathParts: string[] = [];

  for (const chunk of chunks) {
    if (!chunk.sectionTitle) continue;

    const lines = chunk.content.split('\n').map((l) => l.trim()).filter(Boolean);
    for (const line of lines.slice(0, 3)) {
      const match = line.match(SECTION_PATTERN);
      if (match) {
        const numStr = match[1];
        const parts = numStr.split('.');
        pathParts.length = Math.min(parts.length - 1, pathParts.length);
        pathParts.push(numStr);
        chunk.sectionPath = pathParts.join(' > ');
        break;
      }
    }
  }
}

// --- File-Level Metadata Extraction ---

const STANDARD_NUMBER_PATTERN = /(GB\/T\s+\d+[-—]\d+)/;

function extractStandardNumber(text: string): string | undefined {
  const match = text.match(STANDARD_NUMBER_PATTERN);
  return match?.[1];
}

function extractDocumentTitle(text: string, filename: string): string | undefined {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 10)) {
    if (/^(GB|ICS|\d{4}[-—]\d{2}[-—]\d{2}|中国国家标准)/.test(line)) continue;
    if (line.length >= 2 && line.length <= 30 && /[\u4e00-\u9fff]/.test(line)) {
      return line;
    }
  }
  return path.parse(filename).name;
}

// --- Utilities ---

function splitBySentences(text: string): string[] {
  const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'sentence' });
  const segments = segmenter.segment(text);
  return Array.from(segments).map((s) => s.segment);
}

function estimateTokens(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars / 1.5 + otherChars / 4);
}
