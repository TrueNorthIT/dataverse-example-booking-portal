import { describe, it, expect } from "vitest"
import { SESSIONS, sessionRange, defaultVenueDate, VENUE_LEAD_DAYS } from "@/lib/sessions"

describe("SESSIONS", () => {
  it("defines the four hire session blocks", () => {
    expect(SESSIONS.map((s) => s.key)).toEqual(["morning", "afternoon", "evening", "fullday"])
  })
})

describe("sessionRange", () => {
  const date = new Date(2025, 5, 1)

  it("computes duration and labels for a session", () => {
    const morning = SESSIONS.find((s) => s.key === "morning")!
    const range = sessionRange(date, morning)
    expect(range.durationMins).toBe(240) // 09:00–13:00
    expect(range.startLabel).toBe("09:00")
    expect(range.endLabel).toBe("13:00")
  })

  it("anchors start/end on the given date", () => {
    const evening = SESSIONS.find((s) => s.key === "evening")!
    const range = sessionRange(date, evening)
    expect(new Date(range.start).getHours()).toBe(18)
    expect(new Date(range.end).getHours()).toBe(23)
  })
})

describe("defaultVenueDate", () => {
  it("is VENUE_LEAD_DAYS ahead at local midnight", () => {
    const d = defaultVenueDate()
    expect(d.getHours()).toBe(0)
    expect(d.getMinutes()).toBe(0)
    const daysAhead = Math.round((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    expect(daysAhead).toBeGreaterThanOrEqual(VENUE_LEAD_DAYS - 1)
    expect(daysAhead).toBeLessThanOrEqual(VENUE_LEAD_DAYS)
  })
})
