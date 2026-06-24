import { Link } from "react-router-dom"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { getCategoryMeta } from "@/lib/categoryMeta"
import { ChevronRight } from "lucide-react"
import type { Service } from "@/types/generated"

interface CategoryCardProps {
  category: Service
  resourceCount?: number
}

export function CategoryCard({ category, resourceCount }: CategoryCardProps) {
  const meta = getCategoryMeta(category.name!)
  const Icon = meta.icon

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
          {resourceCount !== undefined && (
            <p className="text-sm text-muted-foreground mt-1">
              {resourceCount} {resourceCount === 1 ? "location" : "locations"}
            </p>
          )}
        </CardHeader>
      </Card>
    </Link>
  )
}
