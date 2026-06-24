/**
 * Pure layout maths for the availability slot grid — which start positions can
 * begin a multi-slot span, where a tap "snaps" to, and how contiguous runs of
 * cells should be rounded (first/middle/last/only). Extracted from
 * AvailabilitySlotGrid so the carousel/grid geometry is testable in isolation.
 */
import type { TimeSlot } from "@/lib/availability"

/** Position of a cell within a contiguous run of matching cells. */
export interface RunPos {
  pos: "first" | "middle" | "last" | "only"
  length: number
  indexInRun: number
}

/**
 * Indices that can start a `spanCount`-long booking: every slot in the span
 * must be available and time-contiguous (each slot's start equals the previous
 * slot's end).
 */
export function computeValidStartIndices(
  slots: TimeSlot[],
  spanCount: number
): Set<number> {
  const valid = new Set<number>()
  for (let i = 0; i <= slots.length - spanCount; i++) {
    let ok = true
    for (let j = 0; j < spanCount; j++) {
      const s = slots[i + j]
      if (!s.available) {
        ok = false
        break
      }
      if (j > 0 && s.start !== slots[i + j - 1].end) {
        ok = false
        break
      }
    }
    if (ok) valid.add(i)
  }
  return valid
}

/**
 * Map every index covered by a valid span to the latest valid start that
 * includes it, so tapping a cell snaps backward to fill the span.
 */
export function computeSnapMap(
  validStartIndices: Set<number>,
  spanCount: number
): Map<number, number> {
  const map = new Map<number, number>()
  for (const start of validStartIndices) {
    for (let j = 0; j < spanCount; j++) {
      // Latest valid start wins — overwrites earlier ones.
      map.set(start + j, start)
    }
  }
  return map
}

/**
 * Group cells matching `predicate` into contiguous, time-continuous runs and
 * return each cell's position within its run (for rounded-corner styling).
 */
export function buildRunPositions(
  slots: TimeSlot[],
  predicate: (index: number) => boolean
): Map<number, RunPos> {
  const map = new Map<number, RunPos>()
  const runs: number[][] = []
  let current: number[] = []

  for (let i = 0; i < slots.length; i++) {
    if (predicate(i)) {
      if (current.length > 0) {
        const prev = current[current.length - 1]
        if (slots[i].start !== slots[prev].end) {
          runs.push(current)
          current = []
        }
      }
      current.push(i)
    } else if (current.length > 0) {
      runs.push(current)
      current = []
    }
  }
  if (current.length > 0) runs.push(current)

  for (const run of runs) {
    const len = run.length
    if (len === 1) {
      map.set(run[0], { pos: "only", length: len, indexInRun: 0 })
    } else {
      map.set(run[0], { pos: "first", length: len, indexInRun: 0 })
      for (let i = 1; i < len - 1; i++) {
        map.set(run[i], { pos: "middle", length: len, indexInRun: i })
      }
      map.set(run[len - 1], { pos: "last", length: len, indexInRun: len - 1 })
    }
  }
  return map
}
