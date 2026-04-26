-- MIGRATION: V2 - RAG (Retrieval-Augmented Generation) & pgvector
-- Tanggal: 15 Okt 2024 (Ekuivalen dengan V2 Release)

-- 1. Aktifkan ekstensi pgvector (Wajib)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Tambahkan kolom embedding ke tabel notes
-- Catatan: Model 'text-embedding-004' dari Gemini memiliki 768 dimensi.
ALTER TABLE notes ADD COLUMN IF NOT EXISTS embedding vector(768);

-- 3. Tambahkan index HNSW agar pencarian vektor dengan kemiripan kosinus (Cosine Similarity) super cepat
CREATE INDEX ON notes USING hnsw (embedding vector_cosine_ops);

-- 4. Buat fungsi RPC ganda (Remote Procedure Call) untuk mengeksekusi Cosine Similarity di Database Level
CREATE OR REPLACE FUNCTION match_notes(
  query_embedding vector(768),
  match_threshold float,   -- Batas kedekatan (misal: 0.5)
  match_count int,         -- Batas jumlah hasil
  p_current_note_id uuid   -- Pengecualian ID catatan saat ini agar tidak mencocokkan dirinya sendiri
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    notes.id,
    notes.content,
    1 - (notes.embedding <=> query_embedding) AS similarity
  FROM notes
  WHERE 1 - (notes.embedding <=> query_embedding) > match_threshold
    AND notes.id != p_current_note_id
    AND notes.embedding IS NOT NULL
  ORDER BY notes.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
