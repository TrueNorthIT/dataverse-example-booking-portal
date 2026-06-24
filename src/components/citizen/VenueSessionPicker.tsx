import { useMemo } from "react"
import { SESSIONS, sessionRange } from "@/lib/sessions"
import type { SessionRange } from "@/lib/sessions"
import { hirePricePence, formatGBP } from "@/lib/pricing"
import type { HireRate } from "@/lib/pricing"
import { sessionIsBooked } from "@/lib/venue"
import { useVenueDayBookings } from "@/hooks/useVenueAvailability"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

export type SelectedSession = SessionRange & { key: string; label: string }

interface VenueSessionPickerProps {
  resourceId: string
  date: Date
  rate?: HireRate
  /** Whether the ticketed rate applies (price preview only). */
  sellingTickets?: boolean
  selectedKey?: string | null
  onSelect: (session: SelectedSession) => void
}

export function VenueSessionPicker({
  resourceId,
  date,
  rate,
  sellingTickets = false,
  selectedKey,
  onSelect,
}: VenueSessionPickerProps) {
  const { data: bookings, isLoading } = useVenueDayBookings(resourceId, date)

  const items = useMemo(() => {
    return SESSIONS.map((s) => {
      const range = sessionRange(date, s)
      const taken = sessionIsBooked(range, bookings ?? [])
      const price = rate ? hirePricePence(rate, sellingTickets, range.durationMins) : 0
      return { s, range, taken, price }
    })
  }, [date, bookings, rate, sellingTickets])

  if (isLoading) {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map(({ s, range, taken, price }) => {
        const active = selectedKey === s.key
        return (
          <button
            key={s.key}
            type="button"
            disabled={taken}
            onClick={() => onSelect({ ...range, key: s.key, label: s.label })}
            className={cn(
              "flex flex-col items-start rounded-lg border p-3 text-left transition-colors",
              taken
                ? "cursor-not-allowed border-border bg-muted/40 text-muted-foreground"
                : active
                ? "border-primary bg-primary/10"
                : "border-border bg-card hover:border-primary/40 hover:bg-accent"
            )}
          >
            <span className="font-medium">{s.label}</span>
            <span className="text-sm text-muted-foreground">
              {range.startLabel} – {range.endLabel}
            </span>
            <span className="mt-1 text-sm font-medium">
              {taken ? "Unavailable" : rate ? formatGBP(price) : ""}
            </span>
          </button>
        )
      })}
    </div>
  )
}
