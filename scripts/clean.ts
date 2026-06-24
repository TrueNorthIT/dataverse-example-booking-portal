/**
 * npm run clean
 *
 * Deletes all seed-created bookings, assignments, rooms, categories,
 * and demo contacts. Pass --force to skip confirmation.
 */

import { dv, batch } from "./helpers/client"
import { logSuccess, logError, logSkip, logHeading, logWarn } from "./helpers/log"

// ── Seed data names (must match seed.ts) ─────────────────────────────────────

const ROOM_NAMES = [
  "Armley Leisure Centre \u2014 Gym", "Armley Leisure Centre \u2014 Pool", "Armley Leisure Centre \u2014 Studio",
  "Fearnville Leisure Centre", "Holt Park Active", "John Charles Centre for Sport",
  "Kirkstall Leisure Centre", "Morley Leisure Centre", "Scott Hall Leisure Centre",
  "Kirkstall Road Recycling Centre", "Seacroft Recycling Centre", "Meanwood Recycling Centre",
  "Middleton Recycling Centre", "Pudsey Recycling Centre",
  "Roundhay Park \u2014 Football Pitch 1", "Roundhay Park \u2014 Football Pitch 2",
  "John Charles 3G Pitch", "Beckett Park \u2014 Cricket Square",
  "Armley Community Hub", "Compton Centre Community Hub", "Reginald Centre Community Hub", "Bramley Community Hub",
  "Leeds Central Library \u2014 Study Room A", "Leeds Central Library \u2014 Meeting Room",
  "Chapel Allerton Library \u2014 Community Room",
  "Leeds Register Office \u2014 Births & Deaths",
  "Leeds Register Office \u2014 Marriages & Civil Partnerships",
  "Leeds Register Office \u2014 Citizenship Ceremonies",
]

const LEGACY_ROOM_NAMES = ["Armley Leisure Centre"]

const CATEGORY_NAMES = [
  "Leisure Centre", "Recycling Centre", "Sports Pitch",
  "Community Hub", "Library", "Register Office",
]

const CITIZEN_EMAILS = [
  "sarah.johnson@example.com",
  "james.wilson@example.com",
  "priya.patel@example.com",
  "steve@drakey.co.uk",
  "demo.traffic@example.com",
]

// ── Main ─────────────────────────────────────────────────────────────────────

async function runClean() {
  if (!process.argv.includes("--force")) {
    const readline = await import("readline")
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    const answer = await new Promise<string>((resolve) =>
      rl.question(
        "This will DELETE all seed-created bookings, assignments, rooms, categories, and demo contacts. Continue? (y/N) ",
        resolve
      )
    )
    rl.close()
    if (answer.toLowerCase() !== "y") {
      console.log("Aborted.")
      process.exit(0)
    }
  }

  const roomNames = new Set([...ROOM_NAMES, ...LEGACY_ROOM_NAMES])
  const categoryNames = new Set(CATEGORY_NAMES)
  const citizenEmails = new Set(CITIZEN_EMAILS)

  // 1. Find seed rooms
  logHeading("── Finding seed rooms ────────────────────────────")
  const rooms = await dv.getList<{
    bookableresourceid: string
    name: string
  }>("bookableresources?$filter=resourcetype eq 7&$select=bookableresourceid,name")
  const seedRooms = rooms.value.filter((r) => roomNames.has(r.name))
  const seedRoomIds = new Set(seedRooms.map((r) => r.bookableresourceid))
  logSuccess(`  Found ${seedRooms.length} seed rooms`)

  // 1b. Find seed contacts
  logHeading("── Finding seed contacts ─────────────────────────")
  const contacts = await dv.getList<{
    contactid: string
    emailaddress1: string
    firstname: string
    lastname: string
  }>("contacts?$select=contactid,emailaddress1,firstname,lastname")
  const seedContacts = contacts.value.filter((c) => citizenEmails.has(c.emailaddress1))
  logSuccess(`  Found ${seedContacts.length} seed contacts`)

  // 2a. Find bookings on seed rooms
  logHeading("── Finding Bookings ──────────────────────────────")
  const allBookingIds: { id: string; name: string }[] = []
  const bookingFetches = await batch(
    seedRooms.map((room) => async () => {
      const bookings = await dv.getList<{
        bookableresourcebookingid: string
        name: string
      }>(
        `bookableresourcebookings?$filter=_resource_value eq ${room.bookableresourceid}&$select=bookableresourcebookingid,name`
      )
      return bookings.value.map((b) => ({ id: b.bookableresourcebookingid, name: b.name }))
    })
  )
  for (const r of bookingFetches) {
    if (r.status === "fulfilled") allBookingIds.push(...r.value)
  }
  logSuccess(`  Found ${allBookingIds.length} bookings across seed rooms`)

  // 2b. Delete CSBs
  logHeading("── Deleting Citizen Service Bookings ─────────────")
  try {
    const csbFilters: string[] = []
    if (seedContacts.length > 0) {
      csbFilters.push(
        ...seedContacts.map((c) => `_tn_citizen_value eq ${c.contactid}`)
      )
    }
    if (allBookingIds.length > 0) {
      csbFilters.push(
        ...allBookingIds.map((b) => `_tn_booking_value eq ${b.id}`)
      )
    }

    if (csbFilters.length > 0) {
      const csbIds = new Set<string>()
      for (let i = 0; i < csbFilters.length; i += 15) {
        const chunk = csbFilters.slice(i, i + 15).join(" or ")
        const csbs = await dv.getList<{
          tn_citizenservicebookingid: string
          tn_name: string
        }>(
          `tn_citizenservicebookings?$filter=${encodeURIComponent(chunk)}&$select=tn_citizenservicebookingid,tn_name`
        )
        for (const csb of csbs.value) csbIds.add(csb.tn_citizenservicebookingid)
      }
      logSuccess(`  Found ${csbIds.size} citizen service bookings to delete`)

      const csbDelResults = await batch(
        [...csbIds].map((id) => async () => {
          await dv.del(`tn_citizenservicebookings(${id})`)
          return id
        })
      )
      let csbOk = 0, csbFail = 0
      for (const r of csbDelResults) {
        if (r.status === "fulfilled") csbOk++
        else { csbFail++; logError(`  CSB delete failed: ${r.reason}`) }
      }
      logSuccess(`  ${csbOk} deleted, ${csbFail} failed`)
    } else {
      logSkip("  No filters \u2014 skipping")
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : ""
    if (msg.includes("EntityDefinitions") || msg.includes("does not exist") || msg.includes("0x80060888")) {
      logSkip("  Entity tn_citizenservicebooking not found \u2014 skipping")
    } else {
      logWarn(`  CSB cleanup failed: ${msg}`)
    }
  }

  // 2c. Delete bookings
  logHeading("── Deleting Bookings ─────────────────────────────")
  logSuccess(`  ${allBookingIds.length} bookings to delete`)
  const bookingDelResults = await batch(
    allBookingIds.map((b) => async () => {
      await dv.del(`bookableresourcebookings(${b.id})`)
      return b.name
    })
  )
  let delOk = 0, delFail = 0
  for (const r of bookingDelResults) {
    if (r.status === "fulfilled") { delOk++; logWarn(`  Deleted: ${r.value}`) }
    else { delFail++; logError(`  Failed: ${r.reason}`) }
  }
  logSuccess(`  ${delOk} deleted, ${delFail} failed`)

  // 3. Delete category assignments
  logHeading("── Deleting Category Assignments ─────────────────")
  const assns = await dv.getList<{
    bookableresourcecategoryassnid: string
    _resource_value: string
  }>("bookableresourcecategoryassns?$select=bookableresourcecategoryassnid,_resource_value")
  const seedAssns = assns.value.filter((a) => seedRoomIds.has(a._resource_value))
  logSuccess(`  Found ${seedAssns.length} assignments to delete`)

  const assnDelResults = await batch(
    seedAssns.map((a) => async () => {
      await dv.del(`bookableresourcecategoryassns(${a.bookableresourcecategoryassnid})`)
      return a.bookableresourcecategoryassnid
    })
  )
  let assnOk = 0
  for (const r of assnDelResults) {
    if (r.status === "fulfilled") assnOk++
    else logError(`  Failed: ${r.reason}`)
  }
  logWarn(`  ${assnOk} deleted`)

  // 4. Delete rooms
  logHeading("── Deleting Rooms ────────────────────────────────")
  const roomDelResults = await batch(
    seedRooms.map((r) => async () => {
      await dv.del(`bookableresources(${r.bookableresourceid})`)
      return r.name
    })
  )
  for (const r of roomDelResults) {
    if (r.status === "fulfilled") logWarn(`  Deleted: ${r.value}`)
    else logError(`  Failed: ${r.reason}`)
  }

  // 5. Delete categories
  logHeading("── Deleting Categories ───────────────────────────")
  const cats = await dv.getList<{
    bookableresourcecategoryid: string
    name: string
  }>("bookableresourcecategories?$select=bookableresourcecategoryid,name")
  const seedCats = cats.value.filter((c) => categoryNames.has(c.name))

  const catDelResults = await batch(
    seedCats.map((c) => async () => {
      await dv.del(`bookableresourcecategories(${c.bookableresourcecategoryid})`)
      return c.name
    })
  )
  for (const r of catDelResults) {
    if (r.status === "fulfilled") logWarn(`  Deleted: ${r.value}`)
    else logError(`  Failed: ${r.reason}`)
  }

  // 6. Delete demo contacts
  logHeading("── Deleting Demo Contacts ────────────────────────")
  const contactDelResults = await batch(
    seedContacts.map((c) => async () => {
      await dv.del(`contacts(${c.contactid})`)
      return `${c.firstname} ${c.lastname}`
    })
  )
  for (const r of contactDelResults) {
    if (r.status === "fulfilled") logWarn(`  Deleted: ${r.value}`)
    else logError(`  Failed: ${r.reason}`)
  }

  logHeading("══════════════════════════════════════════════════")
  logSuccess("  Clean complete! (Publisher, solution, and columns left in place)")
}

runClean().catch((err) => {
  logError(`Clean failed: ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})
