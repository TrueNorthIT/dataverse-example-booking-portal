import { describe, it, expect } from "vitest"
import { sessionIsBooked, filterRoomsByCapacityAndFeatures } from "@/lib/venue"
import type { Venue } from "@/types/generated"

function room(name: string, id = name): Venue {
  return { bookableresourceid: id, name } as Venue
}

describe("sessionIsBooked", () => {
  const range = { start: "2025-01-15T09:00:00Z", end: "2025-01-15T13:00:00Z" }

  it("is false with no bookings", () => {
    expect(sessionIsBooked(range, [])).toBe(false)
  })

  it("is true when a booking overlaps the session", () => {
    expect(
      sessionIsBooked(range, [
        { starttime: "2025-01-15T12:00:00Z", endtime: "2025-01-15T14:00:00Z" },
      ])
    ).toBe(true)
  })

  it("is false for an adjacent (non-overlapping) booking", () => {
    expect(
      sessionIsBooked(range, [
        { starttime: "2025-01-15T13:00:00Z", endtime: "2025-01-15T15:00:00Z" },
      ])
    ).toBe(false)
  })
})

describe("filterRoomsByCapacityAndFeatures", () => {
  // Names must match keys in lib/pricing VENUE_ROOMS.
  const alexandra = room("Morley Town Hall — Alexandra Hall") // cap 650, has kitchen
  const strawberry = room("Strawberry Lane Community Centre — Hall") // cap 80, wetroom+kitchen
  const small = room("Morley Town Hall — Small Banqueting Hall") // cap 40, no features
  const rooms = [alexandra, strawberry, small]

  it("sorts by capacity ascending and returns no tooSmall when guestCount is null", () => {
    const { fits, tooSmall } = filterRoomsByCapacityAndFeatures(rooms, [], null)
    expect(fits.map((r) => r.capacity)).toEqual([40, 80, 650])
    expect(tooSmall).toEqual([])
  })

  it("splits fits and tooSmall by guest count", () => {
    const { fits, tooSmall } = filterRoomsByCapacityAndFeatures(rooms, [], 100)
    expect(fits.map((r) => r.resource.name)).toEqual([alexandra.name])
    expect(tooSmall.map((r) => r.capacity)).toEqual([40, 80])
  })

  it("filters to rooms that have all required features", () => {
    const { fits } = filterRoomsByCapacityAndFeatures(rooms, ["wetroom"], null)
    expect(fits.map((r) => r.resource.name)).toEqual([strawberry.name])
  })

  it("treats an unknown room name as capacity 0 with no features", () => {
    const { fits } = filterRoomsByCapacityAndFeatures([room("Unknown Venue")], [], null)
    expect(fits).toEqual([{ resource: expect.objectContaining({ name: "Unknown Venue" }), capacity: 0 }])
  })
})
