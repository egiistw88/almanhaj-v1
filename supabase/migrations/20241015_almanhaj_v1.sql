-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. Table: books (Manajemen Pustaka)
-- ==========================================
CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  author TEXT,
  category TEXT CHECK (category IN ('Akidah', 'Tasawuf', 'Sirah', 'Fikih', 'Mantiq', 'Keluarga', 'Lainnya')),
  core_premise TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 2. Table: notes (Inkubasi & Jaringan Saraf)
-- ==========================================
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT NOT NULL,
  linked_book_id UUID REFERENCES books(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'inkubasi' CHECK (status IN ('inkubasi', 'permanen')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 3. Table: note_links (Bidirectional Linking)
-- ==========================================
CREATE TABLE note_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  target_note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source_note_id, target_note_id)
);

-- ==========================================
-- 4. Table: curricula (Mutaba'ah & Tracker)
-- ==========================================
CREATE TABLE curricula (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  progress_percentage INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 5. Table: curriculum_tasks (Sub-tasks Mutaba'ah)
-- ==========================================
CREATE TABLE curriculum_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  curriculum_id UUID NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- Indexes (For Performance)
-- ==========================================
CREATE INDEX idx_notes_status_created ON notes(status, created_at DESC);
CREATE INDEX idx_books_category ON books(category);
CREATE INDEX idx_note_links_target on note_links(target_note_id);

-- ==========================================
-- RLS (Row Level Security) Baseline
-- Single-User / Private MVP Mode (Permissive for now logic via app)
-- ==========================================
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE curricula ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_tasks ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for prototyping 
-- (Assuming interaction is controlled strictly via authenticated client later, but open during dev)
CREATE POLICY "Permissive_All_books" ON books FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permissive_All_notes" ON notes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permissive_All_note_links" ON note_links FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permissive_All_curricula" ON curricula FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permissive_All_curriculum_tasks" ON curriculum_tasks FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- Initial Seeding (Library Categories & Sample)
-- ==========================================
-- (Sesuai dengan keputusan tim: Akidah, Tasawuf, Sirah, Fikih, Mantiq, Keluarga)
INSERT INTO books (title, author, category, core_premise) 
VALUES 
  ('Tahafut al-Falasifah', 'Imam Al-Ghazali', 'Mantiq', 'Dekonstruksi rasionalitas murni tanpa koridor wahyu untuk mencapai kepastian.'),
  ('Muqaddimah', 'Ibn Khaldun', 'Sirah', 'Sejarah bukan sekadar rentetan peristiwa, melainkan pemahaman siklus sosiologis (Ashabiyah).');
