import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, Sparkles } from "lucide-react";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { MinimalCard } from "@/components/ui/MinimalCard";
import { ZenButton } from "@/components/ui/ZenButton";
import { ZenModal } from "@/components/ui/ZenModal";
import { ZenInput } from "@/components/ui/ZenInput";
import { ZenSelect } from "@/components/ui/ZenSelect";
import { ZenTextarea } from "@/components/ui/ZenTextarea";
import { ZenAlert } from "@/components/ui/ZenAlert";
import { BooksService } from "@/lib/books-service";
import { formatDate } from "@/lib/utils";
import type { Database } from "@/types/database.types";

type BookRow = Database['public']['Tables']['books']['Row'];
type Category = Database['public']['Tables']['books']['Insert']['category'];

export default function PustakaPage() {
  const [books, setBooks] = useState<BookRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [globalError, setGlobalError] = useState("");

  // Search Params (URL Sync)
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") || "";
  const catQuery = searchParams.get("cat") || "Semua";
  const sortQuery = searchParams.get("sort") || "newest";

  const updateParams = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== 'Semua' && value !== 'newest' && value !== '') {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [identifyFeedback, setIdentifyFeedback] = useState<{type: 'success'|'error', msg: string} | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    title: string;
    author: string;
    category: Category;
    core_premise: string;
  }>({
    title: "",
    author: "",
    category: "Lainnya",
    core_premise: ""
  });

  // Delete State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmTitle, setDeleteConfirmTitle] = useState("");

  const loadBooks = async () => {
    setIsLoading(true);
    setGlobalError("");
    const res = await BooksService.listBooks();
    if (res.ok) {
      setBooks(res.data);
    } else {
      setGlobalError(res.error || "Gagal memuat pustaka.");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadBooks();
  }, []);

  const handleOpenCreate = () => {
    setModalMode('create');
    setEditingId(null);
    setFormData({ title: "", author: "", category: "Lainnya", core_premise: "" });
    setIdentifyFeedback(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (book: BookRow) => {
    setModalMode('edit');
    setEditingId(book.id);
    setFormData({
      title: book.title.trim(),
      author: book.author ? book.author.trim() : "",
      category: book.category || "Lainnya",
      core_premise: book.core_premise ? book.core_premise.trim() : ""
    });
    setIdentifyFeedback(null);
    setIsModalOpen(true);
  };

  const handleIdentifyBook = async () => {
    if (!formData.title.trim()) return;
    setIsIdentifying(true);
    setIdentifyFeedback(null);
    try {
      const res = await fetch('/api/identify-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: formData.title.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');

      const validCategories = ["Akidah", "Tasawuf", "Sirah", "Fikih", "Mantiq", "Keluarga", "Lainnya"];
      const extractedCategory = validCategories.includes(data.category) ? data.category : "Lainnya";

      setFormData(prev => ({
        ...prev,
        author: data.author || prev.author,
        category: extractedCategory as Category,
        core_premise: data.core_premise || prev.core_premise
      }));
      setIdentifyFeedback({ type: 'success', msg: '✓ Meta data kitab berhasil disurihkan' });
      setTimeout(() => setIdentifyFeedback(null), 3000);
    } catch (e: any) {
      setIdentifyFeedback({ type: 'error', msg: 'Gagal mengekstrak: ' + e.message });
      setTimeout(() => setIdentifyFeedback(null), 4000);
    } finally {
      setIsIdentifying(false);
    }
  };

  const handleDeleteClick = (id: string, title: string) => {
    setDeleteConfirmId(id);
    setDeleteConfirmTitle(title);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    
    setGlobalError("");
    const res = await BooksService.deleteBook(deleteConfirmId);
    if (res.ok) {
      setDeleteConfirmId(null);
      loadBooks();
    } else {
      setGlobalError("Gagal menghapus pustaka: " + res.error);
      setDeleteConfirmId(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = formData.title.trim();
    if (!trimmedTitle) return;

    setIsSubmitting(true);
    setGlobalError("");

    const payload = {
      title: trimmedTitle,
      author: formData.author.trim() || undefined,
      category: formData.category,
      core_premise: formData.core_premise.trim() || undefined,
    };

    let res;
    if (modalMode === 'create') {
      res = await BooksService.createBook(payload);
    } else {
      res = await BooksService.updateBook(editingId!, payload);
    }

    setIsSubmitting(false);

    if (res.ok) {
      setIsModalOpen(false);
      loadBooks();
    } else {
      setGlobalError(`Gagal menyimpan: ${res.error}`);
    }
  };

  // Client-side filtering and sorting
  const filteredBooks = books.filter(b => {
    const matchesSearch = b.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (b.author && b.author.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = catQuery === 'Semua' || b.category === catQuery;
    return matchesSearch && matchesCat;
  }).sort((a, b) => {
    const timeA = new Date(a.created_at).getTime();
    const timeB = new Date(b.created_at).getTime();
    return sortQuery === 'oldest' ? timeA - timeB : timeB - timeA;
  });

  return (
    <PageContainer>
      {globalError && (
        <ZenAlert 
          message={globalError} 
          onClose={() => setGlobalError("")} 
          className="mb-8"
        />
      )}

      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <SectionTitle>Pustaka Literatur</SectionTitle>
          <p className="text-zinc-500 text-sm mt-4 tracking-wide max-w-lg">
            Manajemen referensi otoritatif. Bangun landasan teori Anda di sini.
          </p>
        </div>
        <ZenButton onClick={handleOpenCreate}>+ Tambah Referensi</ZenButton>
      </header>

      {/* TOOLBAR: FILTER & SEARCH */}
      <div className="mb-10 flex flex-col md:flex-row gap-6 opacity-90 focus-within:opacity-100 transition-opacity">
        <div className="flex-1">
          <ZenInput 
            placeholder="Cari berdasarkan judul atau penulis..." 
            value={searchQuery}
            onChange={(e) => updateParams('q', e.target.value)}
            className="text-base py-3 border-zinc-800 focus:border-zinc-500"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-4 md:w-auto shrink-0">
          <div className="relative min-w-[160px]">
            <ZenSelect
              value={catQuery}
              onChange={(e) => updateParams('cat', e.target.value)}
              className="text-sm py-3 border-zinc-800 text-zinc-400 focus:text-zinc-200"
            >
              <option value="Semua">Semua Kategori</option>
              <option value="Akidah">Akidah</option>
              <option value="Tasawuf">Tasawuf</option>
              <option value="Sirah">Sirah</option>
              <option value="Fikih">Fikih</option>
              <option value="Mantiq">Mantiq</option>
              <option value="Keluarga">Keluarga</option>
              <option value="Lainnya">Lainnya</option>
            </ZenSelect>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-600">
              <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>
          <div className="relative min-w-[140px]">
            <ZenSelect
              value={sortQuery}
              onChange={(e) => updateParams('sort', e.target.value)}
              className="text-sm py-3 border-zinc-800 text-zinc-400 focus:text-zinc-200"
            >
              <option value="newest">Paling Baru</option>
              <option value="oldest">Paling Lama</option>
            </ZenSelect>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-600">
              <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>
        </div>
      </div>

      {/* LITERATURE LIST */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="text-sm font-sans text-zinc-500 animate-pulse text-center py-10 border border-zinc-800/30 border-dashed rounded-xl">
            Menyibak lembaran arsip pustaka...
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="text-sm font-sans text-zinc-600 italic text-center py-16 border border-zinc-800/30 border-dashed rounded-xl">
            {searchQuery || catQuery !== 'Semua' ? "Pencarian nihil untuk filter ini. Ilmu yang dituju mungkin belum tercatat." : "Pustaka Anda masih sunyi. Mulailah membangun landasan teori dengan meresume kitab rujukan Anda."}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-xs font-mono text-zinc-600 tracking-widest">{filteredBooks.length} REFERENSI DITEMUKAN</div>
            {filteredBooks.map((book) => (
              <MinimalCard key={book.id} className="p-6 md:p-8 flex flex-col md:flex-row gap-6 md:items-start group transition-all duration-300 hover:border-zinc-700">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-serif text-white tracking-wide">{book.title}</h3>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest text-emerald-400 bg-emerald-400/10 border border-emerald-400/20">
                      {book.category}
                    </span>
                  </div>
                  {book.author && (
                    <p className="text-sm text-zinc-400 mb-4 font-sans font-medium">{book.author}</p>
                  )}
                  {book.core_premise && (
                    <div className="text-sm text-zinc-500 leading-relaxed font-sans border-l-2 border-zinc-800 pl-4 mt-4">
                      {book.core_premise}
                    </div>
                  )}
                </div>
                
                <div className="flex flex-row md:flex-col gap-4 shrink-0 mt-4 md:mt-0 justify-end md:justify-start items-center md:items-end">
                  <div className="text-xs font-mono text-zinc-600 hidden md:block text-right mb-2">
                    {formatDate(book.created_at)}
                  </div>
                  <button 
                    onClick={() => handleOpenEdit(book)}
                    className="text-xs font-medium tracking-widest uppercase text-zinc-400 hover:text-emerald-400 transition-colors"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDeleteClick(book.id, book.title)}
                    className="text-xs font-medium tracking-widest uppercase text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    Hapus
                  </button>
                </div>
              </MinimalCard>
            ))}
          </div>
        )}
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      <ZenModal
        isOpen={!!deleteConfirmId}
        onClose={cancelDelete}
        title="Hapus Referensi"
      >
        <div className="space-y-6 mt-6">
          <p className="text-zinc-300 font-sans">
            Apakah Anda yakin ingin menghapus referensi <span className="text-emerald-400 font-serif">"{deleteConfirmTitle}"</span>?
            Tindakan ini tidak dapat dibatalkan.
          </p>
          <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-zinc-800/50">
            <button 
              type="button" 
              onClick={cancelDelete}
              className="text-xs font-mono uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Batal
            </button>
            <ZenButton 
              type="button" 
              onClick={confirmDelete}
              className="!bg-red-900/50 hover:!bg-red-800/50 !text-red-200 !border-red-900/50"
            >
              Hapus Permanen
            </ZenButton>
          </div>
        </div>
      </ZenModal>

      {/* CRUD MODAL */}
      <ZenModal 
        isOpen={isModalOpen} 
        onClose={() => !isSubmitting && setIsModalOpen(false)} 
        title={modalMode === 'create' ? "Tambah Referensi Baru" : "Edit Pengetahuan"}
      >
        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-end mb-1">
                <label className="text-xs font-mono text-zinc-500 uppercase tracking-widest block">Judul Literatur (Wajib)</label>
                {formData.title.trim() && (
                  <button
                    type="button"
                    onClick={handleIdentifyBook}
                    disabled={isIdentifying}
                    className="flex items-center gap-1.5 px-2 py-1 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 rounded text-[10px] font-mono tracking-widest uppercase transition-colors disabled:opacity-50"
                  >
                    {isIdentifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {isIdentifying ? 'Memindai...' : 'Panggil Identitas Kitab'}
                  </button>
                )}
              </div>
              <ZenInput 
                autoFocus
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                placeholder="Mis. Al-Muwafaqat"
                required
              />
              {identifyFeedback && (
                <div className={`mt-2 text-[11px] font-sans px-3 py-2 rounded border animate-fade-in flex items-center gap-2 ${
                  identifyFeedback.type === 'success' 
                    ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400/90' 
                    : 'bg-red-500/5 border-red-500/20 text-red-400/90'
                }`}>
                  {identifyFeedback.msg}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1 block">Penulis (Opsional)</label>
                <ZenInput 
                  value={formData.author}
                  onChange={e => setFormData({...formData, author: e.target.value})}
                  placeholder="Mis. Asy-Syatibi"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1 block">Kategori Enum</label>
                <div className="relative">
                  <ZenSelect
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value as Category})}
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
              <label className="text-xs font-mono text-zinc-500 uppercase tracking-widest mt-4 mb-2 block">Core Premise / Premis Utama</label>
              <ZenTextarea 
                value={formData.core_premise}
                onChange={e => setFormData({...formData, core_premise: e.target.value})}
                className="min-h-[150px] text-zinc-300"
                placeholder="Tuliskan gagasan paling pokok dari literatur ini untuk referensi cepat..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-6 mt-4 border-t border-zinc-800/50">
            <ZenButton type="button" onClick={() => setIsModalOpen(false)} className="border-transparent hover:bg-zinc-800 hover:text-zinc-300 hover:border-transparent">
              Batal
            </ZenButton>
            <ZenButton type="submit" disabled={isSubmitting || !formData.title.trim()}>
              {isSubmitting ? "Memproses..." : (modalMode === 'create' ? "Simpan Referensi" : "Perbarui")}
            </ZenButton>
          </div>
        </form>
      </ZenModal>

    </PageContainer>
  );
}

