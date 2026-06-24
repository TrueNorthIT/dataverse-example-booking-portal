import { useState } from "react"
import { format, parseISO, isPast } from "date-fns"
import { MapPin, Clock, X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getCategoryMeta } from "@/lib/categoryMeta"
import { ServicebookingTnStatus } from "@/types/generated"
import type { ExpandedServicebooking } from "@/hooks/useMyBookings"

interface MyBookingCardProps {
  booking: ExpandedServicebooking
  categoryName?: string
  onCancel: (booking: ExpandedServicebooking) => void
  cancelling?: boolean
}

export function MyBookingCard({ booking, categoryName, onCancel, cancelling }: MyBookingCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Prefer actual times from the underlying booking, fall back to requested times
  const startIso = booking.tn_Booking?.starttime ?? booking.tn_requestedstart
  const endIso = booking.tn_Booking?.endtime ?? booking.tn_requestedend
  const start = startIso ? parseISO(startIso) : null
  const end = endIso ? parseISO(endIso) : null
  const past = end ? isPast(end) : false
  const isCancelled = booking.tn_status === ServicebookingTnStatus.Cancelled

  const resourceName =
    booking.tn_Booking?.resource_label ??
    booking.tn_Booking?.Resource?.name
  const statusLabel =
    booking.tn_status_label ??
    booking.tn_Booking?.BookingStatus?.name

  const catMeta = categoryName ? getCategoryMeta(categoryName) : null
  const CatIcon = catMeta?.icon

  return (
    <>
      <Card className={past ? "opacity-60" : "transition-shadow hover:shadow-md"}>
        <CardContent className="flex items-start gap-4 p-4">
          {/* Date block */}
          {start && (
            <div className="flex flex-col items-center rounded-lg bg-primary/10 px-3 py-2 text-center shrink-0">
              <span className="text-[11px] font-medium uppercase text-primary">
                {format(start, "EEE")}
              </span>
              <span className="text-xl font-bold text-primary leading-tight">
                {format(start, "d")}
              </span>
              <span className="text-[11px] text-primary">{format(start, "MMM")}</span>
            </div>
          )}

          {/* Details */}
          <div className="flex-1 space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">{booking.tn_name}</p>
            </div>
            {resourceName && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {resourceName}
              </p>
            )}
            {start && end && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                {format(start, "HH:mm")} — {format(end, "HH:mm")}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {catMeta && CatIcon && (
                <Badge variant="outline" className={`${catMeta.color} ${catMeta.textColor} border-0 text-xs`}>
                  <CatIcon className="h-3 w-3 mr-1" />
                  {categoryName}
                </Badge>
              )}
              {statusLabel && (
                <Badge
                  variant={isCancelled ? "destructive" : "secondary"}
                >
                  {statusLabel}
                </Badge>
              )}
            </div>
          </div>

          {/* Cancel button — only for future, non-cancelled bookings */}
          {!past && !isCancelled && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-destructive hover:bg-destructive/10"
              onClick={() => setConfirmOpen(true)}
              disabled={cancelling}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Cancel confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel booking?</DialogTitle>
            <DialogDescription>
              This will cancel your booking for <strong>{booking.tn_name}</strong>
              {start && <> on {format(start, "EEEE d MMMM")}</>}. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Keep booking
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmOpen(false)
                onCancel(booking)
              }}
              disabled={cancelling}
            >
              {cancelling ? "Cancelling..." : "Cancel booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
