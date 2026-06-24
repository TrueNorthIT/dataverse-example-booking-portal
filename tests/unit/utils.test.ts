import { describe, it, expect } from "vitest"
import { cn, formatDuration } from "@/lib/utils"

describe("cn", () => {
  it("joins truthy class values, dropping falsy ones", () => {
    const hidden = false as boolean
    expect(cn("a", hidden && "b", "c")).toBe("a c")
  })

  it("merges conflicting tailwind classes (last wins)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4")
  })
})

describe("formatDuration", () => {
  it("formats sub-hour durations in minutes", () => {
    expect(formatDuration(30)).toBe("30 min")
  })

  it("formats whole hours", () => {
    expect(formatDuration(60)).toBe("1 hour")
    expect(formatDuration(120)).toBe("2 hours")
  })

  it("formats half-hour overflows", () => {
    expect(formatDuration(90)).toBe("1½ hours")
  })
})
