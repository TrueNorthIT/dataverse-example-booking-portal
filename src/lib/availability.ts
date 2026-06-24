/**
 * Pure availability logic — slot generation, overlap counting and period
 * grouping. Extracted from useAvailability / AvailabilitySlotGrid so it can be
 * unit-tested without React, react-query or the network.
 *
 * Interval convention: a booking `[start, end)` overlaps a slot `[slotStart,
 * slotEnd)` when `start < slotEnd && end > slotStart` (half-open).
 */
import { addMinutes, format, isAfter, isBefore, max, parseISO } from "date-fns"
import type { TimeInfo } from "@/types/calendar"
import type { ParsedBooking } from "@/types/bookings"

export interface TimeSlot {
  start: string
  end: string
  startLabel: string
  endLabel: string
  available: boolean
  spotsLeft: number
  capacity: number
  /** True when this slot is unavailable specifically because of buffer time. */
  bufferBlocked: boolean
}

/** Count bookings whose buffered window overlaps `[slotStart, slotEnd)`. */
export function countOverlaps(
  bookings: ParsedBooking[],
  slotStart: Date,
  slotEnd: Date
): number {
  return bookings.filter(
    (b) => isBefore(b.start, slotEnd) && isAfter(b.bufferedEnd, slotStart)
  ).length
}

/** Count bookings whose actual (un-buffered) window overlaps `[slotStart, slotEnd)`. */
export function countRawOverlaps(
  bookings: ParsedBooking[],
  slotStart: Date,
  slotEnd: Date
): number {
  return bookings.filter(
    (b) => isBefore(b.start, slotEnd) && isAfter(b.end, slotStart)
  ).length
}

/**
 * Build the day's bookable time slots from the calendar's working-hour blocks,
 * dividing each block into `slotDurationMins` slots, counting overlapping
 * bookings against the block's capacity, and clipping changeover buffers.
 */
export function generateAvailabilitySlots(
  blocks: TimeInfo[],
  bookings: ParsedBooking[],
  bufferMinutes: number,
  slotDurationMins: number
): TimeSlot[] {
  const result: TimeSlot[] = []

  for (const block of blocks) {
    const blockStart = parseISO(block.Start)
    const blockEnd = parseISO(block.End)
    const blockCapacity = block.Effort || 1

    let cursor = new Date(blockStart)
    while (isBefore(cursor, blockEnd)) {
      const slotEnd = addMinutes(cursor, slotDurationMins)
      if (isAfter(slotEnd, blockEnd)) break

      const clippingBuffers =
        bufferMinutes > 0
          ? bookings.filter((b) => !isAfter(b.end, cursor) && isAfter(b.bufferedEnd, cursor))
          : []

      if (clippingBuffers.length > 0) {
        const bufferEnd = max(clippingBuffers.map((b) => b.bufferedEnd))
        const adjustedEnd = addMinutes(bufferEnd, slotDurationMins)

        result.push({
          start: cursor.toISOString(),
          end: bufferEnd.toISOString(),
          startLabel: format(cursor, "HH:mm"),
          endLabel: format(bufferEnd, "HH:mm"),
          available: false,
          spotsLeft: 0,
          capacity: blockCapacity,
          bufferBlocked: true,
        })

        if (!isAfter(adjustedEnd, blockEnd)) {
          const adjOverlaps = countOverlaps(bookings, bufferEnd, adjustedEnd)
          const adjRawOverlaps = countRawOverlaps(bookings, bufferEnd, adjustedEnd)
          const adjSpotsLeft = Math.max(0, blockCapacity - adjOverlaps)
          const adjRawSpotsLeft = Math.max(0, blockCapacity - adjRawOverlaps)

          result.push({
            start: bufferEnd.toISOString(),
            end: adjustedEnd.toISOString(),
            startLabel: format(bufferEnd, "HH:mm"),
            endLabel: format(adjustedEnd, "HH:mm"),
            available: adjSpotsLeft > 0,
            spotsLeft: adjSpotsLeft,
            capacity: blockCapacity,
            bufferBlocked: adjSpotsLeft === 0 && adjRawSpotsLeft > 0,
          })

          cursor = adjustedEnd
        } else {
          cursor = slotEnd
        }
        continue
      }

      const overlapCount = countOverlaps(bookings, cursor, slotEnd)
      const spotsLeft = Math.max(0, blockCapacity - overlapCount)

      result.push({
        start: cursor.toISOString(),
        end: slotEnd.toISOString(),
        startLabel: format(cursor, "HH:mm"),
        endLabel: format(slotEnd, "HH:mm"),
        available: spotsLeft > 0,
        spotsLeft,
        capacity: blockCapacity,
        bufferBlocked: false,
      })

      cursor = slotEnd
    }
  }

  return result
}

export interface PeriodGroup {
  label: string
  slots: { slot: TimeSlot; globalIndex: number }[]
}

/** Split slots into Morning (<12:00), Afternoon (<17:00) and Evening groups. */
export function groupByPeriod(slots: TimeSlot[]): PeriodGroup[] {
  const morning: PeriodGroup = { label: "Morning", slots: [] }
  const afternoon: PeriodGroup = { label: "Afternoon", slots: [] }
  const evening: PeriodGroup = { label: "Evening", slots: [] }

  slots.forEach((slot, i) => {
    const hour = parseISO(slot.start).getHours()
    const entry = { slot, globalIndex: i }
    if (hour < 12) morning.slots.push(entry)
    else if (hour < 17) afternoon.slots.push(entry)
    else evening.slots.push(entry)
  })

  return [morning, afternoon, evening].filter((g) => g.slots.length > 0)
}
