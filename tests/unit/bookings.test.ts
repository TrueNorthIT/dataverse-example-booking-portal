import { describe, it, expect } from "vitest"
import { findMyBookedSlotStarts, findServicebookingForSlot } from "@/lib/bookings"

const selectedDate = new Date(2025, 0, 15)

function sb(name: string, startISO: string, endISO: string, id = name) {
  return {
    tn_citizenservicebookingid: id,
    tn_Booking: { name, starttime: startISO, endtime: endISO, bookableresourcebookingid: `b-${id}` },
  }
}

// Slots in local time so they share the selectedDate calendar day.
function localSlot(hour: number) {
  const start = new Date(2025, 0, 15, hour, 0, 0)
  const end = new Date(2025, 0, 15, hour + 1, 0, 0)
  return { start: start.toISOString(), end: end.toISOString() }
}

describe("findMyBookedSlotStarts", () => {
  const slots = [localSlot(9), localSlot(10), localSlot(11)]
  const ten = localSlot(10)

  it("returns the slot starts overlapping the citizen's bookings for this resource/date", () => {
    const mine = [sb("Gym", ten.start, ten.end)]
    const set = findMyBookedSlotStarts(mine, "Gym", selectedDate, slots)
    expect(set.has(ten.start)).toBe(true)
    expect(set.size).toBe(1)
  })

  it("ignores bookings for a different resource", () => {
    const mine = [sb("Pool", ten.start, ten.end)]
    expect(findMyBookedSlotStarts(mine, "Gym", selectedDate, slots).size).toBe(0)
  })

  it("ignores bookings on a different date", () => {
    const other = new Date(2025, 0, 16, 10, 0, 0)
    const otherEnd = new Date(2025, 0, 16, 11, 0, 0)
    const mine = [sb("Gym", other.toISOString(), otherEnd.toISOString())]
    expect(findMyBookedSlotStarts(mine, "Gym", selectedDate, slots).size).toBe(0)
  })

  it("returns empty when inputs are missing", () => {
    expect(findMyBookedSlotStarts([], "Gym", selectedDate, slots).size).toBe(0)
    expect(findMyBookedSlotStarts([sb("Gym", ten.start, ten.end)], undefined, selectedDate, slots).size).toBe(0)
  })
})

describe("findServicebookingForSlot", () => {
  const ten = localSlot(10)

  it("returns the matching servicebooking", () => {
    const mine = [sb("Gym", ten.start, ten.end)]
    const found = findServicebookingForSlot(mine, "Gym", ten)
    expect(found?.tn_citizenservicebookingid).toBe("Gym")
  })

  it("returns null when nothing overlaps", () => {
    const mine = [sb("Gym", localSlot(9).start, localSlot(9).end)]
    expect(findServicebookingForSlot(mine, "Gym", ten)).toBeNull()
  })

  it("returns null with no bookings or no resource name", () => {
    expect(findServicebookingForSlot([], "Gym", ten)).toBeNull()
    expect(findServicebookingForSlot([sb("Gym", ten.start, ten.end)], undefined, ten)).toBeNull()
  })
})
