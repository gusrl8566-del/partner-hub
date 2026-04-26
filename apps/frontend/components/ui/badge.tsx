import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("inline-flex rounded-full border border-white/50 bg-white/65 px-3 py-1 text-[0.7rem] font-semibold tracking-[0.16em] text-foreground", className)}
      {...props}
    />
  );
}
