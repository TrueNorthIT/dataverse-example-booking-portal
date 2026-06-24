import { CalendarCheck, Eye, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TimeSlot } from "@/lib/availability"
import type { RunPos } from "@/lib/slotGridLayout"
import { slotStateLabel, type SlotVisualState } from "@/lib/slotCell"

interface SlotCellProps {
  slot: TimeSlot
  state: SlotVisualState
  /** This cell's position within a contiguous "mine" run, if any. */
  mineRun?: RunPos
  multiCapacity: boolean
  /** Show the full start–end range (single-cell bookings) vs just the start. */
  showTimeRange: boolean
  bookingDuration: number
  spanCount: number
  viewers: number
  isFlashing: boolean
  /** Colour classes from slotVariantClasses(). */
  variantClasses: string
  /** Rounded-corner merge classes from mergeRoundingClasses(). */
  mergeClasses: string
  onSelect: () => void
  onCancel: () => void
}

/** A single tappable cell in the availability grid. Pure presentation — all
 *  state decisions are made by the parent and the lib/slotCell helpers. */
export function SlotCell({
  slot,
  state,
  mineRun,
  multiCapacity,
  showTimeRange,
  bookingDuration,
  spanCount,
  viewers,
  isFlashing,
  variantClasses,
  mergeClasses,
  onSelect,
  onCancel,
}: SlotCellProps) {
  const { isMine, isInSpan, wontFit } = state
  const isWatched = viewers > 0

  return (
    <button
      type="button"
      aria-pressed={isInSpan}
      aria-label={`${slot.startLabel} to ${slot.endLabel}, ${slotStateLabel(slot, state, multiCapacity)}`}
      disabled={(!slot.available && !isMine) || wontFit}
      onClick={isMine ? onCancel : onSelect}
      className={cn(
        "border px-2 py-2 text-sm font-medium transition-colors flex flex-col items-center justify-center gap-0.5 min-h-[3.25rem]",
        isFlashing && "animate-slot-flash",
        isWatched && "ring-2 ring-amber-400 dark:ring-amber-500",
        mergeClasses,
        variantClasses,
      )}
    >
      <span>{showTimeRange ? `${slot.startLabel}–${slot.endLabel}` : slot.startLabel}</span>

      <SlotSubLabel
        slot={slot}
        state={state}
        mineRun={mineRun}
        multiCapacity={multiCapacity}
        bookingDuration={bookingDuration}
        spanCount={spanCount}
      />

      {isWatched && (
        <span className="flex items-center gap-0.5 text-[10px] leading-none text-amber-600 dark:text-amber-400 font-medium">
          <Eye className="h-2.5 w-2.5" />
          {viewers}
        </span>
      )}
    </button>
  )
}

/** The small second line: "Won't fit" / "Yours · N min" / "X left" / "Changeover" / "Full". */
function SlotSubLabel({
  slot,
  state,
  mineRun,
  multiCapacity,
  bookingDuration,
  spanCount,
}: Pick<SlotCellProps, "slot" | "state" | "mineRun" | "multiCapacity" | "bookingDuration" | "spanCount">) {
  if (state.wontFit) {
    return <span className="text-[10px] leading-none no-underline opacity-70">Won't fit</span>
  }

  if (state.isMine) {
    const isRunCentre = mineRun && mineRun.indexInRun === Math.floor((mineRun.length - 1) / 2)
    if (isRunCentre) {
      return (
        <span className="text-[10px] leading-none flex items-center gap-0.5">
          <CalendarCheck className="h-2.5 w-2.5" />
          {mineRun.length > 1 ? `Yours · ${mineRun.length * (bookingDuration / spanCount)} min` : "Yours"}
          <X className="h-2.5 w-2.5 opacity-50" />
        </span>
      )
    }
    return <span className="text-[10px] leading-none text-blue-400 dark:text-blue-500">—</span>
  }

  const detail = slot.available ? null : slot.bufferBlocked ? "Changeover" : multiCapacity ? "Full" : "Booked"

  if (multiCapacity) {
    return (
      <span className={cn("text-[10px] leading-none", state.isInSpan ? "text-primary-foreground/80" : "opacity-70")}>
        {slot.available ? `${slot.spotsLeft} left` : detail}
      </span>
    )
  }

  return <span className="text-[10px] leading-none opacity-70">{slot.available ? " " : detail}</span>
}
