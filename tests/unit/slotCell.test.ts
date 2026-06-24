import { describe, it, expect } from "vitest"
import { slotVariantClasses, mergeRoundingClasses, slotStateLabel, type SlotVisualState } from "@/lib/slotCell"
import type { TimeSlot } from "@/lib/availability"

const base: SlotVisualState = {
  isMine: false,
  isMineMulti: false,
  isInSpan: false,
  wontFit: false,
  available: true,
  bufferBlocked: false,
  lowStock: false,
}

function slot(p: Partial<TimeSlot> = {}): TimeSlot {
  return {
    start: "s", end: "e", startLabel: "09:00", endLabel: "10:00",
    available: true, spotsLeft: 3, capacity: 5, bufferBlocked: false, ...p,
  }
}

describe("slotVariantClasses (precedence)", () => {
  it("mine wins, with a ring when standalone", () => {
    expect(slotVariantClasses({ ...base, isMine: true })).toContain("bg-blue-50")
    expect(slotVariantClasses({ ...base, isMine: true })).toContain("ring-1")
    expect(slotVariantClasses({ ...base, isMine: true, isMineMulti: true })).not.toContain("ring-1")
  })

  it("selected span beats availability", () => {
    expect(slotVariantClasses({ ...base, isInSpan: true })).toContain("bg-primary")
  })

  it("won't-fit is struck through", () => {
    expect(slotVariantClasses({ ...base, wontFit: true })).toContain("line-through")
  })

  it("available uses amber when low-stock, green otherwise", () => {
    expect(slotVariantClasses({ ...base, lowStock: true })).toContain("bg-amber-50")
    expect(slotVariantClasses(base)).toContain("bg-green-50")
  })

  it("changeover is purple; full is muted", () => {
    expect(slotVariantClasses({ ...base, available: false, bufferBlocked: true })).toContain("bg-purple-50")
    expect(slotVariantClasses({ ...base, available: false })).toContain("bg-muted")
  })
})

describe("mergeRoundingClasses", () => {
  it("is fully rounded when standalone", () => {
    expect(mergeRoundingClasses(null)).toBe("rounded-lg")
  })
  it("rounds the correct side per position", () => {
    expect(mergeRoundingClasses({ first: true, middle: false, last: false })).toContain("rounded-l-lg")
    expect(mergeRoundingClasses({ first: false, middle: true, last: false })).toContain("rounded-none")
    expect(mergeRoundingClasses({ first: false, middle: false, last: true })).toContain("rounded-r-lg")
  })
})

describe("slotStateLabel", () => {
  it("describes each state for screen readers", () => {
    expect(slotStateLabel(slot(), { isMine: true, wontFit: false }, false)).toBe("your booking")
    expect(slotStateLabel(slot(), { isMine: false, wontFit: true }, false)).toBe("won't fit")
    expect(slotStateLabel(slot({ spotsLeft: 2 }), { isMine: false, wontFit: false }, true)).toBe("2 spaces left")
    expect(slotStateLabel(slot(), { isMine: false, wontFit: false }, false)).toBe("available")
    expect(slotStateLabel(slot({ available: false, bufferBlocked: true }), { isMine: false, wontFit: false }, false)).toBe("changeover")
    expect(slotStateLabel(slot({ available: false }), { isMine: false, wontFit: false }, false)).toBe("full")
  })
})
