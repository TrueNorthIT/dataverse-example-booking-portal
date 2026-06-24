import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { format } from "date-fns"
import { Users, Tag, ChevronRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { WeekDatePicker } from "@/components/citizen/WeekDatePicker"
import {
  getVenueRoom,
  getRoomFeatures,
  formatGBP,
  featureLabel,
  VENUE_FEATURES,
  type VenueFeature,
} from "@/lib/pricing"
import { filterRoomsByCapacityAndFeatures } from "@/lib/venue"
import { defaultVenueDate } from "@/lib/sessions"
import { cn } from "@/lib/utils"
import type { Venue } from "@/types/generated"

// Guest bands → minimum room capacity required
const GUEST_BANDS: { value: string; label: string; min: number | null }[] = [
  { value: "any", label: "Any size", min: null },
  { value: "30", label: "Up to 30", min: 30 },
  { value: "50", label: "Up to 50", min: 50 },
  { value: "100", label: "Up to 100", min: 100 },
  { value: "200", label: "Up to 200", min: 200 },
  { value: "300", label: "300+", min: 300 },
]

interface VenueHireBrowserProps {
  rooms: Venue[]
}

export function VenueHireBrowser({ rooms }: VenueHireBrowserProps) {
  const [date, setDate] = useState<Date>(() => defaultVenueDate())
  const [band, setBand] = useState<string>("any")
  const [features, setFeatures] = useState<Set<VenueFeature>>(new Set())

  const guestCount = GUEST_BANDS.find((b) => b.value === band)?.min ?? null
  const dateParam = format(date, "yyyy-MM-dd")

  const toggleFeature = (key: VenueFeature) => {
    setFeatures((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Filter by required features, then by capacity (smallest fitting room first)
  const { fits, tooSmall } = useMemo(
    () => filterRoomsByCapacityAndFeatures(rooms, [...features], guestCount),
    [rooms, guestCount, features]
  )

  return (
    <div className="space-y-5">
      {/* Event-led filter */}
      <Card>
        <CardContent className="p-5 space-y-5">
          {/* Date — full width */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">When is your event?</Label>
            <WeekDatePicker selected={date} onChange={setDate} />
            <p className="text-xs text-muted-foreground">
              We recommend booking at least 4 weeks ahead ·{" "}
              <span className="font-medium text-foreground">{format(date, "EEEE d MMMM yyyy")}</span>
            </p>
          </div>

          {/* Guests */}
          <div className="space-y-2">
            <Label htmlFor="guests" className="text-sm font-medium text-muted-foreground">
              How many guests?
            </Label>
            <Select value={band} onValueChange={setBand}>
              <SelectTrigger id="guests" className="w-full sm:w-48">
                <div className="flex min-w-0 items-center gap-2">
                  <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {GUEST_BANDS.map((b) => (
                  <SelectItem key={b.value} value={b.value}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Facilities */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Facilities needed</Label>
            <div className="flex flex-wrap gap-2">
              {VENUE_FEATURES.map((f) => {
                const active = features.has(f.key)
                const Icon = f.icon
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => toggleFeature(f.key)}
                    aria-pressed={active}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-accent",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {f.label}
                  </button>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Matching rooms */}
      {fits.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {fits.map(({ resource, capacity }) => (
            <VenueRoomCard
              key={resource.bookableresourceid}
              resource={resource}
              capacity={capacity}
              dateParam={dateParam}
              guests={guestCount}
            />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground py-6 text-center">
          No rooms match those filters. Try fewer facilities or a smaller party.
        </p>
      )}

      {/* Rooms too small for the party */}
      {tooSmall.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Too small for {guestCount} guests</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {tooSmall.map(({ resource, capacity }) => (
              <VenueRoomCard
                key={resource.bookableresourceid}
                resource={resource}
                capacity={capacity}
                dateParam={dateParam}
                guests={guestCount}
                disabled
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface VenueRoomCardProps {
  resource: Venue
  capacity: number
  dateParam: string
  guests: number | null
  disabled?: boolean
}

function VenueRoomCard({ resource, capacity, dateParam, guests, disabled }: VenueRoomCardProps) {
  const room = getVenueRoom(resource.name ?? undefined)
  const features = getRoomFeatures(resource.name ?? undefined)

  const body = (
    <Card className={disabled ? "opacity-50" : "group transition-shadow hover:shadow-md hover:border-primary/30"}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between">
          <p className="font-medium">{resource.name}</p>
          {!disabled && (
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5 shrink-0" />
            up to {capacity}
          </span>
          {room && (
            <span className="inline-flex items-center gap-1">
              <Tag className="h-3.5 w-3.5 shrink-0" />
              from {formatGBP(Math.round(room.standard * 100))}/hr
            </span>
          )}
        </div>
        {room?.blurb && <p className="text-xs text-muted-foreground">{room.blurb}</p>}
        {features.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {features.map((f) => (
              <span key={f} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                {featureLabel(f)}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )

  if (disabled) return body

  const params = new URLSearchParams({ date: dateParam })
  if (guests != null) params.set("guests", String(guests))

  return <Link to={`/book/${resource.bookableresourceid}?${params.toString()}`}>{body}</Link>
}
