import { describe, it, expect } from "vitest"
import { queryKeys } from "@/lib/queryKeys"

describe("queryKeys", () => {
  it("exposes static keys", () => {
    expect(queryKeys.categories).toEqual(["categories"])
    expect(queryKeys.myBookings).toEqual(["myBookings"])
    expect(queryKeys.bookingStatuses).toEqual(["bookingStatuses"])
    expect(queryKeys.resourceCategoryMap).toEqual(["resourceCategoryMap"])
    expect(queryKeys.categoryResourceNames).toEqual(["categoryResourceNames"])
  })

  it("builds parameterised keys", () => {
    expect(queryKeys.category("abc")).toEqual(["category", "abc"])
    expect(queryKeys.rooms("r1")).toEqual(["room", "r1"])
    expect(queryKeys.roomsByCategory("c1")).toEqual(["roomsByCategory", "c1"])
    expect(queryKeys.availability("r1", "2026-01-01")).toEqual([
      "availability",
      "r1",
      "2026-01-01",
    ])
    expect(queryKeys.busyness("2026-01-01")).toEqual(["todaysBusyness", "2026-01-01"])
    expect(queryKeys.calendarCapacity("cal1", "2026-01-01")).toEqual([
      "calendarCapacity",
      "cal1",
      "2026-01-01",
    ])
    expect(queryKeys.venueDayBookings("r1", "2026-01-01")).toEqual([
      "venueDayBookings",
      "r1",
      "2026-01-01",
    ])
  })

  it("handles omitted optional args", () => {
    expect(queryKeys.category()).toEqual(["category", undefined])
    expect(queryKeys.rooms()).toEqual(["room", undefined])
    expect(queryKeys.roomsByCategory()).toEqual(["roomsByCategory", undefined])
    expect(queryKeys.availability()).toEqual(["availability", undefined, undefined])
    expect(queryKeys.calendarCapacity()).toEqual([
      "calendarCapacity",
      undefined,
      undefined,
    ])
    expect(queryKeys.venueDayBookings()).toEqual([
      "venueDayBookings",
      undefined,
      undefined,
    ])
    expect(queryKeys.venueDayBookings("r1", null)).toEqual([
      "venueDayBookings",
      "r1",
      null,
    ])
  })
})
