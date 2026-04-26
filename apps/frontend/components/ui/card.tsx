import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("glass-panel mesh-border rounded-[28px] p-5 shadow-panel sm:p-6", className)}
      {...props}
    />
  );
}
