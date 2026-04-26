import { useEffect, useState } from "react";
import { Loader2, Activity } from "lucide-react";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { MinimalCard } from "@/components/ui/MinimalCard";
import { ZenButton } from "@/components/ui/ZenButton";
import { ZenAlert } from "@/components/ui/ZenAlert";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";
import type { Database } from "@/types/database.types";

type NoteRow = Database['public']['Tables']['notes']['Row'];
type BookRow = Database['public']['Tables']['books']['Row'];

export default function DashboardPage() {
  const navigate = useNavigate();
  const [recentActivities, setRecentActivities] = useState<Array<{id: string, type: string, title: string, date: string}>>([]);
  const [globalError, setGlobalError] = useState("");
  
  // Muraja'ah State
  const [murajaahQuestion, setMurajaahQuestion] = useState<string | null>(null);
  const [murajaahNoteId, setMurajaahNoteId] = useState<string | null>(null);
  const [isGeneratingMurajaah, setIsGeneratingMurajaah] = useState(false);

  useEffect(() => {
    // Attempt to load some real activity data
    const loadRecent = async () => {
      try {
        setGlobalError("");
        const [notesRes, booksRes] = await Promise.all([
          supabase.from('notes').select('id, content, created_at').order('created_at', { ascending: false }).limit(3),
          supabase.from('books').select('id, title, created_at').order('created_at', { ascending: false }).limit(3)
        ]);

        if (notesRes.error) throw new Error(notesRes.error.message);
        if (booksRes.error) throw new Error(booksRes.error.message);

        const mixed = [];
        if (notesRes.data) {
          mixed.push(...notesRes.data.map(n => {
            const rawTitleMatch = n.content.match(/<h1>(.*?)<\/h1>/i);
            const title = rawTitleMatch ? rawTitleMatch[1].trim() : "Tanpa Judul";
            return { 
              id: n.id, 
              type: 'Catatan', 
              title, 
              date: n.created_at 
            };
          }));
        }
        if (booksRes.data) {
          mixed.push(...booksRes.data.map(b => ({ 
            id: b.id, 
            type: 'Buku', 
            title: b.title, 
            date: b.created_at 
          })));
        }

        // Sort by newest
        mixed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        setRecentActivities(mixed.slice(0, 5));
      } catch (e: any) {
        console.error("Gagal memuat aktivitas:", e);
        setGlobalError("Gagal terhubung dengan Pangkalan Data. " + (e.message || ""));
      }
    };

    loadRecent();
  }, []);

  const triggerMurajaah = async () => {
    setIsGeneratingMurajaah(true);
    setMurajaahQuestion(null);
    try {
      // Ambil catatan lama (mis. urut berdasarkan terlama, ambil 10 pertama, lalu random)
      const res = await supabase.from('notes').select('id, content').order('created_at', { ascending: true }).limit(10);
      if (res.error) throw res.error;
      
      if (!res.data || res.data.length === 0) {
        setMurajaahQuestion("Belum ada catatan untuk direview. Mulailah menulis!");
        setIsGeneratingMurajaah(false);
        return;
      }
      
      const randomNote = res.data[Math.floor(Math.random() * res.data.length)];
      const rawTitleMatch = randomNote.content.match(/<h1>(.*?)<\/h1>/i);
      const title = rawTitleMatch ? rawTitleMatch[1].trim() : "Catatan Tanpa Judul";
      
      const aiRes = await fetch('/api/generate-murajaah', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          noteTitle: title,
          noteContent: randomNote.content.replace(/<[^>]+>/g, ' ').trim() // raw text
        })
      });
      
      const data = await aiRes.json();
      if (!aiRes.ok) throw new Error(data.error);

      setMurajaahNoteId(randomNote.id);
      setMurajaahQuestion(data.question);
    } catch (err: any) {
      console.error(err);
      setMurajaahQuestion("Gagal membangunkan Murobbi AI untuk sesi ulasan Anda hari ini.");
    } finally {
      setIsGeneratingMurajaah(false);
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
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <SectionTitle>Pusat Kendali</SectionTitle>
          <p className="text-zinc-500 text-sm mt-4 tracking-wide font-sans">
            Muaranya jaringan pengetahuan empirik. <br className="hidden md:block" />
            Selamat merajut pencerahan, mereduksi kerumitan ilmu.
          </p>
        </div>
      </header>

      {/* MURAJA'AH WIDGET */}
      <div className="mb-12 border border-indigo-500/20 bg-[#0a0a0c] rounded-xl p-6 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-50 z-0 pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-serif text-indigo-400 tracking-wide">Sesi Muraja'ah Berkala</h2>
          </div>
          
          <div className="bg-zinc-950/50 p-6 rounded-lg border border-zinc-800/50 min-h-[120px] flex flex-col justify-center items-center text-center">
            {isGeneratingMurajaah ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                <p className="text-zinc-400 font-mono text-xs uppercase tracking-widest">Murobbi AI Menyelidiki Memori Anda...</p>
              </div>
            ) : murajaahQuestion ? (
              <div className="space-y-6">
                <p className="text-zinc-200 font-sans leading-relaxed max-w-2xl mx-auto text-sm md:text-base">
                  "{murajaahQuestion}"
                </p>
                <div className="flex justify-center gap-4">
                  <button onClick={() => setMurajaahQuestion(null)} className="text-xs font-mono uppercase tracking-widest text-zinc-500 hover:text-zinc-300">
                    Lain Kali
                  </button>
                  {murajaahNoteId && (
                    <ZenButton onClick={() => navigate(`/catatan/${murajaahNoteId}`)} className="!py-1.5 !px-4">
                      Tinjau Jawaban
                    </ZenButton>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-zinc-500 font-sans text-sm">
                  Uji ingatan Anda terhadap arsip-arsip yang mulai terkubur dari kesadaran aktif.
                </p>
                <ZenButton onClick={triggerMurajaah} className="mx-auto block">
                  Bangkitkan Tantangan Murobbi
                </ZenButton>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
        <MinimalCard className="flex flex-col gap-6 group hover:-translate-y-1 transition-transform duration-500">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full opacity-60"></div>
              <h2 className="text-xl font-serif text-zinc-100 tracking-wide">Penangkap Kilat</h2>
            </div>
            <p className="text-sm text-zinc-500 leading-relaxed font-sans">
              Segera tangkap premis, silogisme, atau pecahan pemikiran sebelum mereka hilang di telan lupa. Inkubasi awal seluruh ilmu.
            </p>
          </div>
          <div className="mt-auto pt-6 border-t border-zinc-800/30">
            <ZenButton className="w-full justify-between" onClick={() => navigate('/inkubasi')}>
              <span>Tulis Inspirasi Baru</span>
              <span className="font-mono opacity-50 group-hover:opacity-100 group-hover:text-emerald-400">➔</span>
            </ZenButton>
          </div>
        </MinimalCard>

        <MinimalCard className="flex flex-col gap-6 group hover:-translate-y-1 transition-transform duration-500">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full opacity-60"></div>
              <h2 className="text-xl font-serif text-zinc-100 tracking-wide">Pustaka Referensi</h2>
            </div>
            <p className="text-sm text-zinc-500 leading-relaxed font-sans">
              Akses cepat ke repositori literatur yang telah Anda kurasi. Fondasi atas setiap jejak jalinan jaringan (*link graph*).
            </p>
          </div>
          <div className="mt-auto pt-6 border-t border-zinc-800/30">
            <ZenButton className="w-full justify-between" onClick={() => navigate('/pustaka')}>
              <span>Buka Pustaka Literatur</span>
              <span className="font-mono opacity-50 group-hover:opacity-100 group-hover:text-emerald-400">➔</span>
            </ZenButton>
          </div>
        </MinimalCard>
      </div>

      <div className="mt-8">
        <MinimalCard className="flex flex-col md:flex-row items-center justify-between gap-6 group hover:border-emerald-500/50 transition-colors cursor-pointer" onClick={() => navigate('/peta')}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
            </div>
            <div>
              <h2 className="text-xl font-serif text-white tracking-wide mb-1">Jejaring Epistemologi</h2>
              <p className="text-sm font-sans text-zinc-500">Lihat konstelasi pemikiran Anda dari sudut pandang helikopter (Visual Knowledge Graph).</p>
            </div>
          </div>
          <div className="hidden md:block opacity-50 group-hover:opacity-100 group-hover:text-emerald-400 font-mono transition-all group-hover:translate-x-2">
            ➔ Singkap Peta
          </div>
        </MinimalCard>
      </div>
      
      <div className="mt-20">
        <h3 className="text-xs font-mono tracking-widest text-zinc-500 uppercase mb-8 flex justify-between items-center border-b border-zinc-800/50 pb-4">
          <span>Aktivitas Intelektual Terakhir</span>
          <span className="text-zinc-600 group-hover:text-emerald-500 transition-colors">Terekam Oleh Sistem</span>
        </h3>
        
        <ul className="space-y-1 font-sans text-sm">
          {recentActivities.length > 0 ? recentActivities.map((act) => (
            <li key={act.id} className="flex justify-between items-center py-4 px-4 hover:bg-zinc-900/50 rounded-lg group transition-colors cursor-pointer border border-transparent hover:border-zinc-800" onClick={() => navigate(act.type === 'Catatan' ? `/catatan/${act.id}` : '/pustaka')}>
              <span className="text-zinc-300 group-hover:text-emerald-50 transition-colors line-clamp-1 flex-1 pr-6 flex items-center gap-4">
                <span className={`font-mono text-[10px] tracking-widest uppercase px-2 py-0.5 rounded border ${act.type === 'Catatan' ? 'text-amber-400/80 border-amber-400/20 bg-amber-400/10' : 'text-emerald-400/80 border-emerald-400/20 bg-emerald-400/10'}`}>
                  {act.type}
                </span>
                {act.title}
              </span>
              <span className="text-zinc-600 text-xs font-mono shrink-0">{formatDate(act.date)}</span>
            </li>
          )) : (
            <li className="text-zinc-600 px-4 py-8 border border-zinc-800/50 border-dashed rounded-xl flex flex-col items-center justify-center gap-4 bg-zinc-900/20">
              <span className="italic">Belum ada jejak intelektual tercatat di repositori ini.</span>
              <button 
                onClick={async () => {
                  setGlobalError("Menyuntikkan pustaka benih...");
                  const { NotesService } = await import('@/lib/notes-service');
                  const res = await NotesService.injectSeedKnowledge();
                  if (res.ok) {
                    window.location.reload();
                  } else {
                    setGlobalError(res.error || "Gagal menyuntikkan");
                  }
                }}
                className="mt-2 px-4 py-2 border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg text-xs font-mono tracking-wide uppercase transition-colors flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                Suntik Pustaka Benih
              </button>
            </li>
          )}
        </ul>
      </div>
    </PageContainer>
  );
}


