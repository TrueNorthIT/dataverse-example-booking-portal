import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import { publicClient } from "./useDataverse"
import { queryKeys } from "@/lib/queryKeys"
import type { BookingTimeRange } from "@/types/bookings"

/** A booking that overlaps a venue's calendar day (start/end only). */
export type DayBooking = BookingTimeRange

/**
 * All bookings for a resource that overlap a given calendar day. Used to work out
 * which venue-hire session blocks are still free (computed client-side).
 */
export function useVenueDayBookings(resourceId?: string, date?: Date) {
  const dateStr = date ? format(date, "yyyy-MM-dd") : null
  return useQuery({
    queryKey: queryKeys.venueDayBookings(resourceId, dateStr),
    enabled: !!resourceId && !!date,
    staleTime: 1000 * 60,
    queryFn: async () => {
      const dayStart = new Date(date!)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(date!)
      dayEnd.setHours(23, 59, 59, 999)
      const resp = await publicClient.public.list<DayBooking>("booking", {
        filter: [
          { field: "resource", operator: "eq", value: resourceId! },
          { field: "starttime", operator: "lt", value: dayEnd.toISOString() },
          { field: "endtime", operator: "gt", value: dayStart.toISOString() },
        ],
        select: ["starttime", "endtime"],
      })
      return resp.data
    },
  })
}
