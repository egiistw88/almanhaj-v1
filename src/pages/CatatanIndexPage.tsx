import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { LayoutGrid, List, SlidersHorizontal, Info, Download } from "lucide-react";
import { toast } from "sonner";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { MinimalCard } from "@/components/ui/MinimalCard";
import { ZenButton } from "@/components/ui/ZenButton";
import { ZenAlert } from "@/components/ui/ZenAlert";
import { ZenModal } from "@/components/ui/ZenModal";
import { NotesService } from "@/lib/notes-service";
import { formatDate } from "@/lib/utils";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { Database } from "@/types/database.types";

type NoteRow = Database['public']['Tables']['notes']['Row'];

export default function CatatanIndexPage() {
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [links, setLinks] = useState<{source_note_id: string, target_note_id: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [globalError, setGlobalError] = useState("");
  
  // Customization States
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('catatan_viewMode') as 'grid' | 'list') || 'grid';
  });
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'az' | 'za'>(() => {
    return (localStorage.getItem('catatan_sortBy') as any) || 'newest';
  });
  const [filterStatus, setFilterStatus] = useState<'semua' | 'inkubasi' | 'permanen' | 'yatim'>(() => {
    return (localStorage.getItem('catatan_filterStatus') as any) || 'semua';
  });
  const [showOptions, setShowOptions] = useState(false);

  // Delete State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmTitle, setDeleteConfirmTitle] = useState("");

  const loadNotes = async () => {
    setIsLoading(true);
    setGlobalError("");
    const [res, linksRes] = await Promise.all([
      NotesService.listAllNotes(),
      NotesService.getAllLinks()
    ]);
    
    if (res.ok) {
      setNotes(res.data);
    } else {
      setGlobalError(res.error || "Gagal memuat catatan.");
    }
    
    if (linksRes.ok) {
      setLinks(linksRes.data);
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    loadNotes();
  }, []);

  useEffect(() => {
    localStorage.setItem('catatan_viewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('catatan_sortBy', sortBy);
  }, [sortBy]);

  useEffect(() => {
    localStorage.setItem('catatan_filterStatus', filterStatus);
  }, [filterStatus]);

  useEffect(() => {
    // Show educational toast
    const hasSeenToast = sessionStorage.getItem("toast_catatan_index");
    if (!hasSeenToast) {
       setTimeout(() => {
         toast("Pengaturan Tampilan", {
            description: "Sesuaikan filter, urutan, dan tata letak jaringan catatan pemikiran Anda pada tombol pengaturan di kanan atas.",
            icon: <Info className="w-5 h-5 text-indigo-400" />
         });
         sessionStorage.setItem("toast_catatan_index", "true");
       }, 500);
    }
  }, []);

  const parseNodeMeta = (html: string) => {
    const titleMatch = html.match(/<h1>(.*?)<\/h1>/i);
    const title = titleMatch ? titleMatch[1].trim() : "Rintisan Tanpa Judul";
    const rawText = html.replace(/<[^>]+>/g, ' ').trim();
    const cleanSnippet = rawText.replace(title, '').trim();
    const snippet = cleanSnippet.length > 50 ? cleanSnippet.substring(0, 50) + '...' : cleanSnippet;
    
    return { title, snippet };
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string, title: string) => {
    e.preventDefault(); // Prevent navigating to note
    e.stopPropagation(); // Stop event bubbling
    setDeleteConfirmId(id);
    setDeleteConfirmTitle(title);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    
    setGlobalError("");
    const res = await NotesService.deleteNote(deleteConfirmId);
    if (res.ok) {
      setDeleteConfirmId(null);
      loadNotes();
    } else {
      setGlobalError("Gagal menghapus catatan: " + res.error);
      setDeleteConfirmId(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmId(null);
  };

  const connectedNoteIds = useMemo(() => {
    const ids = new Set<string>();
    links.forEach(l => {
      ids.add(l.source_note_id);
      ids.add(l.target_note_id);
    });
    return ids;
  }, [links]);

  const handleExportAllNotes = async () => {
    try {
      const zip = new JSZip();
      
      notes.forEach((note) => {
        const meta = parseNodeMeta(note.content);
        // Clean filename matching the title, fallback to id if empty
        const safeTitle = meta.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || note.id;
        const filename = `${safeTitle}.md`;
        
        let fileContent = note.content;
        
        // Add YAML Frontmatter for extra semantics
        const frontmatter = `---
id: ${note.id}
status: ${note.status}
created_at: ${note.created_at}
updated_at: ${note.updated_at}
---

`;
        zip.file(filename, frontmatter + fileContent);
      });
      
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "al-manhaj-export.zip");
      toast.success("Konstruksi pemikiran Anda berhasil diekspor.");
    } catch (err: any) {
      toast.error("Gagal mengekspor catatan: " + (err.message || "Terdapat kendala teknis"));
    }
  };

  // Processing visual representation
  const displayedNotes = useMemo(() => {
    let filtered = notes;
    
    if (filterStatus === 'yatim') {
      filtered = filtered.filter(n => !connectedNoteIds.has(n.id));
    } else if (filterStatus !== 'semua') {
      filtered = filtered.filter(n => n.status === filterStatus);
    }

    filtered.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      
      const titleA = parseNodeMeta(a.content).title.toLowerCase();
      const titleB = parseNodeMeta(b.content).title.toLowerCase();
      if (sortBy === 'az') return titleA.localeCompare(titleB);
      if (sortBy === 'za') return titleB.localeCompare(titleA);
      
      return 0;
    });

    return filtered;
  }, [notes, filterStatus, sortBy, links]);

  return (
    <PageContainer>
      {globalError && (
        <ZenAlert 
          message={globalError} 
          onClose={() => setGlobalError("")} 
          className="mb-8"
        />
      )}

      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <SectionTitle>Topologi Catatan</SectionTitle>
          <p className="text-zinc-500 text-sm mt-4 tracking-wide max-w-sm">
            Jaringan pemikiran permanen maupun rintisan. Seluruh entitas graf berada di sini.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-end">
          <button 
            onClick={handleExportAllNotes}
            className="flex items-center gap-2 px-3 py-1.5 border rounded-lg transition-colors text-xs font-mono tracking-wider uppercase bg-transparent text-emerald-400 border-emerald-900 hover:bg-emerald-950/20"
            title="Ekspor Seluruh Database Lokal Ke Markdown"
          >
            <Download className="w-3.5 h-3.5" /> 
            Ekspor .md
          </button>
          <button 
            onClick={() => setShowOptions(!showOptions)}
            className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg transition-colors text-xs font-mono tracking-wider uppercase ${showOptions ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'bg-transparent text-zinc-400 border-zinc-800/50 hover:bg-zinc-900/50'}`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" /> 
            Penyesuaian
          </button>
        </div>
      </header>

      {/* FILTER & SORT PANEL */}
      {showOptions && (
        <div className="mb-8 p-4 bg-[#0d0d0d]/80 border border-zinc-800/60 rounded-xl flex flex-col md:flex-row gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Status Filter */}
          <div className="flex-1 space-y-2">
            <label className="text-[10px] uppercase font-mono tracking-widest text-zinc-500">Status Entitas</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'semua', label: 'Semua' },
                { id: 'inkubasi', label: 'Inkubasi' },
                { id: 'permanen', label: 'Permanen' },
                { id: 'yatim', label: 'Yatim (0 Tautan)' }
              ].map(f => (
                <button 
                  key={f.id}
                  onClick={() => setFilterStatus(f.id as any)}
                  className={`px-3 py-1 text-xs font-mono rounded border transition-colors ${filterStatus === f.id ? (f.id === 'yatim' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400') : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          {/* Sorting */}
          <div className="flex-1 space-y-2">
            <label className="text-[10px] uppercase font-mono tracking-widest text-zinc-500">Logika Urutan</label>
            <div className="flex flex-wrap gap-2">
              <select 
                value={sortBy} 
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-mono px-3 py-1.5 rounded focus:outline-none focus:border-zinc-700 w-full md:w-auto hover:cursor-pointer"
              >
                <option value="newest">Termuda (Terbaru)</option>
                <option value="oldest">Tertua (Terlama)</option>
                <option value="az">Leksikal (A - Z)</option>
                <option value="za">Leksikal (Z - A)</option>
              </select>
            </div>
          </div>
          {/* View Toggle */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-mono tracking-widest text-zinc-500">Tampilan</label>
            <div className="flex gap-2">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded border transition-colors ${viewMode === 'grid' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
                title="Tampilan Kisi"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded border transition-colors ${viewMode === 'list' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
                title="Tampilan Daftar"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {isLoading ? (
          <div className="text-sm font-sans text-zinc-500 animate-pulse text-center py-10 border border-zinc-800/30 border-dashed rounded-xl">
            Menelusuri pustaka pemikiran...
          </div>
        ) : displayedNotes.length === 0 ? (
          <div className="text-sm font-sans text-zinc-600 italic text-center py-16 border border-zinc-800/30 border-dashed rounded-xl">
            {notes.length === 0 
              ? "Jaringan masih sunyi. Coba tangkap ide melalui Inkubasi."
              : "Tidak ada catatan yang cocok dengan filter yang dipilih."}
          </div>
        ) : (
          <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-4"}>
            {displayedNotes.map(note => {
              const meta = parseNodeMeta(note.content);
              const isOrphaned = !connectedNoteIds.has(note.id);
              
              return (
                <Link to={`/catatan/${note.id}`} key={note.id} className="block group">
                  <MinimalCard className={viewMode === 'grid' ? "h-full flex flex-col transition-all duration-300 group-hover:border-zinc-500 hover:-translate-y-1 relative" : "flex flex-col transition-all duration-300 group-hover:border-zinc-500 relative py-4 px-5"}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono tracking-widest uppercase border ${
                          note.status === 'inkubasi' 
                            ? 'text-amber-400/80 bg-amber-400/10 border-amber-400/20' 
                            : 'text-zinc-400 bg-zinc-800/50 border-zinc-700'
                        }`}>
                          {note.status}
                        </span>
                        {isOrphaned && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono tracking-widest uppercase border text-rose-400 bg-rose-500/10 border-rose-500/20" title="Catatan Yatim: 0 Tautan">
                            Yatim
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-zinc-600">{formatDate(note.created_at)}</span>
                        <button 
                          onClick={(e) => handleDeleteClick(e, note.id, meta.title)}
                          className="text-[10px] font-medium tracking-widest uppercase text-zinc-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                          title="Hapus catatan ini"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                    <div className={viewMode === 'list' ? 'flex flex-col md:flex-row gap-0 md:gap-4 md:items-baseline mb-4' : ''}>
                      <h3 className={`font-serif text-white tracking-wide ${viewMode === 'list' ? 'text-xl capitalize shrink-0 mb-2 md:mb-0' : 'text-lg mb-3'}`}>{meta.title}</h3>
                      <p className={`font-sans text-zinc-500 leading-relaxed ${viewMode === 'list' ? 'text-[13px] flex-1 line-clamp-2 md:line-clamp-1 mb-0' : 'text-sm mb-6'}`}>
                        {meta.snippet}
                      </p>
                    </div>
                    <div className="mt-auto pt-4 border-t border-zinc-800/50 flex justify-between items-center text-xs text-zinc-600 font-mono">
                      <span>{note.content.length} bytes</span>
                      <span className="group-hover:text-emerald-400 transition-colors">Telusuri ➔</span>
                    </div>
                  </MinimalCard>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      <ZenModal
        isOpen={!!deleteConfirmId}
        onClose={cancelDelete}
        title="Hapus Catatan"
      >
        <div className="space-y-6 mt-6">
          <p className="text-zinc-300 font-sans">
            Apakah Anda yakin ingin menghapus catatan <span className="text-emerald-400 font-serif">"{deleteConfirmTitle}"</span>?
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
    </PageContainer>
  );
}
