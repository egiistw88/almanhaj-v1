import React from "react";

interface ZenModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function ZenModal({ isOpen, onClose, title, children }: ZenModalProps) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-[#0a0a0a]/90 backdrop-blur-sm transition-opacity pb-[env(safe-area-inset-bottom)]">
      <div className="bg-[#0d0d0d] border border-zinc-800 w-full md:max-w-2xl p-6 md:p-12 shadow-2xl overflow-y-auto max-h-[90vh] rounded-t-3xl md:rounded-2xl pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div className="flex justify-between items-center mb-10 border-b border-zinc-800/50 pb-6">
          <h2 className="text-xl md:text-2xl font-serif text-zinc-100">{title}</h2>
          <button 
            onClick={onClose} 
            className="text-zinc-500 hover:text-zinc-100 transition-colors font-mono text-xs tracking-widest uppercase py-2"
          >
            Tutup [X]
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
