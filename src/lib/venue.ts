/**
 * Pure venue-hire helpers — session-slot conflict detection and room matching
 * by capacity/features. Extracted from VenueSessionPicker / VenueHireBrowser.
 */
import { parseISO } from "date-fns"
import { getVenueRoom, getRoomFeatures, type VenueFeature } from "@/lib/pricing"
import type { BookingTimeRange } from "@/types/bookings"
import type { Venue } from "@/types/generated"

/** True if any booking overlaps the `[start, end)` session window. */
export function sessionIsBooked(
  range: { start: string; end: string },
  bookings: BookingTimeRange[]
): boolean {
  const startMs = parseISO(range.start).getTime()
  const endMs = parseISO(range.end).getTime()
  return bookings.some((b) => {
    const bs = parseISO(b.starttime).getTime()
    const be = parseISO(b.endtime).getTime()
    return bs < endMs && be > startMs
  })
}

export interface RoomMatch {
  resource: Venue
  capacity: number
}

/**
 * Filter rooms to those with all `requiredFeatures`, sorted smallest-first,
 * then split by whether they seat `guestCount` (null = no capacity filter).
 */
export function filterRoomsByCapacityAndFeatures(
  rooms: Venue[],
  requiredFeatures: VenueFeature[],
  guestCount: number | null
): { fits: RoomMatch[]; tooSmall: RoomMatch[] } {
  const matched: RoomMatch[] = rooms
    .map((resource) => ({
      resource,
      capacity: getVenueRoom(resource.name ?? undefined)?.capacity ?? 0,
    }))
    .filter(({ resource }) => {
      const rf = getRoomFeatures(resource.name ?? undefined)
      return requiredFeatures.every((f) => rf.includes(f))
    })
    .sort((a, b) => a.capacity - b.capacity)

  if (guestCount == null) return { fits: matched, tooSmall: [] }
  return {
    fits: matched.filter((r) => r.capacity >= guestCount),
    tooSmall: matched.filter((r) => r.capacity < guestCount),
  }
}
