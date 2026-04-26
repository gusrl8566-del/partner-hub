import type { TableHTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn("min-w-[42rem] w-full border-separate border-spacing-y-2 text-sm", className)} {...props} />;
}

export function TH({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("px-3 py-2 text-left text-[0.68rem] uppercase tracking-[0.24em] text-[#7b6b5a]", className)} {...props} />;
}

export function TD({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("rounded-2xl border border-white/70 bg-white/88 px-3 py-3 align-middle", className)} {...props} />;
}
