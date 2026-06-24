import { useQuery } from "@tanstack/react-query"
import { publicClient } from "./useDataverse"
import { queryKeys } from "@/lib/queryKeys"
import { startOfDay, endOfDay } from "date-fns"
import { computeBusynessByResource, type BusyLevel } from "@/lib/busyness"
import type { ResourceBookingRow } from "@/types/bookings"

export type { BusyLevel } from "@/lib/busyness"

/**
 * Queries today's bookings and computes a busyness level per resource.
 * Counting/threshold logic lives in lib/busyness.ts.
 */
export function useTodaysBusyness() {
  const now = new Date()
  const dayStart = startOfDay(now)
  const dayStartISO = dayStart.toISOString()
  const dayEndISO = endOfDay(now).toISOString()

  return useQuery<Map<string, BusyLevel>>({
    queryKey: queryKeys.busyness(dayStartISO),
    queryFn: async () => {
      const resp = await publicClient.public.list<ResourceBookingRow>("booking", {
        filter: [
          { field: "starttime", operator: "lt", value: dayEndISO },
          { field: "endtime", operator: "gt", value: dayStartISO },
        ],
        select: ["resource", "starttime", "endtime"],
      })
      return computeBusynessByResource(resp.data, dayStart)
    },
    staleTime: 5 * 60 * 1000,
  })
}
