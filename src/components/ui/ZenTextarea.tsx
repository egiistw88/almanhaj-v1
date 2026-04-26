import * as React from "react";
import { cn } from "@/lib/utils";

export const ZenTextarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[200px] w-full bg-[#0a0a0c] p-6 md:p-8 text-[1.05rem] text-zinc-300 transition-colors border border-zinc-800/80 rounded-2xl shadow-inner",
          "placeholder:text-zinc-700/80 placeholder:italic",
          "focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500/50",
          "disabled:cursor-not-allowed disabled:opacity-30 resize-y",
          "font-sans leading-loose tracking-wide",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
ZenTextarea.displayName = "ZenTextarea"
