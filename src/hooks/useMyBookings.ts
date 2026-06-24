import { useAuthenticatedList } from "./useApi"
import { queryKeys } from "@/lib/queryKeys"
import type { Servicebooking } from "@/types/generated"

/** Servicebooking with the expanded tn_Booking navigation property. */
export interface ExpandedServicebooking extends Servicebooking {
  tn_Booking?: {
    bookableresourcebookingid: string
    name: string
    starttime: string
    endtime: string
    resource?: string
    resource_label?: string
    _resource_value?: string
    Resource?: { name: string; bookableresourceid: string }
    BookingStatus?: { name: string; bookingstatusid: string }
  }
}

/**
 * Returns citizen service bookings for the authenticated user.
 * The /me tier auto-scopes to the user's contact via contactJoinPath.
 */
export function useMyBookings() {
  return useAuthenticatedList<ExpandedServicebooking>(
    queryKeys.myBookings,
    "servicebooking",
    {
      expand: "tn_Booking",
      orderBy: { field: "tn_requestedstart", direction: "desc" },
      filter: { field: "statecode", operator: "eq", value: 0 },
      top: 100,
    }
  )
}
