import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function summarizeDescription(value: string | null | undefined, fallback = "설명 없음") {
  if (!value) return fallback;

  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return fallback;

  return normalized;
}
