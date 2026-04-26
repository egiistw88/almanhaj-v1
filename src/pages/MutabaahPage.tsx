import { useState, useEffect } from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { MinimalCard } from "@/components/ui/MinimalCard";
import { ZenButton } from "@/components/ui/ZenButton";
import { ZenInput } from "@/components/ui/ZenInput";
import { ZenAlert } from "@/components/ui/ZenAlert";
import { DisciplineHeatmap } from "@/components/ui/DisciplineHeatmap";
import { CurriculumService } from "@/lib/curriculum-service";
import type { Database } from "@/types/database.types";
import { toast } from "sonner";
import { Flame } from "lucide-react";

type CurriculumRow = Database['public']['Tables']['curricula']['Row'];
type TaskRow = Database['public']['Tables']['curriculum_tasks']['Row'];

type CurriculumWithTasks = CurriculumRow & { tasks: TaskRow[] };

export default function MutabaahPage() {
  const [curricula, setCurricula] = useState<CurriculumWithTasks[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [globalError, setGlobalError] = useState("");

  // Forms states
  const [newCurriculumTitle, setNewCurriculumTitle] = useState("");
  const [newTaskTitles, setNewTaskTitles] = useState<Record<string, string>>({}); // mapped by curriculumId

  // AI Architect State
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);

  useEffect(() => {
    const hasSeenToast = sessionStorage.getItem("toast_mutabaah");
    if (!hasSeenToast) {
       setTimeout(() => {
         toast("Tips Istiqamah", {
            description: "Setiap centang aktivitas akan diubah menjadi Lencana Beruntun (Streak). Jagalah agar rekor hariannya tak terputus!",
            icon: <Flame className="w-5 h-5 text-amber-500" />
         });
         sessionStorage.setItem("toast_mutabaah", "true");
       }, 500);
    }
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setGlobalError("");
    const res = await CurriculumService.getCurriculaList();
    if (res.ok) {
      setCurricula(res.data);
    } else {
      setGlobalError(res.error || "Gagal memuat kurikulum.");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCurriculum = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = newCurriculumTitle.trim();
    if (!trimmedTitle) return;

    setGlobalError("");
    setIsGeneratingRoadmap(true);

    try {
      // 1. Send goal to AI to get roadmap tasks
      const aiRes = await fetch('/api/generate-roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: trimmedTitle })
      });
      const data = await aiRes.json();
      
      let initialTasks: string[] = [];
      if (aiRes.ok && data.roadmap && Array.isArray(data.roadmap)) {
        initialTasks = data.roadmap;
      } else {
        // If it fails, we just create the curriculum empty or with one step
        console.warn("AI roadmap generation failed:", data.error);
        setGlobalError("AI gagal merumuskan kurikulum, membuat kurikulum kosongan...");
      }

      // 2. Create Curriculum in system
      const res = await CurriculumService.createCurriculum(trimmedTitle);
      if (res.ok) {
        setNewCurriculumTitle("");
        
        // 3. Inject the AI steps if they exist
        const curriculumId = res.data.id;
        if (initialTasks.length > 0) {
          for (let i = 0; i < initialTasks.length; i++) {
            await CurriculumService.addTask(curriculumId, initialTasks[i], i);
          }
        }
        
        loadData();
      } else {
        setGlobalError("Gagal membuat kurikulum: " + res.error);
      }
    } catch (err: any) {
      setGlobalError("Kesalahan saat menghubungi Arsitek AI: " + err.message);
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent, curriculumId: string) => {
    e.preventDefault();
    const title = newTaskTitles[curriculumId];
    if (!title || !title.trim()) return;

    setGlobalError("");
    const currentCurriculum = curricula.find(c => c.id === curriculumId);
    const nextOrder = currentCurriculum ? currentCurriculum.tasks.length : 0;

    const res = await CurriculumService.addTask(curriculumId, title.trim(), nextOrder);
    if (res.ok) {
      setNewTaskTitles(prev => ({ ...prev, [curriculumId]: "" }));
      // Optimistic or fresh load
      loadData();
    } else {
      setGlobalError("Gagal menambah langkah: " + res.error);
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: boolean, curriculumId: string) => {
    setGlobalError("");
    // Optimistic UI update
    setCurricula(prev => prev.map(c => {
      if (c.id === curriculumId) {
        let completedCount = 0;
        const newTasks = c.tasks.map(t => {
          if (t.id === taskId) {
            const nextStat = !currentStatus;
            if (nextStat) completedCount++;
            return { ...t, is_completed: nextStat };
          }
          if (t.is_completed) completedCount++;
          return t;
        });
        const progress = newTasks.length > 0 ? Math.round((completedCount / newTasks.length) * 100) : 0;
        return { ...c, tasks: newTasks, progress_percentage: progress };
      }
      return c;
    }));

    // Background update
    const res = await CurriculumService.toggleTask(taskId, !currentStatus);
    if (!res.ok) {
      setGlobalError("Gagal menyimpan ceklis: " + res.error);
      loadData(); // Revert on fail
    }
  };

  const handleDeleteCurriculum = async (curriculumId: string) => {
    setGlobalError("");
    const res = await CurriculumService.deleteCurriculum(curriculumId);
    if (res.ok) {
      loadData();
    } else {
      setGlobalError("Gagal menghapus target: " + res.error);
    }
  };

  const handleDeleteTask = async (taskId: string, curriculumId: string) => {
    setGlobalError("");
    const res = await CurriculumService.deleteTask(taskId, curriculumId);
    if (res.ok) {
      loadData();
    } else {
      setGlobalError("Gagal menghapus langkah: " + res.error);
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

      <header className="mb-12">
        <SectionTitle>Mutaba'ah Kajian & Kitab</SectionTitle>
        <p className="text-zinc-500 text-sm mt-4 tracking-wide">
          Pemantauan progres terstruktur untuk menjaga <span className="italic">istiqamah</span> dalam menuntut ilmu.
        </p>
      </header>

      <DisciplineHeatmap />

      {/* FORM ADD CURRICULUM */}
      <div className="mb-14">
        <form onSubmit={handleCreateCurriculum} className="flex gap-4">
          <ZenInput
            placeholder="Apa target keilmuan Anda (Mis. Ingin khatam Syarah Arbain Nawawi dalam 2 minggu)..."
            value={newCurriculumTitle}
            onChange={(e) => setNewCurriculumTitle(e.target.value)}
            className="flex-1"
            disabled={isGeneratingRoadmap}
          />
          <ZenButton type="submit" disabled={!newCurriculumTitle.trim() || isGeneratingRoadmap}>
            {isGeneratingRoadmap ? "Arsitek AI Menganalisa..." : "Buat Roadmap"}
          </ZenButton>
        </form>
        {isGeneratingRoadmap && (
          <p className="text-xs font-mono text-indigo-400 mt-3 animate-pulse">
            Saraf Munaqisy sedang memecah target Anda menjadi rute masuk akal...
          </p>
        )}
      </div>

      <div className="space-y-16">
        {isLoading ? (
          <div className="text-sm font-sans text-zinc-500 animate-pulse text-center py-10 border border-zinc-800/30 rounded-xl">
            Menghitung progres rekapan...
          </div>
        ) : curricula.length === 0 ? (
          <div className="text-sm font-sans text-zinc-600 italic text-center py-16 border border-zinc-800/30 border-dashed rounded-xl">
            Belum ada catatan mutaba'ah. Tentukan target kajian atau resolusi literatur pertama Anda.
          </div>
        ) : (
          curricula.map((curr) => (
            <section key={curr.id} className="relative group/curr">
              <div className="flex justify-between items-end mb-4">
                <div className="flex items-center gap-4">
                  <h3 className="text-xl font-serif text-zinc-100">{curr.title}</h3>
                  <button 
                    onClick={() => handleDeleteCurriculum(curr.id)}
                    className="text-[10px] uppercase font-mono tracking-widest text-zinc-600 hover:text-red-400 opacity-0 group-hover/curr:opacity-100 transition-opacity"
                    title="Hapus Target Mutaba'ah"
                  >
                    [ Hapus Target ]
                  </button>
                </div>
                <span className="text-sm font-mono text-emerald-400">
                  {curr.progress_percentage}%
                </span>
              </div>
              
              {/* Minimalist Progress Bar */}
              <div className="w-full h-[3px] bg-zinc-900 rounded-full overflow-hidden mb-8">
                <div 
                  className="h-full bg-emerald-500/80 transition-all duration-700 ease-out" 
                  style={{ width: `${curr.progress_percentage}%` }}
                />
              </div>

              <MinimalCard className="border-transparent bg-zinc-900/10 p-0 md:p-6 lg:p-8">
                <ul className="space-y-4 mb-8">
                  {curr.tasks.length === 0 ? (
                    <li className="text-zinc-600 text-xs italic font-sans py-2">Belum ada rincian capaians (misal: Sesi 1, Bab 2) yang didefinisikan.</li>
                  ) : (
                    curr.tasks.map((task) => (
                      <li key={task.id} className="flex items-center justify-between gap-4 group/task">
                        <label className="flex items-center gap-4 cursor-pointer flex-1">
                          <div className="relative flex items-center justify-center shrink-0 w-5 h-5">
                            <input 
                              type="checkbox" 
                              checked={task.is_completed}
                              onChange={() => handleToggleTask(task.id, task.is_completed, curr.id)}
                              className="peer w-5 h-5 bg-transparent border border-zinc-700 rounded-sm appearance-none checked:bg-emerald-500/20 checked:border-emerald-500/50 cursor-pointer transition-colors" 
                            />
                            {task.is_completed && (
                              <svg className="absolute w-3 h-3 text-emerald-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className={`text-base font-sans transition-colors duration-300 flex-1 ${task.is_completed ? 'text-zinc-600 line-through' : 'text-zinc-200 group-hover/task:text-emerald-50'}`}>
                            {task.title}
                          </span>
                        </label>
                        <button
                          onClick={() => handleDeleteTask(task.id, curr.id)}
                          className="text-zinc-700 hover:text-red-400 opacity-0 group-hover/task:opacity-100 transition-colors shrink-0 p-1"
                          title="Hapus Langkah"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </li>
                    ))
                  )}
                </ul>

                {/* FORM ADD TASK */}
                <form onSubmit={(e) => handleCreateTask(e, curr.id)} className="flex gap-4 items-center">
                  <div className="w-5 h-px bg-zinc-800 shrink-0" />
                  <ZenInput
                    placeholder="Tambah target spesifik (mis. Bab 1, Halaman 5, Sesi 2)..."
                    value={newTaskTitles[curr.id] || ""}
                    onChange={(e) => setNewTaskTitles(prev => ({ ...prev, [curr.id]: e.target.value }))}
                    className="text-sm py-2 border-transparent bg-zinc-900 focus:bg-zinc-800 flex-1"
                  />
                  {(newTaskTitles[curr.id] || "").trim() && (
                    <ZenButton type="submit" className="text-xs px-3 py-1">Tambah</ZenButton>
                  )}
                </form>
              </MinimalCard>
            </section>
          ))
        )}
      </div>
    </PageContainer>
  );
}

