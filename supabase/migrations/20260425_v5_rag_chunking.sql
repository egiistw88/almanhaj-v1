-- MIGRATION: V5 - RAG Chunking
-- Tanggal: 15 Okt 2024 (Ekuivalen dengan V5 Release)

-- 1. Buat Tabel Sub-Chunks
CREATE TABLE IF NOT EXISTS note_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
    content text NOT NULL,
    embedding vector(768)
);

-- 2. Buat Index HNSW untuk Pencarian Kosinus Kecepatan Tinggi
CREATE INDEX IF NOT EXISTS note_embeddings_hnsw_idx 
ON note_embeddings USING hnsw (embedding vector_cosine_ops);

-- 3. Ubah fungsi match_notes untuk mencari via chunk
DROP FUNCTION IF EXISTS match_notes(vector(768), float, int);

CREATE OR REPLACE FUNCTION match_notes(
    query_embedding vector(768),
    match_threshold float,
    match_count int
)
RETURNS TABLE (
    id UUID,
    content text,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id,
        n.content,
        1 - (ne.embedding <=> query_embedding) AS similarity
    FROM note_embeddings ne
    JOIN notes n ON n.id = ne.note_id
    WHERE 1 - (ne.embedding <=> query_embedding) > match_threshold
    ORDER BY ne.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
