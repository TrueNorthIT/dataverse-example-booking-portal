/**
 * Pure styling/label helpers for a single availability slot cell. Extracted
 * from AvailabilitySlotGrid so the (otherwise deeply-nested) colour and
 * rounding decisions are readable and unit-testable.
 */
import { cn } from "@/lib/utils"
import type { TimeSlot } from "@/lib/availability"

/** The visual state of a cell, derived by the grid from slots + selection. */
export interface SlotVisualState {
  /** The signed-in citizen already booked this slot. */
  isMine: boolean
  /** This cell is part of a multi-cell "mine" run (affects ring styling). */
  isMineMulti: boolean
  /** This cell is part of the currently selected span. */
  isInSpan: boolean
  /** Available, but no valid span of the requested length starts/covers it. */
  wontFit: boolean
  /** The underlying slot is bookable. */
  available: boolean
  /** Blocked by changeover buffer rather than a booking. */
  bufferBlocked: boolean
  /** Multi-capacity slot running low (≤25% spaces left). */
  lowStock: boolean
}

/** Position of a cell within a merged run (null = standalone, fully rounded). */
export interface MergePosition {
  first: boolean
  middle: boolean
  last: boolean
}

/** Border/background classes for a cell, by precedence: mine → selected → won't-fit → available → changeover → full. */
export function slotVariantClasses(s: SlotVisualState): string {
  if (s.isMine) {
    return cn(
      "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900 cursor-pointer",
      !s.isMineMulti && "ring-1 ring-blue-200 dark:ring-blue-800",
    )
  }
  if (s.isInSpan) return "border-primary bg-primary text-primary-foreground"
  if (s.wontFit) {
    return "border-green-200 bg-green-50 text-green-700/50 cursor-not-allowed line-through dark:border-green-800 dark:bg-green-950 dark:text-green-300/50"
  }
  if (s.available) {
    return s.lowStock
      ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-900"
      : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-950 dark:text-green-300 dark:hover:bg-green-900"
  }
  if (s.bufferBlocked) {
    return "border-purple-200 bg-purple-50 text-purple-400 cursor-not-allowed dark:border-purple-800 dark:bg-purple-950 dark:text-purple-500"
  }
  return "border-border bg-muted text-muted-foreground/50 cursor-not-allowed"
}

/** Rounded-corner + border-collapse classes that merge a run of adjacent cells. */
export function mergeRoundingClasses(pos: MergePosition | null): string {
  if (!pos) return "rounded-lg"
  return cn(
    pos.first && "rounded-l-lg rounded-r-none border-r-0 -mr-1 z-10",
    pos.middle && "rounded-none border-x-0 -mx-1 z-10",
    pos.last && "rounded-r-lg rounded-l-none border-l-0 -ml-1 z-10",
  )
}

/** Human-readable state, used for the cell's `aria-label`. */
export function slotStateLabel(slot: TimeSlot, s: Pick<SlotVisualState, "isMine" | "wontFit">, multiCapacity: boolean): string {
  if (s.isMine) return "your booking"
  if (s.wontFit) return "won't fit"
  if (slot.available) return multiCapacity ? `${slot.spotsLeft} spaces left` : "available"
  return slot.bufferBlocked ? "changeover" : "full"
}
