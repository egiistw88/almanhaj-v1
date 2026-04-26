# 📜 UAT Script: Al-Manhaj MVP (v1.0.0)

Dokumen ini berisi skenario User Acceptance Testing (UAT) untuk memastikan semua _core flow_ MVP Al-Manhaj berjalan sesuai standar spesifikasi produk (PRD).

## Pra-syarat (Pre-conditions)
1. Aplikasi berjalan secara lokal atau telah di-deploy (contoh: Vercel).
2. Terdapat koneksi internet aktif.
3. Database Supabase sudah memiliki _schema_ tabel `notes`, `books`, `curricula`, `curriculum_tasks`, dan `note_links`.

---

## 🧪 Skenario 1: Penangkap Kilat (Quick Capture) & Inkubasi
**Tujuan:** Memastikan ide dapat ditangkap dalam waktu kurang dari 15 detik.

1. Buka halaman `/inkubasi`.
2. **Observasi:** Kursor harus secara otomatis berfokus (_autofocus_) pada area penulisan besar (_textarea_).
3. Ketik: `Ini adalah observasi kilat mengenai konsep X.`
4. Tekan tombol **Simpan ke Inkubasi**.
5. **Ekspektasi Hasil:**
   - Tombol berubah menjadi "Menyimpan...".
   - Teks input dikosongkan secara otomatis pasca berhasil.
   - Muncul _inline alert_ hijau berbunyi "Tersimpan ke Inkubasi.".
   - Catatan tersebut muncul di deretan atas daftar "Inbox Triage" di bawahnya.
   - Waktu total (ketik -> simpan) < 15 detik.

---

## 🧪 Skenario 2: Inkubasi ke Pustaka (Triage Flow)
**Tujuan:** Mengonversi catatan raw menjadi referensi literatur yang terstruktur.

1. Pada daftar "Inbox Triage" di halaman `/inkubasi`, temukan catatan dari Skenario 1.
2. Klik tombol **Pindah ke Pustaka**.
3. **Observasi:** Modal "Ekstraksi ke Pustaka" terbuka, dan kolom "Core Premise" otomatis terisi dengan teks catatan tersebut.
4. Isi "Judul Literatur" dengan `Buku Ujian Pertama`. Pilih kategori `Fikih`.
5. Tekan **Konversi & Arsipkan**.
6. **Ekspektasi Hasil:**
   - Modal tertutup dengan sendirinya.
   - Catatan di "Inbox Triage" menghilang (telah diarsipkan dengan status _permanen_).
7. Buka halaman `/pustaka`.
8. **Ekspektasi Hasil:**
   - Buku `Buku Ujian Pertama` muncul di daftar.
   - Ketik `Ujian` di kolom pencarian. Hasil harus terfilter seketika di sisi _client_.

---

## 🧪 Skenario 3: Jaringan Pemikiran dengan Token `[[...]]`
**Tujuan:** Memvalidasi mesin _bidirectional linking_ dan kemulusan navigasi.

1. Buat catatan baru di Inkubasi, lalu pindahkan/simpan, atau langsung buka entitas catatan apa pun rintisan Anda yang terdapat di halaman `/dashboard` melalui fitur Aktivitas Terakhir (atau buat manual).
2. Di dalam editor (halaman `/catatan/[id]`), ketik: `Mengingat kembali konsep pada bagian [[Logika Aristoteles]].`
3. Tunggu ±1.5 detik hingga ada indikasi "Tersimpan Abadi" di kanan atas (Autosave bekerja).
4. **Ekspektasi Hasil:**
   - Panel bawah "Merujuk Ke Luar (Forward)" langsung di-_update_ saat halaman di-_refresh_ atau di muat ulang.
   - Tautan `Logika Aristoteles` terdeteksi. Karena belum pernah eksis, ia ditandai sebagai **[ BUAT CATATAN ]** dengan pesan "Kekosongan terdeteksi."
5. Klik tautan `Logika Aristoteles` tersebut di panel Forward.
6. **Ekspektasi Hasil:**
   - Editor seketika _remount_ membuat/membuka halaman rintisan baru ("Logika Aristoteles").
   - Cek panel "Merujuk Ke Sini (Backlinks)". Pastikan ada 1 entitas merujuk yang merujuk ke catatan asli (dari Step 2).

---

## 🧪 Skenario 4: Mutaba'ah & Kurikulum 
**Tujuan:** Validasi kalkulasi progres sekuensial.

1. Buka halaman `/mutabaah`.
2. Pada input di puncak aplikasi, ketik `Penjelajahan Sirah Nabawiyah` dan klik **Buat**.
3. Di dalam blok kurikulum yang baru dibuat, isi input "Tambah langkah..." dengan `Fase Makkiyah`, klik "Tambah".
4. Tambahkan langkah kedua: `Fase Madaniyah`, klik "Tambah".
5. **Observasi:** Progres bar harus menunjukkan angka `0%`.
6. Centang _checkbox_ pada `Fase Makkiyah`.
7. **Ekspektasi Hasil:**
   - Animasi progres bar akan terisi.
   - Angka _realtime_ persentase berubah langsung menjadi `50%`.
8. Refresh peramban (_browser_).
9. **Ekspektasi Hasil:**
   - Data bertahan (_persistent_). Progres tetap `50%` dan _checkbox_ Makkiyah masih berstatus tercentang. 

---

## 🏁 Final Sign-off
Jika seluruh skenario di atas dapat dilewati tanpa error 500, tanpa antarmuka yang pecah di _mobile viewport_, serta seluruh aksi bersifat instan (loading & _feedback non-intrusif_ hadir), maka **Fase 0 MVP dinyatakan LULUS (GOLD MASTER)**.
