import { describe, it, expect } from "vitest"
import {
  busynessLevelFromFraction,
  computeBusyness,
  computeBusynessByResource,
  TOTAL_WINDOWS,
} from "@/lib/busyness"
import type { ResourceBookingRow } from "@/types/bookings"

const dayStart = new Date(2025, 0, 15)

function booking(startHour: number, durationMins: number) {
  const start = new Date(dayStart)
  start.setHours(startHour, 0, 0, 0)
  const end = new Date(start.getTime() + durationMins * 60_000)
  return { starttime: start.toISOString(), endtime: end.toISOString() }
}

describe("busynessLevelFromFraction", () => {
  it("maps fractions to the three levels at the thresholds", () => {
    expect(busynessLevelFromFraction(0)).toBe("quiet")
    expect(busynessLevelFromFraction(0.24)).toBe("quiet")
    expect(busynessLevelFromFraction(0.25)).toBe("moderate")
    expect(busynessLevelFromFraction(0.59)).toBe("moderate")
    expect(busynessLevelFromFraction(0.6)).toBe("busy")
    expect(busynessLevelFromFraction(1)).toBe("busy")
  })
})

describe("computeBusyness", () => {
  it("has 20 windows in an 08:00–18:00 day", () => {
    expect(TOTAL_WINDOWS).toBe(20)
  })

  it("returns quiet for no bookings", () => {
    expect(computeBusyness([], dayStart)).toBe("quiet")
  })

  it("returns quiet for a single short booking (1/20)", () => {
    expect(computeBusyness([booking(10, 30)], dayStart)).toBe("quiet")
  })

  it("returns moderate at exactly 25% (5 windows)", () => {
    const bookings = [8, 9, 10, 11, 12].map((h) => booking(h, 30))
    expect(computeBusyness(bookings, dayStart)).toBe("moderate")
  })

  it("returns busy at exactly 60% (6 continuous hours = 12 windows)", () => {
    expect(computeBusyness([booking(8, 360)], dayStart)).toBe("busy")
  })

  it("ignores bookings outside working hours", () => {
    expect(computeBusyness([booking(6, 120), booking(18, 120)], dayStart)).toBe("quiet")
  })
})

describe("computeBusynessByResource", () => {
  it("computes a level per resource id", () => {
    const rows: ResourceBookingRow[] = [
      { resource: "r1", ...booking(8, 600) }, // full day → busy
      { resource: "r2", ...booking(10, 30) }, // one slot → quiet
    ]
    const levels = computeBusynessByResource(rows, dayStart)
    expect(levels.get("r1")).toBe("busy")
    expect(levels.get("r2")).toBe("quiet")
    expect(levels.size).toBe(2)
  })

  it("returns an empty map for no bookings", () => {
    expect(computeBusynessByResource([], dayStart).size).toBe(0)
  })
})
