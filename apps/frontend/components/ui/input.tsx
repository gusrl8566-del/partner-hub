import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "min-h-12 w-full rounded-[1.25rem] border border-border bg-white/85 px-4 py-3 text-sm outline-none ring-0 placeholder:text-[#8c7c6a] transition focus:border-primary focus:bg-white",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
