import { describe, it, expect } from "vitest"
import { dv } from "../helpers/dataverse-client.ts"

interface Category {
  bookableresourcecategoryid: string
  name: string
  description: string
}

const EXPECTED_CATEGORIES = [
  { name: "Leisure Centre", description: "Gym sessions, swimming, fitness classes and sports facilities" },
  { name: "Recycling Centre", description: "Household waste recycling centre booking slots" },
  { name: "Sports Pitch", description: "Football, rugby and cricket pitch hire" },
  { name: "Community Hub", description: "Community hub room and event space bookings" },
  { name: "Library", description: "Library study rooms, meeting rooms and event spaces" },
  { name: "Register Office", description: "Appointments for births, deaths, marriages and citizenship" },
]

describe("Categories (bookableresourcecategories)", () => {
  let categories: Category[]

  it("can fetch categories from Dataverse", async () => {
    const result = await dv.getList<Category>(
      "bookableresourcecategories?$select=bookableresourcecategoryid,name,description&$orderby=name"
    )
    categories = result.value
    expect(categories.length).toBeGreaterThanOrEqual(6)
  })

  it("all 6 seed categories exist", () => {
    const names = categories.map((c) => c.name)
    for (const expected of EXPECTED_CATEGORIES) {
      expect(names).toContain(expected.name)
    }
  })

  it("categories have correct descriptions", () => {
    for (const expected of EXPECTED_CATEGORIES) {
      const cat = categories.find((c) => c.name === expected.name)
      expect(cat).toBeDefined()
      expect(cat!.description).toBe(expected.description)
    }
  })
})
