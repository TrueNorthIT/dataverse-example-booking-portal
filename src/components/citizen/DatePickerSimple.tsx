import { useEffect, useRef } from "react"
import { addDays, format, isSameDay, isToday } from "date-fns"
import { cn } from "@/lib/utils"

interface DatePickerSimpleProps {
  selected: Date
  onChange: (date: Date) => void
  days?: number
  /** Days from today the strip starts at (venue hire starts a few weeks out). */
  startOffset?: number
}

export function DatePickerSimple({ selected, onChange, days = 14, startOffset = 0 }: DatePickerSimpleProps) {
  const today = new Date()
  const activeRef = useRef<HTMLButtonElement>(null)

  // Keep the selected date in view (the venue-hire strip can start weeks out)
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "center" })
  }, [selected])

  return (
    <div className="flex w-full min-w-0 gap-2 overflow-x-auto pb-2">
      {Array.from({ length: days }, (_, i) => {
        const date = addDays(today, i + startOffset)
        const active = isSameDay(date, selected)

        return (
          <button
            key={i}
            ref={active ? activeRef : undefined}
            onClick={() => onChange(date)}
            className={cn(
              "flex flex-col items-center rounded-lg border px-3.5 py-2.5 text-sm transition-colors shrink-0 min-w-[4.25rem]",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:border-primary/40 hover:bg-accent"
            )}
          >
            <span className="text-[11px] font-medium uppercase">
              {isToday(date) ? "Today" : format(date, "EEE")}
            </span>
            <span className="text-lg font-bold leading-tight">
              {format(date, "d")}
            </span>
            <span className="text-[11px]">{format(date, "MMM")}</span>
          </button>
        )
      })}
    </div>
  )
}
