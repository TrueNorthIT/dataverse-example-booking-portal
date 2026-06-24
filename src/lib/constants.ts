/**
 * Centralised magic numbers and string literals.
 *
 * Keeping these in one place makes the business rules explicit, testable, and
 * easy to tune — instead of scattering `0.6`, `30_000`, `"Canceled"` etc.
 * across hooks, contexts and components.
 */

/** "Busyness" heat-map calculation (see lib/busyness.ts). */
export const BUSYNESS = {
  /** Width of each sampling window, in minutes. */
  WINDOW_MINS: 30,
  /** Working day start hour (inclusive), local time. */
  DAY_START_HOUR: 8,
  /** Working day end hour (exclusive), local time. */
  DAY_END_HOUR: 18,
  /** Fraction of windows booked at/above which a resource is "busy". */
  BUSY_THRESHOLD: 0.6,
  /** Fraction of windows booked at/above which a resource is "moderate". */
  MODERATE_THRESHOLD: 0.25,
} as const

/** Live-presence (Azure Web PubSub) timings. */
export const PRESENCE = {
  /** Heartbeat broadcast interval. */
  HEARTBEAT_MS: 30_000,
  /** Stale-viewer sweep interval. */
  CLEANUP_MS: 15_000,
  /** A viewer is considered gone after this long without a heartbeat. */
  STALE_MS: 60_000,
  /** How long a slot "flashes" after a new viewer appears. */
  FLASH_MS: 2_500,
  /** Client-access token lifetime (demo only — issue server-side in prod). */
  JWT_TTL_SECS: 3_600,
} as const

/** Booking-status display names as stored in Dataverse `bookingstatuses`. */
export const BOOKING_STATUS_NAME = {
  SCHEDULED: "Scheduled",
  CANCELED: "Canceled",
} as const

/** Default lead time (days ahead) for the venue-hire event date. */
export const VENUE_LEAD_DAYS = 28
