import { useApiGet } from "./useApi"
import type { Service } from "@/types/generated"

export function useCategory(id: string | undefined) {
  return useApiGet<Service>(
    ["category", id],
    "service",
    id,
    { enabled: !!id }
  )
}
