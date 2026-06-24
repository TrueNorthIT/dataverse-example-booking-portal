import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Human-readable duration, e.g. "30 min", "1 hour", "1½ hours". */
export function formatDuration(mins: number): string {
  if (mins < 60) return `${mins} min`
  const hours = Math.floor(mins / 60)
  const remainder = mins % 60
  if (remainder === 0) return `${hours} hour${hours > 1 ? "s" : ""}`
  return `${hours}½ hours` // e.g. 1½ hours
}
