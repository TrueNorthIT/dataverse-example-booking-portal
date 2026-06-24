import { describe, it, expect } from "vitest"
import { dv } from "../helpers/dataverse-client.ts"

interface Room {
  bookableresourceid: string
  name: string
  resourcetype: number
}

const EXPECTED_ROOMS = [
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

describe("Rooms (bookableresources)", () => {
  let rooms: Room[]

  it("can fetch rooms from Dataverse", async () => {
    const result = await dv.getList<Room>(
      "bookableresources?$filter=resourcetype eq 7&$select=bookableresourceid,name,resourcetype&$orderby=name"
    )
    rooms = result.value
    expect(rooms.length).toBeGreaterThanOrEqual(EXPECTED_ROOMS.length)
  })

  it("contains all 28 seed rooms", () => {
    const names = rooms.map((r) => r.name)
    for (const expected of EXPECTED_ROOMS) {
      expect(names).toContain(expected)
    }
  })

  it("Armley Leisure Centre is split into Gym, Pool, Studio", () => {
    const armley = rooms.filter((r) => r.name.startsWith("Armley Leisure Centre"))
    const armleyNames = armley.map((r) => r.name)
    expect(armleyNames).toContain("Armley Leisure Centre — Gym")
    expect(armleyNames).toContain("Armley Leisure Centre — Pool")
    expect(armleyNames).toContain("Armley Leisure Centre — Studio")
  })

  it("old unsplit 'Armley Leisure Centre' no longer exists", () => {
    const exact = rooms.find((r) => r.name === "Armley Leisure Centre")
    expect(exact).toBeUndefined()
  })

  it("all rooms are Facility type (7)", () => {
    for (const room of rooms) {
      expect(room.resourcetype).toBe(7)
    }
  })
})
