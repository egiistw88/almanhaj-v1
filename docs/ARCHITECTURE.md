# Arsitektur Sistem Al-Manhaj

Dokumen ini menjelaskan rancangan rekayasa piranti lunak (*Software Engineering Design*) yang menggerakkan basis sistem Al-Manhaj, khususnya pendekatan *Offline-First* dan *Semantic Topology*.

## 1. Topologi Arsitektur
Sistem ini menggunakan arsitektur **Client-Side Heavy** yang dilengkapi dengan server *BFF (Backend For Frontend)* menggunakan Express. 

```ascii
[ Browser (Zustand + IndexedDB) ] <---> [ Express Backend ] <---> [ OpenRouter AI ]
             ^                                  ^
             |                                  |
             v                                  v
    [ Supabase (PostgreSQL) ] <-----------------/
```

## 2. Manajemen Prilaku Penyimpanan (State Management)
Pusat memori aplikasi dijalankan di dalam `src/lib/store.ts` yang diformat dengan **Zustand**. Kelebihannya:
- Rekayasa penyimpanan berdasar *dictionary* obyek alih-alih daftar senarai (*Arrays*), sehingga pencarian data O(1).
- Aplikasi berinteraksi murni pada RAM memori peramban, menghasilkan latensi 0ms. Sinkronisasi (Supabase) direpresentasikan secara laten (*background process*).

## 3. Topologi Bidirectional Links (Zettelkasten)
`note_links` pada layer Database dirancang *Many-to-Many*:
- Pada proses penulisan editor, *Parser Regex* mendeteksi pola `[[Teks]]`.
- Teks yang berada di dalam kurung kurawal akan dicurigai sebagai *Entitas Referensi Target*. 
- Sistem mengotomatisasi pencatatan graf ke dalam tabel `note_links` dengan relasi `source_note_id` menuju `target_note_id`.
- Modul Saraf Graf (D3.js) di `PetaPage` bereaksi mengikuti rute simpul (*nodes*).

## 4. Mesin Kecerdasan Buatan (Prompts Guarding)
Al-Manhaj mencegah pencemaran data pengguna (Data Poisoning) dengan Munaqisy Engine, sebuah instruksi pra-kondisi (System Prompt) yang mengunci parameter "Anti Halusinasi Teks Wahyu". 
Engine AI terkunci hanya pada parameter rasional (Syllogism) pada tesis yang dimasukkan secara personal.

## Catatan Kinerja
Data sinkronisasi *Client - Server* disederhanakan dengan *Batched Polling* untuk mengurangi beban permintaan ke basis data *cloud*.
