# Dataverse API Interactions — Citizen Booking Portal

Runtime reads and writes performed by the app (excludes seed/clean/schema scripts). All queries hit `/api/data/v9.2` via MSAL-authenticated browser requests.

---

## Reads

### contacts

| Source | Filter | Fields | Notes |
|--------|--------|--------|-------|
| `DemoContext.tsx` | `emailaddress1 eq '...'` (OR'd for each persona) | `contactid`, `emailaddress1` | Maps demo persona emails to Dataverse contact IDs |
| `DemoContext.tsx` (debug) | — | `contactid`, `emailaddress1`, `firstname`, `lastname` | `$top=10`, `$orderby=createdon desc` |

### bookableresources

| Source | Filter | Fields | Notes |
|--------|--------|--------|-------|
| `useRooms.ts` | By ID | `bookableresourceid`, `name`, `resourcetype`, `timezone`, `statecode`, `statuscode`, `_calendarid_value` | Single resource fetch |

### bookableresourcecategories

| Source | Filter | Fields | Notes |
|--------|--------|--------|-------|
| `useCategories.ts` | `statecode eq 0` | `bookableresourcecategoryid`, `name`, `description`, `tn_searchaliases` | `$orderby=name`, cached 30min |
| `useCategories.ts` (single) | By ID | `bookableresourcecategoryid`, `name`, `description` | — |

### bookableresourcecategoryassns

| Source | Filter | Expand | Fields | Notes |
|--------|--------|--------|--------|-------|
| `useRoomsByCategory.ts` | `_resourcecategory_value eq {id}` AND `statecode eq 0` | `Resource($select=bookableresourceid,name,resourcetype,timezone,statecode)` | `bookableresourcecategoryassnid`, `_resource_value`, `_resourcecategory_value` | — |
| `useResourceCategoryMap.ts` | `statecode eq 0` | `ResourceCategory($select=name,tn_bufferminutes,tn_slotdurationmins)` | `_resource_value`, `_resourcecategory_value` | Cached 30min. Uses `OData.Community.Display.V1.FormattedValue` annotation |
| `HomePage.tsx` | `statecode eq 0` | `Resource($select=bookableresourceid,name;$filter=statecode eq 0)` | `_resourcecategory_value` | Cached 30min. Counts unique resources per category client-side |

### bookableresourcebookings

| Source | Filter | Fields | Notes |
|--------|--------|--------|-------|
| `useAvailability.ts` | `_resource_value eq {id}` AND `endtime gt {dayStart}` AND `starttime lt {dayEnd}` AND `statecode eq 0` | `starttime`, `endtime` | `$orderby=starttime` |
| `useBookings.ts` | `_resource_value eq {id}` AND `starttime lt {end}` AND `endtime gt {start}` AND `statecode eq 0` | `bookableresourcebookingid` | Conflict check. Optionally excludes a booking ID |
| `useTodaysBusyness.ts` | `starttime lt {dayEnd}` AND `endtime gt {dayStart}` AND `statecode eq 0` | `_resource_value`, `starttime`, `endtime` | Cached 5min. Counts per-resource in JS for busyness ratios |

### bookingstatuses

| Source | Filter | Fields | Notes |
|--------|--------|--------|-------|
| `useBookingStatuses.ts` | `statecode eq 0` | `bookingstatusid`, `name`, `status`, `description` | `$orderby=name`, cached 1hr |

### tn_citizenservicebookings

| Source | Filter | Expand | Fields | Notes |
|--------|--------|--------|--------|-------|
| `useMyBookings.ts` | `_tn_citizen_value eq {id}` AND `statecode eq 0` | `tn_Booking($select=bookableresourcebookingid,name,starttime,endtime,_resource_value;$expand=Resource($select=name,bookableresourceid),BookingStatus($select=name,bookingstatusid))` | `tn_citizenservicebookingid`, `tn_name`, `tn_requestedstart`, `tn_requestedend`, `tn_duration`, `tn_servicetype`, `tn_status`, `tn_notes`, `_tn_citizen_value`, `_tn_booking_value`, `statecode` | `$orderby=tn_requestedstart`. Nested expand pulls Resource name and BookingStatus |

### calendars (ExpandCalendar bound function)

| Source | Call | Response Fields | Notes |
|--------|------|-----------------|-------|
| `useCalendarCapacity.ts` | `calendars({id})/Microsoft.Dynamics.CRM.ExpandCalendar(Start=@s,End=@e)` | `Start`, `End`, `TimeCode`, `SubCode`, `Effort` | Cached 5min. Filters blocks where `TimeCode="Filter"` + `SubCode="ResourceCapacity"` or `TimeCode="Available"`. Slots and capacity computed client-side |

---

## Writes

### Creates (POST)

| Source | Table | Fields | Lookups |
|--------|-------|--------|---------|
| `useBookings.ts` | bookableresourcebookings | `name`, `starttime`, `endtime`, `duration`, `bookingtype` | `Resource@odata.bind`, `BookingStatus@odata.bind` |
| `useCitizenBookings.ts` | bookableresourcebookings | `name`, `starttime`, `endtime`, `duration`, `bookingtype` | `Resource@odata.bind`, `BookingStatus@odata.bind` |
| `useCitizenBookings.ts` | tn_citizenservicebookings | `tn_name`, `tn_requestedstart`, `tn_requestedend`, `tn_duration`, `tn_servicetype`, `tn_status`, `tn_notes` | `tn_Citizen@odata.bind`, `tn_Booking@odata.bind` |

### Updates (PATCH)

| Source | Table | Fields | Notes |
|--------|-------|--------|-------|
| `useCitizenBookings.ts` | tn_citizenservicebookings | `tn_status`, `statecode`, `statuscode` | Cancellation flow |
| `useCitizenBookings.ts` | bookableresourcebookings | `statecode`, `statuscode`, `BookingStatus@odata.bind` | Cancellation flow |

### Deletes

None in app code (only in seed/clean scripts).

---

## Client-Side Aggregations

No OData `$apply`/`groupby`/`aggregate` queries are used. All aggregation happens in JavaScript:

| Source | What It Does |
|--------|-------------|
| `useTodaysBusyness.ts` | Fetches all of today's bookings, counts per resource to compute busyness ratios |
| `HomePage.tsx` | Fetches all category assignments, counts unique resources per category |
| `useCalendarCapacity.ts` | Fetches calendar time blocks via `ExpandCalendar`, splits into slot intervals, subtracts existing bookings to compute available slots and remaining capacity |

---

## Authentication

| Context | Method |
|---------|--------|
| Browser (app) | MSAL — `acquireTokenSilent()` with `acquireTokenPopup()` fallback |
| Scripts (seed/clean/schema) | Client credentials OAuth via `.env` (`CLIENT_ID`, `CLIENT_SECRET`, `TENANT_ID`, `DATAVERSE_URL`) |

## Caching

| Hook / Source | TTL |
|---------------|-----|
| `useCategories.ts` | 30 min |
| `useResourceCategoryMap.ts` | 30 min |
| `HomePage.tsx` (category assignments) | 30 min |
| `useCalendarCapacity.ts` | 5 min |
| `useTodaysBusyness.ts` | 5 min |
| `useBookingStatuses.ts` | 1 hr |
