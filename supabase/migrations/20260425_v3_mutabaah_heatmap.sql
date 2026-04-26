-- MIGRATION: V3 - Mutabaah Heatmap
-- Tanggal: 15 Okt 2024 (Ekuivalen dengan V3 Release)

-- Tambahkan kolom completed_at di curriculum_tasks
ALTER TABLE curriculum_tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Tambahkan kolom updated_at di notes untuk merekam sintesis logika (jika update)
ALTER TABLE notes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Trigger untuk update notes.updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_notes_updated_at ON notes;
CREATE TRIGGER update_notes_updated_at
BEFORE UPDATE ON notes
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();
