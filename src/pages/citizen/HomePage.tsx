import { useState, useMemo } from "react"
import { Link } from "react-router-dom"
import { useCategories } from "@/hooks/useCategories"
import { useApiListAll } from "@/hooks/useApi"
import { useCurrentUser } from "@/components/auth/AuthGuard"
import { CategoryCard } from "@/components/citizen/CategoryCard"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { categoryMatchesSearch, getCategoryMeta } from "@/lib/categoryMeta"
import { queryKeys } from "@/lib/queryKeys"
import { Search, ChevronRight } from "lucide-react"
import { DevHint } from "@/components/common/DevHint"

interface ResourceAssn {
  resourcecategory: string
  resourcecategory_label?: string
  Resource?: { bookableresourceid: string; name: string }
}

export function HomePage() {
  const { name } = useCurrentUser()
  const { data, isLoading } = useCategories()
  const [search, setSearch] = useState("")

  // Fetch resources with category (cached 30 min) for venue-name search + direct links
  const { data: assns } = useApiListAll<ResourceAssn>(
    queryKeys.categoryResourceNames,
    "servicevenue",
    { expand: "Resource" },
    { staleTime: 1000 * 60 * 30 }
  )

  const resourceNamesByCategoryId = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const a of assns ?? []) {
      if (!a.Resource?.name) continue
      const existing = map.get(a.resourcecategory)
      if (existing) existing.push(a.Resource.name.toLowerCase())
      else map.set(a.resourcecategory, [a.Resource.name.toLowerCase()])
    }
    return map
  }, [assns])

  const q = search.trim().toLowerCase()

  const filtered = useMemo(() => {
    if (!data) return []
    if (!q) return data
    return data.filter((cat) =>
      categoryMatchesSearch(cat.name!, q, cat.tn_searchaliases) ||
      cat.description?.toLowerCase().includes(q) ||
      resourceNamesByCategoryId.get(cat.bookableresourcecategoryid!)?.some((name) => name.includes(q))
    )
  }, [data, q, resourceNamesByCategoryId])

  // Matching individual resources (only when actively searching)
  const matchingResources = useMemo(() => {
    if (!q || !assns) return []
    return assns
      .filter((a) => a.Resource?.name?.toLowerCase().includes(q))
      .map((a) => ({
        id: a.Resource!.bookableresourceid,
        name: a.Resource!.name,
        categoryName: a.resourcecategory_label ?? "",
        categoryId: a.resourcecategory,
      }))
  }, [q, assns])

  return (
    <div className="space-y-8">
      {/* Hero / greeting */}
      <div className="rounded-xl bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent border border-primary/10 p-6 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Hello, {name.split(" ")[0] || "there"}
        </h1>
        <p className="text-muted-foreground mt-1">
          Browse Leeds City Council services and book an available slot.
        </p>

        {/* Search */}
        <div className="relative mt-5">
          <Search className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder='Search services — try "gym", "skip", "holt park"...'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 pl-10 text-base rounded-lg shadow-sm"
          />
        </div>
      </div>

      {/* Matching resources — direct links */}
      {matchingResources.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Matching venues</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {matchingResources.map((r) => {
              const meta = getCategoryMeta(r.categoryName)
              const Icon = meta.icon
              return (
                <Link
                  key={r.id}
                  to={`/book/${r.id}`}
                  className="group flex items-center gap-3 rounded-lg border p-3 transition-shadow hover:shadow-md hover:border-primary/30"
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.color}`}>
                    <Icon className={`h-4 w-4 ${meta.textColor}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.categoryName}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Category grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-2">
          {q && <h2 className="text-sm font-medium text-muted-foreground">Categories</h2>}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((cat) => (
              <CategoryCard key={cat.bookableresourcecategoryid} category={cat} />
            ))}
          </div>
        </div>
      ) : matchingResources.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">
          No services match &ldquo;{search}&rdquo;. Try a different term.
        </p>
      ) : null}

      <DevHint hints={[
        { route: "public/service", table: "bookableresourcecategory", notes: "Service categories (Leisure, Sports, etc.)" },
        { route: "public/servicevenue", table: "bookableresourcecategoryassn", notes: "Venue-to-category junction (with expand=Resource for search)" },
      ]} />
    </div>
  )
}
