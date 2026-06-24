import { describe, it, expect } from "vitest"
import { renderHook, waitFor, createHookWrapper, mockClient } from "../setup/test-utils"
import { useCategories } from "@/hooks/useCategories"
import { useCategory } from "@/hooks/useCategory"
import { useRoom } from "@/hooks/useRooms"
import { useRoomsByCategory } from "@/hooks/useRoomsByCategory"
import { useBookingStatuses } from "@/hooks/useBookingStatuses"
import { useMyBookings } from "@/hooks/useMyBookings"
import { useResourceCategoryMap } from "@/hooks/useResourceCategoryMap"
import { useTodaysBusyness } from "@/hooks/useTodaysBusyness"
import { useVenueDayBookings } from "@/hooks/useVenueAvailability"
import { useCalendarCapacity } from "@/hooks/useCalendarCapacity"

const wrapper = createHookWrapper()

describe("catalogue hooks", () => {
  it("useCategories lists services", async () => {
    mockClient.public.list.mockResolvedValueOnce({ data: [{ name: "Leisure" }], page: {} })
    const { result } = renderHook(() => useCategories(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
  })

  it("useCategory is disabled without an id", () => {
    const { result } = renderHook(() => useCategory(undefined), { wrapper })
    expect(result.current.fetchStatus).toBe("idle")
  })

  it("useRoom fetches a single venue", async () => {
    mockClient.public.get.mockResolvedValueOnce({ data: { bookableresourceid: "v1" } })
    const { result } = renderHook(() => useRoom("v1"), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toMatchObject({ bookableresourceid: "v1" })
  })

  it("useBookingStatuses lists statuses", async () => {
    mockClient.public.list.mockResolvedValueOnce({ data: [{ name: "Scheduled" }], page: {} })
    const { result } = renderHook(() => useBookingStatuses(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})

describe("useRoomsByCategory", () => {
  it("maps category assignments to their expanded Resource (active only)", async () => {
    mockClient.public.list.mockResolvedValueOnce({
      data: [
        { resource: "v1", Resource: { bookableresourceid: "v1", name: "Gym", statecode: 0 } },
        { resource: "v2", Resource: { bookableresourceid: "v2", name: "Old", statecode: 1 } },
      ],
      page: {},
    })
    const { result } = renderHook(() => useRoomsByCategory("cat1"), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.rooms).toHaveLength(1)
    expect(result.current.rooms[0].name).toBe("Gym")
  })
})

describe("useResourceCategoryMap", () => {
  it("builds resource→category / buffer / duration maps", async () => {
    mockClient.public.eachPage.mockImplementationOnce(async function* () {
      yield {
        data: [
          {
            resource: "v1",
            resourcecategory: "c1",
            ResourceCategory: { name: "Recycling Centre", tn_bufferminutes: 10, tn_slotdurationmins: 30 },
          },
        ],
        page: {},
      }
    })
    const { result } = renderHook(() => useResourceCategoryMap(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.map.get("v1")).toBe("Recycling Centre")
    expect(result.current.bufferMap.get("v1")).toBe(10)
    expect(result.current.durationMap.get("v1")).toBe(30)
    expect(result.current.categoryIdMap.get("v1")).toBe("c1")
  })
})

describe("useMyBookings", () => {
  it("lists the citizen's service bookings", async () => {
    mockClient.me.list.mockResolvedValueOnce({ data: [{ tn_citizenservicebookingid: "sb1" }], page: {} })
    const { result } = renderHook(() => useMyBookings(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.[0].tn_citizenservicebookingid).toBe("sb1")
  })
})

describe("useTodaysBusyness", () => {
  it("returns a per-resource busyness map", async () => {
    const start = new Date()
    start.setHours(9, 0, 0, 0)
    const end = new Date(start.getTime() + 8 * 60 * 60 * 1000)
    mockClient.public.list.mockResolvedValueOnce({
      data: [{ resource: "v1", starttime: start.toISOString(), endtime: end.toISOString() }],
      page: {},
    })
    const { result } = renderHook(() => useTodaysBusyness(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.get("v1")).toBe("busy")
  })
})

describe("useVenueDayBookings", () => {
  it("is disabled without a resource id or date", () => {
    const { result } = renderHook(() => useVenueDayBookings(undefined, undefined), { wrapper })
    expect(result.current.fetchStatus).toBe("idle")
  })

  it("fetches the day's bookings", async () => {
    mockClient.public.list.mockResolvedValueOnce({ data: [{ starttime: "x", endtime: "y" }], page: {} })
    const { result } = renderHook(() => useVenueDayBookings("v1", new Date(2025, 0, 15)), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
  })
})

describe("useCalendarCapacity", () => {
  it("prefers Filter/ResourceCapacity blocks", async () => {
    mockClient.public.invokeFunction.mockResolvedValueOnce({
      data: {
        result: [
          { Start: "s", End: "e", TimeCode: "Filter", SubCode: "ResourceCapacity", Effort: 20 },
          { Start: "s", End: "e", TimeCode: "Available", Effort: 1 },
        ],
      },
    })
    const { result } = renderHook(() => useCalendarCapacity("cal1", "2025-01-15"), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.blocks).toHaveLength(1)
    expect(result.current.blocks[0].Effort).toBe(20)
  })

  it("falls back to Available blocks when no Filter blocks exist", async () => {
    mockClient.public.invokeFunction.mockResolvedValueOnce({
      data: { result: [{ Start: "s", End: "e", TimeCode: "Available", Effort: 1 }] },
    })
    const { result } = renderHook(() => useCalendarCapacity("cal2", "2025-01-15"), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.blocks).toHaveLength(1)
  })
})
