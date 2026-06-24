/**
 * Response shape from the ExpandCalendar bound function on calendar entities.
 *
 * GET calendars({id})/Microsoft.Dynamics.CRM.ExpandCalendar(Start=@s,End=@e)?@s=...&@e=...
 *
 * NOTE: The API returns the array under `result`, not `value`.
 */
export interface ExpandCalendarResponse {
  result: TimeInfo[]
}

export interface TimeInfo {
  Start: string
  End: string
  /** "Available", "Busy", "Unavailable", "Filter" */
  TimeCode: string
  /** "Schedulable", "ResourceCapacity", etc. */
  SubCode?: string
  /** Capacity for this time block (meaningful on "Filter" / "ResourceCapacity" blocks) */
  Effort: number
  DisplayText?: string
  CalendarId?: string
  SourceId?: string
  SourceTypeCode?: number
  IsActivity?: boolean
  ActivityStatusCode?: number
}
