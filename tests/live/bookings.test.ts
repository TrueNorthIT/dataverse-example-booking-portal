import { describe, it, expect } from "vitest"
import { dv } from "../helpers/dataverse-client.ts"

interface Booking {
  bookableresourcebookingid: string
  name: string
  starttime: string
  endtime: string
  _resource_value: string
}

interface Contact {
  contactid: string
  emailaddress1: string
}

describe("Bookings (bookableresourcebookings)", () => {
  it("today has bookings", async () => {
    const now = new Date()
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()

    const result = await dv.getList<Booking>(
      `bookableresourcebookings?$filter=starttime lt ${dayEnd} and endtime gt ${dayStart} and statecode eq 0&$select=bookableresourcebookingid,name,starttime,endtime,_resource_value`
    )
    expect(result.value.length).toBeGreaterThan(0)
  })

  it("bookings span multiple resources", async () => {
    const now = new Date()
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()

    const result = await dv.getList<Booking>(
      `bookableresourcebookings?$filter=starttime lt ${dayEnd} and endtime gt ${dayStart} and statecode eq 0&$select=_resource_value`
    )

    const uniqueResources = new Set(result.value.map((b) => b._resource_value))
    expect(uniqueResources.size).toBeGreaterThan(1)
  })

  it("traffic contact exists", async () => {
    const result = await dv.getList<Contact>(
      "contacts?$filter=emailaddress1 eq 'demo.traffic@example.com'&$select=contactid,emailaddress1"
    )
    expect(result.value.length).toBeGreaterThanOrEqual(1)
    expect(result.value[0].emailaddress1).toBe("demo.traffic@example.com")
  })
})
