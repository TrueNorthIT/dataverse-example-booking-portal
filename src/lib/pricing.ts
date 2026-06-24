// Venue-hire room data (rates, capacity, facilities/features, optional paid add-ons).
//
// Hardcoded client-side for the demo — mirrors locations.ts. The Contact API's
// citizenbooking projection does not (yet) expose the tn_hourlyrate columns or a
// seated-capacity column, so this lives here keyed by resource name.
// TODO: migrate to API custom columns once the projection is extended.

import { Utensils, Car, Wine, Drama, Music, Droplets, type LucideIcon } from "lucide-react"

export interface HireRate {
  /** £/hour when NOT selling tickets */
  standard: number
  /** £/hour when selling tickets */
  ticketed: number
}

export interface AddOn {
  key: string
  label: string
  /** £/hour */
  rate: number
}

// Real Leeds add-on rates (separate line items per building, shared across rooms)
export const KITCHEN: AddOn = { key: "kitchen", label: "Kitchen", rate: 6.25 }
export const WET_ROOM: AddOn = { key: "wetroom", label: "Wet room", rate: 15.63 }

/** Filterable venue features */
export type VenueFeature = "kitchen" | "parking" | "bar" | "stage" | "dancefloor" | "wetroom"

export const VENUE_FEATURES: { key: VenueFeature; label: string; icon: LucideIcon }[] = [
  { key: "kitchen", label: "Kitchen", icon: Utensils },
  { key: "parking", label: "Parking", icon: Car },
  { key: "bar", label: "Bar", icon: Wine },
  { key: "stage", label: "Stage", icon: Drama },
  { key: "dancefloor", label: "Dance floor", icon: Music },
  { key: "wetroom", label: "Wet room", icon: Droplets },
]

const FEATURE_LABEL: Record<VenueFeature, string> = Object.fromEntries(
  VENUE_FEATURES.map((f) => [f.key, f.label]),
) as Record<VenueFeature, string>

export interface VenueRoom extends HireRate {
  /** Seated capacity — used to match a room to the guest count */
  capacity: number
  /** Short character description for the card */
  blurb: string
  /** Filterable features */
  features: VenueFeature[]
  /** Optional paid extras you can add to the hire */
  addOns?: AddOn[]
}

// Keyed by resource name (matching seed data — note the em dash "—")
export const VENUE_ROOMS: Record<string, VenueRoom> = {
  "Morley Town Hall — Alexandra Hall": { standard: 62.5, ticketed: 78.13, capacity: 650, blurb: "Grade I listed grand hall", features: ["stage", "bar", "parking", "kitchen", "dancefloor"], addOns: [KITCHEN] },
  "Morley Town Hall — Morleian Hall": { standard: 31.25, ticketed: 31.25, capacity: 150, blurb: "Function room", features: ["bar", "kitchen", "dancefloor"], addOns: [KITCHEN] },
  "Morley Town Hall — Large Banqueting Hall": { standard: 31.25, ticketed: 31.25, capacity: 90, blurb: "Banqueting room", features: ["kitchen", "bar", "dancefloor"], addOns: [KITCHEN] },
  "Morley Town Hall — Small Banqueting Hall": { standard: 18.75, ticketed: 18.75, capacity: 40, blurb: "Intimate banqueting room", features: [] },
  "Blackburn Hall, Rothwell — Main Hall": { standard: 31.25, ticketed: 78.13, capacity: 300, blurb: "Theatre-style hall with stage", features: ["stage", "kitchen", "dancefloor"], addOns: [KITCHEN] },
  "Blackburn Hall, Rothwell — Supper Room": { standard: 22.5, ticketed: 22.5, capacity: 40, blurb: "Supper room", features: ["kitchen"], addOns: [KITCHEN] },
  "Mandela Centre — Main Hall": { standard: 31.25, ticketed: 31.25, capacity: 120, blurb: "Community hall in Chapeltown", features: ["kitchen", "parking", "dancefloor", "wetroom"], addOns: [KITCHEN, WET_ROOM] },
  "Strawberry Lane Community Centre — Hall": { standard: 15.63, ticketed: 15.63, capacity: 80, blurb: "Community hall in Armley", features: ["kitchen", "wetroom"], addOns: [KITCHEN, WET_ROOM] },
  "Denis Healey Centre — Hall": { standard: 15.63, ticketed: 15.63, capacity: 80, blurb: "Community hall in Seacroft", features: ["kitchen", "parking", "wetroom"], addOns: [KITCHEN, WET_ROOM] },
  "Stephen Longfellow Academy — School Hall": { standard: 18.75, ticketed: 18.75, capacity: 200, blurb: "School sports hall", features: ["parking", "kitchen", "stage"], addOns: [KITCHEN] },
}

export function getVenueRoom(resourceName?: string): VenueRoom | undefined {
  if (!resourceName) return undefined
  return VENUE_ROOMS[resourceName]
}

export function getHireRate(resourceName?: string): HireRate | undefined {
  const room = getVenueRoom(resourceName)
  return room ? { standard: room.standard, ticketed: room.ticketed } : undefined
}

export function getRoomCapacity(resourceName?: string): number | undefined {
  return getVenueRoom(resourceName)?.capacity
}

export function getRoomFeatures(resourceName?: string): VenueFeature[] {
  return getVenueRoom(resourceName)?.features ?? []
}

export function featureLabel(key: VenueFeature): string {
  return FEATURE_LABEL[key]
}

export function getRoomAddOns(resourceName?: string): AddOn[] {
  return getVenueRoom(resourceName)?.addOns ?? []
}

/** Per-hour rate (in pence) for the chosen ticketing option. */
export function ratePerHourPence(rate: HireRate, sellingTickets: boolean): number {
  return Math.round((sellingTickets ? rate.ticketed : rate.standard) * 100)
}

/** Hire price in pence for the room alone, for a given duration. */
export function hirePricePence(rate: HireRate, sellingTickets: boolean, durationMins: number): number {
  return Math.round(ratePerHourPence(rate, sellingTickets) * (durationMins / 60))
}

/** Cost in pence of a single add-on for a given duration. */
export function addOnPricePence(addOn: AddOn, durationMins: number): number {
  return Math.round(addOn.rate * 100 * (durationMins / 60))
}

/** Combined cost in pence of the selected add-ons for a given duration. */
export function addOnsPricePence(addOns: AddOn[], durationMins: number): number {
  return addOns.reduce((sum, a) => sum + addOnPricePence(a, durationMins), 0)
}

export interface BookingPrice {
  /** Room hire cost in pence (0 when the venue has no rate). */
  hirePence: number
  /** Selected add-ons cost in pence. */
  addOnsPence: number
  /** Total payable in pence. */
  amountPence: number
}

/**
 * Total price for a booking: room hire (rate × duration, ticketed or not) plus
 * any chosen add-ons. A free service (`rate` undefined) yields all-zero.
 */
export function calculateBookingPrice(
  rate: HireRate | undefined,
  sellingTickets: boolean,
  durationMins: number,
  addOns: AddOn[]
): BookingPrice {
  const hirePence = rate ? hirePricePence(rate, sellingTickets, durationMins) : 0
  const addOnsPence = addOnsPricePence(addOns, durationMins)
  return { hirePence, addOnsPence, amountPence: hirePence + addOnsPence }
}

export function formatGBP(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`
}
