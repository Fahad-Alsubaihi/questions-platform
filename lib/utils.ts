import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { createHash } from "crypto";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

// Normalize Arabic text and hash it for dedup
export function hashQuestion(text: string): string {
  const normalized = text
    .trim()
    .toLowerCase()
    .replace(/[ؐ-ًؚ-ٟ]/g, "") // remove tashkeel
    .replace(/[أإآا]/g, "ا")                        // normalize alef
    .replace(/ة/g, "ه")                             // normalize ta marbuta
    .replace(/ى/g, "ي")                             // normalize alef maqsura
    .replace(/\s+/g, " ");                           // collapse spaces
  return createHash("sha256").update(normalized).digest("hex");
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unexpected error occurred";
}
