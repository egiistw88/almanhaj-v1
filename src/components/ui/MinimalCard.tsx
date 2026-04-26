import { cn } from "@/lib/utils";
import React from "react";

export function MinimalCard({ children, className, onClick }: { children: React.ReactNode, className?: string, onClick?: () => void }) {
  return (
    <div className={cn("border border-zinc-800/60 p-5 md:p-6 bg-[#0d0d0d]/50 rounded-2xl", className)} onClick={onClick}>
      {children}
    </div>
  );
}
