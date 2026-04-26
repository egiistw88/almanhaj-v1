import { cn } from "@/lib/utils";
import React from "react";

export function SectionTitle({ children, className }: { children: React.ReactNode, className?: string }) {
  // High contrast, serif font for authority
  return (
    <h1 className={cn("text-3xl md:text-4xl font-serif text-zinc-50 tracking-wide font-normal", className)}>
      {children}
    </h1>
  );
}
