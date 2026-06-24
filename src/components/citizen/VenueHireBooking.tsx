import { useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { parse, isValid, format } from "date-fns"
import { ChevronRight, Users, Tag } from "lucide-react"
import { useResourceCategoryMap } from "@/hooks/useResourceCategoryMap"
import { CitizenBookingForm } from "@/components/citizen/CitizenBookingForm"
import { VenueSessionPicker, type SelectedSession } from "@/components/citizen/VenueSessionPicker"
import { WeekDatePicker } from "@/components/citizen/WeekDatePicker"
import { Card, CardContent } from "@/components/ui/card"
import { getVenueRoom, getHireRate, getRoomFeatures, featureLabel, formatGBP } from "@/lib/pricing"
import { defaultVenueDate } from "@/lib/sessions"
import type { TimeSlot } from "@/hooks/useAvailability"
import type { Venue } from "@/types/generated"
import { DevHint } from "@/components/common/DevHint"

interface VenueHireBookingProps {
  resource: Venue
}

export function VenueHireBooking({ resource }: VenueHireBookingProps) {
  const resourceId = resource.bookableresourceid!
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { categoryIdMap } = useResourceCategoryMap()

  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const param = searchParams.get("date")
    if (param) {
      const parsed = parse(param, "yyyy-MM-dd", new Date())
      if (isValid(parsed)) return parsed
    }
    return defaultVenueDate()
  })
  const [session, setSession] = useState<SelectedSession | null>(null)

  const room = getVenueRoom(resource.name ?? undefined)
  const rate = getHireRate(resource.name ?? undefined)
  const features = getRoomFeatures(resource.name ?? undefined)
  const categoryId = categoryIdMap.get(resourceId)

  const handleDateChange = (date: Date) => {
    setSelectedDate(date)
    setSession(null)
  }

  const clearSession = () => setSession(null)

  const handleBooked = () => {
    setSession(null)
    queryClient.invalidateQueries({ queryKey: ["venueDayBookings"] })
  }

  const slot: TimeSlot | null = session
    ? {
        start: session.start,
        end: session.end,
        startLabel: session.startLabel,
        endLabel: session.endLabel,
        available: true,
        spotsLeft: 1,
        capacity: 1,
        bufferBlocked: false,
      }
    : null

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm">
        <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
          All services
        </Link>
        {categoryId && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
            <Link to={`/browse/${categoryId}`} className="text-muted-foreground hover:text-foreground transition-colors">
              Venue Hire
            </Link>
          </>
        )}
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
        <span className="font-medium text-foreground">{resource.name}</span>
      </nav>

      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{resource.name}</h1>
        {room && (
          <>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5 shrink-0" /> up to {room.capacity} guests
              </span>
              <span className="inline-flex items-center gap-1">
                <Tag className="h-3.5 w-3.5 shrink-0" /> from {formatGBP(Math.round(room.standard * 100))}/hr
              </span>
              {room.blurb && <span>{room.blurb}</span>}
            </div>
            {features.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {features.map((f) => (
                  <span key={f} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                    {featureLabel(f)}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Date */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Choose your date</h2>
          <WeekDatePicker selected={selectedDate} onChange={handleDateChange} />
          <p className="text-xs text-muted-foreground">
            Booking for <span className="font-medium text-foreground">{format(selectedDate, "EEEE d MMMM yyyy")}</span>.
            We recommend at least 4 weeks' notice.
          </p>
        </CardContent>
      </Card>

      {/* Sessions */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Choose a session</h2>
          <VenueSessionPicker
            resourceId={resourceId}
            date={selectedDate}
            rate={rate}
            selectedKey={session?.key ?? null}
            onSelect={setSession}
          />
        </CardContent>
      </Card>

      {/* Confirm + pay */}
      {slot && (
        <CitizenBookingForm
          resourceId={resourceId}
          resourceName={resource.name!}
          categoryName="Venue Hire"
          slot={slot}
          onCancel={clearSession}
          onBooked={handleBooked}
        />
      )}

      <DevHint hints={[
        { route: "public/venue/{id}", table: "bookableresource", notes: "Venue details" },
        { route: "public/booking", table: "bookableresourcebooking", notes: "Day's bookings → which sessions are free" },
        { route: "me/servicebooking", table: "tn_citizenservicebooking", notes: "Create booking after payment" },
      ]} />
    </div>
  )
}
