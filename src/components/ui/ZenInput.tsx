import * as React from "react";
import { cn } from "@/lib/utils";

export const ZenInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex w-full border-b border-zinc-800 bg-transparent px-0 py-3 text-base text-zinc-100 transition-colors",
          "placeholder:text-zinc-700 focus:border-zinc-400 focus:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-30",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
ZenInput.displayName = "ZenInput"
