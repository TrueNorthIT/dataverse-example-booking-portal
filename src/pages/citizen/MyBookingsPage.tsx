import { useState, useMemo } from "react"
import { Link } from "react-router-dom"
import { useAuth0 } from "@auth0/auth0-react"
import { isPast, parseISO } from "date-fns"
import { useMyBookings } from "@/hooks/useMyBookings"
import { useCancelCitizenBooking } from "@/hooks/useCitizenBookings"
import { useBookingStatuses } from "@/hooks/useBookingStatuses"
import { useResourceCategoryMap } from "@/hooks/useResourceCategoryMap"
import { useCurrentUser } from "@/components/auth/AuthGuard"
import { MyBookingCard } from "@/components/citizen/MyBookingCard"
import { EmptyState } from "@/components/common/EmptyState"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { CalendarDays, LogIn, Search } from "lucide-react"
import { getCategoryMeta } from "@/lib/categoryMeta"
import { cn } from "@/lib/utils"
import { DevHint } from "@/components/common/DevHint"
import { toast } from "sonner"
import { ServicebookingTnStatus } from "@/types/generated"
import type { ExpandedServicebooking } from "@/hooks/useMyBookings"

type Tab = "upcoming" | "past"

/** Extract the resource ID from a CSB's expanded tn_Booking */
function resourceIdOf(b: ExpandedServicebooking): string | undefined {
  return b.tn_Booking?.resource ?? b.tn_Booking?.Resource?.bookableresourceid
}

export function MyBookingsPage() {
  const [tab, setTab] = useState<Tab>("upcoming")
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const { name, isAuthenticated } = useCurrentUser()
  const { loginWithRedirect } = useAuth0()
  const { data, isLoading } = useMyBookings()
  const cancelCitizenBooking = useCancelCitizenBooking()
  const { data: statuses } = useBookingStatuses()
  const { map: categoryMap } = useResourceCategoryMap()

  const cancelStatus = statuses?.find((s) => s.name === "Canceled")

  const allBookings = data ?? []

  const endTimeOf = (b: ExpandedServicebooking) =>
    b.tn_Booking?.endtime ?? b.tn_requestedend

  const upcoming = allBookings.filter((b) => {
    const end = endTimeOf(b)
    return end ? !isPast(parseISO(end)) && b.tn_status !== ServicebookingTnStatus.Cancelled : true
  })
  const past = allBookings.filter((b) => {
    const end = endTimeOf(b)
    return (end ? isPast(parseISO(end)) : false) || b.tn_status === ServicebookingTnStatus.Cancelled
  })

  // Derive which categories appear in the current tab's bookings
  const displayed = tab === "upcoming" ? upcoming : past

  const categoriesInView = useMemo(() => {
    const cats = new Set<string>()
    for (const b of displayed) {
      const rid = resourceIdOf(b)
      const cat = rid ? categoryMap.get(rid) : undefined
      if (cat) cats.add(cat)
    }
    return Array.from(cats).sort()
  }, [displayed, categoryMap])

  // Apply category filter
  const filtered = categoryFilter
    ? displayed.filter((b) => {
        const rid = resourceIdOf(b)
        return rid ? categoryMap.get(rid) === categoryFilter : false
      })
    : displayed

  // Reset category filter when switching tabs
  const handleTabChange = (t: Tab) => {
    setTab(t)
    setCategoryFilter(null)
  }

  const handleCancel = (booking: ExpandedServicebooking) => {
    if (!cancelStatus) {
      toast.error("Booking statuses not loaded")
      return
    }

    cancelCitizenBooking.mutate({
      citizenServiceBookingId: booking.tn_citizenservicebookingid!,
      underlyingBookingId: booking.tn_booking ?? booking._tn_booking_value,
      cancelStatusId: cancelStatus.bookingstatusid!,
    })
  }

  if (!isAuthenticated) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Bookings</h1>
        </div>
        <EmptyState
          icon={CalendarDays}
          title="Sign in to view your bookings"
          description="Your upcoming and past bookings appear here once you sign in."
          action={
            <Button onClick={() => loginWithRedirect()}>
              <LogIn className="mr-2 h-4 w-4" />
              Sign in
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Bookings</h1>
        <p className="text-muted-foreground">
          Viewing bookings for <strong>{name}</strong>
        </p>
      </div>

      {/* Time tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        {(["upcoming", "past"] as const).map((t) => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              tab === t
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "upcoming" ? `Upcoming (${upcoming.length})` : `Past (${past.length})`}
          </button>
        ))}
      </div>

      {/* Category filter chips */}
      {categoriesInView.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategoryFilter(null)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors border",
              !categoryFilter
                ? "bg-foreground text-background border-foreground"
                : "bg-background text-muted-foreground border-border hover:border-foreground/30"
            )}
          >
            All ({displayed.length})
          </button>
          {categoriesInView.map((cat) => {
            const meta = getCategoryMeta(cat)
            const Icon = meta.icon
            const count = displayed.filter((b) => {
              const rid = resourceIdOf(b)
              return rid ? categoryMap.get(rid) === cat : false
            }).length
            const active = categoryFilter === cat
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(active ? null : cat)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors border",
                  active
                    ? `${meta.color} ${meta.textColor} border-transparent`
                    : "bg-background text-muted-foreground border-border hover:border-foreground/30"
                )}
              >
                <Icon className="h-3 w-3" />
                {cat} ({count})
              </button>
            )
          })}
        </div>
      )}

      {/* Booking list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((booking) => (
            <MyBookingCard
              key={booking.tn_citizenservicebookingid}
              booking={booking}
              categoryName={(() => {
                const rid = resourceIdOf(booking)
                return rid ? categoryMap.get(rid) : undefined
              })()}
              onCancel={handleCancel}
              cancelling={cancelCitizenBooking.isPending}
            />
          ))}
        </div>
      ) : categoryFilter ? (
        <EmptyState
          icon={Search}
          title="No matching bookings"
          description={`No ${categoryFilter} bookings found. Try a different filter.`}
        />
      ) : tab === "upcoming" ? (
        <EmptyState
          icon={CalendarDays}
          title="No upcoming bookings"
          description="You don't have any upcoming bookings. Browse services to make one!"
          action={
            <Button asChild variant="outline">
              <Link to="/">Browse services</Link>
            </Button>
          }
        />
      ) : (
        <EmptyState
          icon={CalendarDays}
          title="No past bookings"
          description="Your completed or cancelled bookings will appear here."
        />
      )}

      <DevHint hints={[
        { route: "me/servicebooking", table: "tn_citizenservicebooking", notes: "Citizen's bookings (expand=tn_Booking for times)" },
        { route: "public/status", table: "bookingstatus", notes: "Booking statuses for cancel flow" },
        { route: "public/servicevenue", table: "bookableresourcecategoryassn", notes: "Category mapping for badges" },
      ]} />
    </div>
  )
}
