import { describe, it, expect } from "vitest"
import {
  buildRunPositions,
  computeSnapMap,
  computeValidStartIndices,
} from "@/lib/slotGridLayout"
import type { TimeSlot } from "@/lib/availability"

/** Build contiguous hourly slots; `avail` marks each slot available or not. */
function slots(avail: boolean[]): TimeSlot[] {
  return avail.map((available, i) => {
    const start = `2025-01-15T${String(9 + i).padStart(2, "0")}:00:00.000Z`
    const end = `2025-01-15T${String(10 + i).padStart(2, "0")}:00:00.000Z`
    return {
      start,
      end,
      startLabel: "",
      endLabel: "",
      available,
      spotsLeft: available ? 1 : 0,
      capacity: 1,
      bufferBlocked: false,
    }
  })
}

describe("computeValidStartIndices", () => {
  it("treats every available slot as a valid 1-span start", () => {
    const valid = computeValidStartIndices(slots([true, false, true]), 1)
    expect([...valid].sort()).toEqual([0, 2])
  })

  it("requires contiguous available slots for a multi-span", () => {
    // [a a _ a a] with span 2 → starts 0 and 3
    const valid = computeValidStartIndices(slots([true, true, false, true, true]), 2)
    expect([...valid].sort((a, b) => a - b)).toEqual([0, 3])
  })

  it("breaks a span when slots are not time-contiguous", () => {
    const s = slots([true, true])
    s[1].start = "2025-01-15T10:30:00.000Z" // gap from slot 0's end (10:00)
    expect(computeValidStartIndices(s, 2).size).toBe(0)
  })
})

describe("computeSnapMap", () => {
  it("maps each covered cell to the latest valid start", () => {
    // valid starts {0,1}, span 2 → cell 1 covered by both → latest (1) wins
    const map = computeSnapMap(new Set([0, 1]), 2)
    expect(map.get(0)).toBe(0)
    expect(map.get(1)).toBe(1)
    expect(map.get(2)).toBe(1)
  })
})

describe("buildRunPositions", () => {
  it("labels a lone match as 'only'", () => {
    const map = buildRunPositions(slots([true, false, true]), (i) => i === 0)
    expect(map.get(0)).toEqual({ pos: "only", length: 1, indexInRun: 0 })
  })

  it("labels first/middle/last across a contiguous run", () => {
    const map = buildRunPositions(slots([true, true, true]), () => true)
    expect(map.get(0)?.pos).toBe("first")
    expect(map.get(1)?.pos).toBe("middle")
    expect(map.get(2)?.pos).toBe("last")
    expect(map.get(1)?.length).toBe(3)
  })

  it("splits runs at a time gap", () => {
    const s = slots([true, true])
    s[1].start = "2025-01-15T10:30:00.000Z" // not contiguous
    const map = buildRunPositions(s, () => true)
    expect(map.get(0)?.pos).toBe("only")
    expect(map.get(1)?.pos).toBe("only")
  })
})
