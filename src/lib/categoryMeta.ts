import {
  Dumbbell,
  Recycle,
  Trophy,
  Users,
  BookOpen,
  FileText,
  Landmark,
  type LucideIcon,
} from "lucide-react"

interface CategoryMeta {
  icon: LucideIcon
  color: string        // Tailwind bg class
  textColor: string    // Tailwind text class
  durationOptions?: number[]   // available slot lengths in minutes
  defaultDuration?: number     // pre-selected duration in minutes
}

const META: Record<string, CategoryMeta> = {
  "Leisure Centre": {
    icon: Dumbbell,
    color: "bg-blue-100 dark:bg-blue-950",
    textColor: "text-blue-600 dark:text-blue-400",
    durationOptions: [60],
    defaultDuration: 60,
  },
  "Recycling Centre": {
    icon: Recycle,
    color: "bg-green-100 dark:bg-green-950",
    textColor: "text-green-600 dark:text-green-400",
    durationOptions: [30],
    defaultDuration: 30,
  },
  "Sports Pitch": {
    icon: Trophy,
    color: "bg-orange-100 dark:bg-orange-950",
    textColor: "text-orange-600 dark:text-orange-400",
    durationOptions: [60, 90, 120],
    defaultDuration: 60,
  },
  "Community Hub": {
    icon: Users,
    color: "bg-purple-100 dark:bg-purple-950",
    textColor: "text-purple-600 dark:text-purple-400",
    durationOptions: [60, 120],
    defaultDuration: 60,
  },
  Library: {
    icon: BookOpen,
    color: "bg-amber-100 dark:bg-amber-950",
    textColor: "text-amber-600 dark:text-amber-400",
    durationOptions: [30, 60],
    defaultDuration: 60,
  },
  "Register Office": {
    icon: FileText,
    color: "bg-rose-100 dark:bg-rose-950",
    textColor: "text-rose-600 dark:text-rose-400",
    durationOptions: [30],
    defaultDuration: 30,
  },
  "Venue Hire": {
    icon: Landmark,
    color: "bg-indigo-100 dark:bg-indigo-950",
    textColor: "text-indigo-600 dark:text-indigo-400",
    durationOptions: [60, 120, 180, 240],
    defaultDuration: 120,
  },
}

const FALLBACK: CategoryMeta = {
  icon: Users,
  color: "bg-muted",
  textColor: "text-muted-foreground",
}

export function getCategoryMeta(name: string): CategoryMeta {
  return META[name] ?? FALLBACK
}

/**
 * Check if a category matches a search query.
 * Matches against name and API-driven search aliases (comma-separated).
 */
export function categoryMatchesSearch(categoryName: string, query: string, searchAliases?: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  if (categoryName.toLowerCase().includes(q)) return true
  if (searchAliases) {
    const aliases = searchAliases.toLowerCase().split(",").map((a) => a.trim())
    if (aliases.some((a) => a.includes(q))) return true
  }
  return false
}

import { ServicebookingTnServicetype } from "@/types/generated"

/** Map category display name → tn_servicetype enum value */
export const SERVICE_TYPE_BY_CATEGORY: Record<string, number> = {
  "Leisure Centre": ServicebookingTnServicetype.Leisure,
  "Recycling Centre": ServicebookingTnServicetype.Recycling,
  "Sports Pitch": ServicebookingTnServicetype.Sports,
  "Community Hub": ServicebookingTnServicetype.Community,
  "Library": ServicebookingTnServicetype.Library,
  "Register Office": ServicebookingTnServicetype.Registration,
  "Venue Hire": ServicebookingTnServicetype.VenueHire,
}

export function getCategoryDurationConfig(categoryName?: string): {
  options: number[]
  defaultDuration: number
} {
  const meta = categoryName ? META[categoryName] : undefined
  return {
    options: meta?.durationOptions ?? [30],
    defaultDuration: meta?.defaultDuration ?? 30,
  }
}

function gcd(a: number, b: number): number {
  while (b) {
    ;[a, b] = [b, a % b]
  }
  return a
}

/**
 * Compute the finest grid resolution for a category by taking the GCD
 * of its duration options. This decouples display cell size from booking duration.
 */
export function getGridResolution(categoryName?: string): number {
  const { options } = getCategoryDurationConfig(categoryName)
  return options.reduce((acc, val) => gcd(acc, val))
}
