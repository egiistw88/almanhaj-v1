import React from 'react';
import { cn } from "@/lib/utils";

interface ZenAlertProps {
  type?: 'error' | 'success' | 'info';
  message: string;
  onClose?: () => void;
  className?: string;
}

export function ZenAlert({ type = 'error', message, onClose, className }: ZenAlertProps) {
  if (!message) return null;

  const typeConfig = {
    error: "bg-red-500/10 border-red-500/20 text-red-400",
    success: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    info: "bg-blue-500/10 border-blue-500/20 text-blue-400"
  };

  return (
    <div className={cn(`flex justify-between items-center text-xs font-sans px-4 py-3 border rounded ${typeConfig[type]}`, className)}>
      <span>{message}</span>
      {onClose && (
        <button onClick={onClose} className="ml-4 opacity-50 hover:opacity-100 transition-opacity uppercase font-mono tracking-widest text-[10px]">
          [X]
        </button>
      )}
    </div>
  );
}
