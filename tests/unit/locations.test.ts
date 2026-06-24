import { describe, it, expect } from "vitest"
import {
  haversineDistance,
  formatDistance,
  RESOURCE_LOCATIONS,
  PERSONA_LOCATIONS,
  type LatLng,
} from "@/lib/locations"

describe("haversineDistance", () => {
  it("returns 0 for the same point", () => {
    const p: LatLng = { lat: 53.8, lng: -1.55 }
    expect(haversineDistance(p, p)).toBe(0)
  })

  it("Leeds City Centre to Headingley ≈ 1.5-2.5 mi", () => {
    const cityCentre: LatLng = { lat: 53.801, lng: -1.549 }
    const headingley: LatLng = { lat: 53.819, lng: -1.582 }
    const d = haversineDistance(cityCentre, headingley)
    expect(d).toBeGreaterThan(1)
    expect(d).toBeLessThan(3)
  })

  it("Leeds to York ≈ 23-27 mi", () => {
    const leeds: LatLng = { lat: 53.801, lng: -1.549 }
    const york: LatLng = { lat: 53.958, lng: -1.082 }
    const d = haversineDistance(leeds, york)
    expect(d).toBeGreaterThan(20)
    expect(d).toBeLessThan(30)
  })

  it("is symmetric", () => {
    const a: LatLng = { lat: 53.8, lng: -1.55 }
    const b: LatLng = { lat: 53.85, lng: -1.5 }
    expect(haversineDistance(a, b)).toBeCloseTo(haversineDistance(b, a), 10)
  })
})

describe("formatDistance", () => {
  it("shows '<0.1 mi' for very short distances", () => {
    expect(formatDistance(0)).toBe("<0.1 mi")
    expect(formatDistance(0.05)).toBe("<0.1 mi")
    expect(formatDistance(0.099)).toBe("<0.1 mi")
  })

  it("formats to 1 decimal place", () => {
    expect(formatDistance(1.234)).toBe("1.2 mi")
    expect(formatDistance(0.5)).toBe("0.5 mi")
    expect(formatDistance(10)).toBe("10.0 mi")
  })

  it("rounds correctly at boundary", () => {
    expect(formatDistance(0.1)).toBe("0.1 mi")
    expect(formatDistance(0.16)).toBe("0.2 mi")
  })
})

describe("RESOURCE_LOCATIONS coverage", () => {
  const SEED_ROOMS = [
    "Armley Leisure Centre — Gym",
    "Armley Leisure Centre — Pool",
    "Armley Leisure Centre — Studio",
    "Fearnville Leisure Centre",
    "Holt Park Active",
    "John Charles Centre for Sport",
    "Kirkstall Leisure Centre",
    "Morley Leisure Centre",
    "Scott Hall Leisure Centre",
    "Kirkstall Road Recycling Centre",
    "Seacroft Recycling Centre",
    "Meanwood Recycling Centre",
    "Middleton Recycling Centre",
    "Pudsey Recycling Centre",
    "Roundhay Park — Football Pitch 1",
    "Roundhay Park — Football Pitch 2",
    "John Charles 3G Pitch",
    "Beckett Park — Cricket Square",
    "Armley Community Hub",
    "Compton Centre Community Hub",
    "Reginald Centre Community Hub",
    "Bramley Community Hub",
    "Leeds Central Library — Study Room A",
    "Leeds Central Library — Meeting Room",
    "Chapel Allerton Library — Community Room",
    "Leeds Register Office — Births & Deaths",
    "Leeds Register Office — Marriages & Civil Partnerships",
    "Leeds Register Office — Citizenship Ceremonies",
  ]

  it("every seed room has a location entry", () => {
    for (const name of SEED_ROOMS) {
      expect(RESOURCE_LOCATIONS[name], `Missing location for: ${name}`).toBeDefined()
    }
  })

  it("all coordinates are within Leeds area", () => {
    for (const [name, loc] of Object.entries(RESOURCE_LOCATIONS)) {
      expect(loc.lat, `${name} lat out of range`).toBeGreaterThan(53.7)
      expect(loc.lat, `${name} lat out of range`).toBeLessThan(53.9)
      expect(loc.lng, `${name} lng out of range`).toBeGreaterThan(-1.7)
      expect(loc.lng, `${name} lng out of range`).toBeLessThan(-1.4)
    }
  })
})

describe("PERSONA_LOCATIONS", () => {
  it("has entries for all demo personas", () => {
    expect(PERSONA_LOCATIONS["sarah-johnson"]).toBeDefined()
    expect(PERSONA_LOCATIONS["james-wilson"]).toBeDefined()
    expect(PERSONA_LOCATIONS["priya-patel"]).toBeDefined()
    expect(PERSONA_LOCATIONS["steve-drake"]).toBeDefined()
  })

  it("each persona has area, lat, lng", () => {
    for (const [id, loc] of Object.entries(PERSONA_LOCATIONS)) {
      expect(loc.area, `${id} missing area`).toBeTruthy()
      expect(typeof loc.lat, `${id} lat`).toBe("number")
      expect(typeof loc.lng, `${id} lng`).toBe("number")
    }
  })
})
