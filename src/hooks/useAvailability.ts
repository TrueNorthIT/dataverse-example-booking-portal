import { useMemo } from "react"
import { useApiList } from "./useApi"
import { useCalendarCapacity } from "./useCalendarCapacity"
import { queryKeys } from "@/lib/queryKeys"
import { generateAvailabilitySlots, type TimeSlot } from "@/lib/availability"
import type { ParsedBooking, BookingTimeRange } from "@/types/bookings"
import { addMinutes, format, parseISO } from "date-fns"

export type { TimeSlot } from "@/lib/availability"

/**
 * Fetches bookings for a resource on a given date, then uses the resource's
 * Work Hours calendar (via ExpandCalendar) to compute time slots with
 * remaining capacity. The slot maths lives in lib/availability.ts.
 */
export function useAvailability(
  resourceId: string | undefined,
  calendarId: string | undefined,
  date: Date | undefined,
  bufferMinutes = 0,
  slotDurationMins = 30
) {
  const dateStr = date ? format(date, "yyyy-MM-dd") : undefined
  const startOfDayISO = dateStr ? `${dateStr}T00:00:00Z` : undefined
  const endOfDayISO = dateStr ? `${dateStr}T23:59:59Z` : undefined

  const enabled = !!resourceId && !!date

  const bookingsQuery = useApiList<BookingTimeRange>(
    queryKeys.availability(resourceId, dateStr),
    "booking",
    enabled
      ? {
          filter: [
            { field: "resource", operator: "eq", value: resourceId },
            { field: "endtime", operator: "gt", value: startOfDayISO! },
            { field: "starttime", operator: "lt", value: endOfDayISO! },
          ],
          select: ["starttime", "endtime"],
          orderBy: { field: "starttime" },
        }
      : undefined,
    { enabled }
  )

  // Fetch working hour blocks from the calendar
  const { blocks, isLoading: calendarLoading } = useCalendarCapacity(calendarId, dateStr)

  const slots: TimeSlot[] = useMemo(() => {
    if (!date || blocks.length === 0) return []

    const bookings: ParsedBooking[] = (bookingsQuery.data ?? []).map((b) => ({
      start: parseISO(b.starttime),
      end: parseISO(b.endtime),
      bufferedEnd: addMinutes(parseISO(b.endtime), bufferMinutes),
    }))

    return generateAvailabilitySlots(blocks, bookings, bufferMinutes, slotDurationMins)
  }, [date, bookingsQuery.data, blocks, bufferMinutes, slotDurationMins])

  return {
    slots,
    isLoading: bookingsQuery.isLoading || calendarLoading,
    isError: bookingsQuery.isError,
  }
}
