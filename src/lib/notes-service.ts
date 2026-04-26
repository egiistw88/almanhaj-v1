import { supabase } from "./supabase";
import { QuickCaptureSchema } from "./validations";
import { syncNoteLinks } from "./link-parser";
import type { Database } from "@/types/database.types";
import type { ServiceResponse } from "@/types/service.types";

type NoteRow = Database['public']['Tables']['notes']['Row'];
type NoteUpdate = Database['public']['Tables']['notes']['Update'];

export const NotesService = {
  async createQuickNote(content: string): Promise<ServiceResponse<NoteRow>> {
    try {
      // 1. Zod Validation
      const validated = QuickCaptureSchema.parse({ content });
      
      // 2. Data Logic Layer
      const { data, error } = await supabase
        .from('notes')
        .insert([{ content: validated.content, status: 'inkubasi' }])
        .select()
        .single();

      if (error) throw error;
      
      // 3. Sync Bidirectional Links
      if (data) {
        await syncNoteLinks(data.id, data.content);
      }
      
      return { ok: true, data };
    } catch (err: any) {
      return { ok: false, error: err.message || "Gagal menyimpan catatan kilat" };
    }
  },

  async listInkubasiNotes(): Promise<ServiceResponse<NoteRow[]>> {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('status', 'inkubasi')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { ok: true, data };
    } catch (err: any) {
      return { ok: false, error: err.message || "Gagal memuat daftar inkubasi" };
    }
  },

  async listAllNotes(): Promise<ServiceResponse<NoteRow[]>> {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { ok: true, data };
    } catch (err: any) {
      return { ok: false, error: err.message || "Gagal memuat semua catatan" };
    }
  },

  async getNoteById(id: string): Promise<ServiceResponse<NoteRow>> {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return { ok: true, data };
    } catch (err: any) {
      return { ok: false, error: err.message || "Catatan tidak ditemukan" };
    }
  },

  async getAllLinks(): Promise<ServiceResponse<{source_note_id: string, target_note_id: string}[]>> {
    try {
      const { data, error } = await supabase
        .from('note_links')
        .select('source_note_id, target_note_id');
      if (error) throw error;
      return { ok: true, data };
    } catch (err: any) {
      return { ok: false, error: err.message || "Gagal memuat semua tautan" };
    }
  },

  async getBacklinks(noteId: string): Promise<ServiceResponse<{ id: string, content: string, status: string }[]>> {
    try {
      const { data, error } = await supabase
        .from('note_links')
        .select(`
          source_note_id,
          source_note:notes!note_links_source_note_id_fkey(id, content, status)
        `)
        .eq('target_note_id', noteId);

      if (error) throw error;
      
      // Extract just the note data to return a clean list
      const backlinks = data.map((d: any) => d.source_note).filter(Boolean);
      return { ok: true, data: backlinks };
    } catch (err: any) {
      return { ok: false, error: err.message || "Gagal memuat backlinks" };
    }
  },

  async getOutgoingLinks(noteId: string): Promise<ServiceResponse<{ id: string, content: string, status: string }[]>> {
    try {
      const { data, error } = await supabase
        .from('note_links')
        .select(`
          target_note_id,
          target_note:notes!note_links_target_note_id_fkey(id, content, status)
        `)
        .eq('source_note_id', noteId);

      if (error) throw error;
      
      const outgoing = data.map((d: any) => d.target_note).filter(Boolean);
      return { ok: true, data: outgoing };
    } catch (err: any) {
      return { ok: false, error: err.message || "Gagal memuat tautan keluar" };
    }
  },

  async updateNote(id: string, input: NoteUpdate): Promise<ServiceResponse<NoteRow>> {
    try {
      const { data, error } = await supabase
        .from('notes')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // 3. Sync Bidirectional Links Graph
      if (input.content !== undefined) {
        await syncNoteLinks(data.id, data.content);
      }

      return { ok: true, data };
    } catch (err: any) {
      return { ok: false, error: err.message || "Gagal memperbarui catatan" };
    }
  },

  async deleteNote(id: string): Promise<ServiceResponse<null>> {
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      return { ok: true, data: null };
    } catch (err: any) {
      return { ok: false, error: err.message || "Gagal menghapus catatan" };
    }
  },

  async injectSeedKnowledge(): Promise<ServiceResponse<boolean>> {
    try {
      // 1. Create Seed Books
      const book1Id = crypto.randomUUID();
      const book2Id = crypto.randomUUID();
      
      const seedBooks = [
        {
          id: book1Id,
          title: "Bidayatul Hidayah",
          author: "Imam Al-Ghazali",
          category: "Tasawuf" as const,
          core_premise: "Panduan awal bagi seorang pencari kebenaran dalam menata hati dan kesehariannya."
        },
        {
          id: book2Id,
          title: "Mabadi' Ilmu Mantiq",
          author: "Syekh Damanhuri",
          category: "Mantiq" as const,
          core_premise: "Kaidah-kaidah dasar dalam menjaga nalar dan logika berpikir yang lurus."
        }
      ];

      for (const book of seedBooks) {
        const { error } = await supabase.from('books').insert([book]);
        if (error) console.warn("Failed to insert book:", error.message);
      }

      // 2. Create Seed Curriculum
      const curriculumId = crypto.randomUUID();
      const curriculum = {
        id: curriculumId,
        title: "Pondasi Penuntut Ilmu",
        progress_percentage: 0
      };

      const { error: currError } = await supabase.from('curricula').insert([curriculum]);
      if (currError) console.warn("Failed to insert curriculum:", currError.message);

      const seedTasks = [
        { id: crypto.randomUUID(), curriculum_id: curriculumId, title: "Membaca Muqaddimah Bidayatul Hidayah", order_index: 0, is_completed: false },
        { id: crypto.randomUUID(), curriculum_id: curriculumId, title: "Memahami Pengertian Mantiq", order_index: 1, is_completed: false },
        { id: crypto.randomUUID(), curriculum_id: curriculumId, title: "Menghubungkan Adab dengan Mantiq", order_index: 2, is_completed: false },
      ];

      for (const task of seedTasks) {
        const { error: taskError } = await supabase.from('curriculum_tasks').insert([task]);
        if (taskError) console.warn("Failed to insert task:", taskError.message);
      }

      // 3. Create Seed Notes
      const notes = [
        {
          id: crypto.randomUUID(),
          linked_book_id: book1Id,
          status: "permanen" as const,
          content: "<h1>Adab Menuntut Ilmu</h1>\n<p>Sebelum mempelajari ilmu, seorang penuntut ilmu harus membenahi niat dan mempelajari adab terlebih dahulu. Ilmu tanpa adab seperti badan tanpa ruh, ia tidak akan membuahkan manfaat yang hakiki.</p>\n<p>Terkait dengan ini, sebelum kita mengasah akal melalui [[Logika Formal (Mantiq)]], kita wajib menuntut ketekunan dan kesucian niat sebagaimana diajarkan oleh para ulama.</p>"
        },
        {
          id: crypto.randomUUID(),
          linked_book_id: book2Id,
          status: "permanen" as const,
          content: "<h1>Logika Formal (Mantiq)</h1>\n<p>Mantiq adalah alat (instrumen) yang menjaga akal pikiran dari kesalahan berpikir. Ini adalah pondasi dari segala macam cabang keilmuan untuk membedakan antara yang haq dan batil dari sisi argumentasi.</p>\n<p>Namun perlu diingat, sebelum mendalami hal ini, pastikan kita memahami [[Adab Menuntut Ilmu]] dengan baik. Di dalam mantiq, prinsip yang paling mutlak pertama kali diakui akal adalah [[Hukum Identitas]].</p>\n<p>Selain itu, Mantiq juga membagi pengetahuan manusia menjadi dua: [[Dharuri dan Nazhari]].</p>"
        },
        {
          id: crypto.randomUUID(),
          linked_book_id: book2Id,
          status: "permanen" as const,
          content: "<h1>Hukum Identitas</h1>\n<p>Hukum Identitas adalah salah satu dari kaidah dasar logika (Aksioma Kehidupan/Keniscayaan). Ia menyatakan bahwa segala sesuatu sama persis dengan dirinya sendiri (A = A).</p>\n<p>Dalam memahami ilmu [[Logika Formal (Mantiq)]], hukum ini adalah landasan paling mendasar. Ia dharuriyat (pasti) dikenali akal tanpa perlu bukti eksternal lebih jauh.</p>"
        },
        {
          id: crypto.randomUUID(),
          linked_book_id: book2Id,
          status: "permanen" as const,
          content: "<h1>Dharuri dan Nazhari</h1>\n<p>Pengetahuan manusia dapat dibedakan dalam dua konsepsi besar:</p>\n<ul>\n<li><strong>Dharuri (Aksiomatik):</strong> Ilmu yang diperoleh tanpa perlu berpikir, menganalisa, atau merenung. Contoh: Mengetahui bahwa 1 adalah setengah dari 2.</li>\n<li><strong>Nazhari (Teoritik):</strong> Ilmu yang membutuhkan perenungan dan pembuktian logika formal untuk mencapainya. Karena sifatnya ini, akal sangat rentan tergelincir, sehingga harus diikat dengan kaidah [[Logika Formal (Mantiq)]].</li>\n</ul>"
        },
        {
          id: crypto.randomUUID(),
          linked_book_id: book1Id,
          status: "inkubasi" as const,
          content: "<h1>Mengikat Ilmu dengan Tulisan</h1>\n<p>Ilmu ibarat buruan liar, dan menulis adalah tali pengikatnya. Catatan kecil sangat berguna untuk menangkap jejak pikiran sebelum ia menguap dari kepala.</p>\n<p>Konsep ini sangat relevan untuk zettelkasten, sekaligus menjadi pondasi keberhasilan [[Adab Menuntut Ilmu]] kita. (Masih perlu di-expand lagi bagian korelasinya dengan daya ingat manusia)</p>"
        }
      ];

      for (const note of notes) {
        const { id, content, status, linked_book_id } = note;
        const { error } = await supabase.from('notes').insert([{ id, content, status, linked_book_id }]);
        if (error) console.warn("Failed to insert note:", error.message);
        
        // Ensure backlinks are resolved properly for each injected note
        await syncNoteLinks(id, content);
      }

      return { ok: true, data: true };
    } catch (err: any) {
      console.error(err);
      return { ok: false, error: err.message || "Gagal menyuntikkan Pustaka Benih" };
    }
  }
};
