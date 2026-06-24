/**
 * Pure helpers for matching a citizen's own bookings to availability slots.
 * Extracted from BookResourcePage.
 *
 * The expanded `tn_Booking` navigation carries the venue *name* (not its id),
 * so matches are made by name + time-overlap on the selected date.
 */
import { format, parseISO } from "date-fns"

interface BookingNav {
  name?: string
  starttime?: string
  endtime?: string
}

/** Minimal shape of an expanded servicebooking these helpers need. */
export interface ServicebookingWithBooking {
  tn_Booking?: BookingNav | undefined
}

interface SlotRange {
  start: string
  end: string
}

/** Slot start times (ISO) where the citizen already has a booking for this resource/date. */
export function findMyBookedSlotStarts(
  myBookings: ServicebookingWithBooking[],
  resourceName: string | undefined,
  selectedDate: Date,
  slots: SlotRange[]
): Set<string> {
  const set = new Set<string>()
  if (!myBookings.length || !resourceName || slots.length === 0) return set

  const dateStr = format(selectedDate, "yyyy-MM-dd")
  const myRanges: { start: number; end: number }[] = []
  for (const sb of myBookings) {
    const b = sb.tn_Booking
    if (!b?.name || !b.starttime || !b.endtime || b.name !== resourceName) continue
    const bStart = parseISO(b.starttime)
    if (format(bStart, "yyyy-MM-dd") !== dateStr) continue
    myRanges.push({ start: bStart.getTime(), end: parseISO(b.endtime).getTime() })
  }

  for (const slot of slots) {
    const slotStart = parseISO(slot.start).getTime()
    const slotEnd = parseISO(slot.end).getTime()
    if (myRanges.some((r) => r.start < slotEnd && r.end > slotStart)) {
      set.add(slot.start)
    }
  }
  return set
}

/** The citizen's servicebooking whose underlying booking overlaps the given slot. */
export function findServicebookingForSlot<T extends ServicebookingWithBooking>(
  myBookings: T[],
  resourceName: string | undefined,
  slot: SlotRange
): T | null {
  if (!myBookings.length || !resourceName) return null
  const slotStart = parseISO(slot.start).getTime()
  const slotEnd = parseISO(slot.end).getTime()
  for (const sb of myBookings) {
    const b = sb.tn_Booking
    if (!b?.name || !b.starttime || !b.endtime || b.name !== resourceName) continue
    const bStart = parseISO(b.starttime).getTime()
    const bEnd = parseISO(b.endtime).getTime()
    if (bStart < slotEnd && bEnd > slotStart) return sb
  }
  return null
}
