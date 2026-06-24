import { useApiList } from "./useApi"
import { queryKeys } from "@/lib/queryKeys"
import type { Venue } from "@/types/generated"

interface ApiCategoryAssn {
  bookableresourcecategoryassnid: string
  resource: string
  resourcecategory: string
  Resource?: Venue
}

export function useRoomsByCategory(categoryId: string | undefined) {
  const query = useApiList<ApiCategoryAssn>(
    queryKeys.roomsByCategory(categoryId),
    "servicevenue",
    { filter: { field: "resourcecategory", operator: "eq", value: categoryId! }, expand: "Resource" },
    { enabled: !!categoryId }
  )

  const rooms = (query.data ?? [])
    .map((assn) => assn.Resource)
    .filter((r): r is Venue => !!r && r.statecode === 0)

  return { ...query, rooms }
}
