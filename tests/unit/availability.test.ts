import { describe, it, expect } from "vitest"
import { addMinutes, parseISO } from "date-fns"
import {
  countOverlaps,
  countRawOverlaps,
  generateAvailabilitySlots,
  groupByPeriod,
  type TimeSlot,
} from "@/lib/availability"
import type { TimeInfo } from "@/types/calendar"
import type { ParsedBooking } from "@/types/bookings"

function parsed(startISO: string, endISO: string, bufferMins = 0): ParsedBooking {
  return {
    start: parseISO(startISO),
    end: parseISO(endISO),
    bufferedEnd: addMinutes(parseISO(endISO), bufferMins),
  }
}

function block(start: string, end: string, effort = 1): TimeInfo {
  return { Start: start, End: end, TimeCode: "Available", Effort: effort }
}

describe("countOverlaps / countRawOverlaps", () => {
  const slotStart = parseISO("2025-01-15T09:00:00Z")
  const slotEnd = parseISO("2025-01-15T10:00:00Z")

  it("counts a booking overlapping the window", () => {
    const b = [parsed("2025-01-15T09:30:00Z", "2025-01-15T10:30:00Z")]
    expect(countOverlaps(b, slotStart, slotEnd)).toBe(1)
    expect(countRawOverlaps(b, slotStart, slotEnd)).toBe(1)
  })

  it("does not count an adjacent (touching) booking", () => {
    const b = [parsed("2025-01-15T10:00:00Z", "2025-01-15T11:00:00Z")]
    expect(countOverlaps(b, slotStart, slotEnd)).toBe(0)
  })

  it("counts a buffered overlap that the raw window misses", () => {
    // ends at 09:00 but buffered to 09:15 → overlaps [09:00,10:00) only via buffer
    const b = [parsed("2025-01-15T08:00:00Z", "2025-01-15T09:00:00Z", 15)]
    expect(countOverlaps(b, slotStart, slotEnd)).toBe(1)
    expect(countRawOverlaps(b, slotStart, slotEnd)).toBe(0)
  })
})

describe("generateAvailabilitySlots", () => {
  it("divides a block into fixed-duration slots", () => {
    const slots = generateAvailabilitySlots(
      [block("2025-01-15T09:00:00Z", "2025-01-15T11:00:00Z")],
      [],
      0,
      60
    )
    expect(slots).toHaveLength(2)
    expect(slots.every((s) => s.available)).toBe(true)
    expect(slots[0].start).toBe("2025-01-15T09:00:00.000Z")
    expect(slots[1].start).toBe("2025-01-15T10:00:00.000Z")
  })

  it("stops before a partial trailing slot", () => {
    const slots = generateAvailabilitySlots(
      [block("2025-01-15T09:00:00Z", "2025-01-15T10:30:00Z")],
      [],
      0,
      60
    )
    expect(slots).toHaveLength(1)
  })

  it("marks a fully-booked capacity-1 slot unavailable", () => {
    const slots = generateAvailabilitySlots(
      [block("2025-01-15T09:00:00Z", "2025-01-15T10:00:00Z", 1)],
      [parsed("2025-01-15T09:00:00Z", "2025-01-15T10:00:00Z")],
      0,
      60
    )
    expect(slots[0].available).toBe(false)
    expect(slots[0].spotsLeft).toBe(0)
  })

  it("reports remaining capacity on a multi-capacity block", () => {
    const slots = generateAvailabilitySlots(
      [block("2025-01-15T09:00:00Z", "2025-01-15T10:00:00Z", 3)],
      [parsed("2025-01-15T09:00:00Z", "2025-01-15T10:00:00Z")],
      0,
      60
    )
    expect(slots[0].available).toBe(true)
    expect(slots[0].spotsLeft).toBe(2)
    expect(slots[0].capacity).toBe(3)
  })

  it("emits a buffer-blocked slot after a booking when a buffer applies", () => {
    const slots = generateAvailabilitySlots(
      [block("2025-01-15T09:00:00Z", "2025-01-15T11:00:00Z", 1)],
      [parsed("2025-01-15T09:00:00Z", "2025-01-15T10:00:00Z", 30)],
      30,
      60
    )
    expect(slots.some((s) => s.bufferBlocked)).toBe(true)
  })

  it("returns no slots for an empty block list", () => {
    expect(generateAvailabilitySlots([], [], 0, 60)).toEqual([])
  })
})

describe("groupByPeriod", () => {
  function slotAt(hourUtcLabelStart: string): TimeSlot {
    return {
      start: hourUtcLabelStart,
      end: hourUtcLabelStart,
      startLabel: "",
      endLabel: "",
      available: true,
      spotsLeft: 1,
      capacity: 1,
      bufferBlocked: false,
    }
  }

  it("omits empty period groups", () => {
    // Build slots at local 09:00 only → just Morning
    const nine = new Date(2025, 0, 15, 9, 0, 0)
    const groups = groupByPeriod([slotAt(nine.toISOString())])
    expect(groups).toHaveLength(1)
    expect(groups[0].label).toBe("Morning")
    expect(groups[0].slots[0].globalIndex).toBe(0)
  })

  it("splits across morning/afternoon/evening by local hour", () => {
    const mk = (h: number) => slotAt(new Date(2025, 0, 15, h, 0, 0).toISOString())
    const groups = groupByPeriod([mk(9), mk(14), mk(19)])
    expect(groups.map((g) => g.label)).toEqual(["Morning", "Afternoon", "Evening"])
  })
})
