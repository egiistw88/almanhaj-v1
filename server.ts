import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Helper function to call OpenRouter
  async function callOpenRouter(prompt: string, systemPrompt: string) {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not set");
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.3-70b-instruct",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      let errText = await response.text().catch(() => response.statusText);
      throw new Error(`OpenRouter Error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content?.trim();

    if (!resultText) {
      throw new Error("No response from AI");
    }

    return resultText;
  }

  // API Route: Clarify Premise (Penjernih Premis)
  app.post("/api/clarify-premise", async (req, res) => {
    try {
      const { rawText } = req.body;
      if (!rawText) {
        return res.status(400).json({ error: "rawText is required" });
      }

      const prompt = `Tugas Anda: Rapikan dan jernihkan pemikiran mentah berikut menjadi bahasa akademis atau intelektual yang tajam dan terstruktur tanpa mengubah esensi makna aslinya.
Aturan:
1. Perbaiki gramatika dan diksi agar lebih elegan dan presisi.
2. Jika ada istilah Islam/Arab, gunakan transliterasi baku (misal: "maqosid" -> "Maqashid", "bida" -> "Bid'ah").
3. Jika argumennya ruwet, susun ulang menjadi struktur silogisme atau poin-poin logis yang mudah dicerna.
4. JANGAN pernah menambahkan informasi/opini baru yang tidak ada dalam teks asli.
5. HANYA KEMBALIKAN TEKS HASILNYA SAJA. Tanpa basa-basi, tanpa awalan/akhiran.

Pemikiran mentah:
${rawText}`;

      const resultText = await callOpenRouter(
        prompt, 
        "You are an expert editorial assistant specializing in clarifying and structuring academic and Islamic intellectual thoughts. You output only the finalized text."
      );
      
      res.json({ result: resultText });
    } catch (error: any) {
      console.error("AI Clarify Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Route: Munaqisy Mode (Uji Argumen / Debate Partner)
  app.post("/api/test-argument", async (req, res) => {
    try {
      const { selectedText, fullContext } = req.body;
      if (!selectedText) {
        return res.status(400).json({ error: "selectedText is required" });
      }

      const prompt = `Berikut adalah keseluruhan konteks catatan sang murid:
"${fullContext || 'Tidak ada konteks'}"

Berikut adalah argumen/kesimpulan spesifik yang dinukil untuk diuji:
"${selectedText}"

Tugas Anda sebagai Munaqisy: 
1. Evaluasi dan bedah konstruksi logika (premis mayor, minor, kesimpulan) dari argumen di atas.
2. Identifikasi dengan jitu apabila terdapat cacat logika (logical fallacy), asumsi yang tak terbukti, loncatan kesimpulan (non-sequitur), atau kerancuan definisi secara akademis.
3. BATASAN ABSOLUT: Jangan pernah mendebat premis yang berasal dari teks wahyu (Al-Quran/Hadits mutawatir), melainkan ujilah penarikan kesimpulan (istinbath) dan analogi (qiyas) yang dibuat oleh pengguna.
4. Gunakan tulisan prosa dengan frasa bahasa Indonesia baku yang elegan, sopan, namun sangat eksplisit dan presisi (maksimal 2 paragraf padat).
5. Tawarkan konter-fakta dari sudut pandang epistemologi, rasional, atau sumber historis klasik jika relevan.
6. Akhiri dengan satu pertanyaan penutup (sokratis/istifham inkari) yang akan memaksa murid meninjau ulang fondasi metodologi berpikirnya.

HANYA KEMBALIKAN TEKS ANALISIS ANDA. Hindari format bullet points khas robot. Jadilah penguji tesis yang natural dan berwibawa.`;

      const resultText = await callOpenRouter(
        prompt,
        "Anda adalah Munaqisy (penguji akademis dan Murobbi) spesialis logika formal (Manthiq), epistemologi, dan literatur klasik. Anda adalah penguji logika formal. Jangan pernah mendebat premis yang berasal dari teks wahyu (Al-Quran/Hadits mutawatir), melainkan ujilah penarikan kesimpulan (istinbath) dan analogi (qiyas) yang dibuat oleh pengguna. Evaluasi teks secara ketat menggunakan parameter logika formal (premis, silogisme). Hindari gaya bahasa AI/robotik, asisten virtual, atau bias 'woke-ism' modern, sekuler, atau liberal. Analisis Anda harus sopan, berwibawa, beradab, bebas emosi, namun tajam secara intelektual. Bertindaklah layaknya rekan diskusi intelektual tingkat lanjut atau penguji disertasi yang kredibel yang menjunjung 'worldview' Islam empiris dan rasional."
      );

      res.json({ critique: resultText });
    } catch (error: any) {
      console.error("Munaqisy Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Route: Pengekstrak Kitab Induk (Metadata Auto-Fill)
  app.post("/api/identify-book", async (req, res) => {
    try {
      const { title } = req.body;
      if (!title) {
        return res.status(400).json({ error: "title is required" });
      }

      const prompt = `Saya ingin menyimpan data kitab/buku literatur Islam klasik atau modern. 
Judul: "${title}"

Tugas Anda: Berikan saya meta data kitab tersebut dalam format JSON murni TANPA markdown (\`\`\`) atau penjelasan tambahan.
Bentuk JSON yang saya inginkan:
{
  "author": "Nama Penulis",
  "category": "Pilih satu dari: Akidah, Tasawuf, Sirah, Fikih, Mantiq, Keluarga, Lainnya",
  "core_premise": "Intisari kitab/premis utamanya dalam 1-2 kalimat (bahasa Indonesia padat dan jelas)."
}

Hanya kembalikan JSON. Jika kitab tidak dikenal, berikan jawaban sebaik mungkin atau gunakan kategori 'Lainnya'.`;

      const resultText = await callOpenRouter(
        prompt,
        "Anda adalah pustakawan asisten khusus literatur Islam yang hanya merespon format JSON."
      );
      
      let parsedData;
      try {
        // Coba bersihkan markdown jika AI bandel
        const cleanJsonString = resultText.replace(/```json/gi, '').replace(/```/gi, '').trim();
        parsedData = JSON.parse(cleanJsonString);
      } catch (e) {
        throw new Error("Gagal memparsing jawaban AI sebagai JSON: " + resultText);
      }

      res.json(parsedData);
    } catch (error: any) {
      console.error("Identify Book Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Route: AI Curriculum Planner
  app.post("/api/generate-roadmap", async (req, res) => {
    try {
      const { target } = req.body;
      if (!target) {
        return res.status(400).json({ error: "target is required" });
      }

      const prompt = `Saya ingin mencapai target pembelajaran/keilmuan berikut: "${target}".
Tugas Anda: Bertindak sebagai 'Arsitek Kurikulum'. Dekonstruksi dan pecahkan target besar ini menjadi rute pembelajaran (Syllabus/Roadmap) yang realistis, bertahap, dan konkrit.
Aturan:
1. Setiap langkah harus spesifik (misal bukan "Baca buku", tapi "Sesi 1: Baca Pendahuluan & Bab 1").
2. Berikan dalam bahasa Indonesia yang baku dan memotivasi.
3. Batasi total langkah antara 5 hingga maksimal 20 langkah, menyesuaikan cakupan target.
4. KEMBALIKAN HANYA ARRAY JSON STRING MURNI. Tanpa blok markdown (\`\`\`), tanpa penutup/awalan kata.
Contoh Valid: ["Sesi 1: Pengantar", "Sesi 2: Definisi Konsep Utama", "Sesi 3: Praktik Lapangan"]`;

      const resultText = await callOpenRouter(
        prompt,
        "You are an expert curriculum designer and syllabus architect. You output only a strict JSON array of strings, with no syntax errors and no conversational filler."
      );
      
      let parsedData;
      try {
        const cleanJsonString = resultText.replace(/```json/gi, '').replace(/```/gi, '').trim();
        parsedData = JSON.parse(cleanJsonString);
        if (!Array.isArray(parsedData)) throw new Error("Bukan array");
      } catch (e) {
        throw new Error("Gagal mengekstrak roadmap: " + resultText);
      }

      res.json({ roadmap: parsedData });
    } catch (error: any) {
      console.error("AI Roadmap Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Route: AI Muraja'ah Generator
  app.post("/api/generate-murajaah", async (req, res) => {
    try {
      const { noteTitle, noteContent } = req.body;
      if (!noteContent) {
        return res.status(400).json({ error: "noteContent is required" });
      }

      const prompt = `Berikut adalah intisari catatan masa lalu saya (Judul: "${noteTitle || 'Tanpa Judul'}"):
"${noteContent.substring(0, 5000)}"

Tugas Anda: Bertindaklah sebagai Murobbi (Pembimbing) ahli teknik 'Spaced Repetition'.
Saya ingin menguji ingatan saya terhadap materi di atas. Susunlah SATU pertanyaan esai pemantik tingkat tinggi (HOTS - Higher Order Thinking Skills) yang menuntut pemahaman konseptual, bukan sekadar hafalan literal. Jangan memulai dengan kata-kata seperti "Apakah Anda ingat...", langsung todongkan pertanyaan kritisnya.
Contoh: "Anda pernah membahas relasi antara 'Adab' dan 'Ilmu'. Jika dihadapkan pada murid yang genius namun nir adab, bagaimana framework catatan ini memberikan solusi riil?"
HANYA kembalikan teks pertanyaan Anda. Maksimal 2 kalimat. Pendek, tajam, dan memancing memori!`;

      const resultText = await callOpenRouter(
        prompt,
        "You are an expert cognitive mentor. You produce single, sharp trigger questions to test knowledge retention. You output only the question string."
      );

      res.json({ question: resultText });
    } catch (error: any) {
      console.error("Murajaah Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // In express 4, Use '*' for fallback
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
