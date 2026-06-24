/**
 * npm run seed
 *
 * Creates contacts, categories, rooms, work hours, category assignments,
 * bookings, and CSB records. Idempotent — safe to re-run.
 */

import { dv, batch } from "./helpers/client"
import { logSuccess, logError, logSkip, logHeading, logWarn } from "./helpers/log"

// ── Constants ────────────────────────────────────────────────────────────────

const CSB_STATUS = {
  Requested: 888000000,
  Confirmed: 888000001,
  InProgress: 888000002,
  Completed: 888000003,
  Cancelled: 888000004,
} as const

const SERVICE_TYPE_BY_CATEGORY: Record<string, number> = {
  "Leisure Centre": 888000000,
  "Recycling Centre": 888000001,
  "Sports Pitch": 888000002,
  "Community Hub": 888000003,
  "Library": 888000004,
  "Register Office": 888000005,
  "Venue Hire": 888000006,
}

interface DemoPersona {
  id: string
  name: string
  email: string
}

const CITIZEN_PERSONAS: DemoPersona[] = [
  { id: "sarah-johnson", name: "Sarah Johnson", email: "sarah.johnson@example.com" },
  { id: "james-wilson", name: "James Wilson", email: "james.wilson@example.com" },
  { id: "priya-patel", name: "Priya Patel", email: "priya.patel@example.com" },
  { id: "steve-drake", name: "Steve Drake", email: "steve@drakey.co.uk" },
]

const TRAFFIC_CONTACT = {
  firstname: "Demo",
  lastname: "Traffic",
  email: "demo.traffic@example.com",
}

const CATEGORIES = [
  { name: "Leisure Centre", description: "Gym sessions, swimming, fitness classes and sports facilities", bufferMinutes: 0, slotDurationMins: 60, searchAliases: "gym,swim,swimming,pool,fitness,exercise,sport,weights,yoga,pilates,spin,aerobics,classes" },
  { name: "Recycling Centre", description: "Household waste recycling centre booking slots", bufferMinutes: 0, slotDurationMins: 30, searchAliases: "skip,tip,dump,rubbish,waste,bin,refuse,disposal,drop off,drop-off,junk" },
  { name: "Sports Pitch", description: "Football, rugby and cricket pitch hire", bufferMinutes: 15, slotDurationMins: 60, searchAliases: "football,rugby,cricket,pitch,field,5-a-side,kick about,match,training" },
  { name: "Community Hub", description: "Community hub room and event space bookings", bufferMinutes: 0, slotDurationMins: 60, searchAliases: "community,hall,meeting,event,workshop,group,class,club,room hire" },
  { name: "Library", description: "Library study rooms, meeting rooms and event spaces", bufferMinutes: 0, slotDurationMins: 60, searchAliases: "book,books,reading,study,study room,quiet,revision" },
  { name: "Register Office", description: "Appointments for births, deaths, marriages and citizenship", bufferMinutes: 0, slotDurationMins: 30, searchAliases: "birth,death,marriage,wedding,certificate,citizenship,civil partnership,registrar,registry" },
  { name: "Venue Hire", description: "Hire halls, community centres and school halls for events, weddings, meetings and parties", bufferMinutes: 30, slotDurationMins: 60, searchAliases: "venue,hall,halls,room hire,hire,space,school hall,town hall,community centre,community hall,wedding,weddings,party,parties,event,events,meeting,function,conference,performance,playgroup,christening,celebration,reception" },
]

const ROOMS = [
  { name: "Armley Leisure Centre \u2014 Gym", description: "", timezone: 85, category: "Leisure Centre", capacity: 30 },
  { name: "Armley Leisure Centre \u2014 Pool", description: "", timezone: 85, category: "Leisure Centre", capacity: 20 },
  { name: "Armley Leisure Centre \u2014 Studio", description: "", timezone: 85, category: "Leisure Centre", capacity: 15 },
  { name: "Fearnville Leisure Centre", description: "", timezone: 85, category: "Leisure Centre", capacity: 30 },
  { name: "Holt Park Active", description: "", timezone: 85, category: "Leisure Centre", capacity: 25 },
  { name: "John Charles Centre for Sport", description: "", timezone: 85, category: "Leisure Centre", capacity: 40 },
  { name: "Kirkstall Leisure Centre", description: "", timezone: 85, category: "Leisure Centre", capacity: 30 },
  { name: "Morley Leisure Centre", description: "", timezone: 85, category: "Leisure Centre", capacity: 25 },
  { name: "Scott Hall Leisure Centre", description: "", timezone: 85, category: "Leisure Centre", capacity: 20 },
  { name: "Kirkstall Road Recycling Centre", description: "", timezone: 85, category: "Recycling Centre", capacity: 20, fridayCapacity: 8 },
  { name: "Seacroft Recycling Centre", description: "", timezone: 85, category: "Recycling Centre", capacity: 20, fridayCapacity: 8 },
  { name: "Meanwood Recycling Centre", description: "", timezone: 85, category: "Recycling Centre", capacity: 15, fridayCapacity: 6 },
  { name: "Middleton Recycling Centre", description: "", timezone: 85, category: "Recycling Centre", capacity: 15, fridayCapacity: 6 },
  { name: "Pudsey Recycling Centre", description: "", timezone: 85, category: "Recycling Centre", capacity: 15, fridayCapacity: 6 },
  { name: "Roundhay Park \u2014 Football Pitch 1", description: "", timezone: 85, category: "Sports Pitch", capacity: 1 },
  { name: "Roundhay Park \u2014 Football Pitch 2", description: "", timezone: 85, category: "Sports Pitch", capacity: 1 },
  { name: "John Charles 3G Pitch", description: "", timezone: 85, category: "Sports Pitch", capacity: 1 },
  { name: "Beckett Park \u2014 Cricket Square", description: "", timezone: 85, category: "Sports Pitch", capacity: 1 },
  { name: "Armley Community Hub", description: "", timezone: 85, category: "Community Hub", capacity: 1 },
  { name: "Compton Centre Community Hub", description: "", timezone: 85, category: "Community Hub", capacity: 1 },
  { name: "Reginald Centre Community Hub", description: "", timezone: 85, category: "Community Hub", capacity: 1 },
  { name: "Bramley Community Hub", description: "", timezone: 85, category: "Community Hub", capacity: 1 },
  { name: "Leeds Central Library \u2014 Study Room A", description: "", timezone: 85, category: "Library", capacity: 4 },
  { name: "Leeds Central Library \u2014 Meeting Room", description: "", timezone: 85, category: "Library", capacity: 12 },
  { name: "Chapel Allerton Library \u2014 Community Room", description: "", timezone: 85, category: "Library", capacity: 1 },
  { name: "Leeds Register Office \u2014 Births & Deaths", description: "", timezone: 85, category: "Register Office", capacity: 1 },
  { name: "Leeds Register Office \u2014 Marriages & Civil Partnerships", description: "", timezone: 85, category: "Register Office", capacity: 1 },
  { name: "Leeds Register Office \u2014 Citizenship Ceremonies", description: "", timezone: 85, category: "Register Office", capacity: 1 },
  { name: "Morley Town Hall \u2014 Alexandra Hall", description: "Grade I listed main hall, 650 seated / 350 for dances", timezone: 85, category: "Venue Hire", capacity: 1, hourlyRate: 62.50, hourlyRateTicketed: 78.13 },
  { name: "Morley Town Hall \u2014 Morleian Hall", description: "Function room for up to 150 people", timezone: 85, category: "Venue Hire", capacity: 1, hourlyRate: 31.25, hourlyRateTicketed: 31.25 },
  { name: "Morley Town Hall \u2014 Large Banqueting Hall", description: "Banqueting room for up to 90 people", timezone: 85, category: "Venue Hire", capacity: 1, hourlyRate: 31.25, hourlyRateTicketed: 31.25 },
  { name: "Morley Town Hall \u2014 Small Banqueting Hall", description: "Banqueting room for up to 40 people", timezone: 85, category: "Venue Hire", capacity: 1, hourlyRate: 18.75, hourlyRateTicketed: 18.75 },
  { name: "Blackburn Hall, Rothwell \u2014 Main Hall", description: "Theatre-style main hall, 300 seated, with stage", timezone: 85, category: "Venue Hire", capacity: 1, hourlyRate: 31.25, hourlyRateTicketed: 78.13 },
  { name: "Blackburn Hall, Rothwell \u2014 Supper Room", description: "Supper room for up to 40 people", timezone: 85, category: "Venue Hire", capacity: 1, hourlyRate: 22.50, hourlyRateTicketed: 22.50 },
  { name: "Mandela Centre \u2014 Main Hall", description: "Community hall in Chapeltown", timezone: 85, category: "Venue Hire", capacity: 1, hourlyRate: 31.25, hourlyRateTicketed: 31.25 },
  { name: "Strawberry Lane Community Centre \u2014 Hall", description: "Community hall in Armley", timezone: 85, category: "Venue Hire", capacity: 1, hourlyRate: 15.63, hourlyRateTicketed: 15.63 },
  { name: "Denis Healey Centre \u2014 Hall", description: "Community hall in Seacroft", timezone: 85, category: "Venue Hire", capacity: 1, hourlyRate: 15.63, hourlyRateTicketed: 15.63 },
  { name: "Stephen Longfellow Academy \u2014 School Hall", description: "School hall available for term-time and holiday lettings", timezone: 85, category: "Venue Hire", capacity: 1, hourlyRate: 18.75, hourlyRateTicketed: 18.75 },
] as const

// ── Booking generators ───────────────────────────────────────────────────────

/**
 * For seeded Venue Hire bookings, record a realistic paid amount + reference so
 * the demo data looks like it went through payment. Free categories return {}.
 */
function seedPaymentFields(roomName: string, durationMins: number, seedIndex: number): Record<string, unknown> {
  const room = ROOMS.find((r) => r.name === roomName) as
    | (typeof ROOMS[number] & { hourlyRate?: number })
    | undefined
  if (!room || room.category !== "Venue Hire" || room.hourlyRate == null) return {}
  const amount = Math.round(room.hourlyRate * (durationMins / 60) * 100) / 100
  return {
    tn_amountpaid: amount,
    tn_sellingtickets: false,
    tn_paymentreference: `pi_seed_${seedIndex}`,
  }
}

function generateBookings(
  roomMap: Record<string, string>,
  scheduledStatusId: string,
  contactMap: Record<string, string>
) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  function day(offset: number) {
    const d = new Date(today)
    d.setDate(d.getDate() + offset)
    return d
  }

  function slot(dayOffset: number, startHour: number, durationMins: number) {
    const start = day(dayOffset)
    start.setHours(startHour, 0, 0, 0)
    const end = new Date(start.getTime() + durationMins * 60 * 1000)
    return { starttime: start.toISOString(), endtime: end.toISOString(), duration: durationMins }
  }

  const defs = [
    { roomName: "Armley Leisure Centre \u2014 Gym", ...slot(0, 7, 60), title: "Early Bird Gym Session" },
    { roomName: "Fearnville Leisure Centre", ...slot(0, 9, 60), title: "Lane Swimming" },
    { roomName: "John Charles Centre for Sport", ...slot(0, 12, 60), title: "Lunchtime Gym Session" },
    { roomName: "Kirkstall Leisure Centre", ...slot(0, 18, 60), title: "Spin Class" },
    { roomName: "Kirkstall Road Recycling Centre", ...slot(0, 10, 30), title: "Drop-off Slot" },
    { roomName: "Seacroft Recycling Centre", ...slot(0, 14, 30), title: "Drop-off Slot" },
    { roomName: "Armley Community Hub", ...slot(0, 10, 120), title: "Knit & Natter Group" },
    { roomName: "Compton Centre Community Hub", ...slot(0, 14, 60), title: "Job Club Drop-in" },
    { roomName: "Leeds Central Library \u2014 Study Room A", ...slot(0, 9, 180), title: "Study Session" },
    { roomName: "Leeds Central Library \u2014 Meeting Room", ...slot(0, 14, 60), title: "Reading Group" },
    { roomName: "Leeds Register Office \u2014 Births & Deaths", ...slot(0, 10, 30), title: "Birth Registration" },
    { roomName: "Leeds Register Office \u2014 Births & Deaths", ...slot(0, 11, 30), title: "Death Registration" },
    { roomName: "Holt Park Active", ...slot(1, 7, 60), title: "Aqua Aerobics" },
    { roomName: "Morley Leisure Centre", ...slot(1, 9, 60), title: "Over 50s Swim" },
    { roomName: "John Charles Centre for Sport", ...slot(1, 17, 60), title: "Evening Gym Session" },
    { roomName: "Meanwood Recycling Centre", ...slot(1, 9, 30), title: "Drop-off Slot" },
    { roomName: "Middleton Recycling Centre", ...slot(1, 11, 30), title: "Drop-off Slot" },
    { roomName: "Roundhay Park \u2014 Football Pitch 1", ...slot(1, 19, 90), title: "5-a-side League Match" },
    { roomName: "John Charles 3G Pitch", ...slot(1, 18, 60), title: "Junior Football Training" },
    { roomName: "Reginald Centre Community Hub", ...slot(1, 10, 120), title: "English Language Class" },
    { roomName: "Leeds Register Office \u2014 Marriages & Civil Partnerships", ...slot(1, 14, 60), title: "Wedding Ceremony" },
    { roomName: "Armley Leisure Centre \u2014 Studio", ...slot(2, 9, 60), title: "Yoga Class" },
    { roomName: "Fearnville Leisure Centre", ...slot(2, 12, 60), title: "Lunchtime Swim" },
    { roomName: "Scott Hall Leisure Centre", ...slot(2, 18, 60), title: "Badminton Court Hire" },
    { roomName: "Pudsey Recycling Centre", ...slot(2, 10, 30), title: "Drop-off Slot" },
    { roomName: "Kirkstall Road Recycling Centre", ...slot(2, 13, 30), title: "Drop-off Slot" },
    { roomName: "Roundhay Park \u2014 Football Pitch 2", ...slot(2, 10, 90), title: "Saturday League Match" },
    { roomName: "Beckett Park \u2014 Cricket Square", ...slot(2, 13, 180), title: "Cricket Club Practice" },
    { roomName: "Bramley Community Hub", ...slot(2, 10, 120), title: "Art Workshop" },
    { roomName: "Chapel Allerton Library \u2014 Community Room", ...slot(2, 14, 90), title: "Toddler Story Time" },
    { roomName: "Leeds Register Office \u2014 Citizenship Ceremonies", ...slot(2, 11, 60), title: "Citizenship Ceremony" },
    { roomName: "Kirkstall Leisure Centre", ...slot(3, 7, 60), title: "Early Bird Swim" },
    { roomName: "John Charles Centre for Sport", ...slot(3, 10, 120), title: "Diving Club Session" },
    { roomName: "Holt Park Active", ...slot(3, 14, 60), title: "Pilates Class" },
    { roomName: "Seacroft Recycling Centre", ...slot(3, 9, 30), title: "Drop-off Slot" },
    { roomName: "Armley Community Hub", ...slot(3, 13, 120), title: "Digital Skills Workshop" },
    { roomName: "Leeds Central Library \u2014 Meeting Room", ...slot(3, 10, 120), title: "Local History Group" },
    { roomName: "Leeds Register Office \u2014 Births & Deaths", ...slot(3, 9, 30), title: "Birth Registration" },
    { roomName: "Leeds Register Office \u2014 Marriages & Civil Partnerships", ...slot(3, 11, 30), title: "Notice of Marriage Appointment" },
    { roomName: "Morley Leisure Centre", ...slot(4, 7, 60), title: "Early Morning Gym" },
    { roomName: "Armley Leisure Centre \u2014 Studio", ...slot(4, 18, 60), title: "Boxercise" },
    { roomName: "Fearnville Leisure Centre", ...slot(4, 16, 60), title: "Kids Swimming Lessons" },
    { roomName: "John Charles 3G Pitch", ...slot(4, 19, 90), title: "Women's Football Training" },
    { roomName: "Roundhay Park \u2014 Football Pitch 1", ...slot(4, 10, 90), title: "Sunday League Match" },
    { roomName: "Compton Centre Community Hub", ...slot(4, 10, 180), title: "Community Cooking Class" },
    { roomName: "Leeds Central Library \u2014 Study Room A", ...slot(4, 10, 240), title: "Exam Revision" },
    { roomName: "Scott Hall Leisure Centre", ...slot(5, 9, 60), title: "Gym Induction" },
    { roomName: "Kirkstall Leisure Centre", ...slot(5, 12, 60), title: "Aqua Fit" },
    { roomName: "Meanwood Recycling Centre", ...slot(5, 14, 30), title: "Drop-off Slot" },
    { roomName: "Reginald Centre Community Hub", ...slot(5, 18, 120), title: "Community Film Night" },
    { roomName: "Leeds Register Office \u2014 Marriages & Civil Partnerships", ...slot(5, 15, 60), title: "Civil Partnership Ceremony" },
    { roomName: "John Charles Centre for Sport", ...slot(7, 7, 60), title: "Masters Swimming" },
    { roomName: "Holt Park Active", ...slot(7, 10, 60), title: "Seated Exercise Class" },
    { roomName: "Armley Leisure Centre \u2014 Studio", ...slot(7, 19, 60), title: "Zumba" },
    { roomName: "Kirkstall Road Recycling Centre", ...slot(7, 10, 30), title: "Drop-off Slot" },
    { roomName: "Pudsey Recycling Centre", ...slot(7, 11, 30), title: "Drop-off Slot" },
    { roomName: "Roundhay Park \u2014 Football Pitch 1", ...slot(7, 19, 90), title: "5-a-side League Match" },
    { roomName: "Beckett Park \u2014 Cricket Square", ...slot(7, 10, 240), title: "Weekend Cricket Match" },
    { roomName: "Armley Community Hub", ...slot(7, 10, 120), title: "Knit & Natter Group" },
    { roomName: "Bramley Community Hub", ...slot(7, 14, 120), title: "Homework Club" },
    { roomName: "Leeds Central Library \u2014 Meeting Room", ...slot(7, 18, 90), title: "Book Club" },
    { roomName: "Chapel Allerton Library \u2014 Community Room", ...slot(7, 10, 60), title: "Baby Rhyme Time" },
    { roomName: "Leeds Register Office \u2014 Citizenship Ceremonies", ...slot(7, 14, 60), title: "Citizenship Ceremony" },
    { roomName: "Fearnville Leisure Centre", ...slot(8, 7, 60), title: "Early Bird Gym Session" },
    { roomName: "Morley Leisure Centre", ...slot(8, 12, 60), title: "Lane Swimming" },
    { roomName: "John Charles Centre for Sport", ...slot(8, 18, 60), title: "Athletics Club" },
    { roomName: "Seacroft Recycling Centre", ...slot(8, 10, 30), title: "Drop-off Slot" },
    { roomName: "Middleton Recycling Centre", ...slot(8, 13, 30), title: "Drop-off Slot" },
    { roomName: "John Charles 3G Pitch", ...slot(8, 18, 90), title: "Senior Football Training" },
    { roomName: "Compton Centre Community Hub", ...slot(8, 10, 120), title: "Sewing Circle" },
    { roomName: "Leeds Central Library \u2014 Study Room A", ...slot(8, 9, 180), title: "IELTS Preparation" },
    { roomName: "Leeds Register Office \u2014 Births & Deaths", ...slot(8, 14, 30), title: "Birth Registration" },
    { roomName: "Kirkstall Leisure Centre", ...slot(10, 9, 60), title: "Parent & Toddler Swim" },
    { roomName: "Holt Park Active", ...slot(10, 12, 60), title: "Gym Session" },
    { roomName: "Scott Hall Leisure Centre", ...slot(10, 17, 60), title: "Table Tennis League" },
    { roomName: "Kirkstall Road Recycling Centre", ...slot(10, 15, 30), title: "Drop-off Slot" },
    { roomName: "Roundhay Park \u2014 Football Pitch 2", ...slot(10, 19, 90), title: "Thursday League Match" },
    { roomName: "Reginald Centre Community Hub", ...slot(10, 10, 120), title: "English Language Class" },
    { roomName: "Leeds Register Office \u2014 Marriages & Civil Partnerships", ...slot(10, 14, 60), title: "Wedding Ceremony" },
    { roomName: "Armley Leisure Centre \u2014 Studio", ...slot(12, 7, 60), title: "HIIT Class" },
    { roomName: "John Charles Centre for Sport", ...slot(12, 9, 120), title: "Swimming Gala" },
    { roomName: "Fearnville Leisure Centre", ...slot(12, 14, 60), title: "Aqua Aerobics" },
    { roomName: "Meanwood Recycling Centre", ...slot(12, 10, 30), title: "Drop-off Slot" },
    { roomName: "Beckett Park \u2014 Cricket Square", ...slot(12, 13, 180), title: "Cricket Club Practice" },
    { roomName: "Armley Community Hub", ...slot(12, 13, 120), title: "Digital Skills Workshop" },
    { roomName: "Chapel Allerton Library \u2014 Community Room", ...slot(12, 14, 90), title: "Toddler Story Time" },
    { roomName: "Leeds Register Office \u2014 Citizenship Ceremonies", ...slot(12, 11, 60), title: "Citizenship Ceremony" },
    { roomName: "Morley Town Hall \u2014 Alexandra Hall", ...slot(2, 13, 240), title: "Wedding Reception" },
    { roomName: "Morley Town Hall \u2014 Morleian Hall", ...slot(4, 14, 180), title: "60th Birthday Party" },
    { roomName: "Blackburn Hall, Rothwell \u2014 Main Hall", ...slot(5, 19, 180), title: "Amateur Dramatics Performance" },
    { roomName: "Mandela Centre \u2014 Main Hall", ...slot(1, 18, 120), title: "Community AGM" },
    { roomName: "Strawberry Lane Community Centre \u2014 Hall", ...slot(0, 10, 120), title: "Toddler Playgroup" },
    { roomName: "Stephen Longfellow Academy \u2014 School Hall", ...slot(3, 18, 120), title: "Badminton Club" },
    { roomName: "Denis Healey Centre \u2014 Hall", ...slot(7, 13, 120), title: "Coffee Morning" },
  ]

  return defs
    .map((b, i) => {
      const resourceId = roomMap[b.roomName]
      if (!resourceId) return null
      const persona = CITIZEN_PERSONAS[i % CITIZEN_PERSONAS.length]
      const contactId = contactMap[persona.email]
      if (!contactId) return null
      return {
        title: b.title,
        bookingPayload: {
          name: b.title,
          starttime: b.starttime,
          endtime: b.endtime,
          duration: b.duration,
          bookingtype: 1,
          "Resource@odata.bind": `/bookableresources(${resourceId})`,
          "BookingStatus@odata.bind": `/bookingstatuses(${scheduledStatusId})`,
        },
        citizenServiceBookingPayload: {
          tn_name: b.title,
          tn_requestedstart: b.starttime,
          tn_requestedend: b.endtime,
          tn_duration: b.duration,
          tn_status: CSB_STATUS.Confirmed,
          tn_servicetype: SERVICE_TYPE_BY_CATEGORY[
            ROOMS.find((r) => r.name === b.roomName)?.category ?? ""
          ],
          ...seedPaymentFields(b.roomName, b.duration, i),
        },
        contactId,
      }
    })
    .filter(Boolean) as {
      title: string
      bookingPayload: Record<string, unknown>
      citizenServiceBookingPayload: Record<string, unknown>
      contactId: string
    }[]
}

function generateFillBookings(
  roomMap: Record<string, string>,
  scheduledStatusId: string,
  contactId: string,
  days: number,
) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  function slot(dayOffset: number, startHour: number, startMin: number, durationMins: number) {
    const start = new Date(today)
    start.setDate(start.getDate() + dayOffset)
    start.setHours(startHour, startMin, 0, 0)
    const end = new Date(start.getTime() + durationMins * 60 * 1000)
    return { starttime: start.toISOString(), endtime: end.toISOString(), duration: durationMins }
  }

  interface SlotDef { h: number; m: number; dur: number; title: string }
  const pools: { roomName: string; slots: SlotDef[] }[] = [
    { roomName: "Armley Leisure Centre \u2014 Gym",    slots: [{ h: 8, m: 0, dur: 60, title: "Morning Gym" }, { h: 10, m: 0, dur: 60, title: "Weights Session" }, { h: 14, m: 0, dur: 60, title: "Afternoon Gym" }, { h: 16, m: 0, dur: 60, title: "Evening Gym" }] },
    { roomName: "Armley Leisure Centre \u2014 Pool",   slots: [{ h: 9, m: 0, dur: 60, title: "Lane Swimming" }, { h: 11, m: 0, dur: 60, title: "Aqua Aerobics" }, { h: 15, m: 0, dur: 60, title: "Family Swim" }] },
    { roomName: "Armley Leisure Centre \u2014 Studio", slots: [{ h: 9, m: 0, dur: 60, title: "Spin Class" }, { h: 12, m: 0, dur: 60, title: "HIIT Class" }, { h: 17, m: 0, dur: 60, title: "Boxercise" }] },
    { roomName: "Fearnville Leisure Centre",     slots: [{ h: 9, m: 0, dur: 60, title: "Lane Swimming" }, { h: 11, m: 0, dur: 60, title: "Aqua Fit" }, { h: 15, m: 0, dur: 60, title: "Yoga" }] },
    { roomName: "Holt Park Active",              slots: [{ h: 9, m: 0, dur: 60, title: "Gym Session" }, { h: 13, m: 0, dur: 60, title: "Pilates" }] },
    { roomName: "John Charles Centre for Sport", slots: [{ h: 8, m: 0, dur: 60, title: "Masters Swimming" }, { h: 10, m: 0, dur: 60, title: "Gym Session" }, { h: 12, m: 0, dur: 60, title: "Lunchtime Swim" }, { h: 14, m: 0, dur: 60, title: "Diving Club" }, { h: 16, m: 0, dur: 60, title: "Athletics Club" }] },
    { roomName: "Kirkstall Leisure Centre",      slots: [{ h: 8, m: 0, dur: 60, title: "Early Swim" }, { h: 17, m: 0, dur: 60, title: "Evening Gym" }] },
    { roomName: "Morley Leisure Centre",         slots: [{ h: 10, m: 0, dur: 60, title: "Over 50s Swim" }] },
    { roomName: "Scott Hall Leisure Centre",     slots: [{ h: 9, m: 0, dur: 60, title: "Gym Induction" }, { h: 14, m: 0, dur: 60, title: "Badminton" }, { h: 16, m: 0, dur: 60, title: "Table Tennis" }] },
    { roomName: "Kirkstall Road Recycling Centre", slots: [{ h: 9, m: 0, dur: 30, title: "Drop-off Slot" }, { h: 10, m: 30, dur: 30, title: "Drop-off Slot" }, { h: 11, m: 30, dur: 30, title: "Drop-off Slot" }, { h: 13, m: 0, dur: 30, title: "Drop-off Slot" }, { h: 14, m: 30, dur: 30, title: "Drop-off Slot" }] },
    { roomName: "Seacroft Recycling Centre",       slots: [{ h: 10, m: 0, dur: 30, title: "Drop-off Slot" }, { h: 12, m: 0, dur: 30, title: "Drop-off Slot" }, { h: 15, m: 0, dur: 30, title: "Drop-off Slot" }] },
    { roomName: "Meanwood Recycling Centre",       slots: [{ h: 9, m: 0, dur: 30, title: "Drop-off Slot" }, { h: 11, m: 0, dur: 30, title: "Drop-off Slot" }] },
    { roomName: "Middleton Recycling Centre",      slots: [{ h: 10, m: 0, dur: 30, title: "Drop-off Slot" }] },
    { roomName: "Pudsey Recycling Centre",         slots: [{ h: 9, m: 30, dur: 30, title: "Drop-off Slot" }, { h: 13, m: 0, dur: 30, title: "Drop-off Slot" }, { h: 15, m: 0, dur: 30, title: "Drop-off Slot" }, { h: 16, m: 30, dur: 30, title: "Drop-off Slot" }] },
    { roomName: "Roundhay Park \u2014 Football Pitch 1", slots: [{ h: 10, m: 0, dur: 90, title: "5-a-side Match" }, { h: 17, m: 0, dur: 90, title: "Evening Kick-about" }] },
    { roomName: "Roundhay Park \u2014 Football Pitch 2", slots: [{ h: 14, m: 0, dur: 90, title: "Sunday League" }] },
    { roomName: "John Charles 3G Pitch",           slots: [{ h: 10, m: 0, dur: 60, title: "Junior Training" }, { h: 12, m: 0, dur: 60, title: "Lunchtime Hire" }, { h: 18, m: 0, dur: 60, title: "Women\u2019s Football" }] },
    { roomName: "Beckett Park \u2014 Cricket Square",    slots: [{ h: 10, m: 0, dur: 120, title: "Cricket Practice" }] },
    { roomName: "Armley Community Hub",            slots: [{ h: 13, m: 0, dur: 60, title: "Job Club Drop-in" }, { h: 15, m: 0, dur: 60, title: "Digital Skills" }] },
    { roomName: "Compton Centre Community Hub",    slots: [{ h: 9, m: 0, dur: 60, title: "Sewing Circle" }, { h: 11, m: 0, dur: 60, title: "Coffee Morning" }, { h: 15, m: 0, dur: 60, title: "Youth Club" }] },
    { roomName: "Reginald Centre Community Hub",   slots: [{ h: 10, m: 0, dur: 120, title: "English Class" }] },
    { roomName: "Bramley Community Hub",           slots: [{ h: 10, m: 0, dur: 60, title: "Art Workshop" }, { h: 13, m: 0, dur: 60, title: "Homework Club" }, { h: 16, m: 0, dur: 60, title: "Craft Group" }] },
    { roomName: "Leeds Central Library \u2014 Study Room A",   slots: [{ h: 13, m: 0, dur: 60, title: "Study Session" }, { h: 15, m: 0, dur: 60, title: "Revision Group" }] },
    { roomName: "Leeds Central Library \u2014 Meeting Room",   slots: [{ h: 10, m: 0, dur: 60, title: "Reading Group" }] },
    { roomName: "Chapel Allerton Library \u2014 Community Room", slots: [{ h: 10, m: 0, dur: 60, title: "Baby Rhyme Time" }, { h: 14, m: 0, dur: 60, title: "Toddler Story Time" }] },
    { roomName: "Leeds Register Office \u2014 Births & Deaths", slots: [{ h: 9, m: 30, dur: 30, title: "Birth Registration" }, { h: 12, m: 0, dur: 30, title: "Death Registration" }, { h: 14, m: 0, dur: 30, title: "Birth Registration" }, { h: 15, m: 30, dur: 30, title: "Death Registration" }, { h: 16, m: 0, dur: 30, title: "Birth Registration" }] },
    { roomName: "Leeds Register Office \u2014 Marriages & Civil Partnerships", slots: [{ h: 11, m: 0, dur: 60, title: "Wedding Ceremony" }, { h: 14, m: 0, dur: 60, title: "Civil Partnership" }] },
    { roomName: "Leeds Register Office \u2014 Citizenship Ceremonies", slots: [{ h: 10, m: 0, dur: 60, title: "Citizenship Ceremony" }] },
    { roomName: "Morley Town Hall \u2014 Alexandra Hall",          slots: [{ h: 18, m: 0, dur: 240, title: "Evening Function" }] },
    { roomName: "Morley Town Hall \u2014 Large Banqueting Hall",   slots: [{ h: 10, m: 0, dur: 120, title: "Private Event" }, { h: 14, m: 0, dur: 120, title: "Celebration" }] },
    { roomName: "Blackburn Hall, Rothwell \u2014 Main Hall",       slots: [{ h: 19, m: 0, dur: 180, title: "Rehearsal" }] },
    { roomName: "Mandela Centre \u2014 Main Hall",                 slots: [{ h: 13, m: 0, dur: 120, title: "Community Group" }] },
    { roomName: "Strawberry Lane Community Centre \u2014 Hall",    slots: [{ h: 10, m: 0, dur: 120, title: "Playgroup" }, { h: 18, m: 0, dur: 120, title: "Fitness Class" }] },
    { roomName: "Stephen Longfellow Academy \u2014 School Hall",   slots: [{ h: 18, m: 0, dur: 120, title: "Sports Club" }] },
  ]

  const results: {
    title: string
    bookingPayload: Record<string, unknown>
    citizenServiceBookingPayload: Record<string, unknown>
    contactId: string
  }[] = []

  for (let d = 0; d < days; d++) {
    for (const room of pools) {
      const resourceId = roomMap[room.roomName]
      if (!resourceId) continue

      const subset = room.slots.filter((_, i) => (i + d) % 3 !== 2)
      if (subset.length === 0) continue

      for (const s of subset) {
        const { starttime, endtime, duration } = slot(d, s.h, s.m, s.dur)
        results.push({
          title: s.title,
          bookingPayload: {
            name: s.title,
            starttime,
            endtime,
            duration,
            bookingtype: 1,
            "Resource@odata.bind": `/bookableresources(${resourceId})`,
            "BookingStatus@odata.bind": `/bookingstatuses(${scheduledStatusId})`,
          },
          citizenServiceBookingPayload: {
            tn_name: s.title,
            tn_requestedstart: starttime,
            tn_requestedend: endtime,
            tn_duration: duration,
            tn_status: CSB_STATUS.Confirmed,
            tn_servicetype: SERVICE_TYPE_BY_CATEGORY[
              ROOMS.find((r) => r.name === room.roomName)?.category ?? ""
            ],
            ...seedPaymentFields(room.roomName, duration, results.length),
          },
          contactId,
        })
      }
    }
  }

  return results
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function runSeed() {
  // ── 1. Demo Contacts ──────────────────────────────────────────────
  logHeading("── Demo Contacts ─────────────────────────────────")
  const contactMap: Record<string, string> = {}

  const existingContacts = await dv.getList<{
    contactid: string
    emailaddress1: string
  }>(
    `contacts?$filter=${encodeURIComponent(
      CITIZEN_PERSONAS.map((p) => `emailaddress1 eq '${p.email}'`).join(" or ")
    )}&$select=contactid,emailaddress1`
  )
  for (const c of existingContacts.value)
    contactMap[c.emailaddress1] = c.contactid

  for (const persona of CITIZEN_PERSONAS) {
    if (contactMap[persona.email]) {
      logSkip(`  ${persona.name} (exists)`)
      continue
    }
    const [firstname, ...rest] = persona.name.split(" ")
    const created = await dv.postAndReturn<{ contactid: string }>(
      "contacts",
      {
        firstname,
        lastname: rest.join(" "),
        emailaddress1: persona.email,
      }
    )
    contactMap[persona.email] = created.contactid
    logSuccess(`  ${persona.name} (created: ${created.contactid})`)
  }

  // Traffic contact
  const trafficExisting = await dv.getList<{
    contactid: string
    emailaddress1: string
  }>(
    `contacts?$filter=${encodeURIComponent(`emailaddress1 eq '${TRAFFIC_CONTACT.email}'`)}&$select=contactid,emailaddress1`
  )
  let trafficContactId: string
  if (trafficExisting.value.length > 0) {
    trafficContactId = trafficExisting.value[0].contactid
    logSkip(`  ${TRAFFIC_CONTACT.firstname} ${TRAFFIC_CONTACT.lastname} (exists)`)
  } else {
    const created = await dv.postAndReturn<{ contactid: string }>(
      "contacts",
      {
        firstname: TRAFFIC_CONTACT.firstname,
        lastname: TRAFFIC_CONTACT.lastname,
        emailaddress1: TRAFFIC_CONTACT.email,
      }
    )
    trafficContactId = created.contactid
    logSuccess(`  ${TRAFFIC_CONTACT.firstname} ${TRAFFIC_CONTACT.lastname} (created: ${trafficContactId})`)
  }

  // ── 2. Booking statuses ───────────────────────────────────────────
  logHeading("── Booking Statuses ──────────────────────────────")
  const statusRes = await dv.getList<{
    bookingstatusid: string
    name: string
    status: number
  }>(
    "bookingstatuses?$filter=statecode eq 0&$select=bookingstatusid,name,status"
  )
  const statusMap: Record<string, string> = {}
  for (const s of statusRes.value) {
    statusMap[s.name] = s.bookingstatusid
    logSuccess(`  ${s.name} (${s.bookingstatusid})`)
  }

  // ── 3. Categories ────────────────────────────────────────────────
  logHeading("── Categories ────────────────────────────────────")
  const existingCats = await dv.getList<{
    bookableresourcecategoryid: string
    name: string
  }>(
    "bookableresourcecategories?$filter=statecode eq 0&$select=bookableresourcecategoryid,name"
  )
  const categoryMap: Record<string, string> = {}
  for (const c of existingCats.value)
    categoryMap[c.name] = c.bookableresourcecategoryid

  for (const cat of CATEGORIES) {
    const { bufferMinutes, slotDurationMins, searchAliases, ...catPayload } = cat
    const customFields = { tn_bufferminutes: bufferMinutes, tn_slotdurationmins: slotDurationMins, tn_searchaliases: searchAliases }
    if (categoryMap[cat.name]) {
      await dv.patch(
        `bookableresourcecategories(${categoryMap[cat.name]})`,
        customFields
      )
      logSkip(`  ${cat.name} (exists, buffer=${bufferMinutes}m, slot=${slotDurationMins}m, aliases=${searchAliases.split(",").length})`)
      continue
    }
    const created = await dv.postAndReturn<{
      bookableresourcecategoryid: string
    }>("bookableresourcecategories", { ...catPayload, ...customFields })
    categoryMap[cat.name] = created.bookableresourcecategoryid
    logSuccess(`  ${cat.name} (created, buffer=${bufferMinutes}m, slot=${slotDurationMins}m, aliases=${searchAliases.split(",").length})`)
  }

  // ── 4. Organizational Unit ────────────────────────────────────────
  logHeading("── Organizational Unit ───────────────────────────")
  const orgUnits = await dv.getList<{
    msdyn_organizationalunitid: string
    msdyn_name: string
  }>(
    "msdyn_organizationalunits?$top=1&$select=msdyn_organizationalunitid,msdyn_name"
  )

  let orgUnitId: string
  if (orgUnits.value.length > 0) {
    orgUnitId = orgUnits.value[0].msdyn_organizationalunitid
    await dv.patch(
      `msdyn_organizationalunits(${orgUnitId})`,
      { msdyn_latitude: 53.8008, msdyn_longitude: -1.5491 }
    )
    logSuccess(`  ${orgUnits.value[0].msdyn_name} (exists, updated coords)`)
  } else {
    const created = await dv.postAndReturn<{
      msdyn_organizationalunitid: string
    }>("msdyn_organizationalunits", {
      msdyn_name: "Leeds City Council",
      msdyn_latitude: 53.8008,
      msdyn_longitude: -1.5491,
    })
    orgUnitId = created.msdyn_organizationalunitid
    logSuccess(`  Leeds City Council (created: ${orgUnitId})`)
  }

  // ── 5. Rooms ─────────────────────────────────────────────────────
  logHeading("── Rooms ─────────────────────────────────────────")
  const existingRooms = await dv.getList<{
    bookableresourceid: string
    name: string
  }>(
    "bookableresources?$filter=resourcetype eq 7 and statecode eq 0&$select=bookableresourceid,name"
  )
  const roomMap: Record<string, string> = {}
  for (const r of existingRooms.value) roomMap[r.name] = r.bookableresourceid

  const roomsToCreate = ROOMS.filter((r) => !roomMap[r.name])
  for (const r of ROOMS.filter((r) => roomMap[r.name])) logSkip(`  ${r.name} (exists)`)

  const roomResults = await batch(
    roomsToCreate.map((room) => async () => {
      const r = room as typeof room & { fridayCapacity?: number; hourlyRate?: number; hourlyRateTicketed?: number }
      const { category: _, description: __, capacity: _cap, fridayCapacity: _fc, hourlyRate: _hr, hourlyRateTicketed: _hrt, ...roomData } = r
      const rateFields: Record<string, number> = {}
      if (_hr != null) rateFields.tn_hourlyrate = _hr
      if (_hrt != null) rateFields.tn_hourlyrateticketed = _hrt
      const created = await dv.postAndReturn<{
        bookableresourceid: string
      }>("bookableresources", {
        ...roomData,
        ...rateFields,
        resourcetype: 7,
        msdyn_startlocation: 690970001,
        msdyn_endlocation: 690970001,
        "msdyn_OrganizationalUnit@odata.bind": `/msdyn_organizationalunits(${orgUnitId})`,
      })
      roomMap[room.name] = created.bookableresourceid
      return room.name
    })
  )
  for (const r of roomResults) {
    if (r.status === "fulfilled") logSuccess(`  ${r.value} (created)`)
    else logError(`  Room failed: ${r.reason}`)
  }

  // Set work hours + capacity via msdyn_SaveCalendar
  logHeading("── Setting Work Hours (Calendar) ─────────────────")

  const roomsWithCal = await dv.getList<{
    bookableresourceid: string
    name: string
    _calendarid_value: string
  }>(
    `bookableresources?$filter=resourcetype eq 7 and statecode eq 0&$select=bookableresourceid,name,_calendarid_value`
  )
  const calendarMap: Record<string, string> = {}
  for (const r of roomsWithCal.value) {
    if (r._calendarid_value) calendarMap[r.name] = r._calendarid_value
  }

  const calResults = await batch(
    ROOMS.map((room) => async () => {
      const resourceId = roomMap[room.name]
      const calendarId = calendarMap[room.name]
      if (!resourceId || !calendarId) {
        return { name: room.name, skipped: true, reason: "no calendar" }
      }

      const isRegisterOffice = room.category === "Register Office"
      const isRecycling = room.category === "Recycling Centre"
      const isVenueHire = room.category === "Venue Hire"
      const startHour = isRegisterOffice ? 9 : 8
      const endHour = isRegisterOffice ? 17 : isVenueHire ? 22 : 18
      const startMinStr = `${String(startHour).padStart(2, "0")}:00`
      const endMinStr = `${String(endHour).padStart(2, "0")}:00`

      if (isRecycling && room.fridayCapacity != null) {
        const nonFridayDays = ["SU","MO","TU","WE","TH","SA"]
        await dv.post("msdyn_SaveCalendar", {
          CalendarEventInfo: JSON.stringify({
            CalendarId: calendarId,
            EntityLogicalName: "bookableresource",
            TimeZoneCode: room.timezone,
            IsVaried: true,
            RulesAndRecurrences: [
              {
                Rules: [{
                  StartTime: `2000-01-01T${startMinStr}:00.000Z`,
                  EndTime: `2000-01-01T${endMinStr}:00.000Z`,
                  WorkHourType: 0,
                  Effort: room.capacity,
                }],
                Action: 1,
                RecurrencePattern: `FREQ=WEEKLY;INTERVAL=1;BYDAY=${nonFridayDays.join(",")}`,
              },
              {
                Rules: [{
                  StartTime: `2000-01-01T${startMinStr}:00.000Z`,
                  EndTime: `2000-01-01T${endMinStr}:00.000Z`,
                  WorkHourType: 0,
                  Effort: room.fridayCapacity,
                }],
                Action: 1,
                RecurrencePattern: "FREQ=WEEKLY;INTERVAL=1;BYDAY=FR",
              },
            ],
          }),
        })
      } else if (isRegisterOffice) {
        await dv.post("msdyn_SaveCalendar", {
          CalendarEventInfo: JSON.stringify({
            CalendarId: calendarId,
            EntityLogicalName: "bookableresource",
            TimeZoneCode: room.timezone,
            RulesAndRecurrences: [{
              Rules: [{
                StartTime: `2000-01-01T${startMinStr}:00.000Z`,
                EndTime: `2000-01-01T${endMinStr}:00.000Z`,
                WorkHourType: 0,
                Effort: room.capacity,
              }],
              RecurrencePattern: "FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,TU,WE,TH,FR",
            }],
          }),
        })
      } else {
        await dv.post("msdyn_SaveCalendar", {
          CalendarEventInfo: JSON.stringify({
            CalendarId: calendarId,
            EntityLogicalName: "bookableresource",
            TimeZoneCode: room.timezone,
            RulesAndRecurrences: [{
              Rules: [{
                StartTime: `2000-01-01T${startMinStr}:00.000Z`,
                EndTime: `2000-01-01T${endMinStr}:00.000Z`,
                WorkHourType: 0,
                Effort: room.capacity,
              }],
              RecurrencePattern: "FREQ=WEEKLY;INTERVAL=1;BYDAY=SU,MO,TU,WE,TH,FR,SA",
            }],
          }),
        })
      }

      return { name: room.name, skipped: false }
    })
  )

  for (const r of calResults) {
    if (r.status === "fulfilled") {
      const v = r.value
      if (v.skipped) {
        logWarn(`  ${v.name} \u2014 ${v.reason}`)
      } else {
        const room = ROOMS.find((rm) => rm.name === v.name)!
        const extra = room.fridayCapacity != null ? ` (Fri: ${room.fridayCapacity})` : ""
        logSuccess(`  ${v.name} = ${room.capacity}${extra}`)
      }
    } else {
      logError(`  Calendar failed: ${r.reason}`)
    }
  }

  // ── 6. Category assignments ──────────────────────────────────────
  logHeading("── Category Assignments ──────────────────────────")
  const existingAssns = await dv.getList<{
    bookableresourcecategoryassnid: string
    _resource_value: string
    _resourcecategory_value: string
  }>(
    "bookableresourcecategoryassns?$filter=statecode eq 0&$select=bookableresourcecategoryassnid,_resource_value,_resourcecategory_value"
  )
  const assnSet = new Set(
    existingAssns.value.map((a) => `${a._resource_value}|${a._resourcecategory_value}`)
  )

  const assnsToCreate = ROOMS.filter((room) => {
    const resourceId = roomMap[room.name]
    const categoryId = categoryMap[room.category]
    if (!resourceId || !categoryId) return false
    if (assnSet.has(`${resourceId}|${categoryId}`)) {
      logSkip(`  ${room.name} -> ${room.category} (exists)`)
      return false
    }
    return true
  })

  const assnResults = await batch(
    assnsToCreate.map((room) => async () => {
      await dv.post("bookableresourcecategoryassns", {
        "Resource@odata.bind": `/bookableresources(${roomMap[room.name]})`,
        "ResourceCategory@odata.bind": `/bookableresourcecategories(${categoryMap[room.category]})`,
      })
      return `${room.name} -> ${room.category}`
    })
  )
  for (const r of assnResults) {
    if (r.status === "fulfilled") logSuccess(`  ${r.value}`)
    else logError(`  Assignment failed: ${r.reason}`)
  }

  // ── 7. Bookings ──────────────────────────────────────────────────
  logHeading("── Sample Bookings ───────────────────────────────")
  const scheduledId = statusMap["Scheduled"]
  if (!scheduledId) {
    logWarn("  No 'Scheduled' booking status found \u2014 skipping")
  } else {
    const bookings = generateBookings(roomMap, scheduledId, contactMap)
    const bookingResults = await batch(
      bookings.map((entry) => async () => {
        const created = await dv.postAndReturn<{
          bookableresourcebookingid: string
        }>("bookableresourcebookings", entry.bookingPayload)

        await dv.post("tn_citizenservicebookings", {
          ...entry.citizenServiceBookingPayload,
          "tn_Citizen@odata.bind": `/contacts(${entry.contactId})`,
          "tn_Booking@odata.bind": `/bookableresourcebookings(${created.bookableresourcebookingid})`,
        })

        return `${entry.title} (${(entry.bookingPayload.starttime as string).slice(0, 10)})`
      })
    )
    for (const r of bookingResults) {
      if (r.status === "fulfilled") logSuccess(`  ${r.value}`)
      else logError(`  ${r.reason}`)
    }
  }

  // ── 8. Fill bookings (10 days) ────────────────────────────────────
  logHeading("── Fill Bookings (10 days) ───────────────────────")
  if (!scheduledId) {
    logWarn("  No 'Scheduled' status \u2014 skipping fill")
  } else {
    const fillBookings = generateFillBookings(roomMap, scheduledId, trafficContactId, 10)
    logSuccess(`  Generating ${fillBookings.length} bookings across 10 days...`)
    const fillResults = await batch(
      fillBookings.map((entry) => async () => {
        const created = await dv.postAndReturn<{
          bookableresourcebookingid: string
        }>("bookableresourcebookings", entry.bookingPayload)

        await dv.post("tn_citizenservicebookings", {
          ...entry.citizenServiceBookingPayload,
          "tn_Citizen@odata.bind": `/contacts(${entry.contactId})`,
          "tn_Booking@odata.bind": `/bookableresourcebookings(${created.bookableresourcebookingid})`,
        })

        return `${entry.title} (${(entry.bookingPayload.starttime as string).slice(0, 10)})`
      })
    )
    let tOk = 0, tFail = 0
    for (const r of fillResults) {
      if (r.status === "fulfilled") { tOk++; logSuccess(`  ${r.value}`) }
      else { tFail++; logError(`  ${r.reason}`) }
    }
    logSuccess(`  ${tOk} created, ${tFail} failed`)
  }

  logHeading("══════════════════════════════════════════════════")
  logSuccess(`  Categories: ${CATEGORIES.length}`)
  logSuccess(`  Rooms:      ${ROOMS.length}`)
  logSuccess(`  Contacts:   ${CITIZEN_PERSONAS.length + 1} (+ traffic)`)
  logSuccess("  Seed complete!")
}

runSeed().catch((err) => {
  logError(`Seed failed: ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})
