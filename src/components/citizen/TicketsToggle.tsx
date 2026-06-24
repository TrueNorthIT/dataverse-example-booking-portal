import { Ticket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

interface TicketsToggleProps {
  /** Whether the citizen will be selling tickets (the higher-rate option). */
  value: boolean
  onChange: (sellingTickets: boolean) => void
}

/** Yes/No choice shown only for venues whose ticketed rate differs from standard. */
export function TicketsToggle({ value, onChange }: TicketsToggleProps) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5">
        <Ticket className="h-3.5 w-3.5" />
        Will you be selling tickets at this event?
      </Label>
      <div className="flex gap-2">
        <Button type="button" variant={!value ? "default" : "outline"} size="sm" onClick={() => onChange(false)}>
          No
        </Button>
        <Button type="button" variant={value ? "default" : "outline"} size="sm" onClick={() => onChange(true)}>
          Yes
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Ticketed events are charged at a higher rate for this venue.
      </p>
    </div>
  )
}
