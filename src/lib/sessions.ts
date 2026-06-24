import { addDays } from "date-fns"
import { VENUE_LEAD_DAYS } from "@/lib/constants"

export { VENUE_LEAD_DAYS }

// Venue hire is booked in event-sized session blocks, not hourly slots.
// The hourly rate is just how the price is worked out.

export interface SessionDef {
  key: string
  label: string
  startHour: number
  endHour: number
}

export const SESSIONS: SessionDef[] = [
  { key: "morning", label: "Morning", startHour: 9, endHour: 13 },
  { key: "afternoon", label: "Afternoon", startHour: 13, endHour: 17 },
  { key: "evening", label: "Evening", startHour: 18, endHour: 23 },
  { key: "fullday", label: "Full day", startHour: 9, endHour: 17 },
]

export interface SessionRange {
  start: string // ISO
  end: string // ISO
  durationMins: number
  startLabel: string
  endLabel: string
}

function hhmm(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`
}

/** Concrete start/end for a session on a given date. */
export function sessionRange(date: Date, s: SessionDef): SessionRange {
  const start = new Date(date)
  start.setHours(s.startHour, 0, 0, 0)
  const end = new Date(date)
  end.setHours(s.endHour, 0, 0, 0)
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    durationMins: (s.endHour - s.startHour) * 60,
    startLabel: hhmm(s.startHour),
    endLabel: hhmm(s.endHour),
  }
}

/** Council asks for ~4 weeks' notice — default the date that far out. */
export function defaultVenueDate(): Date {
  const d = addDays(new Date(), VENUE_LEAD_DAYS)
  d.setHours(0, 0, 0, 0)
  return d
}
