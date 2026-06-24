import { useMemo } from "react"
import { useParams, Link } from "react-router-dom"
import { useCategory } from "@/hooks/useCategory"
import { useRoomsByCategory } from "@/hooks/useRoomsByCategory"
import { useTodaysBusyness } from "@/hooks/useTodaysBusyness"
import { useDemo } from "@/contexts/DemoContext"
import { getCategoryMeta } from "@/lib/categoryMeta"
import {
  getPersonaLocation,
  getResourceLocation,
  haversineDistance,
} from "@/lib/locations"
import { ResourceCard } from "@/components/citizen/ResourceCard"
import { VenueHireBrowser } from "@/components/citizen/VenueHireBrowser"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronRight } from "lucide-react"
import type { Venue } from "@/types/generated"
import { DevHint } from "@/components/common/DevHint"

export function CategoryPage() {
  const { categoryId } = useParams<{ categoryId: string }>()
  const { persona } = useDemo()
  const { data: category, isLoading: catLoading } = useCategory(categoryId)
  const { rooms, isLoading: roomsLoading } = useRoomsByCategory(categoryId)
  const { data: busynessMap } = useTodaysBusyness()

  const personaLoc = getPersonaLocation(persona.id)

  const isLoading = catLoading || roomsLoading
  const meta = category ? getCategoryMeta(category.name!) : null
  const Icon = meta?.icon
  const isVenueHire = category?.name === "Venue Hire"

  // Compute distances and sort by nearest
  const sortedRooms = useMemo(() => {
    if (!personaLoc) return rooms.map((r) => ({ resource: r, distance: null as number | null }))

    return [...rooms]
      .map((resource: Venue) => {
        const resLoc = getResourceLocation(resource.name!)
        const distance = resLoc ? haversineDistance(personaLoc, resLoc) : null
        return { resource, distance }
      })
      .sort((a, b) => {
        if (a.distance === null) return 1
        if (b.distance === null) return -1
        return a.distance - b.distance
      })
  }, [rooms, personaLoc])

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm">
        <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
          All services
        </Link>
        {category && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span className="font-medium text-foreground">{category.name}</span>
          </>
        )}
      </nav>

      {/* Category header */}
      {catLoading ? (
        <Skeleton className="h-10 w-64" />
      ) : category ? (
        <div className="flex items-center gap-3">
          {Icon && meta && (
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${meta.color}`}>
              <Icon className={`h-5 w-5 ${meta.textColor}`} />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{category.name}</h1>
            {category.description && (
              <p className="text-muted-foreground">{category.description}</p>
            )}
          </div>
        </div>
      ) : (
        <h1 className="text-2xl font-bold">Category not found</h1>
      )}

      {/* Resources */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : isVenueHire ? (
        <VenueHireBrowser rooms={rooms} />
      ) : sortedRooms.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {sortedRooms.map(({ resource, distance }) => (
            <ResourceCard
              key={resource.bookableresourceid}
              resource={resource}
              distance={distance}
              busyLevel={busynessMap ? (busynessMap.get(resource.bookableresourceid!) ?? "quiet") : undefined}
            />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground py-8 text-center">
          No resources available in this category.
        </p>
      )}

      <DevHint hints={[
        { route: "public/service/{id}", table: "bookableresourcecategory", notes: "Single category by ID" },
        { route: "public/servicevenue", table: "bookableresourcecategoryassn", notes: "Venues in category (expand=Resource)" },
        { route: "public/booking", table: "bookableresourcebooking", notes: "Today's bookings for busyness badges" },
      ]} />
    </div>
  )
}
