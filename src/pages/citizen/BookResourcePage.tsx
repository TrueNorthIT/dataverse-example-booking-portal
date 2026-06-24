import { useState, useEffect, useMemo } from "react"
import { useParams, Link } from "react-router-dom"
import { useRoom } from "@/hooks/useRooms"
import { useResourceCategoryMap } from "@/hooks/useResourceCategoryMap"
import { useAvailability, type TimeSlot } from "@/hooks/useAvailability"
import { useMyBookings, type ExpandedServicebooking } from "@/hooks/useMyBookings"
import { useCancelCitizenBooking } from "@/hooks/useCitizenBookings"
import { useBookingStatuses } from "@/hooks/useBookingStatuses"
import { DatePickerSimple } from "@/components/citizen/DatePickerSimple"
import { DurationPicker } from "@/components/citizen/DurationPicker"
import { AvailabilitySlotGrid } from "@/components/citizen/AvailabilitySlotGrid"
import { CitizenBookingForm } from "@/components/citizen/CitizenBookingForm"
import { VenueHireBooking } from "@/components/citizen/VenueHireBooking"
import { getCategoryDurationConfig, getGridResolution } from "@/lib/categoryMeta"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronRight, Info, CalendarX } from "lucide-react"
import { format, parseISO } from "date-fns"
import { DevHint } from "@/components/common/DevHint"
import { usePresence } from "@/hooks/usePresence"
import { findMyBookedSlotStarts, findServicebookingForSlot } from "@/lib/bookings"
import { BOOKING_STATUS_NAME } from "@/lib/constants"

/**
 * Routes to the right booking experience for the resource's category.
 * Venue Hire uses an event-led, session-block flow; everything else uses the
 * standard live-availability slot grid.
 */
export function BookResourcePage() {
  const { resourceId } = useParams<{ resourceId: string }>()
  const { data: resource, isLoading: roomLoading } = useRoom(resourceId)
  const { map: categoryMap, isLoading: catLoading } = useResourceCategoryMap()
  const categoryName = resourceId ? categoryMap.get(resourceId) : undefined

  if (!roomLoading && !catLoading && resource && categoryName === "Venue Hire") {
    return <VenueHireBooking resource={resource} />
  }
  return <StandardBookingView />
}

function StandardBookingView() {
  const { resourceId } = useParams<{ resourceId: string }>()
  const { data: resource, isLoading: roomLoading } = useRoom(resourceId)
  const { map: categoryMap, bufferMap, categoryIdMap } = useResourceCategoryMap()

  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [selectedStartIndex, setSelectedStartIndex] = useState<number | null>(null)

  const calendarId = resource?.calendarid ?? resource?._calendarid_value
  const bufferMinutes = resourceId ? bufferMap.get(resourceId) ?? 0 : 0
  const categoryName = resourceId ? categoryMap.get(resourceId) : undefined

  const { options: durationOptions, defaultDuration } = getCategoryDurationConfig(categoryName)
  const [selectedDuration, setSelectedDuration] = useState(defaultDuration)

  useEffect(() => {
    setSelectedDuration(defaultDuration)
  }, [defaultDuration])

  const handleDurationChange = (mins: number) => {
    setSelectedDuration(mins)
    setSelectedStartIndex(null)
  }

  const handleDateChange = (date: Date) => {
    setSelectedDate(date)
    setSelectedStartIndex(null)
    broadcastLeft()
  }

  // Grid resolution is the GCD of duration options; booking duration spans multiple cells
  const gridResolution = getGridResolution(categoryName)
  const bookingDuration = selectedDuration
  const spanCount = bookingDuration / gridResolution

  const { slots, isLoading: slotsLoading } = useAvailability(resourceId, calendarId, selectedDate, bufferMinutes, gridResolution)

  // Derive a synthetic booking slot from the selected span
  const bookingSlot: TimeSlot | null = useMemo(() => {
    if (selectedStartIndex === null || slots.length === 0) return null
    const endIndex = selectedStartIndex + spanCount - 1
    if (endIndex >= slots.length) return null
    const first = slots[selectedStartIndex]
    const last = slots[endIndex]
    return {
      start: first.start,
      end: last.end,
      startLabel: first.startLabel,
      endLabel: last.endLabel,
      available: true,
      spotsLeft: first.spotsLeft,
      capacity: first.capacity,
      bufferBlocked: false,
    }
  }, [selectedStartIndex, spanCount, slots])

  // Find slots where the current user already has a booking
  // Match by booking name === resource name + time overlap on selected date
  const { data: myBookings } = useMyBookings()
  const resourceName = resource?.name
  const myBookedStarts = useMemo(
    () => findMyBookedSlotStarts(myBookings ?? [], resourceName, selectedDate, slots),
    [myBookings, resourceName, selectedDate, slots]
  )

  // Cancel flow
  const [cancellingSlot, setCancellingSlot] = useState<TimeSlot | null>(null)
  const [cancellingBooking, setCancellingBooking] = useState<ExpandedServicebooking | null>(null)
  const cancelMutation = useCancelCitizenBooking()
  const { data: statuses } = useBookingStatuses()
  const cancelStatusId = statuses?.find((s) => s.name === BOOKING_STATUS_NAME.CANCELED)?.bookingstatusid

  const handleCancelSlot = (slot: TimeSlot) => {
    const booking = findServicebookingForSlot(myBookings ?? [], resourceName, slot)
    if (booking) {
      setCancellingSlot(slot)
      setCancellingBooking(booking)
      setSelectedStartIndex(null)
    }
  }

  const handleConfirmCancel = async () => {
    if (!cancellingBooking || !cancelStatusId) return
    const sbId = cancellingBooking.tn_citizenservicebookingid!
    const bookingId = cancellingBooking.tn_Booking?.bookableresourcebookingid
    await cancelMutation.mutateAsync({
      citizenServiceBookingId: sbId,
      underlyingBookingId: bookingId,
      cancelStatusId,
    })
    setCancellingSlot(null)
    setCancellingBooking(null)
  }

  const { broadcastViewing, broadcastLeft, viewersForSlot, flashingSlots } = usePresence()

  // Cleanup presence on unmount
  useEffect(() => () => broadcastLeft(), [broadcastLeft])

  const isRecycling = categoryName === "Recycling Centre"
  const isFriday = selectedDate.getDay() === 5

  const dateStr = format(selectedDate, "yyyy-MM-dd")

  const handleSlotClick = (slot: TimeSlot, index: number) => {
    setCancellingSlot(null)
    setCancellingBooking(null)
    setSelectedStartIndex(index)
    if (resourceId) broadcastViewing(resourceId, dateStr, slot.start)
  }

  const handleClear = () => {
    setSelectedStartIndex(null)
    broadcastLeft()
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm">
        <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
          All services
        </Link>
        {resourceId && categoryMap.get(resourceId) && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
            <Link
              to={`/browse/${categoryIdMap.get(resourceId)}`}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {categoryMap.get(resourceId)}
            </Link>
          </>
        )}
        {resource && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span className="font-medium text-foreground">{resource.name}</span>
          </>
        )}
      </nav>

      {/* Resource info */}
      {roomLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-72" />
        </div>
      ) : resource ? (
        <h1 className="text-2xl font-bold tracking-tight">{resource.name}</h1>
      ) : (
        <h1 className="text-2xl font-bold">Resource not found</h1>
      )}

      {/* Buffer notice */}
      {bufferMinutes > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-muted bg-muted/50 p-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{bufferMinutes}-minute changeover is automatically applied between bookings for this service.</span>
        </div>
      )}

      {/* Date picker section */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">Select a date</h2>
          <DatePickerSimple selected={selectedDate} onChange={handleDateChange} />

          {/* Session length picker (only shown when multiple durations available) */}
          {durationOptions.length > 1 && (
            <>
              <h2 className="text-sm font-medium text-muted-foreground">Session length</h2>
              <DurationPicker
                options={durationOptions}
                selected={selectedDuration}
                onChange={handleDurationChange}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Friday reduced-capacity notice for recycling centres */}
      {isRecycling && isFriday && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Recycling centres operate with reduced capacity on Fridays due to maintenance works.</span>
        </div>
      )}

      {/* Time slots section */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Available times</h2>
          <AvailabilitySlotGrid
            slots={slots}
            selectedStartIndex={selectedStartIndex}
            spanCount={spanCount}
            bookingDuration={bookingDuration}
            onSelectSlot={handleSlotClick}
            onCancelSlot={handleCancelSlot}
            isLoading={slotsLoading}
            myBookedStarts={myBookedStarts}
            viewersForSlot={viewersForSlot}
            flashingSlots={flashingSlots}
          />
        </CardContent>
      </Card>

      {/* Cancel booking confirmation */}
      {cancellingSlot && cancellingBooking && resource && (
        <Card className="border-red-300/50 bg-red-50/50 dark:border-red-800/50 dark:bg-red-950/20">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CalendarX className="h-5 w-5 text-red-500" />
              <h3 className="font-semibold">Cancel this booking?</h3>
            </div>
            <div className="rounded-lg border bg-background p-3 space-y-1 text-sm">
              <p className="font-medium">{resource.name}</p>
              <p className="text-muted-foreground">
                {format(parseISO(cancellingSlot.start), "EEEE d MMMM yyyy")}
              </p>
              <p className="text-muted-foreground">
                {cancellingSlot.startLabel} — {cancellingSlot.endLabel}
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setCancellingSlot(null); setCancellingBooking(null) }}
                disabled={cancelMutation.isPending}
              >
                Keep booking
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmCancel}
                disabled={cancelMutation.isPending || !cancelStatusId}
              >
                {cancelMutation.isPending ? "Cancelling..." : "Cancel booking"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inline booking confirmation */}
      {bookingSlot && resource && (
        <CitizenBookingForm
          resourceId={resource.bookableresourceid!}
          resourceName={resource.name!}
          categoryName={categoryMap.get(resource.bookableresourceid!)}
          slot={bookingSlot}
          onCancel={handleClear}
          onBooked={handleClear}
        />
      )}

      <DevHint hints={[
        { route: "public/venue/{id}", table: "bookableresource", notes: "Resource details + calendar ID" },
        { route: "public/booking", table: "bookableresourcebooking", notes: "Existing bookings for slot availability" },
        { route: "expand-calendar", table: "calendar (ExpandCalendar)", notes: "Work hours + capacity blocks" },
        { route: "me/servicebooking", table: "tn_citizenservicebooking", notes: "Create booking + my bookings overlay" },
      ]} />
    </div>
  )
}
