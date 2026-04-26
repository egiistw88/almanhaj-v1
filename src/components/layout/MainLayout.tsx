import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Zap, Library, Network, Target, HelpCircle } from "lucide-react";
import { SpotlightTour } from "@/components/ui/SpotlightTour";
import { SyncObserver } from "@/components/ui/SyncObserver";
import { Toaster } from 'sonner';

function BottomNavLink({ to, id, icon: Icon, label }: { to: string, id?: string, icon: any, label: string }) {
  const location = useLocation();
  const isActive = location.pathname.startsWith(to) && (to !== '/' || location.pathname === '/');
  
  return (
    <Link 
      id={id}
      to={to} 
      className={`flex flex-col items-center justify-center w-full min-h-[56px] transition-colors duration-300 ${isActive ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
    >
      <Icon className={`w-5 h-5 mb-1 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
      <span className="text-[10px] font-mono uppercase tracking-wider">{label}</span>
      {isActive && (
        <span className="absolute top-0 w-8 h-0.5 bg-emerald-500 rounded-b-full"></span>
      )}
    </Link>
  );
}

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  useEffect(() => {
    // Show guide automatically on first ever visit
    const hasSeenGuide = localStorage.getItem('almanhaj_interactivetour_seen');
    if (!hasSeenGuide) {
      // Delay slightly for dramatic effect & to let background render
      const timer = setTimeout(() => setIsGuideOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const closeGuide = () => {
    setIsGuideOpen(false);
    localStorage.setItem('almanhaj_interactivetour_seen', 'true');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200 lg:max-w-2xl lg:mx-auto lg:border-x lg:border-zinc-800/50 shadow-2xl relative">
      <SyncObserver />
      <Toaster theme="dark" position="top-center" toastOptions={{
        style: {
          background: '#0a0a0c',
          border: '1px solid rgba(39, 39, 42, 0.8)',
          color: '#d4d4d8',
          fontFamily: 'var(--font-sans)',
        },
      }} />
      {/* Mobile Top App Bar */}
      <header className="border-b border-zinc-800/60 bg-[#0a0a0a]/90 backdrop-blur-md sticky top-0 z-40 w-full h-14 flex items-center justify-between px-4">
        <Link id="nav-brand" to="/dashboard" className="flex items-center gap-2 group">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 group-hover:shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-shadow"></span>
          <span className="font-serif text-base tracking-widest uppercase text-zinc-100 transition-colors">Al-Manhaj</span>
        </Link>
        <button 
          onClick={() => setIsGuideOpen(true)}
          className="text-zinc-400 hover:text-emerald-400 p-2 rounded-full hover:bg-zinc-900 transition-colors"
          aria-label="Panduan"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </header>
      
      <main className="flex-1 flex flex-col w-full px-4 py-6 pb-[calc(56px+env(safe-area-inset-bottom)+1.5rem)] overflow-x-hidden">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-lg border-t border-zinc-800/60 flex items-center justify-around pb-[env(safe-area-inset-bottom)] lg:max-w-2xl lg:mx-auto">
        <div className="flex w-full justify-around relative">
          <BottomNavLink id="nav-dashboard" to="/dashboard" icon={LayoutDashboard} label="Beranda" />
          <BottomNavLink id="nav-inkubasi" to="/inkubasi" icon={Zap} label="Inkubasi" />
          <BottomNavLink id="nav-pustaka" to="/pustaka" icon={Library} label="Pustaka" />
          <BottomNavLink id="nav-catatan" to="/catatan" icon={Network} label="Catatan" />
          <BottomNavLink id="nav-mutabaah" to="/mutabaah" icon={Target} label="Mutaba'ah" />
        </div>
      </nav>

      <SpotlightTour isOpen={isGuideOpen} onClose={closeGuide} />
    </div>
  );
}
