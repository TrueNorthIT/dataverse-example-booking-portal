import { useQuery } from "@tanstack/react-query"
import { publicClient } from "@/hooks/useDataverse"
import { queryKeys } from "@/lib/queryKeys"
import { logger } from "@/lib/logger"
import type { TimeInfo } from "@/types/calendar"
import { startOfDay, endOfDay } from "date-fns"

/**
 * Calls the ExpandCalendar function via the citizen booking API
 * to get working-hour blocks with real capacity for a specific date.
 *
 * Endpoint: GET public/actions/expand-calendar/{calendarId}?Start=...&End=...
 * Returns TimeInfo[] with actual capacity (e.g. 20 for recycling centres).
 */
export function useCalendarCapacity(
  calendarId: string | undefined,
  dateStr: string | undefined
) {
  const query = useQuery({
    queryKey: queryKeys.calendarCapacity(calendarId, dateStr),
    queryFn: async () => {
      const date = new Date(dateStr!)
      const start = startOfDay(date).toISOString()
      const end = endOfDay(date).toISOString()

      try {
        const resp = await publicClient.public.invokeFunction<{ result: TimeInfo[] }>(
          "expand-calendar",
          { recordId: calendarId!, params: { Start: start, End: end } },
        )
        return resp.data?.result ?? []
      } catch (err) {
        logger.error("[CalendarCapacity] ExpandCalendar failed", err)
        throw err
      }
    },
    enabled: !!calendarId && !!dateStr,
    staleTime: 30 * 60 * 1000,
  })

  const blocks: TimeInfo[] = query.data ?? []

  // Prefer "Filter"/"ResourceCapacity" blocks (high-capacity resources),
  // fall back to "Available" blocks (capacity-1 resources).
  const filterBlocks = blocks.filter(
    (t) => t.TimeCode === "Filter" && t.SubCode === "ResourceCapacity"
  )
  const finalBlocks = filterBlocks.length > 0
    ? filterBlocks
    : blocks.filter((t) => t.TimeCode === "Available")

  return {
    blocks: finalBlocks,
    isLoading: query.isLoading,
    isError: query.isError,
  }
}
