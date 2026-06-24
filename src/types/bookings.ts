/**
 * Shared booking-shape types, consolidated so hooks and lib helpers describe
 * the same data the same way instead of redeclaring ad-hoc inline interfaces.
 */

/** The minimal time window every booking query selects. */
export interface BookingTimeRange {
  starttime: string
  endtime: string
}

/** A booking row that also carries its parent resource id. */
export interface ResourceBookingRow extends BookingTimeRange {
  resource: string
}

/**
 * A booking parsed into `Date`s, with a `bufferedEnd` that extends `end` by the
 * category's changeover buffer. Used by the availability slot calculation.
 */
export interface ParsedBooking {
  start: Date
  end: Date
  bufferedEnd: Date
}
