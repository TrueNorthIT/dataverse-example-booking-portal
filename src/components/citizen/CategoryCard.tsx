import { Link } from "react-router-dom"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { getCategoryMeta } from "@/lib/categoryMeta"
import { ChevronRight } from "lucide-react"
import type { Service } from "@/types/generated"

interface CategoryCardProps {
  category: Service
  resourceCount?: number
  /** Render a wide, horizontal banner (used to highlight the first service). */
  featured?: boolean
}

export function CategoryCard({ category, resourceCount, featured }: CategoryCardProps) {
  const meta = getCategoryMeta(category.name!)
  const Icon = meta.icon

  const locationLine =
    resourceCount !== undefined ? (
      <p className="text-sm text-muted-foreground mt-1">
        {resourceCount} {resourceCount === 1 ? "location" : "locations"}
      </p>
    ) : null

  if (featured) {
    return (
      <Link to={`/browse/${category.bookableresourcecategoryid}`}>
        <Card className="group flex overflow-hidden transition-all hover:shadow-md hover:border-primary/30">
          {/* Vertical accent bar */}
          <div className={`w-1.5 shrink-0 ${meta.color}`} />
          <CardHeader className="flex flex-1 flex-row items-center gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${meta.color}`}
            >
              <Icon className={`h-6 w-6 ${meta.textColor}`} />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg">{category.name}</CardTitle>
              <CardDescription>
                {category.description || "Browse available services"}
              </CardDescription>
              {locationLine}
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </CardHeader>
        </Card>
      </Link>
    )
  }

  return (
    <Link to={`/browse/${category.bookableresourcecategoryid}`}>
      <Card className="group h-full overflow-hidden transition-all hover:shadow-md hover:border-primary/30">
        {/* Accent bar */}
        <div className={`h-1 ${meta.color}`} />
        <CardHeader>
          <div className="flex items-start justify-between">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-lg ${meta.color}`}
            >
              <Icon className={`h-6 w-6 ${meta.textColor}`} />
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <CardTitle className="text-lg mt-3">{category.name}</CardTitle>
          <CardDescription>
            {category.description || "Browse available services"}
          </CardDescription>
          {locationLine}
        </CardHeader>
      </Card>
    </Link>
  )
}
