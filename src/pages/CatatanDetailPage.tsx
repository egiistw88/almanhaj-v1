import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Loader2, Sparkles, Network } from "lucide-react";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { ZenButton } from "@/components/ui/ZenButton";
import { AbunawaEditor } from "@/components/editor/AbunawaEditor";
import { NotesService } from "@/lib/notes-service";
import type { Database } from "@/types/database.types";
import { supabase } from "@/lib/supabase";
import { updateYjsState } from "@/lib/yjs-utils";
import { toast } from "sonner";

type NoteRow = Database['public']['Tables']['notes']['Row'];

interface LinkNode {
  id: string;
  content: string;
  status: string;
}

interface NoteMeta {
  id: string;
  title: string;
  snippet: string;
}

export default function CatatanPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [note, setNote] = useState<NoteRow | null>(null);
  const [content, setContent] = useState("");
  const [backlinks, setBacklinks] = useState<LinkNode[]>([]);
  const [outgoingLinks, setOutgoingLinks] = useState<LinkNode[]>([]);
  const [availableNotesMeta, setAvailableNotesMeta] = useState<NoteMeta[]>([]);
  const [suggestedLinks, setSuggestedLinks] = useState<NoteMeta[]>([]);
  const [isScanningSemantic, setIsScanningSemantic] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [loadError, setLoadError] = useState("");

  // Metadata Extractor untuk Link Graph UI & AI Context
  const parseNodeMeta = useCallback((html: string) => {
    const titleMatch = html.match(/<h1>(.*?)<\/h1>/i);
    const title = titleMatch ? titleMatch[1].trim() : "Rintisan Tanpa Judul";
    const rawText = html.replace(/<[^>]+>/g, ' ').trim();
    const cleanSnippet = rawText.replace(title, '').trim();
    const snippet = cleanSnippet.length > 50 ? cleanSnippet.substring(0, 50) + '...' : cleanSnippet;
    
    return { title, snippet };
  }, []);

  useEffect(() => {
    const hasSeenToast = sessionStorage.getItem("toast_catatan_d");
    if (!hasSeenToast) {
       setTimeout(() => {
         toast("Jaringan Zettelkasten", {
            description: "Ketik nama konsep di antara 2 kurung siku [[ ]] untuk menautkan pemikiran Anda dengan otomatis. AI akan membaca simpulnya di latar.",
            icon: <Network className="w-5 h-5 text-blue-400" />
         });
         sessionStorage.setItem("toast_catatan_d", "true");
       }, 500);
    }
  }, []);

  useEffect(() => {
    const fetchNoteAndGraph = async () => {
      if (!id) return;
      setIsLoading(true);
      setLoadError("");
      
      const res = await NotesService.getNoteById(id);
      if (res.ok) {
        setNote(res.data);
        setContent(res.data.content);
        
        // Fetch Knowledge Graph Topology and All Notes for Semantic AI
        const [linksRes, outRes, allNotesRes] = await Promise.all([
          NotesService.getBacklinks(id),
          NotesService.getOutgoingLinks(id),
          NotesService.listAllNotes()
        ]);
        
        if (linksRes.ok) setBacklinks(linksRes.data);
        if (outRes.ok) setOutgoingLinks(outRes.data);
        
        if (allNotesRes.ok) {
           const metas = allNotesRes.data
             .filter(n => n.id !== id) // Exclude current note
             .map(n => ({ id: n.id, ...parseNodeMeta(n.content) }));
           setAvailableNotesMeta(metas);
        }

      } else {
        setLoadError("Catatan tidak ditemukan, telah terhapus, atau Anda kehilangan akses.");
      }
      setIsLoading(false);
    };

    fetchNoteAndGraph();
  }, [id, parseNodeMeta]);

  // Implementasi Autosave / Debounced Save & RAG Embedding Generation
  useEffect(() => {
    if (!note || content === note.content) return;

    const debounceTimer = setTimeout(async () => {
      setSaveStatus('saving');
      setIsSaving(true);
      
      const { newBase64, updatedText } = updateYjsState(note.yjs_state, note.content, content);
      
      const { data: updatedNote, error: updateError } = await supabase.from('notes').update({ 
        content: updatedText,
        yjs_state: newBase64,
        status: 'permanen'
      }).eq('id', note.id).select().single();
      
      // Update local React state with DB response to keep it fully synced
      if (!updateError && updatedNote) {
        setNote(updatedNote as NoteRow);
        setSaveStatus('saved');
        
        // Refresh outgoing links softly to show newly authored [[links]]
        const outRes = await NotesService.getOutgoingLinks(note.id);
        if (outRes.ok) setOutgoingLinks(outRes.data);
      } else {
        setSaveStatus('error');
      }
      setIsSaving(false);
      
      setTimeout(() => {
        setSaveStatus(current => current === 'saved' ? 'idle' : current);
      }, 3000);
      
    }, 1500);

    return () => clearTimeout(debounceTimer);
  }, [content, note, parseNodeMeta]);

  const handleScanSemantic = async () => {
    if (!content.trim()) return;
    
    setIsScanningSemantic(true);
    setScanMessage("Menghitung Vektor Kemiripan Kosinus (RAG)...");
    setSuggestedLinks([]);

    try {
      const cleanText = parseNodeMeta(content).snippet;
      // 1. Generate Query Embedding
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.embedContent({
         model: "gemini-embedding-2-preview",
         contents: cleanText,
      });

      if (!response.embeddings || response.embeddings.length === 0) {
         throw new Error("Gagal komputasi tensor kalimat");
      }

      const queryEmbedding = response.embeddings[0].values;

      // 2. Query similarity via Supabase pgvector RPC
      const { data, error } = await supabase.rpc('match_notes', {
        query_embedding: queryEmbedding,
        match_threshold: 0.25, // Cosine closeness threshold
        match_count: 3,
        p_current_note_id: note!.id
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setSuggestedLinks(data.map((d: any) => ({
          id: d.id,
          title: d.content.match(/<h1>(.*?)<\/h1>/i)?.[1]?.trim() || "Catatan Relevan",
          snippet: d.content.replace(/<[^>]*>?/gm, '').substring(0, 80) + '...'
        })));
        setScanMessage("Koneksi semantik dengan Cosine Similarity tinggi ditemukan.");
      } else {
        setScanMessage("Tidak ada korelasi vektor yang signifikan dalam pangkalan data.");
      }
    } catch (err: any) {
      setScanMessage("Gagal memindai vektor: " + err.message);
    } finally {
      setIsScanningSemantic(false);
    }
  };

  const handleInjectLink = (title: string) => {
    // A simplified injection helper. We just append the link to the bottom.
    // In a full implementation, you might want to insert it at cursor position in Tiptap.
    const linkStr = `[[${title}]]`;
    if (!content.includes(linkStr)) {
       setContent(prev => prev + ` <p>${linkStr}</p>`);
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-[50vh]">
          <div className="text-zinc-500 font-mono text-sm animate-pulse">Menelusuri Jaringan...</div>
        </div>
      </PageContainer>
    );
  }

  if (loadError) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center h-[50vh] gap-6">
          <div className="text-zinc-500 font-mono text-sm">{loadError}</div>
          <Link to="/inkubasi" className="text-emerald-500 hover:text-emerald-400 font-sans tracking-wide text-sm underline underline-offset-4">Kembali ke Inkubasi</Link>
        </div>
      </PageContainer>
    );
  }

  if (!note) return null;

  return (
    <PageContainer>
      <header className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <SectionTitle>Kanvas Berpikir</SectionTitle>
          <button
            onClick={handleScanSemantic}
            disabled={isScanningSemantic}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 rounded text-xs font-mono tracking-widest transition-colors backdrop-blur-md disabled:opacity-50"
          >
            {isScanningSemantic ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Pindai Saraf Semantik
          </button>
        </div>
        <div className="text-xs font-mono">
          {saveStatus === 'saving' && <span className="text-amber-500 animate-pulse">Saraf Sedang Menyambung...</span>}
          {saveStatus === 'saved' && <span className="text-emerald-500">Tersimpan Abadi</span>}
          {saveStatus === 'error' && <span className="text-red-500">Gagal Tersimpan</span>}
          {saveStatus === 'idle' && <span className="text-zinc-600">Terinkripsi & Modis</span>}
        </div>
      </header>

      <div className="mb-8">
        <div className="text-sm font-mono text-zinc-500 flex flex-wrap gap-4 uppercase tracking-widest border-b border-zinc-800/50 pb-2">
          <span>ENTITAS ID: {note.id.split('-')[0]}</span>
          <span className="text-zinc-700">|</span>
          <span>STATUS: {note.status}</span>
        </div>
      </div>

      <div className="min-h-[40vh] transition-opacity duration-300 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 md:p-10 shadow-inner">
        <AbunawaEditor 
          key={note.id}
          initialContent={note.content}
          onChange={(newContent) => setContent(newContent)}
          isSaving={false} 
        />
      </div>

      {/* PANEL SARAF SEMANTIK (AI SUGGESTIONS) */}
      {(isScanningSemantic || scanMessage || suggestedLinks.length > 0) && (
        <div className="mt-8 border border-indigo-500/30 bg-[#0a0a0c]/80 rounded-xl p-5 mb-8 animate-fade-in shadow-[0_0_30px_rgba(99,102,241,0.05)]">
          <h4 className="flex items-center gap-2 text-indigo-400 font-serif text-lg mb-3">
            <Sparkles className="w-4 h-4 text-indigo-400" /> Saran Semantik (Munaqisy Engine)
          </h4>
          <p className="text-xs font-mono text-zinc-500 mb-4">{scanMessage}</p>
          
          {suggestedLinks.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {suggestedLinks.map(link => (
                <div key={link.id} className="bg-zinc-900/80 p-4 border border-zinc-700 rounded-lg hover:border-indigo-500/50 transition-colors group">
                  <h5 className="font-serif text-sm text-zinc-200 mb-2 truncate">Catatan: {link.title}</h5>
                  <p className="text-xs text-zinc-500 mb-4 line-clamp-2">{link.snippet}</p>
                  <button
                    onClick={() => handleInjectLink(link.title)}
                    className="text-[10px] uppercase font-mono tracking-widest bg-zinc-800 text-indigo-400 group-hover:bg-indigo-500/20 group-hover:text-indigo-300 w-full py-2 rounded transition-colors"
                  >
                    + Susupkan Tautan [[ {link.title} ]]
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DASHBOARD KNOWLEDGE GRAPH / PANEL BACKLINKS & OUTGOING */}
      <div className="mt-16 pt-8 border-t border-zinc-800/50 grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Kolom 1: Backlinks */}
        <div>
          <h4 className="text-xs font-mono tracking-widest text-zinc-500 uppercase mb-6 flex items-center gap-2">
            <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">{backlinks.length}</span>
            Merujuk Ke Sini (Backlinks)
          </h4>
          <div className="text-sm font-sans text-zinc-400">
            {backlinks.length === 0 ? (
              <span className="text-zinc-600 italic block py-4 border border-zinc-800/20 border-dashed rounded text-center">Titik buntu. Belum ada akar di luar sana.</span>
            ) : (
              <ul className="space-y-3">
                {backlinks.map(bl => {
                  const meta = parseNodeMeta(bl.content);
                  return (
                    <li key={bl.id} className="bg-zinc-900/40 p-4 rounded-lg border border-zinc-800/50 hover:border-zinc-700 transition-colors">
                      <Link to={`/catatan/${bl.id}`} className="block group">
                        <div className="font-serif text-emerald-400/90 group-hover:text-emerald-300 mb-1">
                          ← {meta.title}
                        </div>
                        <div className="text-zinc-500 text-xs">
                          {meta.snippet || "Catatan Kosong..."}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Kolom 2: Outgoing Links */}
        <div>
          <h4 className="text-xs font-mono tracking-widest text-zinc-500 uppercase mb-6 flex items-center gap-2">
            <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">{outgoingLinks.length}</span>
            Merujuk Ke Luar (Forward)
          </h4>
          <div className="text-sm font-sans text-zinc-400">
            {outgoingLinks.length === 0 ? (
              <span className="text-zinc-600 italic block py-4 border border-zinc-800/20 border-dashed rounded text-center">Pulau terisolasi. Gunakan [[tautan]] untuk merajut jaringan.</span>
            ) : (
              <ul className="space-y-3">
                {outgoingLinks.map(out => {
                  const meta = parseNodeMeta(out.content);
                  const isStub = out.status === 'inkubasi' && out.content.includes("Catatan rintisan dari referensi silang");
                  
                  return (
                    <li key={out.id} className="bg-zinc-900/40 p-4 rounded-lg border border-zinc-800/50 hover:border-zinc-700 transition-colors">
                      <Link to={`/catatan/${out.id}`} className="block group flex items-start justify-between">
                        <div>
                          <div className="font-serif text-amber-500/90 group-hover:text-amber-400 mb-1">
                            {meta.title} →
                          </div>
                          <div className="text-zinc-500 text-xs">
                            {isStub ? "Kekosongan terdeteksi." : (meta.snippet || "Catatan Kosong...")}
                          </div>
                        </div>
                        {isStub && (
                          <div className="ml-4 shrink-0 px-2 py-1 text-[10px] uppercase font-mono tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                            Buat Catatan
                          </div>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

