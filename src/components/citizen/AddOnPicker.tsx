import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { addOnPricePence, formatGBP, type AddOn } from "@/lib/pricing"

interface AddOnPickerProps {
  addOns: AddOn[]
  /** Keys of the currently selected add-ons. */
  selected: Set<string>
  durationMins: number
  onToggle: (key: string) => void
}

/** Optional paid extras (e.g. kitchen, wet room) for a venue-hire booking. */
export function AddOnPicker({ addOns, selected, durationMins, onToggle }: AddOnPickerProps) {
  if (addOns.length === 0) return null

  return (
    <div className="space-y-1.5">
      <Label>Optional extras</Label>
      <div className="space-y-1.5">
        {addOns.map((addOn) => {
          const isSelected = selected.has(addOn.key)
          return (
            <button
              key={addOn.key}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onToggle(addOn.key)}
              className={cn(
                "flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors",
                isSelected ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-accent",
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded border",
                    isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
                  )}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                </span>
                {addOn.label}
                <span className="text-muted-foreground">+{formatGBP(Math.round(addOn.rate * 100))}/hr</span>
              </span>
              <span className="text-muted-foreground">{formatGBP(addOnPricePence(addOn, durationMins))}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
