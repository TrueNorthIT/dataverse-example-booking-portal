import { describe, it, expect } from "vitest"
import {
  getCategoryMeta,
  categoryMatchesSearch,
  getCategoryDurationConfig,
  getGridResolution,
  SERVICE_TYPE_BY_CATEGORY,
} from "@/lib/categoryMeta"
import { ServicebookingTnServicetype } from "@/types/generated"

describe("getCategoryMeta", () => {
  it("returns specific meta for a known category", () => {
    expect(getCategoryMeta("Leisure Centre").durationOptions).toEqual([60])
  })

  it("falls back for an unknown category", () => {
    const meta = getCategoryMeta("Unknown")
    expect(meta.color).toBe("bg-muted")
    expect(meta.durationOptions).toBeUndefined()
  })
})

describe("categoryMatchesSearch", () => {
  it("matches everything for an empty query", () => {
    expect(categoryMatchesSearch("Leisure Centre", "")).toBe(true)
  })

  it("matches on the category name (case-insensitive)", () => {
    expect(categoryMatchesSearch("Recycling Centre", "recyc")).toBe(true)
  })

  it("matches on a comma-separated alias", () => {
    expect(categoryMatchesSearch("Recycling Centre", "tip", "skip, tip, dump")).toBe(true)
  })

  it("returns false when neither name nor aliases match", () => {
    expect(categoryMatchesSearch("Library", "swimming", "books")).toBe(false)
  })
})

describe("duration config", () => {
  it("returns a category's options and default", () => {
    expect(getCategoryDurationConfig("Sports Pitch")).toEqual({
      options: [60, 90, 120],
      defaultDuration: 60,
    })
  })

  it("defaults to 30 minutes for an unknown/missing category", () => {
    expect(getCategoryDurationConfig()).toEqual({ options: [30], defaultDuration: 30 })
  })

  it("computes grid resolution as the GCD of duration options", () => {
    expect(getGridResolution("Sports Pitch")).toBe(30) // gcd(60,90,120)
    expect(getGridResolution("Community Hub")).toBe(60) // gcd(60,120)
    expect(getGridResolution()).toBe(30)
  })
})

describe("SERVICE_TYPE_BY_CATEGORY", () => {
  it("maps display names to tn_servicetype enum values", () => {
    expect(SERVICE_TYPE_BY_CATEGORY["Venue Hire"]).toBe(ServicebookingTnServicetype.VenueHire)
    expect(SERVICE_TYPE_BY_CATEGORY["Leisure Centre"]).toBe(ServicebookingTnServicetype.Leisure)
  })
})
