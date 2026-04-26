-- MIGRATION: V4 - PWA & CRDT Integration
-- Tanggal: 15 Okt 2024 (Ekuivalen dengan V4 Release)

-- Tambahkan kolom yjs_state untuk menampung binary update CRDT dari Yjs yang di-encode sebagai Base64 string
ALTER TABLE notes ADD COLUMN IF NOT EXISTS yjs_state text;
