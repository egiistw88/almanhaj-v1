# Al-Manhaj Knowledge System

**Versi:** 1.0.0 (Release)  
**Tumpukan Teknologi Utama:** React 18, Vite, Express (Backend), Tailwind CSS, Supabase (PostgreSQL), Tiptap Editor, OpenRouter AI.

Al-Manhaj adalah sistem manajemen pustaka dan jaringan pemikiran empirik (Zettelkasten) yang dirancang khusus untuk mewadahi kerangka berpikir cendekiawan dan penuntut ilmu (akademis maupun dirasah Islamiyah). Dibangun dengan arsitektur visual "*Negative Space*" dan prinsip "Zen" yang minim distraksi.

## 🌟 Tiga Pilar Fitur Cerdas (AI Terintegrasi)
Aplikasi ini beroperasi lebih dari sekadar buku catatan, tetapi bertindak sebagai pendamping analitis (_copilot_) Anda:

1. **Munaqisy Engine (Uji Argumen Intelektual):** Bertindak sebagai lawan debat (*Devil's Advocate*) di dalam Editor Catatan. Sorot teks argumen Anda, lalu klik "Uji Argumen". AI akan mencari celah logika (logical fallacy) atau memberikan konter-fakta kritis (Socratic Method) untuk mempertajam kualitas pemikiran Anda.
2. **Arsitek Kurikulum (Mutaba'ah Planner):** Masukkan target besar (misal: "Khatam Syarah Arbain Nawawi dalam 2 Minggu"). AI akan mendekonstruksi target abstrak tersebut menjadi rincian *roadmap* yang realistis dan terukur menjadi langkah-langkah *to-do list* harian Anda.
3. **Murobbi AI (Spaced Repetition & Recall):** Terdapat widget di Dasbor Utama yang membangkitkan ingatan Anda atas arsip catatan yang sudah lama tenggelam. Murobbi AI tidak sekadar bertanya definisi, melainkan memikirkan satu pertanyaan pemantik tingkat tinggi (HOTS) yang memaksa sintesa ulang pengetahuan.

## 🕸️ Fitur Inti Kelola Pengetahuan (Zettelkasten)
- **Inkibator (Penangkap Kilat):** Wadah pemikiran/ide sementara yang melintas cepat. Terdapat asisten AI "Jernihkan Silogisme" yang membantu merapikan diksi yang ruwet agar siap dijadikan catatan permanen.
- **Pustaka (Repositori Referensi):** Manajemen literatur (Kitab, Buku, Jurnal) yang menjadi pondasi kuat penahan rujukan setiap ide Anda. Memiliki fitur identifikasi AI jika informasi penulis kosong.
- **Jaring Saraf (*Bidirectional Linking*):** Gunakan sintaks `[[Judul Catatan]]` di dalam editor untuk menautkan satu konsep dengan kerangka konsep lainnya. Panel Dashboard Munaqisy akan menampilkan *backlinks* secara real-time. Terdapat pula **Saraf Semantik API** yang bisa memindai isi catatan dan merekomendasikan interkoneksi dengan catatan sebelumnya.

---

## 🛠 Instalasi dan Deployment Lokal

Di lingkungan lokal, sistem ini memerlukan backend Express bawaan untuk menutupi eksekusi kunci API (*OpenRouter*) sebagai _proxy_ agar aman dari paparan publik.

### 1. Kloning Repositori
```bash
git clone <URL_REPOSITORI_ANDA>
cd al-manhaj
```

### 2. Instalasi Dependensi
```bash
npm install
```

### 3. Konfigurasi Variabel Lingkungan (Environment)
Aplikasi menggunakan **Supabase SQL** untuk database dan **OpenRouter** untuk tenaga mesin kecerdasan buatan. Salin bentuk di bawah ini ke dalam berkas mandiri `.env.local`:
```env
# OpenRouter Token (Untuk mengakses AI)
OPENROUTER_API_KEY=ur_openrouter_token

# Supabase Auth & DB
VITE_SUPABASE_URL=https://[YOUR_SUPABASE_ID].supabase.co
VITE_SUPABASE_ANON_KEY=[YOUR_SUPABASE_ANON_KEY]
```
*(Catatan: Anda wajib mengeksekusi migrasi Supabase di berkas `supabase/migrations/20241015_almanhaj_v1.sql` menggunakan fitur SQL Editor pada dashboar Supabase agar tabel schema langsung tereksekusi).*

### 4. Nyalakan Reaktor
```bash
npm run dev
```
Bermuara di `http://localhost:3000`.

---

## 🏛 Filosofi Desain Antarmuka

Aplikasi dibangun dari nol dengan menolak estetika bawaan *generative framework* standar. Kami memilih warna jelaga `zinc-950` dan aksen `emerald-500` yang memberikan kesejukan bagi retina mata (Dark Mode murni). Font menggunakan `Cinzel` untuk kesan agung pada judul tulisan, dan `Montserrat` / `Inter` sebagai tulang punggung visibilitas pembacaan naskah yang panjang.

Tidak ada *sidebar* menetap. Semuanya diciptakan untuk bersembunyi sembari menyisakan luas pikiran untuk bernapas dalam mengisi setiap lekuk referensi empirik.

---
_“Ikatlah ilmu dengan menulisnya.” — As-Silsilah_
