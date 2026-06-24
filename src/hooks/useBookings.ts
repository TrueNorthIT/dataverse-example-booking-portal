import { publicClient } from "./useDataverse"
import type { FilterCondition } from "@truenorth-it/dataverse-client"

/**
 * Check if a time slot is full via the public booking API.
 * For capacity=1 resources, any overlap is a conflict.
 * For multi-capacity resources, only conflicts when overlapping bookings >= capacity.
 */
export async function checkConflict(
  resourceId: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string,
  capacity = 1
): Promise<boolean> {
  const filter: FilterCondition[] = [
    { field: "resource", operator: "eq", value: resourceId },
    { field: "starttime", operator: "lt", value: endTime },
    { field: "endtime", operator: "gt", value: startTime },
    ...(excludeBookingId ? [{ field: "bookableresourcebookingid", operator: "ne" as const, value: excludeBookingId }] : []),
  ]

  const resp = await publicClient.public.list<{ bookableresourcebookingid: string }>("booking", {
    filter,
    select: ["bookableresourcebookingid"],
  })
  return resp.data.length >= capacity
}
