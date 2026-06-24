import { useApiGet } from "./useApi"
import { queryKeys } from "@/lib/queryKeys"
import type { Venue } from "@/types/generated"

export function useRoom(id: string | undefined) {
  return useApiGet<Venue>(
    queryKeys.rooms(id),
    "venue",
    id,
    { enabled: !!id }
  )
}
