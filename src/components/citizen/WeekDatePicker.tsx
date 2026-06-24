import {
  addDays,
  startOfWeek,
  startOfDay,
  isSameDay,
  isBefore,
  isAfter,
  format,
  isToday,
} from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface WeekDatePickerProps {
  selected: Date
  onChange: (date: Date) => void
}

/**
 * One week at a time with prev/next paging — fits the card width (no horizontal
 * scroll). Paging moves the selection by a week so the chosen day is always
 * visible and in sync with the rest of the screen. Used for venue hire.
 */
export function WeekDatePicker({ selected, onChange }: WeekDatePickerProps) {
  const today = startOfDay(new Date())
  const minWeek = startOfWeek(today, { weekStartsOn: 1 })
  const weekStart = startOfWeek(selected, { weekStartsOn: 1 })

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const canPrev = isAfter(weekStart, minWeek)

  const shiftWeek = (delta: number) => {
    let next = addDays(selected, delta * 7)
    if (isBefore(next, today)) next = today
    onChange(next)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Previous week"
        disabled={!canPrev}
        onClick={() => shiftWeek(-1)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="grid flex-1 grid-cols-7 gap-1.5">
        {days.map((date) => {
          const active = isSameDay(date, selected)
          const past = isBefore(date, today)
          return (
            <button
              key={date.toISOString()}
              type="button"
              disabled={past}
              onClick={() => onChange(date)}
              className={cn(
                "flex flex-col items-center rounded-lg border px-2 py-2.5 text-sm transition-colors",
                past
                  ? "cursor-not-allowed border-border bg-muted/40 text-muted-foreground/50"
                  : active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:border-primary/40 hover:bg-accent",
              )}
            >
              <span className="text-[11px] font-medium uppercase">
                {isToday(date) ? "Today" : format(date, "EEE")}
              </span>
              <span className="text-lg font-bold leading-tight">{format(date, "d")}</span>
              <span className="text-[11px]">{format(date, "MMM")}</span>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        aria-label="Next week"
        onClick={() => shiftWeek(1)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-accent"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
