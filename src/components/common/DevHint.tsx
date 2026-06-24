import { useState } from "react"
import { Code2 } from "lucide-react"

interface RouteHint {
  route: string
  table: string
  notes?: string
}

interface DevHintProps {
  hints: RouteHint[]
}

export function DevHint({ hints }: DevHintProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-12 left-3 z-50">
      {open ? (
        <div className="rounded-lg border bg-background/95 backdrop-blur shadow-lg p-3 text-xs space-y-2 max-w-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-muted-foreground flex items-center gap-1">
              <Code2 className="h-3 w-3" /> API Routes
            </span>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              ✕
            </button>
          </div>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-muted-foreground border-b">
                <th className="text-left py-0.5 pr-2">Route</th>
                <th className="text-left py-0.5">Dataverse Table</th>
              </tr>
            </thead>
            <tbody>
              {hints.map((h) => (
                <tr key={h.route} className="border-b border-border/50 last:border-0">
                  <td className="py-1 pr-2 font-mono text-primary">{h.route}</td>
                  <td className="py-1 font-mono text-muted-foreground">{h.table}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {hints.some((h) => h.notes) && (
            <div className="text-muted-foreground/70 space-y-0.5">
              {hints.filter((h) => h.notes).map((h) => (
                <p key={h.route}>{h.notes}</p>
              ))}
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="rounded-full bg-muted/80 backdrop-blur border p-1.5 text-muted-foreground hover:text-foreground transition-colors"
          title="API route info"
        >
          <Code2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
