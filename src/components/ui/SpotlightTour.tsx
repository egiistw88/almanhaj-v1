import React, { useState, useEffect } from "react";
import { ZenButton } from "./ZenButton";
import { Link } from "react-router-dom";
import { ScrollText, Zap, BookMarked, Network, TrendingUp, Sparkles } from "lucide-react";

type TourStep = {
  title: string;
  content: string | React.ReactNode;
  target: string | null;
  demoMode?: 'inkubasi' | 'catatan' | 'mutabaah' | 'ai' | null;
  icon: React.ReactNode;
};

const TOUR_STEPS: TourStep[] = [
  {
    title: "Manifestasi Zettelkasten Digital",
    content: (
       <div className="space-y-2">
         <p>Selamat datang di Al-Manhaj. Ini bukan sekadar aplikasi pencatat sembarangan. Ini adalah "Otak Kedua" Anda, dirancang spesifik untuk mengasah epistemologi ilmiah.</p>
         <p>Aplikasi ini bekerja <b>Lokal-Pertama (Offline)</b> tanpa jeda sedetikpun, lalu disinkronkan secara misterius ke <i className="text-emerald-400">Database Awan</i> ketika Anda terhubung internet.</p>
       </div>
    ),
    target: null,
    icon: <ScrollText className="w-8 h-8 text-indigo-400" />,
    demoMode: null
  },
  {
    title: "1. Pustaka Otoritatif",
    content: "Pengetahuan wajib mendarat pada rujukan valid. Di modul Pustaka, Anda mendaftarkan kitab, buku, majalah yang dibaca. Setiap cuilan ide yang diketik nanti, dapat diikat secara absolut menuju salah satu literatur di sini.",
    target: "#nav-pustaka",
    icon: <BookMarked className="w-8 h-8 text-amber-400" />,
    demoMode: null
  },
  {
    title: "2. Penangkap Kilat (Inkubasi)",
    content: "Ketika mendengarkan kajian, pikiran kerap meloncat. Menu Inkubasi adalah wadah untuk menadah ide-ide mentah secara impulsif. Biarkan ide tersebut diinkubasi berhari-hari; saring perlahan untuk kelak dinaikkan jadi Catatan Permanen.",
    target: "#nav-inkubasi",
    icon: <Zap className="w-8 h-8 text-emerald-400" />,
    demoMode: "inkubasi"
  },
  {
    title: "3. Jaringan Neuron Pemikiran",
    content: (
       <div className="space-y-2">
         <p>Ini urat nadi Zettelkasten. Lupakan menyusun folder hierarkis konvensional.</p>
         <p>Sintaks Rahasia: Apit sebuah kata dengan tanda <span className="text-amber-400 bg-amber-400/10 px-1 rounded font-mono border-b border-amber-400/50">[[...]]</span> dalam kalimat Anda. Jaringan saraf akan terpatri secara organik membentuk graf pemikiran tak terhingga.</p>
       </div>
    ),
    target: "#nav-catatan",
    icon: <Network className="w-8 h-8 text-blue-400" />,
    demoMode: "catatan"
  },
  {
    title: "4. Mutaba'ah & Psikologi Istiqamah",
    content: "Menyelesaikan kurikulum butuh kedisiplinan panjang. Di kurikulum Mutaba'ah, kami merekam aktivitas Anda dalam Heatmap dan menyuntikkan lencana \"Rekor Beruntun\" (Streak) di dasbor untuk manipulasi positif perlawanan-menunda.",
    target: "#nav-mutabaah",
    icon: <TrendingUp className="w-8 h-8 text-rose-400" />,
    demoMode: "mutabaah"
  },
  {
    title: "5. Munaqisy & Asisten Ekstraksi (AI RAG)",
    content: "Keunggulan mutlak ada di sini. Vektor AI Semantic tertanam utuh dan akan mengkalkulasi kemiripan argumen Anda dengan seluruh database secara ajaib di latar belakang! Manfaatkan asisten debat (Munaqisy) untuk membedah celah logika tulisan di Peta Visual.",
    target: "#nav-dashboard",
    icon: <Sparkles className="w-8 h-8 text-purple-400" />,
    demoMode: "ai"
  }
];

const DemoInkubasi = () => {
  const [text, setText] = useState("");
  return (
    <div className="mt-5 p-3 bg-[#0a0a0c] border border-zinc-800 rounded-xl shadow-inner relative overflow-hidden">
      <textarea 
        className="w-full bg-transparent text-[13px] outline-none resize-none text-emerald-400 placeholder:text-zinc-600 h-14 font-sans" 
        placeholder="Ketik refleks: 'Pilar mazhab ahnaf...'"
        value={text}
        onChange={e => setText(e.target.value)}
      />
      <div className="flex justify-between items-center mt-1 border-t border-zinc-800/50 pt-2">
        <span className="text-[9px] uppercase font-mono tracking-widest text-zinc-600">Aliran Simpan Otomatis Offline</span>
        {text.length > 5 && <span className="text-[9px] uppercase font-mono tracking-widest text-[#10b981] animate-fade-in font-bold flex gap-1 items-center"><Zap className="w-3 h-3"/> Terserap</span>}
      </div>
    </div>
  );
}

const DemoCatatan = () => {
  const [text, setText] = useState("");
  const parts = text.split(/(\[\[.*?\]\])/g);
  return (
    <div className="mt-5 p-3 bg-[#0a0a0c] border border-zinc-800 rounded-xl shadow-inner flex flex-col gap-3">
      <input 
        className="w-full bg-transparent text-[13px] outline-none text-zinc-300 placeholder:text-zinc-600" 
        placeholder="Misal: 'Terhubung ke [[Teori Kausalitas]]'"
        value={text}
        onChange={e => setText(e.target.value)}
      />
      <div className="text-[13px] font-sans text-zinc-400 min-h-[24px] border-t border-zinc-800/50 pt-2 leading-relaxed">
        {parts.map((part, i) => {
          if (part.startsWith('[[') && part.endsWith(']]')) {
            const inner = part.slice(2, -2);
            return <span key={i} className="text-amber-400 border-b border-amber-400/50 px-1 mx-0.5 bg-amber-400/10 rounded cursor-pointer">{inner}</span>
          }
          return <span key={i}>{part}</span>
        })}
        {text.includes('[[') && text.includes(']]') && (
           <div className="text-[9px] text-zinc-500 mt-2 font-mono tracking-widest uppercase animate-fade-in border border-zinc-800/80 bg-zinc-900/50 p-1.5 rounded-md">
             <span className="text-amber-500 font-bold mx-1">SISTEM:</span> Peta korelasi baru tercipta otomatis ke simpul "{text.match(/\[\[(.*?)\]\]/)?.[1]}"
           </div>
        )}
      </div>
    </div>
  );
}

const DemoMutabaah = () => {
  const [checked, setChecked] = useState(false);
  return (
    <div className="mt-5 p-3 bg-[#0a0a0c] border border-zinc-800 rounded-xl shadow-inner flex flex-col gap-3">
       <label className="flex items-center gap-3 cursor-pointer group">
         <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${checked ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'border-zinc-600'}`}>
           {checked && <svg className="w-3 h-3 text-[#0a0a0a] stroke-[3px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
         </div>
         <input type="checkbox" className="hidden" checked={checked} onChange={e => setChecked(e.target.checked)} />
         <span className={`text-[13px] transition-colors ${checked ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>Khatam Subuh: QS. Al-Baqarah 1-50</span>
       </label>
       {checked && (
         <div className="w-full flex items-center gap-2 mt-1 animate-fade-in">
           <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden flex-1 relative">
             <div className="absolute top-0 left-0 h-full bg-emerald-500 transition-all duration-700 ease-out" style={{ width: '100%' }}></div>
           </div>
           <span className="text-[10px] font-mono text-emerald-400 font-bold pr-1">+1 Lencana Beruntun</span>
         </div>
       )}
    </div>
  );
}

const DemoAI = () => {
  return (
    <div className="mt-5 p-3 bg-[#09090b] border border-zinc-800 rounded-xl shadow-inner flex flex-col gap-2 relative overflow-hidden">
       <div className="absolute -right-4 -top-4 w-16 h-16 bg-purple-500/10 blur-xl rounded-full pointer-events-none"></div>
       <div className="flex gap-2 items-start z-10">
         <div className="w-6 h-6 rounded-md bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/30 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
         </div>
         <div className="bg-[#0a0a0c]/80 border border-zinc-800/80 p-2.5 rounded-r-xl rounded-bl-xl text-xs text-zinc-300 leading-relaxed font-sans shadow-md w-full">
            <span className="text-purple-400 font-mono tracking-wide text-[9px] uppercase block mb-1">Analitik RAG Munaqisy</span>
            Menganalisis 43 simpul catatan Anda...<br/>
            Terdapat kontradiksi laten ihwal <strong>"Tafsir Pragmatis"</strong> di tgl 12 Nov. Ingin memutar komparasi sinkron?
         </div>
       </div>
    </div>
  );
}

export function SpotlightTour({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Measure target bounding rect whenever step changes or window resizes
  useEffect(() => {
    if (!isOpen) return;

    // Small delay ensures layout paints (especially for mobile bottom tabs layout shifts)
    const updateRect = () => {
      setTimeout(() => {
        const target = TOUR_STEPS[currentStep]?.target;
        if (target) {
          const el = document.querySelector(target);
          if (el) {
            setRect(el.getBoundingClientRect());
            return;
          }
        }
        setRect(null);
      }, 50);
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect);
    };
  }, [currentStep, isOpen]);

  // Reset step to 0 when opened
  useEffect(() => {
    if (isOpen) setCurrentStep(0);
  }, [isOpen]);

  if (!isOpen) return null;

  const stepInfo = TOUR_STEPS[currentStep];

  // Calculate Mobile-First Popover Positioning
  let inlineStyle: React.CSSProperties = {
    top: '50%',
    left: '16px',
    right: '16px',
    transform: 'translateY(-50%)',
    margin: '0 auto',
    maxWidth: '400px' // For larger screens
  };

  if (rect) {
    // If element is in lower half of screen (like bottom nav), render popover ABOVE it
    const isBottom = rect.top > window.innerHeight / 2;
    
    if (isBottom) {
      inlineStyle = {
        bottom: `${window.innerHeight - rect.top + 16}px`, 
        left: '16px',
        right: '16px',
        margin: '0 auto',
        maxWidth: '400px'
      };
    } else {
      // Element is at top (like headers), render BELOW it
      inlineStyle = {
        top: `${rect.bottom + 16}px`,
        left: '16px',
        right: '16px',
        margin: '0 auto',
        maxWidth: '400px'
      };
    }
  }

  return (
    <div className="fixed inset-0 z-[100] animate-fade-in font-sans">
       {/* Background Catcher to prevent background clicks during tour */}
       <div className="absolute inset-0 z-0 bg-transparent" />
       
       {/* Mobile Spotlight Mask (Using huge box-shadow strategy) */}
       <div 
         className="absolute pointer-events-none transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] z-10 rounded-2xl shadow-[0_0_0_3000px_rgba(10,10,10,0.92)] border-[3px] border-emerald-500 shadow-black/90"
         style={{
           // Apply slight padding around the masked element
           top: rect ? rect.top - 6 : window.innerHeight / 2 - 30,
           left: rect ? rect.left - 6 : window.innerWidth / 2 - 30,
           width: rect ? rect.width + 12 : 60,
           height: rect ? rect.height + 12 : 60,
           opacity: isOpen ? 1 : 0
         }}
       />
       
       {/* Popover Card */}
       <div 
         className="absolute z-20 bg-[#0d0d0d] border border-zinc-800 p-5 md:p-8 shadow-2xl transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] rounded-3xl"
         style={inlineStyle}
       >
         <div className="flex items-start gap-4 mb-4 border-b border-zinc-800/50 pb-4">
           <div className="flex items-center justify-center p-3 bg-zinc-900 border border-zinc-800 rounded-xl">{stepInfo.icon}</div>
           <div className="flex-1">
             <h3 className="font-serif text-lg md:text-xl tracking-wide text-zinc-100">{stepInfo.title}</h3>
             <div className="flex gap-1 mt-2">
               {TOUR_STEPS.map((_, idx) => (
                 <div 
                   key={idx} 
                   className={`h-1 rounded-full transition-all duration-500 ${idx === currentStep ? 'w-4 bg-emerald-500' : 'w-1.5 bg-zinc-700'}`}
                 />
               ))}
             </div>
           </div>
         </div>
         
         <div className="text-zinc-400 text-[13px] md:text-sm leading-relaxed">
           {stepInfo.content}
         </div>

         {/* Interactive Demos */}
         {stepInfo.demoMode === 'inkubasi' && <DemoInkubasi />}
         {stepInfo.demoMode === 'catatan' && <DemoCatatan />}
         {stepInfo.demoMode === 'mutabaah' && <DemoMutabaah />}
         {stepInfo.demoMode === 'ai' && <DemoAI />}

         <div className="flex items-center justify-between mt-6 pt-5 border-t border-zinc-800/50">
           <button 
             onClick={onClose}
             className="text-[10px] font-mono tracking-widest uppercase text-zinc-500 hover:text-zinc-300 transition-colors p-2"
           >
             Lewati
           </button>
           <div className="flex gap-2">
             {currentStep > 0 && (
               <ZenButton type="button" onClick={() => setCurrentStep(prev => prev - 1)} className="bg-transparent border-transparent min-h-[36px] py-1 px-4 text-xs">
                 Mundur
               </ZenButton>
             )}
             <ZenButton type="button" onClick={() => currentStep < TOUR_STEPS.length - 1 ? setCurrentStep(prev => prev + 1) : onClose()} className="min-h-[36px] py-1 px-4 text-xs">
               {currentStep === TOUR_STEPS.length - 1 ? 'Mulai' : 'Lanjut'}
             </ZenButton>
           </div>
         </div>
       </div>
    </div>
  );
}
