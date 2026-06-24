import { useMemo } from "react"
import { useApiListAll } from "./useApi"
import { queryKeys } from "@/lib/queryKeys"

interface ApiAssnWithCategory {
  resource: string
  resourcecategory: string
  resourcecategory_label?: string
  ResourceCategory?: { name: string; tn_bufferminutes?: number | null; tn_slotdurationmins?: number | null }
}

/**
 * Fetches all active category assignments and builds maps from
 * resource ID → category name and resource ID → buffer minutes.
 * Cached for 30 minutes (categories rarely change).
 */
export function useResourceCategoryMap() {
  const { data, isLoading } = useApiListAll<ApiAssnWithCategory>(
    queryKeys.resourceCategoryMap,
    "servicevenue",
    { expand: "ResourceCategory" },
    { staleTime: 1000 * 60 * 30 }
  )

  const { map, bufferMap, durationMap, categoryIdMap } = useMemo(() => {
    const m = new Map<string, string>()
    const b = new Map<string, number>()
    const d = new Map<string, number>()
    const cid = new Map<string, string>()
    for (const assn of data ?? []) {
      const cat = assn.ResourceCategory
      const categoryName = cat?.name ?? assn.resourcecategory_label
      if (categoryName) {
        m.set(assn.resource, categoryName)
      }
      cid.set(assn.resource, assn.resourcecategory)
      b.set(assn.resource, cat?.tn_bufferminutes ?? 0)
      d.set(assn.resource, cat?.tn_slotdurationmins ?? 30)
    }
    return { map: m, bufferMap: b, durationMap: d, categoryIdMap: cid }
  }, [data])

  return { map, bufferMap, durationMap, categoryIdMap, isLoading }
}
