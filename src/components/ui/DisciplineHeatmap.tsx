import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MinimalCard } from './MinimalCard';
import { SectionTitle } from './SectionTitle';
import { Flame, Trophy } from 'lucide-react';

// Buat rentang hari dari sekarang ke belakang (misal 90 hari)
const DAYS_TO_SHOW = 90;

export function DisciplineHeatmap() {
  const [activityMap, setActivityMap] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [streaks, setStreaks] = useState({ current: 0, longest: 0 });

  useEffect(() => {
    let isMounted = true;
    async function loadActivities() {
      setIsLoading(true);
      try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - DAYS_TO_SHOW);
        const isoStart = startDate.toISOString();

        // Ambil tasks yang selesai
        const { data: tasksData, error: errTasks } = await supabase
          .from('curriculum_tasks')
          .select('completed_at')
          .eq('is_completed', true)
          .gte('completed_at', isoStart);
          
        if (errTasks) console.error("Error loading tasks for heatmap:", errTasks);

        // Ambil notes yang terupdate
        const { data: notesData, error: errNotes } = await supabase
          .from('notes')
          .select('updated_at')
          .gte('updated_at', isoStart);

        if (errNotes) console.error("Error loading notes for heatmap:", errNotes);

        const newMap: Record<string, number> = {};

        // Normalisasi tanggal (YYYY-MM-DD lokal)
        const normalizeDate = (isoString: string | null) => {
          if (!isoString) return null;
          const d = new Date(isoString);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        };

        if (tasksData) {
          tasksData.forEach((t: any) => {
            const key = normalizeDate(t.completed_at);
            if (key) {
              newMap[key] = (newMap[key] || 0) + 1;
            }
          });
        }
        
        if (notesData) {
          notesData.forEach((n: any) => {
            const key = normalizeDate(n.updated_at);
            if (key) {
              newMap[key] = (newMap[key] || 0) + 1;
            }
          });
        }

        if (isMounted) setActivityMap(newMap);
      } catch (err) {
        console.error("Heatmap loading error:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadActivities();
    return () => { isMounted = false; };
  }, []);

  // Calculate Streaks
  useEffect(() => {
     let tempStreak = 0;
     let maxStreak = 0;
     let currStreak = 0;

     // Generate the contiguous array of date strings from oldest to newest
     const ascendingDaysArray = [];
     const today = new Date();
     for (let i = DAYS_TO_SHOW - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        ascendingDaysArray.push(dateStr);
     }

     for(let i = 0; i < ascendingDaysArray.length; i++) {
         if ((activityMap[ascendingDaysArray[i]] || 0) > 0) {
             tempStreak++;
             if (tempStreak > maxStreak) {
                 maxStreak = tempStreak;
             }
         } else {
             tempStreak = 0;
         }
     }

     // Current Streak: backwards from today
     for (let i = ascendingDaysArray.length - 1; i >= 0; i--) {
         const count = activityMap[ascendingDaysArray[i]] || 0;
         if (count > 0) {
             currStreak++;
         } else {
             // If today has 0, we forgive it if yesterday was active.
             // If yesterday was 0, streak broke.
             if (i === ascendingDaysArray.length - 1 && currStreak === 0) {
                 continue; // today is still 0, streak might be carried from yesterday
             } else {
                 break; // Streak actually broken
             }
         }
     }

     setStreaks({ current: currStreak, longest: maxStreak });
  }, [activityMap]);

  // Membangun array of dates untuk grid
  const daysArray = [];
  const today = new Date();
  for (let i = DAYS_TO_SHOW - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    daysArray.push({
      dateStr,
      count: activityMap[dateStr] || 0
    });
  }

  const getIntensityClass = (count: number) => {
    if (count === 0) return "bg-[#111113] border-zinc-800/40 opacity-50";
    if (count === 1) return "bg-emerald-900/50 border-emerald-900";
    if (count === 2) return "bg-emerald-700/60 border-emerald-700";
    if (count >= 3) return "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] border-emerald-500 scale-110 z-10";
    return "bg-[#111113] border-zinc-800/40";
  };

  return (
    <MinimalCard className="mb-14 overflow-hidden relative">
      <div className="flex items-center justify-between mb-6">
         <SectionTitle className="text-sm font-mono uppercase tracking-widest text-zinc-500 mb-0">Analitik Istiqamah</SectionTitle>
         {!isLoading && streaks.current > 2 && (
             <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full">
                 <Flame className="w-3.5 h-3.5 text-amber-500" />
                 <span className="text-xs font-mono text-amber-400">{streaks.current} Beruntun!</span>
             </div>
         )}
      </div>
      
      {isLoading ? (
        <div className="h-28 flex items-center justify-center animate-pulse text-xs text-zinc-600 font-mono">
          Memuat matriks disiplin...
        </div>
      ) : (
        <div className="flex gap-2 flex-wrap justify-end">
          {daysArray.map((day, idx) => (
            <div 
              key={idx} 
              title={`${day.dateStr}: ${day.count} kontribusi (Kajian & Catatan)`}
              className={`w-3 h-3 md:w-4 md:h-4 rounded-[2px] transition-all border ${getIntensityClass(day.count)} hover:border-zinc-300 hover:scale-125 cursor-pointer hover:z-20`}
            />
          ))}
        </div>
      )}
      
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-[10px] uppercase font-mono tracking-widest text-zinc-600 border-t border-zinc-800/40 pt-4">
        <div className="flex items-center gap-4">
           {streaks.longest > 0 && (
               <span className="flex items-center gap-1"><Trophy className="w-3 h-3" /> Rekor: {streaks.longest} Hari</span>
           )}
           <span>3 Bulan Terakhir</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span>Pasif</span>
          <div className="flex gap-1">
             <div className="w-2 h-2 rounded-[2px] bg-[#111113] border border-zinc-800/40"></div>
             <div className="w-2 h-2 rounded-[2px] bg-emerald-900/50 border border-emerald-900"></div>
             <div className="w-2 h-2 rounded-[2px] bg-emerald-700/60 border border-emerald-700"></div>
             <div className="w-2 h-2 rounded-[2px] bg-emerald-500 border border-emerald-500"></div>
          </div>
          <span>Aktif</span>
        </div>
      </div>
    </MinimalCard>
  );
}
