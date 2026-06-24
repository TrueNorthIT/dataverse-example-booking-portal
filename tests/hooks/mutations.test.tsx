import { describe, it, expect, vi } from "vitest"
import { renderHook, waitFor, act, createHookWrapper, mockClient } from "../setup/test-utils"
import { useCreateCitizenBooking, useCancelCitizenBooking } from "@/hooks/useCitizenBookings"
import { checkConflict } from "@/hooks/useBookings"
import { useAvailability } from "@/hooks/useAvailability"

// sonner toasts are irrelevant to these assertions.
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const wrapper = createHookWrapper()

describe("useCreateCitizenBooking", () => {
  it("creates the servicebooking with a nested tn_booking", async () => {
    const { result } = renderHook(() => useCreateCitizenBooking(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({
        booking: {
          name: "Gym", starttime: "s", endtime: "e", duration: 60,
          bookingtype: 1, resource: "v1", bookingstatus: "st1",
        },
        citizenBooking: { tn_name: "Gym", tn_duration: 60 },
      })
    })
    expect(mockClient.me.create).toHaveBeenCalledWith(
      "servicebooking",
      expect.objectContaining({
        tn_name: "Gym",
        tn_booking: expect.objectContaining({ resource: "v1", bookingstatus: "st1" }),
      })
    )
  })
})

describe("useCancelCitizenBooking", () => {
  it("cancels both the servicebooking and the underlying booking", async () => {
    const { result } = renderHook(() => useCancelCitizenBooking(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({
        citizenServiceBookingId: "sb1",
        underlyingBookingId: "b1",
        cancelStatusId: "cancelled",
      })
    })
    expect(mockClient.me.update).toHaveBeenCalledWith("servicebooking", "sb1", expect.any(Object))
    expect(mockClient.all.update).toHaveBeenCalledWith(
      "booking",
      "b1",
      expect.objectContaining({ bookingstatus: "cancelled" })
    )
  })

  it("skips the booking update when there is no underlying booking", async () => {
    const { result } = renderHook(() => useCancelCitizenBooking(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ citizenServiceBookingId: "sb1", cancelStatusId: "c" })
    })
    expect(mockClient.me.update).toHaveBeenCalled()
    expect(mockClient.all.update).not.toHaveBeenCalled()
  })
})

describe("checkConflict", () => {
  it("is a conflict when overlapping bookings reach capacity", async () => {
    mockClient.public.list.mockResolvedValueOnce({ data: [{ bookableresourcebookingid: "x" }], page: {} })
    expect(await checkConflict("v1", "s", "e", undefined, 1)).toBe(true)
  })

  it("is not a conflict below capacity", async () => {
    mockClient.public.list.mockResolvedValueOnce({ data: [], page: {} })
    expect(await checkConflict("v1", "s", "e", undefined, 2)).toBe(false)
  })

  it("excludes a given booking id from the conflict query", async () => {
    mockClient.public.list.mockResolvedValueOnce({ data: [], page: {} })
    await checkConflict("v1", "s", "e", "exclude-me", 1)
    const opts = mockClient.public.list.mock.calls.at(-1)?.[1]
    expect(JSON.stringify(opts)).toContain("exclude-me")
  })
})

describe("useAvailability", () => {
  it("computes slots from bookings + calendar blocks", async () => {
    // bookings query (public.list) → none
    mockClient.public.list.mockResolvedValueOnce({ data: [], page: {} })
    // calendar capacity (invokeFunction) → one 2h block
    mockClient.public.invokeFunction.mockResolvedValueOnce({
      data: {
        result: [
          { Start: "2025-01-15T09:00:00Z", End: "2025-01-15T11:00:00Z", TimeCode: "Available", Effort: 1 },
        ],
      },
    })
    const { result } = renderHook(
      () => useAvailability("v1", "cal1", new Date(2025, 0, 15), 0, 60),
      { wrapper }
    )
    await waitFor(() => expect(result.current.slots.length).toBeGreaterThan(0))
    expect(result.current.slots.every((s) => s.available)).toBe(true)
  })

  it("returns no slots when resource/date are missing", () => {
    const { result } = renderHook(() => useAvailability(undefined, undefined, undefined), { wrapper })
    expect(result.current.slots).toEqual([])
  })
})
