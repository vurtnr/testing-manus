-- Parent-Child Chunk relationships and metadata enrichment
ALTER TABLE chunks ADD COLUMN parent_chunk_id UUID REFERENCES chunks(id);
ALTER TABLE chunks ADD COLUMN prev_chunk_id UUID REFERENCES chunks(id);
ALTER TABLE chunks ADD COLUMN next_chunk_id UUID REFERENCES chunks(id);
ALTER TABLE chunks ADD COLUMN section_title TEXT;
ALTER TABLE chunks ADD COLUMN section_path TEXT;
ALTER TABLE chunks ADD COLUMN chunk_type TEXT DEFAULT 'child';
-- 'parent' = large chunk (full paragraph/section), 'child' = small chunk (precise retrieval)

CREATE INDEX idx_chunks_parent ON chunks(parent_chunk_id) WHERE parent_chunk_id IS NOT NULL;
CREATE INDEX idx_chunks_type ON chunks(chunk_type) WHERE chunk_type = 'child';

-- Document-level metadata
ALTER TABLE files ADD COLUMN document_title TEXT;
ALTER TABLE files ADD COLUMN standard_number TEXT;

-- pg_trgm index for Chinese text matching (tsvector 'simple' doesn't handle Chinese)
CREATE INDEX IF NOT EXISTS idx_chunks_content_trgm ON chunks USING gin (content gin_trgm_ops);
