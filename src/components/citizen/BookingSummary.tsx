import { format, parseISO } from "date-fns"
import { formatDuration } from "@/lib/utils"
import { ratePerHourPence, formatGBP, type HireRate } from "@/lib/pricing"
import type { TimeSlot } from "@/lib/availability"

interface BookingSummaryProps {
  resourceName: string
  slot: TimeSlot
  durationMins: number
  /** Venue-hire rate, if this is a paid booking. */
  rate?: HireRate
  sellingTickets: boolean
  /** Room hire cost in pence (shown only when `rate` is set). */
  hirePence: number
  /** Display name of the signed-in citizen. */
  bookedByName: string
}

/** Read-only recap of what's being booked, with the room-hire price line for paid venues. */
export function BookingSummary({
  resourceName,
  slot,
  durationMins,
  rate,
  sellingTickets,
  hirePence,
  bookedByName,
}: BookingSummaryProps) {
  const hours = (durationMins / 60).toFixed(durationMins % 60 ? 1 : 0)

  return (
    <div className="rounded-lg border bg-background p-3 space-y-1 text-sm">
      <p className="font-medium">{resourceName}</p>
      <p className="text-muted-foreground">{format(parseISO(slot.start), "EEEE d MMMM yyyy")}</p>
      <p className="text-muted-foreground">
        {slot.startLabel} — {slot.endLabel} ({formatDuration(durationMins)})
      </p>
      {rate && (
        <p className="text-foreground pt-1">
          Room: <span className="font-medium">{formatGBP(hirePence)}</span>{" "}
          <span className="text-xs text-muted-foreground">
            ({formatGBP(ratePerHourPence(rate, sellingTickets))}/hr × {hours}h
            {sellingTickets ? ", selling tickets" : ""})
          </span>
        </p>
      )}
      <p className="text-xs text-muted-foreground mt-1">Booking as {bookedByName}</p>
    </div>
  )
}
