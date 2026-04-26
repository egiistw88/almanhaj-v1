import { cn } from "@/lib/utils";
import React from "react";

export function PageContainer({ children, className }: { children: React.ReactNode, className?: string }) {
  // Mobile app fluid layout: minimal padding, tighter vertical spacing
  return (
    <div className={cn("w-full space-y-8 animate-fade-in", className)}>
      {children}
    </div>
  );
}
