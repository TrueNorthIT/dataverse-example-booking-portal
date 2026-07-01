import { useMemo, useState } from "react"
import { format, parseISO } from "date-fns"
import { useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/auth/useAuth"
import { CalendarCheck, LogIn, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { useCurrentUser } from "@/components/auth/AuthGuard"
import { checkConflict } from "@/hooks/useBookings"
import { useCreateCitizenBooking } from "@/hooks/useCitizenBookings"
import { useBookingStatuses } from "@/hooks/useBookingStatuses"
import { toast } from "sonner"
import { ServicebookingTnStatus } from "@/types/generated"
import { SERVICE_TYPE_BY_CATEGORY } from "@/lib/categoryMeta"
import { BOOKING_STATUS_NAME } from "@/lib/constants"
import { getHireRate, getRoomAddOns, calculateBookingPrice, formatGBP } from "@/lib/pricing"
import { PaymentStep } from "@/components/citizen/PaymentStep"
import { BookingSummary } from "@/components/citizen/BookingSummary"
import { TicketsToggle } from "@/components/citizen/TicketsToggle"
import { AddOnPicker } from "@/components/citizen/AddOnPicker"
import { queryKeys } from "@/lib/queryKeys"
import type { TimeSlot } from "@/hooks/useAvailability"

interface CitizenBookingFormProps {
  resourceId: string
  resourceName: string
  categoryName?: string
  slot: TimeSlot
  onCancel: () => void
  onBooked: () => void
}

export function CitizenBookingForm({
  resourceId,
  resourceName,
  categoryName,
  slot,
  onCancel,
  onBooked,
}: CitizenBookingFormProps) {
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [sellingTickets, setSellingTickets] = useState(false)
  const [selectedAddOns, setSelectedAddOns] = useState<Set<string>>(new Set())
  const [phase, setPhase] = useState<"confirm" | "pay">("confirm")
  const { name } = useCurrentUser()
  const { isAuthenticated, loginWithRedirect } = useAuth()
  const queryClient = useQueryClient()
  const createCitizenBooking = useCreateCitizenBooking()
  const { data: statuses } = useBookingStatuses()

  const scheduledStatus = statuses?.find((s) => s.name === BOOKING_STATUS_NAME.SCHEDULED)

  const durationMins = useMemo(
    () => Math.round((parseISO(slot.end).getTime() - parseISO(slot.start).getTime()) / 60000),
    [slot.start, slot.end],
  )

  // Venue-hire pricing (free categories return undefined → unchanged flow)
  const rate = getHireRate(resourceName)
  const addOns = getRoomAddOns(resourceName)
  const chosenAddOns = addOns.filter((a) => selectedAddOns.has(a.key))

  const { hirePence, amountPence } = calculateBookingPrice(
    rate,
    sellingTickets,
    durationMins,
    chosenAddOns
  )
  const requiresPayment = amountPence > 0
  const showTicketsToggle = !!rate && rate.ticketed !== rate.standard

  const toggleAddOn = (key: string) => {
    setSelectedAddOns((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Actually write the booking (after payment, or immediately for free services)
  const submitBooking = async (paymentRef?: string) => {
    setSubmitting(true)
    try {
      const hasConflict = await checkConflict(resourceId, slot.start, slot.end, undefined, slot.capacity)
      if (hasConflict) {
        toast.error(
          paymentRef
            ? "This slot was taken while you paid. Your payment will be refunded — please pick another slot."
            : "This slot is full. Please pick another.",
        )
        onCancel()
        return
      }

      const title = notes.trim() || resourceName
      const serviceType = categoryName ? SERVICE_TYPE_BY_CATEGORY[categoryName] : undefined
      const extrasSummary = chosenAddOns.length ? `Extras: ${chosenAddOns.map((a) => a.label).join(", ")}` : ""
      const combinedNotes = [notes.trim(), extrasSummary].filter(Boolean).join(" · ")

      await createCitizenBooking.mutateAsync({
        booking: {
          name: title,
          starttime: slot.start,
          endtime: slot.end,
          duration: durationMins,
          bookingtype: 1,
          resource: resourceId,
          bookingstatus: scheduledStatus!.bookingstatusid!,
        },
        citizenBooking: {
          tn_name: title,
          tn_requestedstart: slot.start,
          tn_requestedend: slot.end,
          tn_duration: durationMins,
          tn_status: ServicebookingTnStatus.Confirmed,
          ...(serviceType != null ? { tn_servicetype: serviceType } : {}),
          ...(combinedNotes ? { tn_notes: combinedNotes } : {}),
        },
      })

      // Optimistically inject the new booking into the availability cache
      // so the slot disappears immediately without waiting for a refetch
      const dateStr = format(parseISO(slot.start), "yyyy-MM-dd")
      const availKey = queryKeys.availability(resourceId, dateStr)
      queryClient.setQueryData<{ starttime: string; endtime: string }[]>(
        availKey,
        (old) => old ? [...old, { starttime: slot.start, endtime: slot.end }] : [{ starttime: slot.start, endtime: slot.end }],
      )

      toast.success(requiresPayment ? "Booking confirmed and paid!" : "Booking confirmed!", {
        description: `${resourceName} — ${format(parseISO(slot.start), "EEE d MMM")} at ${slot.startLabel}${requiresPayment ? ` · ${formatGBP(amountPence)}` : ""}`,
      })
      setNotes("")
      onBooked()
    } catch {
      toast.error(
        paymentRef
          ? "Payment succeeded but the booking could not be saved. Please contact us with your payment reference."
          : "Failed to create booking",
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirm = async () => {
    if (!scheduledStatus) {
      toast.error("Booking statuses not loaded yet")
      return
    }

    if (requiresPayment) {
      // Re-check the slot before showing the payment screen
      setSubmitting(true)
      try {
        const hasConflict = await checkConflict(resourceId, slot.start, slot.end, undefined, slot.capacity)
        if (hasConflict) {
          toast.error("This slot is full. Please pick another.")
          onCancel()
          return
        }
        setPhase("pay")
      } catch {
        toast.error("Could not check availability. Please try again.")
      } finally {
        setSubmitting(false)
      }
      return
    }

    await submitBooking()
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">{phase === "pay" ? "Payment" : "Confirm your booking"}</h3>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <BookingSummary
          resourceName={resourceName}
          slot={slot}
          durationMins={durationMins}
          rate={rate}
          sellingTickets={sellingTickets}
          hirePence={hirePence}
          bookedByName={name}
        />

        {phase === "pay" ? (
          <PaymentStep
            amountPence={amountPence}
            disabled={submitting}
            onCancel={() => setPhase("confirm")}
            onSuccess={(paymentRef) => {
              setPhase("confirm")
              void submitBooking(paymentRef)
            }}
          />
        ) : (
          <>
            {showTicketsToggle && (
              <TicketsToggle value={sellingTickets} onChange={setSellingTickets} />
            )}

            <AddOnPicker
              addOns={addOns}
              selected={selectedAddOns}
              durationMins={durationMins}
              onToggle={toggleAddOn}
            />

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                placeholder="Any additional details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {requiresPayment && (
              <div className="flex items-center justify-between border-t pt-3 text-sm">
                <span className="font-medium">Total</span>
                <span className="font-semibold">{formatGBP(amountPence)}</span>
              </div>
            )}

            {!isAuthenticated && (
              <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                You're browsing as a guest. Sign in to confirm this booking.
              </p>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={onCancel} disabled={submitting}>
                Cancel
              </Button>
              {isAuthenticated ? (
                <Button size="sm" onClick={handleConfirm} disabled={submitting}>
                  {submitting
                    ? requiresPayment ? "Starting payment…" : "Booking…"
                    : requiresPayment ? `Pay ${formatGBP(amountPence)}` : "Confirm Booking"}
                </Button>
              ) : (
                <Button size="sm" onClick={() => loginWithRedirect()}>
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign in to book
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
