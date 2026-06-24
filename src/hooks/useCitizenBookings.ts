import { useAuthenticatedMutation } from "./useApi"
import { queryKeys } from "@/lib/queryKeys"
import { toast } from "sonner"
import { ServicebookingTnStatus } from "@/types/generated"

const INVALIDATE_KEYS = [
  ["availability"],
  queryKeys.myBookings,
  ["todaysBusyness"],
] as const

/**
 * Creates a booking via the API, then a citizen service booking linked to it.
 * The /me tier auto-binds tn_Contact (booking) and tn_Citizen (CSB) to the
 * authenticated user's contact — no contactId needed from the client.
 */
export function useCreateCitizenBooking() {
  return useAuthenticatedMutation(
    async (
      {
        booking,
        citizenBooking,
      }: {
        booking: {
          name: string
          starttime: string
          endtime: string
          duration: number
          bookingtype: number
          resource: string
          bookingstatus: string
        }
        citizenBooking: {
          tn_name: string
          tn_requestedstart?: string
          tn_requestedend?: string
          tn_duration: number
          tn_servicetype?: number
          tn_status?: number
          tn_notes?: string
        }
      },
      client
    ) => {
      await client.me.create("servicebooking", {
        ...citizenBooking,
        tn_booking: {
          name: booking.name,
          starttime: booking.starttime,
          endtime: booking.endtime,
          duration: booking.duration,
          bookingtype: booking.bookingtype,
          resource: booking.resource,
          bookingstatus: booking.bookingstatus,
        },
      })
    },
    {
      invalidateKeys: INVALIDATE_KEYS,
      onSuccess: () => {
        toast.success("Booking created successfully")
      },
      onError: (error: Error) => {
        toast.error(error.message)
      },
    }
  )
}

/**
 * Cancels both the citizen service booking and the underlying booking.
 */
export function useCancelCitizenBooking() {
  return useAuthenticatedMutation(
    async (
      {
        citizenServiceBookingId,
        underlyingBookingId,
        cancelStatusId,
      }: {
        citizenServiceBookingId: string
        underlyingBookingId?: string
        cancelStatusId: string
      },
      client
    ) => {
      await client.me.update("servicebooking", citizenServiceBookingId, {
        tn_status: ServicebookingTnStatus.Cancelled,
        statecode: 1,
        statuscode: 2,
      })

      if (underlyingBookingId) {
        await client.all.update("booking", underlyingBookingId, {
          bookingstatus: cancelStatusId,
          statecode: 1,
          statuscode: 2,
        })
      }
    },
    {
      invalidateKeys: INVALIDATE_KEYS,
      onSuccess: () => {
        toast.success("Booking cancelled")
      },
      onError: (error: Error) => {
        toast.error(error.message)
      },
    }
  )
}
