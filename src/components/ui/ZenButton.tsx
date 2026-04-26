import * as React from "react";
import { cn } from "@/lib/utils";

export const ZenButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center border border-zinc-700 bg-transparent px-8 py-3.5 min-h-[44px] rounded-full text-sm font-medium tracking-wide text-zinc-300 transition-all duration-300 active:scale-95",
          "hover:bg-zinc-100 hover:text-zinc-900 hover:border-zinc-100",
          "focus:outline-none focus:border-zinc-100 focus:bg-zinc-100 focus:text-zinc-900",
          "disabled:opacity-30 disabled:scale-100 disabled:pointer-events-none",
          className
        )}
        {...props}
      />
    )
  }
)
ZenButton.displayName = "ZenButton"
