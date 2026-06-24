import { useApiList } from "./useApi"
import { queryKeys } from "@/lib/queryKeys"
import type { Status } from "@/types/generated"

export function useBookingStatuses() {
  return useApiList<Status>(
    queryKeys.bookingStatuses,
    "status",
    undefined,
    { staleTime: 1000 * 60 * 60 }
  )
}
