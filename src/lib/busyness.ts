/**
 * Pure "busyness" calculation — how full a resource's day looks, expressed as a
 * three-level heat indicator. Extracted from useTodaysBusyness so the
 * window-counting and thresholds are unit-testable (and so the test stops
 * re-implementing the logic it's meant to verify).
 */
import { parseISO } from "date-fns"
import { BUSYNESS } from "@/lib/constants"
import type { ResourceBookingRow } from "@/types/bookings"

export type BusyLevel = "quiet" | "moderate" | "busy"

const { WINDOW_MINS, DAY_START_HOUR, DAY_END_HOUR, BUSY_THRESHOLD, MODERATE_THRESHOLD } = BUSYNESS

/** Total sampling windows in a working day. */
export const TOTAL_WINDOWS = ((DAY_END_HOUR - DAY_START_HOUR) * 60) / WINDOW_MINS

/** Map a booked-window fraction (0..1) to a level. */
export function busynessLevelFromFraction(fraction: number): BusyLevel {
  if (fraction >= BUSY_THRESHOLD) return "busy"
  if (fraction >= MODERATE_THRESHOLD) return "moderate"
  return "quiet"
}

/**
 * Count how many working-day windows overlap at least one booking, then derive
 * the level. `dayStart` anchors the local working day.
 */
export function computeBusyness(
  bookings: { starttime: string; endtime: string }[],
  dayStart: Date
): BusyLevel {
  let busyWindows = 0
  for (let w = 0; w < TOTAL_WINDOWS; w++) {
    const winStart = new Date(dayStart)
    winStart.setHours(DAY_START_HOUR, w * WINDOW_MINS, 0, 0)
    const winEnd = new Date(winStart.getTime() + WINDOW_MINS * 60 * 1000)

    const hasOverlap = bookings.some((b) => {
      const bStart = parseISO(b.starttime)
      const bEnd = parseISO(b.endtime)
      return bStart < winEnd && bEnd > winStart
    })
    if (hasOverlap) busyWindows++
  }
  return busynessLevelFromFraction(busyWindows / TOTAL_WINDOWS)
}

/** Group booking rows by resource id, then compute each resource's level. */
export function computeBusynessByResource(
  bookings: ResourceBookingRow[],
  dayStart: Date
): Map<string, BusyLevel> {
  const byResource = new Map<string, ResourceBookingRow[]>()
  for (const b of bookings) {
    const list = byResource.get(b.resource) ?? []
    list.push(b)
    byResource.set(b.resource, list)
  }

  const levels = new Map<string, BusyLevel>()
  for (const [resourceId, rows] of byResource) {
    levels.set(resourceId, computeBusyness(rows, dayStart))
  }
  return levels
}
