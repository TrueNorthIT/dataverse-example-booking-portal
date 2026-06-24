import { describe, it, expect } from "vitest"
import {
  getVenueRoom,
  getHireRate,
  getRoomCapacity,
  getRoomFeatures,
  getRoomAddOns,
  featureLabel,
  ratePerHourPence,
  hirePricePence,
  addOnPricePence,
  addOnsPricePence,
  calculateBookingPrice,
  formatGBP,
  KITCHEN,
  type HireRate,
} from "@/lib/pricing"

const ALEXANDRA = "Morley Town Hall — Alexandra Hall" // standard 62.5, ticketed 78.13, kitchen add-on

describe("room lookups", () => {
  it("returns room data for a known venue", () => {
    expect(getVenueRoom(ALEXANDRA)?.capacity).toBe(650)
    expect(getRoomCapacity(ALEXANDRA)).toBe(650)
    expect(getHireRate(ALEXANDRA)).toEqual({ standard: 62.5, ticketed: 78.13 })
    expect(getRoomFeatures(ALEXANDRA)).toContain("kitchen")
    expect(getRoomAddOns(ALEXANDRA)).toContainEqual(KITCHEN)
  })

  it("returns undefined / empty for unknown or missing names", () => {
    expect(getVenueRoom(undefined)).toBeUndefined()
    expect(getHireRate("Nope")).toBeUndefined()
    expect(getRoomCapacity("Nope")).toBeUndefined()
    expect(getRoomFeatures("Nope")).toEqual([])
    expect(getRoomAddOns("Nope")).toEqual([])
  })

  it("maps a feature key to its label", () => {
    expect(featureLabel("kitchen")).toBe("Kitchen")
  })
})

describe("price maths (pence)", () => {
  const rate: HireRate = { standard: 60, ticketed: 90 }

  it("converts per-hour rate to pence by ticket choice", () => {
    expect(ratePerHourPence(rate, false)).toBe(6000)
    expect(ratePerHourPence(rate, true)).toBe(9000)
  })

  it("prices hire by duration", () => {
    expect(hirePricePence(rate, false, 120)).toBe(12000)
    expect(hirePricePence(rate, false, 30)).toBe(3000)
  })

  it("prices add-ons individually and combined", () => {
    const a = { key: "k", label: "Kitchen", rate: 10 }
    const b = { key: "w", label: "Wet room", rate: 20 }
    expect(addOnPricePence(a, 60)).toBe(1000)
    expect(addOnsPricePence([a, b], 60)).toBe(3000)
  })

  it("calculateBookingPrice sums hire + add-ons", () => {
    const addOns = [{ key: "k", label: "Kitchen", rate: 10 }]
    expect(calculateBookingPrice(rate, false, 60, addOns)).toEqual({
      hirePence: 6000,
      addOnsPence: 1000,
      amountPence: 7000,
    })
  })

  it("calculateBookingPrice is all-zero for a free service (no rate)", () => {
    expect(calculateBookingPrice(undefined, false, 60, [])).toEqual({
      hirePence: 0,
      addOnsPence: 0,
      amountPence: 0,
    })
  })

  it("formats pence as GBP", () => {
    expect(formatGBP(7000)).toBe("£70.00")
    expect(formatGBP(1563)).toBe("£15.63")
  })
})
