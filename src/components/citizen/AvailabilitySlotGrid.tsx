import { useMemo } from "react"
import { groupByPeriod, type TimeSlot } from "@/lib/availability"
import {
  buildRunPositions,
  computeSnapMap,
  computeValidStartIndices,
} from "@/lib/slotGridLayout"
import {
  slotVariantClasses,
  mergeRoundingClasses,
  type MergePosition,
  type SlotVisualState,
} from "@/lib/slotCell"
import { SlotCell } from "@/components/citizen/SlotCell"

interface AvailabilitySlotGridProps {
  slots: TimeSlot[]
  selectedStartIndex: number | null
  spanCount: number
  bookingDuration: number
  onSelectSlot: (slot: TimeSlot, index: number) => void
  onCancelSlot?: (slot: TimeSlot) => void
  isLoading?: boolean
  /** Start times (ISO) of slots where the current user has a booking */
  myBookedStarts?: Set<string>
  /** Returns the number of other users currently viewing a given slot */
  viewersForSlot?: (slotStart: string) => number
  /** Slot starts currently flashing (someone just selected them) */
  flashingSlots?: Set<string>
}

export function AvailabilitySlotGrid({
  slots,
  selectedStartIndex,
  spanCount,
  bookingDuration,
  onSelectSlot,
  onCancelSlot,
  isLoading,
  myBookedStarts,
  viewersForSlot,
  flashingSlots,
}: AvailabilitySlotGridProps) {
  // Which global indices can start a span, and which cells a tap snaps to.
  const validStartIndices = useMemo(
    () => computeValidStartIndices(slots, spanCount),
    [slots, spanCount]
  )

  // Indices in the currently selected span.
  const selectedIndices = useMemo(() => {
    const set = new Set<number>()
    if (selectedStartIndex !== null) {
      for (let j = 0; j < spanCount; j++) set.add(selectedStartIndex + j)
    }
    return set
  }, [selectedStartIndex, spanCount])

  // Each covered index → the latest valid start that includes it (tap snaps back).
  const snapStartFor = useMemo(
    () => computeSnapMap(validStartIndices, spanCount),
    [validStartIndices, spanCount]
  )

  // Contiguous runs of "mine" / "booked" cells (for merged rounded corners).
  const minePosition = useMemo(
    () => buildRunPositions(slots, (i) => myBookedStarts?.has(slots[i].start) ?? false),
    [slots, myBookedStarts],
  )
  const bookedPosition = useMemo(
    () => buildRunPositions(slots, (i) => {
      const s = slots[i]
      return !s.available && !s.bufferBlocked && !(myBookedStarts?.has(s.start) ?? false)
    }),
    [slots, myBookedStarts],
  )

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
        {Array.from({ length: 20 }, (_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  if (slots.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No time slots available for this date.
      </p>
    )
  }

  const maxCapacity = Math.max(...slots.map((s) => s.capacity), 1)
  const multiCapacity = maxCapacity > 1
  const hasBuffer = slots.some((s) => s.bufferBlocked)
  const availableCount = slots.filter((s) => s.available).length
  const hasMine = !!myBookedStarts && myBookedStarts.size > 0
  const hasWontFit =
    spanCount > 1 &&
    slots.some((s, i) => s.available && !snapStartFor.has(i) && !(myBookedStarts?.has(s.start) ?? false))
  const groups = groupByPeriod(slots)
  const showTimeRange = spanCount === 1

  /** Derive a cell's merge position (selected span > mine run > booked run). */
  function mergePositionFor(
    globalIndex: number,
    isInSpan: boolean,
    mineRunPos?: string,
    bookedRunPos?: string,
  ): MergePosition | null {
    if (isInSpan && spanCount > 1 && selectedStartIndex !== null) {
      const first = globalIndex === selectedStartIndex
      const last = globalIndex === selectedStartIndex + spanCount - 1
      return { first, last, middle: !first && !last }
    }
    const runPos = mineRunPos ?? bookedRunPos
    if (runPos && runPos !== "only") {
      return { first: runPos === "first", middle: runPos === "middle", last: runPos === "last" }
    }
    return null
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {availableCount} of {slots.length} slots available
        {multiCapacity && ` (up to ${maxCapacity} spaces per slot)`}
        {spanCount > 1 && ` — booking ${bookingDuration} min (${spanCount} cells)`}
      </p>

      {groups.map((group) => (
        <div key={group.label} className="space-y-1.5">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {group.label}
          </h3>
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
            {group.slots.map(({ slot, globalIndex }) => {
              const isInSpan = selectedIndices.has(globalIndex)
              const isMine = myBookedStarts?.has(slot.start) ?? false
              const pct = slot.capacity > 0 ? slot.spotsLeft / slot.capacity : 0
              const lowStock = multiCapacity && pct > 0 && pct <= 0.25
              // Available, but no valid span of the requested length covers it.
              const wontFit = slot.available && !snapStartFor.has(globalIndex) && !isMine

              const mineRun = isMine ? minePosition.get(globalIndex) : undefined
              const isBooked = !slot.available && !slot.bufferBlocked && !isMine
              const bookedRun = isBooked ? bookedPosition.get(globalIndex) : undefined

              const state: SlotVisualState = {
                isMine,
                isMineMulti: !!mineRun && mineRun.pos !== "only",
                isInSpan,
                wontFit,
                available: slot.available,
                bufferBlocked: slot.bufferBlocked,
                lowStock,
              }
              const mergePos = mergePositionFor(globalIndex, isInSpan, mineRun?.pos, bookedRun?.pos)

              return (
                <SlotCell
                  key={slot.start}
                  slot={slot}
                  state={state}
                  mineRun={mineRun}
                  multiCapacity={multiCapacity}
                  showTimeRange={showTimeRange}
                  bookingDuration={bookingDuration}
                  spanCount={spanCount}
                  viewers={viewersForSlot?.(slot.start) ?? 0}
                  isFlashing={flashingSlots?.has(slot.start) ?? false}
                  variantClasses={slotVariantClasses(state)}
                  mergeClasses={mergeRoundingClasses(mergePos)}
                  onSelect={() => {
                    const startIdx = snapStartFor.get(globalIndex) ?? globalIndex
                    onSelectSlot(slots[startIdx], startIdx)
                  }}
                  onCancel={() => onCancelSlot?.(slot)}
                />
              )
            })}
          </div>
        </div>
      ))}

      <SlotGridLegend
        hasWontFit={hasWontFit}
        multiCapacity={multiCapacity}
        hasBuffer={hasBuffer}
        hasMine={hasMine}
        hasFlashing={!!flashingSlots && flashingSlots.size > 0}
      />
    </div>
  )
}

interface SlotGridLegendProps {
  hasWontFit: boolean
  multiCapacity: boolean
  hasBuffer: boolean
  hasMine: boolean
  hasFlashing: boolean
}

/** The colour key beneath the grid. */
function SlotGridLegend({ hasWontFit, multiCapacity, hasBuffer, hasMine, hasFlashing }: SlotGridLegendProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <div className="h-3 w-3 rounded border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950" />
        Available
      </div>
      {hasWontFit && (
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded border border-green-200 bg-green-50 opacity-50 dark:border-green-800 dark:bg-green-950" />
          Won't fit
        </div>
      )}
      {multiCapacity && (
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950" />
          Low
        </div>
      )}
      {hasBuffer && (
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded border border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950" />
          Changeover
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <div className="h-3 w-3 rounded border bg-muted" />
        Full
      </div>
      {hasMine && (
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded border border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950" />
          Your booking
        </div>
      )}
      {hasFlashing && (
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded border border-amber-300 bg-amber-200 animate-slot-flash dark:border-amber-600 dark:bg-amber-800" />
          Someone's looking
        </div>
      )}
    </div>
  )
}
