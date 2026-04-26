import { useState, useEffect } from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { ZenTextarea } from "@/components/ui/ZenTextarea";
import { ZenButton } from "@/components/ui/ZenButton";
import { ZenModal } from "@/components/ui/ZenModal";
import { ZenInput } from "@/components/ui/ZenInput";
import { ZenSelect } from "@/components/ui/ZenSelect";
import { MinimalCard } from "@/components/ui/MinimalCard";
import { ZenAlert } from "@/components/ui/ZenAlert";
import { NotesService } from "@/lib/notes-service";
import { BooksService } from "@/lib/books-service";
import { formatDate } from "@/lib/utils";
import type { Database } from "@/types/database.types";
import { toast } from "sonner";
import { Info } from "lucide-react";

type NoteRow = Database['public']['Tables']['notes']['Row'];

export default function InkubasiPage() {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [globalError, setGlobalError] = useState("");

  // Inbox state
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);

  // Promosi (Pindah Pustaka) state
  const [promoteNote, setPromoteNote] = useState<NoteRow | null>(null);
  const [bookForm, setBookForm] = useState<{
    title: string;
    author: string;
    category: Database['public']['Tables']['books']['Insert']['category'];
    core_premise: string;
  }>({ title: "", author: "", category: "Lainnya", core_premise: "" });
  const [isPromoting, setIsPromoting] = useState(false);

  // Edit state
  const [editNote, setEditNote] = useState<NoteRow | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    // Show educational toast
    const hasSeenToast = sessionStorage.getItem("toast_inkubasi");
    if (!hasSeenToast) {
       setTimeout(() => {
         toast("Tips Inkubasi", {
            description: "Ketik ide mentah tanpa struktur baku. Biarkan diinkubasi, lalu promosikan jadi catatan permanen kelak.",
            icon: <Info className="w-5 h-5 text-emerald-400" />
         });
         sessionStorage.setItem("toast_inkubasi", "true");
       }, 500);
    }
  }, []);

  const loadNotes = async () => {
    setIsLoadingNotes(true);
    setGlobalError("");
    const res = await NotesService.listInkubasiNotes();
    if (res.ok) {
      setNotes(res.data);
    } else {
      setGlobalError(res.error || "Gagal memuat catatan inkubasi.");
    }
    setIsLoadingNotes(false);
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto-sanitasi sederhana: trim whitespaces
    const trimmedContent = content.trim();
    if (!trimmedContent) return;

    setIsSubmitting(true);
    setFeedback(null);

    const response = await NotesService.createQuickNote(trimmedContent);

    setIsSubmitting(false);

    if (response.ok) {
      setContent("");
      setFeedback({ type: 'success', message: 'Tersimpan ke Inkubasi.' });
      toast.success("Berhasil ditangkap!", { description: "Ide Anda diletakkan dalam rak inkubasi." });
      loadNotes(); // Refresh list automatically
      
      setTimeout(() => setFeedback(null), 3000);
    } else {
      setFeedback({ type: 'error', message: response.error || 'Gagal menyimpan catatan. Periksa koneksi.' });
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleArchive = async (id: string) => {
    // Menghapus window.confirm yang rusak di iframe, dibuat instant action
    const res = await NotesService.updateNote(id, { status: "permanen" });
    if (res.ok) {
      setGlobalError("");
      loadNotes(); // data reload will naturally remove it from Inbox
    } else {
      setGlobalError("Gagal mengarsipkan: " + res.error);
    }
  };

  const handleOpenEdit = (note: NoteRow) => {
    setEditNote(note);
    // Sanitasi ekstra saat edit (trim spasi liar)
    setEditContent(note.content.trim());
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEdit = editContent.trim();
    if (!editNote || !trimmedEdit) return;

    setIsEditing(true);
    const res = await NotesService.updateNote(editNote.id, { content: trimmedEdit });
    setIsEditing(false);

    if (res.ok) {
      setEditNote(null);
      loadNotes();
    } else {
      setGlobalError("Gagal memperbarui catatan: " + (res.error || ""));
      setEditNote(null);
    }
  };

  const handleOpenPromote = (note: NoteRow) => {
    setPromoteNote(note);
    setBookForm({
      title: "",
      author: "",
      category: "Lainnya",
      core_premise: note.content.trim()
    });
  };

  const submitPromote = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = bookForm.title.trim();
    if (!promoteNote || !trimmedTitle) return;

    setIsPromoting(true);

    // 1. Buat Buku
    const bookRes = await BooksService.createBook({
      title: trimmedTitle,
      author: bookForm.author.trim() || undefined,
      category: bookForm.category,
      core_premise: bookForm.core_premise.trim() || undefined,
    });

    if (!bookRes.ok) {
      setGlobalError("Gagal membuat referensi pustaka: " + bookRes.error);
      setIsPromoting(false);
      setPromoteNote(null);
      return;
    }

    // 2. Hubungkan Note ke Buku & Arsipkan (Triage Selesai)
    const noteRes = await NotesService.updateNote(promoteNote.id, {
      linked_book_id: bookRes.data.id,
      status: 'permanen'
    });

    setIsPromoting(false);

    if (noteRes.ok) {
      setPromoteNote(null);
      loadNotes();
    } else {
      setGlobalError("Buku berhasil dibuat, tapi gagal menautkan catatan. " + noteRes.error);
      setPromoteNote(null);
    }
  };

  return (
    <PageContainer>
      {globalError && (
        <ZenAlert 
          message={globalError} 
          onClose={() => setGlobalError("")} 
          className="mb-8"
        />
      )}

      {/* QUICK CAPTURE SECTION */}
      <section>
        <header className="mb-12">
          <SectionTitle>Penangkap Kilat</SectionTitle>
          <p className="text-zinc-500 text-sm mt-4 tracking-wide font-sans">
            Ruang inkubasi. Tulis pemikiran Anda yang belum terstruktur.
          </p>
        </header>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <ZenTextarea 
            placeholder="Tuliskan anomali pikiran, silogisme, atau premis yang terlintas... (Tekan Ctrl+Enter untuk menyimpan)"
            autoFocus
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                if (content.trim() && !isSubmitting) {
                  handleSubmit(e as unknown as React.FormEvent);
                }
              }
            }}
            disabled={isSubmitting}
            className="min-h-[250px] md:min-h-[300px]"
          />
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={async () => {
                  if (!content.trim()) return;
                  setFeedback({ type: 'success', message: 'Membuka tabir silogisme, mohon tunggu...' });
                  try {
                    const res = await fetch('/api/clarify-premise', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ rawText: content })
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Server error');
                    setContent(data.result);
                    setFeedback({ type: 'success', message: '✓ Syllogistic clarity achieved' });
                    setTimeout(() => setFeedback(null), 3000);
                  } catch (e: any) {
                    setFeedback({ type: 'error', message: 'Gagal menjernihkan: ' + e.message });
                  }
                }}
                disabled={!content.trim() || isSubmitting}
                className="relative overflow-hidden group flex items-center gap-2.5 px-4 py-2.5 bg-zinc-950/50 border border-zinc-800 hover:border-indigo-500/50 text-zinc-400 hover:text-indigo-200 rounded transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <svg className="w-3.5 h-3.5 text-indigo-500/80 group-hover:text-indigo-400 transition-all duration-500 group-hover:scale-110 group-hover:rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <span className="text-[10px] font-mono uppercase tracking-[0.15em] relative z-10 pt-[1px]">Jernihkan Silogisme</span>
              </button>
              
              {feedback && (
                <div className={`text-[11px] font-sans px-3 py-2 rounded border animate-fade-in flex items-center gap-2 ${
                  feedback.type === 'success' 
                    ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400/90' 
                    : 'bg-red-500/5 border-red-500/20 text-red-400/90'
                }`}>
                  {feedback.type === 'success' ? (
                     <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  ) : (
                     <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  )}
                  {feedback.message}
                </div>
              )}
            </div>
            
            <ZenButton 
              type="submit" 
              disabled={isSubmitting || !content.trim()}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? "Menyimpan..." : "Simpan ke Inkubasi"}
            </ZenButton>
          </div>
        </form>
      </section>

      {/* INBOX SECTION */}
      <section className="mt-24 pt-16 border-t border-zinc-800/50">
        <header className="mb-8 flex items-baseline justify-between">
          <h2 className="text-xl font-serif text-zinc-100 tracking-wide">Inbox Triage</h2>
          <span className="text-xs font-mono text-zinc-600">{notes.length} Tertunda</span>
        </header>

        {isLoadingNotes ? (
          <div className="text-sm font-sans text-zinc-500 animate-pulse">Menyelaraskan data inkubasi...</div>
        ) : notes.length === 0 ? (
          <div className="text-sm font-sans text-zinc-600 italic">Tidak ada catatan yang belum terstruktur. Ruang inkubasi bersih.</div>
        ) : (
          <div className="space-y-6">
            {notes.map(note => (
              <MinimalCard key={note.id} className="p-6 md:p-8 flex flex-col gap-6">
                <div className="text-sm font-sans text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {note.content}
                </div>
                
                <div className="mt-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-4 border-t border-zinc-800/50">
                  <span className="text-xs font-mono text-zinc-600">{formatDate(note.created_at)}</span>
                  <div className="flex flex-wrap gap-4">
                    <button onClick={() => handleOpenEdit(note)} className="text-xs font-medium tracking-widest uppercase text-zinc-400 hover:text-zinc-100 transition-colors">
                      Edit
                    </button>
                    <button onClick={() => handleOpenPromote(note)} className="text-xs font-medium tracking-widest uppercase text-emerald-400/80 hover:text-emerald-300 transition-colors">
                      Pindah ke Pustaka
                    </button>
                    <button onClick={() => handleArchive(note.id)} className="text-xs font-medium tracking-widest uppercase text-zinc-500 hover:text-red-400 transition-colors">
                      Arsipkan
                    </button>
                  </div>
                </div>
              </MinimalCard>
            ))}
          </div>
        )}
      </section>

      {/* MODAL EDIT */}
      <ZenModal isOpen={!!editNote} onClose={() => setEditNote(null)} title="Kalibrasi Catatan">
        <form onSubmit={submitEdit} className="space-y-8 mt-6">
          <ZenTextarea 
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            className="min-h-[250px]"
            placeholder="Revisi pemikiran Anda..."
          />
          <div className="flex justify-end gap-4">
            <ZenButton type="button" onClick={() => setEditNote(null)} className="border-transparent hover:bg-zinc-800 hover:text-zinc-300 hover:border-transparent">
              Batal
            </ZenButton>
            <ZenButton type="submit" disabled={isEditing || !editContent.trim()}>
              {isEditing ? "Menyimpan..." : "Simpan Pembaruan"}
            </ZenButton>
          </div>
        </form>
      </ZenModal>

      {/* MODAL PROMOTE (PINDAH KE PUSTAKA) */}
      <ZenModal isOpen={!!promoteNote} onClose={() => setPromoteNote(null)} title="Ekstraksi ke Pustaka">
        <form onSubmit={submitPromote} className="space-y-6 mt-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1 block">Judul Buku (Wajib)</label>
              <ZenInput 
                autoFocus
                value={bookForm.title}
                onChange={e => setBookForm({...bookForm, title: e.target.value})}
                placeholder="Mis. Ihya Ulumuddin"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1 block">Penulis (Opsional)</label>
                <ZenInput 
                  value={bookForm.author}
                  onChange={e => setBookForm({...bookForm, author: e.target.value})}
                  placeholder="Mis. Imam Al-Ghazali"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1 block">Kategori</label>
                <div className="relative">
                  <ZenSelect
                    value={bookForm.category || 'Lainnya'}
                    onChange={e => setBookForm({...bookForm, category: e.target.value as any})}
                  >
                    <option value="Akidah">Akidah</option>
                    <option value="Tasawuf">Tasawuf</option>
                    <option value="Sirah">Sirah</option>
                    <option value="Fikih">Fikih</option>
                    <option value="Mantiq">Mantiq</option>
                    <option value="Keluarga">Keluarga</option>
                    <option value="Lainnya">Lainnya</option>
                  </ZenSelect>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-zinc-500 uppercase tracking-widest mt-4 mb-2 block">Core Premise (Diekstrak)</label>
              <ZenTextarea 
                value={bookForm.core_premise}
                onChange={e => setBookForm({...bookForm, core_premise: e.target.value})}
                className="min-h-[150px] text-zinc-300"
              />
              <p className="text-xs text-zinc-600 mt-2 font-sans">
                Catatan inkubasi asli akan diarsipkan (dijadikan permanen) dan ditautkan ke buku ini secara otomatis.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-zinc-800/50">
            <ZenButton type="button" onClick={() => setPromoteNote(null)} className="border-transparent hover:bg-zinc-800 hover:text-zinc-300 hover:border-transparent">
              Batal
            </ZenButton>
            <ZenButton type="submit" disabled={isPromoting || !bookForm.title.trim()}>
              {isPromoting ? "Mengekstraksi..." : "Konversi & Arsipkan"}
            </ZenButton>
          </div>
        </form>
      </ZenModal>

    </PageContainer>
  );
}



