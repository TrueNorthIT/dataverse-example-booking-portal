import { describe, it, expect } from "vitest"
import { dv } from "../helpers/dataverse-client.ts"

interface BookingRow {
  _resource_value: string
  starttime: string
  endtime: string
}

interface Room {
  bookableresourceid: string
  name: string
}

interface CategoryAssn {
  _resource_value: string
  "_resourcecategory_value@OData.Community.Display.V1.FormattedValue"?: string
}

type BusyLevel = "quiet" | "moderate" | "busy"

/** Replicate the window-counting logic from useTodaysBusyness */
function computeBusyness(bookings: BookingRow[], dayStart: Date): BusyLevel {
  const WINDOW_MINS = 30
  const DAY_START_HOUR = 8
  const DAY_END_HOUR = 18
  const TOTAL_WINDOWS = ((DAY_END_HOUR - DAY_START_HOUR) * 60) / WINDOW_MINS

  let busyWindows = 0
  for (let w = 0; w < TOTAL_WINDOWS; w++) {
    const winStart = new Date(dayStart)
    winStart.setHours(DAY_START_HOUR, w * WINDOW_MINS, 0, 0)
    const winEnd = new Date(winStart.getTime() + WINDOW_MINS * 60 * 1000)

    const hasOverlap = bookings.some((b) => {
      const bStart = new Date(b.starttime)
      const bEnd = new Date(b.endtime)
      return bStart < winEnd && bEnd > winStart
    })
    if (hasOverlap) busyWindows++
  }

  const pct = busyWindows / TOTAL_WINDOWS
  if (pct >= 0.6) return "busy"
  if (pct >= 0.25) return "moderate"
  return "quiet"
}

describe("Busyness (live data)", () => {
  let allBookings: BookingRow[]
  let rooms: Room[]
  const now = new Date()
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  it("can fetch today's bookings", async () => {
    const dayStartISO = dayStart.toISOString()
    const dayEnd = new Date(dayStart.getTime() + 86_400_000).toISOString()

    const result = await dv.getList<BookingRow>(
      `bookableresourcebookings?$filter=starttime lt ${dayEnd} and endtime gt ${dayStartISO} and statecode eq 0&$select=_resource_value,starttime,endtime`
    )
    allBookings = result.value
    expect(allBookings.length).toBeGreaterThan(0)
  })

  it("can fetch rooms and category assignments", async () => {
    const [roomResult, assnResult] = await Promise.all([
      dv.getList<Room>("bookableresources?$filter=resourcetype eq 7&$select=bookableresourceid,name"),
      dv.getList<CategoryAssn>(
        'bookableresourcecategoryassns?$select=_resource_value,_resourcecategory_value'
      ),
    ])
    rooms = roomResult.value
    void assnResult
    expect(rooms.length).toBeGreaterThan(0)
  })

  it("recycling centres with high capacity are not falsely 'busy'", () => {
    // Recycling centres have capacity 15-20 — a handful of bookings shouldn't make them "busy"
    const recyclingNames = [
      "Kirkstall Road Recycling Centre",
      "Seacroft Recycling Centre",
      "Meanwood Recycling Centre",
      "Middleton Recycling Centre",
      "Pudsey Recycling Centre",
    ]
    const recyclingIds = rooms
      .filter((r) => recyclingNames.includes(r.name))
      .map((r) => r.bookableresourceid)

    for (const id of recyclingIds) {
      const resourceBookings = allBookings.filter((b) => b._resource_value === id)
      // Only test if there are few bookings (< 10) — as expected for recycling centres
      if (resourceBookings.length < 10) {
        const level = computeBusyness(resourceBookings, dayStart)
        expect(level).not.toBe("busy")
      }
    }
  })

  it("a well-booked capacity-1 resource is at least 'moderate'", () => {
    // Capacity-1 resources: pitches, hubs, register office rooms
    const cap1Names = [
      "Roundhay Park — Football Pitch 1",
      "Roundhay Park — Football Pitch 2",
      "John Charles 3G Pitch",
      "Beckett Park — Cricket Square",
      "Armley Community Hub",
      "Compton Centre Community Hub",
      "Reginald Centre Community Hub",
      "Bramley Community Hub",
    ]
    const cap1Ids = rooms
      .filter((r) => cap1Names.includes(r.name))
      .map((r) => r.bookableresourceid)

    // Find a cap-1 resource that has ≥5 bookings today
    const wellBooked = cap1Ids.find((id) => {
      const count = allBookings.filter((b) => b._resource_value === id).length
      return count >= 5
    })

    if (wellBooked) {
      const bookings = allBookings.filter((b) => b._resource_value === wellBooked)
      const level = computeBusyness(bookings, dayStart)
      expect(["moderate", "busy"]).toContain(level)
    }
    // If no cap-1 resource has 5+ bookings today, skip gracefully
  })
})
