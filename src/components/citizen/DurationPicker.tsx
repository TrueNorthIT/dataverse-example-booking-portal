import { cn, formatDuration } from "@/lib/utils"

interface DurationPickerProps {
  options: number[]
  selected: number
  onChange: (mins: number) => void
}

export function DurationPicker({ options, selected, onChange }: DurationPickerProps) {
  if (options.length <= 1) return null

  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map((mins) => {
        const active = mins === selected
        return (
          <button
            key={mins}
            onClick={() => onChange(mins)}
            className={cn(
              "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:border-primary/40 hover:bg-accent"
            )}
          >
            {formatDuration(mins)}
          </button>
        )
      })}
    </div>
  )
}
