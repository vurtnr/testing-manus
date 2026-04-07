import { getDb } from './db';
import { embedText } from './embedding';

export interface RetrievalResult {
  id: string;
  fileId: string;
  content: string;
  sourceLocation: Record<string, any>;
  vectorScore: number;
  ftsScore: number;
  finalScore: number;
  expandedContent?: string;
}

export interface SearchFilters {
  fileId?: string;
  standardNumber?: string;
}

/**
 * Hybrid search: vector similarity + full-text/trigram.
 * Only searches child chunks (parent chunks are reference text, not searchable).
 * For Chinese queries, uses pg_trgm similarity instead of tsvector.
 */
export async function hybridSearch(
  query: string,
  limit = 5,
  filters?: SearchFilters
): Promise<RetrievalResult[]> {
  const sql = getDb();

  const queryEmbedding = await embedText(query);
  const vectorStr = `[${queryEmbedding.join(',')}]`;

  // Detect Chinese characters in query
  const hasChinese = /[\u4e00-\u9fff]/.test(query);

  // Build optional file filter
  const fileFilter = filters?.fileId
    ? sql`AND c.file_id = ${filters.fileId}`
    : sql``;

  let results;

  if (hasChinese) {
    // Chinese FTS: pg_trgm similarity (handles unsegmented Chinese text)
    results = await sql`
      WITH vector_results AS (
        SELECT id, file_id, content, source_location,
               1 - (embedding <=> ${vectorStr}::vector) AS vector_score
        FROM chunks c
        WHERE c.chunk_type = 'child' ${fileFilter}
        ORDER BY embedding <=> ${vectorStr}::vector
        LIMIT 20
      ),
      fts_results AS (
        SELECT id, file_id, content, source_location,
               similarity(c.content, ${query}) AS fts_score
        FROM chunks c
        WHERE c.content % ${query}
          AND c.chunk_type = 'child'
          ${fileFilter}
        ORDER BY similarity(c.content, ${query}) DESC
        LIMIT 20
      ),
      combined AS (
        SELECT COALESCE(v.id, f.id) AS id,
               COALESCE(v.file_id, f.file_id) AS file_id,
               COALESCE(v.content, f.content) AS content,
               COALESCE(v.source_location, f.source_location) AS source_location,
               COALESCE(v.vector_score, 0) AS vector_score,
               COALESCE(f.fts_score, 0) AS fts_score
        FROM vector_results v
        FULL OUTER JOIN fts_results f ON v.id = f.id
      )
      SELECT *, (0.7 * vector_score + 0.3 * fts_score) AS final_score
      FROM combined
      ORDER BY final_score DESC
      LIMIT ${limit}
    `;
  } else {
    // English/mixed FTS: standard tsvector
    results = await sql`
      WITH vector_results AS (
        SELECT id, file_id, content, source_location,
               1 - (embedding <=> ${vectorStr}::vector) AS vector_score
        FROM chunks c
        WHERE c.chunk_type = 'child' ${fileFilter}
        ORDER BY embedding <=> ${vectorStr}::vector
        LIMIT 20
      ),
      fts_results AS (
        SELECT id, file_id, content, source_location,
               ts_rank_cd(to_tsvector('simple', c.content),
                          plainto_tsquery('simple', ${query})) AS fts_score
        FROM chunks c
        WHERE to_tsvector('simple', c.content) @@ plainto_tsquery('simple', ${query})
          AND c.chunk_type = 'child'
          ${fileFilter}
        LIMIT 20
      ),
      combined AS (
        SELECT COALESCE(v.id, f.id) AS id,
               COALESCE(v.file_id, f.file_id) AS file_id,
               COALESCE(v.content, f.content) AS content,
               COALESCE(v.source_location, f.source_location) AS source_location,
               COALESCE(v.vector_score, 0) AS vector_score,
               COALESCE(f.fts_score, 0) AS fts_score
        FROM vector_results v
        FULL OUTER JOIN fts_results f ON v.id = f.id
      )
      SELECT *, (0.7 * vector_score + 0.3 * fts_score) AS final_score
      FROM combined
      ORDER BY final_score DESC
      LIMIT ${limit}
    `;
  }

  return results.map((r: any) => ({
    id: r.id,
    fileId: r.file_id,
    content: r.content,
    sourceLocation: typeof r.source_location === 'string'
      ? JSON.parse(r.source_location)
      : r.source_location,
    vectorScore: Number(r.vector_score),
    ftsScore: Number(r.fts_score),
    finalScore: Number(r.final_score),
  }));
}

/**
 * Expand child chunk hits to include parent + sibling context.
 * Only runs if parent_chunk_id column exists (post-migration).
 */
export async function expandWithNeighbors(
  results: RetrievalResult[]
): Promise<RetrievalResult[]> {
  if (results.length === 0) return results;

  const sql = getDb();

  // Check if parent_chunk_id column exists
  const hasParentCol = await sql`
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chunks' AND column_name = 'parent_chunk_id'
    LIMIT 1
  `;
  if (hasParentCol.length === 0) return results;

  const expanded: RetrievalResult[] = [];

  for (const r of results.slice(0, 5)) {
    // Get parent chunk content
    const parentRows = await sql`
      SELECT content FROM chunks WHERE id = (
        SELECT parent_chunk_id FROM chunks WHERE id = ${r.id} AND parent_chunk_id IS NOT NULL
      )
    `;

    // Get sibling chunks (prev + next)
    const siblingRows = await sql`
      SELECT content FROM chunks
      WHERE id IN (
        SELECT prev_chunk_id FROM chunks WHERE id = ${r.id} AND prev_chunk_id IS NOT NULL
        UNION
        SELECT next_chunk_id FROM chunks WHERE id = ${r.id} AND next_chunk_id IS NOT NULL
      )
    `;

    const parts: string[] = [];

    for (const s of siblingRows) {
      if (s.content && s.content !== r.content) {
        parts.push(s.content);
      }
    }

    // Use parent content if available, otherwise use the hit's own content
    const parentContent = parentRows[0]?.content;
    if (parentContent) {
      parts.push(parentContent);
    } else {
      parts.push(r.content);
    }

    expanded.push({
      ...r,
      expandedContent: parts.join('\n\n'),
    });
  }

  for (let i = 5; i < results.length; i++) {
    expanded.push(results[i]);
  }

  return expanded;
}
