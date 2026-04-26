# Al-Manhaj: Zettelkasten & Second Brain Terotomasi

**Versi:** 1.0.0 (Production-Ready)  
**Lisensi:** Terbuka (Open Source)

Al-Manhaj adalah sistem *Visual Second Brain* (Zettelkasten) yang dirancang khusus bagi para akademisi, cendekiawan, dan penuntut ilmu (Dirasah Islamiyah). Al-Manhaj memadukan ketenangan ruang *Negative Space* dengan kekuatan Saraf Semantik AI untuk memastikan setiap gagasan, kutipan, dan catatan pembelajaran Anda tidak menjadi kuburan data, melainkan berjalinan menjadi struktur pengetahuan yang kokoh dan aplikatif.

---

## 🌟 Fitur Inti (Core Features)

### 1. Zettelkasten Murni & Pencegahan Distorsi
- **Kotak Inkubasi:** Tangkap ide mentah dengan cepat. Biarkan ide "masak" sebelum dipromosikan (arsip) menjadi catatan permanen ilmiah.
- **Topologi Peta Pengetahuan (Graph View):** Visualisasi relasi ide menggunakan teknologi rendering interaktif (D3.js). Sistem secara otomatis mengaitkan ide (_bidirectional linking_) dari format `[[Judul Target]]`.
- **Sistem Anti "Catatan Yatim" (Orphaned Notes Guard):** Deteksi dan saring catatan yang tidak memiliki minimum 1 tautan (0 connections) ke catatan lain untuk mencegah fragmen informasi yang tewas (dead-end knowledge).

### 2. Munaqisy AI Engine (Penguji Kesahihan)
Lebih dari sekadar buku digital, AI (OpenRouter) ditanamkan untuk mensimulasikan sidang tertutup terhadap tesis Anda:
- **Uji Argumen (Devil's Advocate):** Mendeteksi cacat logika (logical fallacy) dari argumen.
- **Restriksi Teologi Absolut:** (*Prompt System Tuning* tingkat tinggi). AI dilarang keras menggunakan standar sekuler untuk mendebat validitas literatur *Qat'i* (wahyu/hadits mutawatir), dan secara ketat hanya akan menguji validitas *Istinbath* (penarikan kesimpulan) dan *Qiyas* (analogi) dari penulis.

### 3. Keamanan Data Psikis & Pragmatis (Zero Lock-In)
- **Ekspor Mandiri Massal:** Anda memegang kendali penuh 100% terhadap harta karun pemikiran Anda. Ekspor seluruh *database* secara instan ke dalam zip berisikan fail **Markdown murni (.md)** (dilengkapi YAML *frontmatter* metadata). Anda bebas migrasi kapan saja ke Obsidian, Logseq, atau ekosistem *offline* lain. Sistem menggunakan `JSZip` dan `FileSaver`.

### 4. Manajemen Kurikulum (Mutaba'ah)
- Rencanakan tahapan pembelajaran buku/tuntunan dengan tugas tersetruktur, bilah progresif visual, dan *milestone* penanda (*tracking*).

---

## 🛠 Tumpukan Teknologi (Tech Stack)

Aplikasi dibangun modern dengan standar _Local-First_ & *Cloud Sync*:
* **Frontend:** React 18, React Router v6, TypeScript Strict.
* **Styling/UI:** Tailwind CSS v3, Konsep *Mental Canvas* (Lucide Icons).
* **State Management & Offline Support:** Zustand dengan adaptasi sinkronisasi mutakhir ke *local state*.
* **Database & BaaS:** Supabase (PostgreSQL 15), dengan relasi Foreign Keys kokoh.
* **AI Provider:** OpenRouter API (Agnostik LLM) terisolasi di sisi Server (Express Backend Middleware).

---

## 🚀 Panduan Instalasi (Development & Deployment)

**Syarat Prasyarat:**
1. Node.js (v18+)
2. Akun Supabase (Database kosong / *Project* baru)
3. Akun OpenRouter (API Key)

### 1. Kloning & Persiapan Modul
```bash
git clone <URL_REPOSITORI_ANDA> al-manhaj
cd al-manhaj
npm install
```

### 2. Konfigurasi Variabel Environment (`.env.local`)
Buat fail lingkungan tersembunyi berdasar templat bawaan:
```env
# OpenRouter API untuk Munaqisy Engine (Opsional)
OPENROUTER_API_KEY=sk-or-v1-xxx-xxx

# Kredensial Akses Database Supabase
VITE_SUPABASE_URL=https://xxxxxxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR....
```

### 3. Basis Data (Supabase SQL Migration)
Jalankan fail migrasi DDL yang berada di dalam folder `supabase/migrations/` pada **SQL Editor** yang terdapat pada *dashboard* Supabase Anda. Seluruh skema (tabel, RLS, kaitan *note_links*) akan ter-bangun seketika.

### 4. Aktivasi Server Pembangunan (Dev Server)
Aplikasi di-rancang dengan konfigurasi _full-stack_ (Express + Vite) terpadu:
```bash
npm run dev
```
Akses layar utama dari peramban (browser) di URL: `http://localhost:3000`.

---

## 📂 Tata Letak Direktori (Project Structure)

```text
al-manhaj/
├── src/
│   ├── components/  # Modul antar muka global (Cards, Modals, Editor)
│   ├── lib/         # Layanan pusat (Zustand store, Supabase client, Parser)
│   ├── pages/       # Rute Halaman (Dashboard, Inkubasi, Peta, dsb)
│   ├── types/       # Definisi Database (TypeScript Interfaces)
│   ├── index.css    # Penyesuaian Tailwind (Theming & Font Import)
│   └── main.tsx     # Reaktor Akar
├── server.ts        # Node.js Server (Proxy OpenRouter & Vite dev-server)
├── docs/            # Dokumen arsitektur teknis lebih mendalam
└── package.json     # Manuskrip Manajer Paket
```

---

## 🛡 Keamanan Arsitektur Data
- **Data Rahasia:** Kami mengamankan paparan kunci OpenRouter API dengan pemrosesan _server-side_ murni menggunakan server Express. Akses AI terjadi dari sisi Peladen, bukan di Klien (browser) secara serampangan.
- **Isolasi Koneksi:** Penalian logika AI secara sadar disensor agar menghargai ruang pribadi karya Zettelkasten lokal pengguna tanpa menimbun (*scraping*) untuk melatih LLM komersil.

---

> *"Seburuk-buruknya ingatan adalah sebaik-baiknya tinta. Namun sebaik-baiknya tinta yang tak memiliki persambungan makna, adalah lautan kertas yang bisu."* — **Al-Manhaj Knowledge Base Architecture**.
