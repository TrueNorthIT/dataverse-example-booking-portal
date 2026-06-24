import { Link } from "react-router-dom"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDistance } from "@/lib/locations"
import { getHireRate, formatGBP } from "@/lib/pricing"
import { ChevronRight, MapPin, Tag } from "lucide-react"
import type { Venue } from "@/types/generated"
import type { BusyLevel } from "@/hooks/useTodaysBusyness"

const BUSY_CONFIG: Record<BusyLevel, { label: string; variant: "success" | "warning" | "destructive" }> = {
  quiet: { label: "Quiet today", variant: "success" },
  moderate: { label: "Moderate", variant: "warning" },
  busy: { label: "Busy today", variant: "destructive" },
}

interface ResourceCardProps {
  resource: Venue
  distance?: number | null
  busyLevel?: BusyLevel
}

export function ResourceCard({ resource, distance, busyLevel }: ResourceCardProps) {
  const hasLocationInfo = distance != null || busyLevel
  const rate = getHireRate(resource.name ?? undefined)

  return (
    <Link to={`/book/${resource.bookableresourceid}`}>
      <Card className="group transition-shadow hover:shadow-md hover:border-primary/30">
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-base">{resource.name}</CardTitle>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          {rate && (
            <div className="flex items-center gap-1 text-sm font-medium text-foreground">
              <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              from {formatGBP(Math.round(rate.standard * 100))}/hr
            </div>
          )}
          {hasLocationInfo ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {distance != null && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {formatDistance(distance)} away
                </span>
              )}
              {busyLevel && (
                <Badge variant={BUSY_CONFIG[busyLevel].variant} className="text-[10px] px-1.5 py-0">
                  {BUSY_CONFIG[busyLevel].label}
                </Badge>
              )}
            </div>
          ) : (
            <CardDescription>
              Click to view availability and book
            </CardDescription>
          )}
        </CardHeader>
      </Card>
    </Link>
  )
}
