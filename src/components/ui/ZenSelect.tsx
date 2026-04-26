import * as React from "react";
import { cn } from "@/lib/utils";

export const ZenSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => {
    return (
      <select
        className={cn(
          "flex w-full border-b border-zinc-800 bg-transparent px-0 py-3 text-base text-zinc-100 transition-colors",
          "focus:border-zinc-400 focus:outline-none appearance-none cursor-pointer",
          "disabled:cursor-not-allowed disabled:opacity-30",
          className
        )}
        ref={ref}
        {...props}
      >
        {props.children}
      </select>
    )
  }
)
ZenSelect.displayName = "ZenSelect"
