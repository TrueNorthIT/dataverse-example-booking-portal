import { useApiList } from "./useApi"
import { queryKeys } from "@/lib/queryKeys"
import type { Service } from "@/types/generated"

export function useCategories() {
  return useApiList<Service>(
    queryKeys.categories,
    "service",
    undefined,
    { staleTime: 1000 * 60 * 30 }
  )
}
