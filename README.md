# Leeds City Council — Book a Service - Demo based on the services offered on LCC website

A product-led booking portal for council services, built on Microsoft Dataverse. Citizens browse categories, pick a time slot, and book — all through a modern React frontend that talks to the [Dataverse Contact API](https://github.com/TrueNorthIT/dataverse-contact-api) (`citizenbooking` scope). The API handles authentication (Auth0), authorisation (RBAC + row-level scoping), and proxies all requests to Dataverse. The React app never touches Microsoft's APIs directly.

## How It Works — End to End

This section traces exactly what the React app calls, what the API does, and what gets created in Dataverse for every user action.

### Architecture

```
┌─────────────────┐         ┌─────────────────────────────┐         ┌──────────────┐
│   Browser        │  Auth0  │   Dataverse Contact API      │  OAuth  │  Dataverse   │
│   (React SPA)    │  JWT    │   /api/v2/citizenbooking/    │  S2S    │  Web API     │
│                  │────────►│                              │────────►│  OData v4    │
│  Auth0 PKCE      │         │  1. Validate Auth0 JWT       │         │              │
│  login           │         │  2. Check RBAC permission    │         │  bookable    │
│                  │◄────────│  3. Resolve contact by email │◄────────│  resources   │
│  TanStack Query  │  JSON   │  4. Query scoped by contact  │  JSON   │  bookings    │
│  cache           │         │  5. Proxy to Dataverse       │         │  categories  │
└─────────────────┘         └─────────────────────────────┘         └──────────────┘
```

The React app authenticates citizens via **Auth0 PKCE**, gets a JWT, and sends it with every request to the API. The API validates the JWT, checks RBAC permissions, resolves the citizen's email to a Dataverse contact ID, and proxies the request to Dataverse using **server-to-server** (client credentials) authentication. Citizens never get a Dataverse token.

### Dataverse Tables Used

| Dataverse Table | API Route Name | API Path | Description |
|---|---|---|---|
| `bookableresourcecategories` | `service` | `/citizenbooking/public/service` | Service categories (Leisure Centre, Library, etc.) |
| `bookableresources` | `venue` | `/citizenbooking/public/venue` | Bookable venues and facilities |
| `bookableresourcecategoryassns` | `servicevenue` | `/citizenbooking/public/servicevenue` | Junction table: which venues offer which services |
| `bookingstatuses` | `status` | `/citizenbooking/public/status` | Booking status lookup (Scheduled, Canceled, etc.) |
| `bookableresourcebookings` | `booking` | `/citizenbooking/public/booking` | Individual time-slot bookings |
| `tn_citizenservicebookings` | `servicebooking` | `/citizenbooking/me/servicebooking` | Citizen-facing booking record (links citizen to venue booking) |
| `contacts` | `citizen` | `/citizenbooking/me/citizen` | Citizen contact records |
| `calendars` (ExpandCalendar) | `expand-calendar` | `/citizenbooking/actions/expand-calendar/{id}` | Working hours + capacity blocks |

### What Each Page Calls

---

#### 1. Home Page (`/`) — Browse Services

**What the citizen sees:** Category cards (Leisure Centre, Recycling Centre, etc.) with search.

**React hooks:**
- `useCategories()` — fetches all service categories
- `useApiListAll(queryKeys.categoryResourceNames, "servicevenue", …)` — fetches all venue-to-category assignments for search

**API calls:**

| # | React Hook | HTTP Request | API Route |
|---|---|---|---|
| 1 | `useCategories` | `GET /api/v2/citizenbooking/public/service` | List all active service categories |
| 2 | `useApiListAll` | `GET /api/v2/citizenbooking/public/servicevenue?expand=Resource` | List all service-venue links with venue names |

**What the API does:**
1. No auth required (`publicRead: true` on both tables)
2. Applies default filter `statecode eq 0` (active records only)
3. Proxies to Dataverse: `GET bookableresourcecategories?$filter=statecode eq 0&$select=bookableresourcecategoryid,name,description,tn_searchaliases&$orderby=name`
4. Returns JSON with `data` array

**What's read from Dataverse:**
- `bookableresourcecategories` — 6 category records
- `bookableresourcecategoryassns` with `$expand=Resource` — ~27 venue assignment records

---

#### 2. Category Page (`/browse/:categoryId`) — Pick a Venue

**What the citizen sees:** List of venues in a category, sorted by distance, with busyness indicators.

**React hooks:**
- `useCategory(categoryId)` — single category details
- `useRoomsByCategory(categoryId)` — venues in this category
- `useTodaysBusyness()` — booking counts for busyness badges

**API calls:**

| # | React Hook | HTTP Request | API Route |
|---|---|---|---|
| 1 | `useCategory` | `GET /api/v2/citizenbooking/public/service/{categoryId}` | Single category |
| 2 | `useRoomsByCategory` | `GET /api/v2/citizenbooking/public/servicevenue?filter=resourcecategory eq {id}&expand=Resource` | Venues in category |
| 3 | `useTodaysBusyness` | `GET /api/v2/citizenbooking/public/booking?filter=starttime lt {dayEnd} and endtime gt {dayStart}` | Today's bookings |

**What the API does:**
1. No auth required (all public tables)
2. For venue list: queries `bookableresourcecategoryassns` with `$expand=Resource`, filters by category ID
3. For busyness: queries `bookableresourcebookings` for today's date range

**What's read from Dataverse:**
- `bookableresourcecategories({id})` — 1 record
- `bookableresourcecategoryassns` + expanded `bookableresources` — N venue records
- `bookableresourcebookings` — today's booking records for busyness calculation

---

#### 3. Book Resource Page (`/book/:resourceId`) — Pick a Time Slot

**What the citizen sees:** Date picker, session length picker, availability grid with slots showing "X left".

**React hooks:**
- `useRoom(resourceId)` — venue details + calendar ID
- `useResourceCategoryMap()` — maps venue → category (for buffer minutes, slot duration)
- `useCalendarCapacity(calendarId, date)` — working hours from Dataverse calendar
- `useAvailability(resourceId, date)` — existing bookings for overlap counting

**API calls:**

| # | React Hook | HTTP Request | API Route |
|---|---|---|---|
| 1 | `useRoom` | `GET /api/v2/citizenbooking/public/venue/{resourceId}` | Venue details |
| 2 | `useResourceCategoryMap` | `GET /api/v2/citizenbooking/public/servicevenue?expand=ResourceCategory` | All service-venue links with category config |
| 3 | `useCalendarCapacity` | `GET /api/v2/citizenbooking/actions/expand-calendar/{calendarId}?Start=...&End=...` | Working hours + capacity blocks |
| 4 | `useAvailability` | `GET /api/v2/citizenbooking/public/booking?filter=resource eq {id} and endtime gt {start} and starttime lt {end}` | Existing bookings for the day |

**What the API does:**
1. Venue + servicevenue: public reads, proxied to Dataverse
2. ExpandCalendar: invokes the Dataverse `ExpandCalendar` function (entity-bound to `calendars`). Configured as `publicInvoke: true` in the API's custom API config. Returns working hour blocks with capacity (Effort) per block
3. Bookings: public read with date-range filter

**What's read from Dataverse:**
- `bookableresources({id})` — 1 venue record (name, calendar ID, timezone)
- `bookableresourcecategoryassns` with `$expand=ResourceCategory` — category config (buffer minutes, slot duration)
- `calendars({id})/Microsoft.Dynamics.CRM.ExpandCalendar(Start=@s,End=@e)` — working hour blocks with Effort (capacity) per time block
- `bookableresourcebookings` — existing bookings for the day (for client-side overlap calculation)

**Client-side computation** (`useAvailability` hook):
- Takes working-hour blocks from ExpandCalendar
- Divides each block into fixed-duration slots (e.g. 30 min)
- Counts overlapping bookings per slot
- Subtracts from capacity to get `spotsLeft`
- Applies buffer minutes between bookings if configured on the category

---

#### 4. Confirm Booking (`CitizenBookingForm`) — Create the Booking

**What the citizen sees:** Confirmation card with resource name, date/time, optional notes, and "Confirm Booking" button.

**React hooks:**
- `useBookingStatuses()` — gets the "Scheduled" status ID
- `useCreateCitizenBooking()` — a single deep-insert mutation (the service booking carries its underlying venue booking nested under `tn_booking`)
- `checkConflict()` — last-second availability check before creating

**API calls (in sequence):**

| Step | HTTP Request | Purpose |
|---|---|---|
| 1 | `GET /api/v2/citizenbooking/public/booking?filter=resource eq {id} and starttime lt {end} and endtime gt {start}` | Conflict check — verify the slot is still free |
| 2 | `POST /api/v2/citizenbooking/me/servicebooking` | Create the citizen booking **and** its underlying venue booking in one deep-insert |

There is no separate `me/booking` write: the app nests the venue booking under `tn_booking`, and the API creates both records in a single transaction.

**Step 2 — What the React sends:**
```json
{
  "tn_name": "Lane Swimming",
  "tn_requestedstart": "2026-03-05T10:00:00Z",
  "tn_requestedend": "2026-03-05T10:30:00Z",
  "tn_duration": 30,
  "tn_status": 888000001,
  "tn_servicetype": 888000000,
  "tn_notes": "Optional citizen notes",
  "tn_booking": {
    "name": "Lane Swimming",
    "starttime": "2026-03-05T10:00:00Z",
    "endtime": "2026-03-05T10:30:00Z",
    "duration": 30,
    "bookingtype": 1,
    "resource": "{venueId}",
    "bookingstatus": "{scheduledStatusId}"
  }
}
```

**What the API does:**
1. Validates the Auth0 JWT and checks the `servicebooking` **create** permission
2. Resolves the citizen's email → Dataverse contact ID and **auto-binds** `tn_Citizen` (via `createDefaults` — the caller never sends it)
3. Deep-inserts `tn_booking`: creates a `bookableresourcebooking` (transforming `resource`/`bookingstatus` into `@odata.bind` lookups) and binds `tn_Booking` to it
4. POSTs to Dataverse: `POST tn_citizenservicebookings` with the nested booking, returning the created record

**What gets created in Dataverse:**
```
bookableresourcebookings (nested insert)
├── name, starttime, endtime, duration
├── bookingtype: 1 (Solid)
├── Resource: → bookableresources({venueId})          ← lookup
└── BookingStatus: → bookingstatuses({scheduledId})   ← lookup (Scheduled)

tn_citizenservicebookings
├── tn_name, tn_requestedstart, tn_requestedend, tn_duration
├── tn_status: 888000001 (Confirmed)
├── tn_servicetype: 888000000 (Leisure)
├── tn_notes: "Optional citizen notes"
├── tn_Citizen: → contacts({contactId})                  ← auto-bound by API
└── tn_Booking: → bookableresourcebookings(...)          ← the nested booking above
```

For paid **Venue Hire**, a Stripe PaymentIntent (test mode) is confirmed first via the `PaymentStep` component; the booking is only created once payment succeeds.

**After success:** the app invalidates the `["availability"]`, `["myBookings"]` and `["todaysBusyness"]` query keys, triggering background re-fetches.

---

#### 5. My Bookings Page (`/my-bookings`) — View & Cancel

**What the citizen sees:** Upcoming/past tabs, category filter chips, booking cards with cancel button.

**React hooks:**
- `useMyBookings()` — citizen's service bookings with nested expand
- `useResourceCategoryMap()` — category names for filter chips
- `useBookingStatuses()` — status lookup (for cancel status ID)
- `useCancelCitizenBooking()` — two-step cancel mutation

**API calls (read):**

| # | React Hook | HTTP Request | API Route |
|---|---|---|---|
| 1 | `useMyBookings` | `GET /api/v2/citizenbooking/me/servicebooking?expand=tn_Booking` | Citizen's bookings |
| 2 | `useResourceCategoryMap` | `GET /api/v2/citizenbooking/public/servicevenue?expand=ResourceCategory` | Category map |
| 3 | `useBookingStatuses` | `GET /api/v2/citizenbooking/public/status` | Status lookup |

**What the API does for "My Bookings" (the `me` tier):**
1. Validates Auth0 JWT
2. Extracts email from JWT
3. Resolves email → Dataverse contact ID (via `contactJoinPath` config on `tn_citizenservicebooking`)
4. Injects filter: `_tn_citizen_value eq {contactId}` — the citizen only sees **their own** records
5. Proxies to Dataverse with `$expand=tn_Booking($select=bookableresourcebookingid,name,starttime,endtime)`
6. Returns scoped results

**Cancel flow (two PATCHes in sequence):**

| Step | HTTP Request | API Route | Payload |
|---|---|---|---|
| 1 | `PATCH /api/v2/citizenbooking/me/servicebooking/{csbId}` | Cancel the citizen booking (own record) | `{ "tn_status": 888000004, "statecode": 1, "statuscode": 2 }` |
| 2 | `PATCH /api/v2/citizenbooking/all/booking/{bookingId}` | Cancel the underlying venue booking | `{ "bookingstatus": "{cancelStatusId}", "statecode": 1, "statuscode": 2 }` |

Step 2 uses the **`all`** tier because `bookableresourcebooking` has no citizen link to scope it to `me` — so it requires the `booking:write:all` permission in the scope's `defaults.json`.

**What gets updated in Dataverse on cancel:**

```
tn_citizenservicebookings({csbId})
├── tn_status: 888000004 → Cancelled
├── statecode: 1 → Inactive
└── statuscode: 2 → Inactive

bookableresourcebookings({bookingId})
├── BookingStatus: → bookingstatuses({cancelStatusId})  ← "Canceled"
├── statecode: 1 → Inactive
└── statuscode: 2 → Inactive
```

---

### Complete API Call Map

Every API call the React app makes, with the React hook, HTTP method, API path, auth requirement, and the Dataverse query the API generates:

| React Hook | Method | API Path | Auth | Dataverse Query |
|---|---|---|---|---|
| `useCategories` | GET | `/citizenbooking/public/service` | None | `bookableresourcecategories?$filter=statecode eq 0&$select=...&$orderby=name` |
| `useCategory` | GET | `/citizenbooking/public/service/{id}` | None | `bookableresourcecategories({id})?$select=...` |
| `useRoom` | GET | `/citizenbooking/public/venue/{id}` | None | `bookableresources({id})?$select=...` |
| `useRoomsByCategory` | GET | `/citizenbooking/public/servicevenue?filter=...&expand=Resource` | None | `bookableresourcecategoryassns?$filter=_resourcecategory_value eq {id}&$expand=Resource(...)` |
| `useResourceCategoryMap` | GET | `/citizenbooking/public/servicevenue?expand=ResourceCategory` | None | `bookableresourcecategoryassns?$expand=ResourceCategory(...)` |
| `useBookingStatuses` | GET | `/citizenbooking/public/status` | None | `bookingstatuses?$filter=statecode eq 0&$select=...&$orderby=name` |
| `useAvailability` | GET | `/citizenbooking/public/booking?filter=...` | None | `bookableresourcebookings?$filter=_resource_value eq {id} and endtime gt ... and starttime lt ...` |
| `useTodaysBusyness` | GET | `/citizenbooking/public/booking?filter=...` | None | `bookableresourcebookings?$filter=starttime lt {dayEnd} and endtime gt {dayStart}` |
| `useCalendarCapacity` | GET | `/citizenbooking/actions/expand-calendar/{calId}?Start=...&End=...` | None | `calendars({id})/Microsoft.Dynamics.CRM.ExpandCalendar(Start=@s,End=@e)` |
| `useMyBookings` | GET | `/citizenbooking/me/servicebooking?expand=tn_Booking` | JWT | `tn_citizenservicebookings?$filter=_tn_citizen_value eq {contactId}&$expand=tn_Booking(...)` |
| `checkConflict` | GET | `/citizenbooking/public/booking?filter=...` | None | `bookableresourcebookings?$filter=_resource_value eq {id} and starttime lt {end} and endtime gt {start}` |
| `useCreateCitizenBooking` | POST | `/citizenbooking/me/servicebooking` | JWT | `POST tn_citizenservicebookings` (deep insert: nested `tn_booking` → `bookableresourcebookings`, auto-bound citizen) |
| `useCancelCitizenBooking` (1/2) | PATCH | `/citizenbooking/me/servicebooking/{id}` | JWT | `PATCH tn_citizenservicebookings({id})` |
| `useCancelCitizenBooking` (2/2) | PATCH | `/citizenbooking/all/booking/{id}` | JWT | `PATCH bookableresourcebookings({id})` |

### Dataverse Entity Relationship Map

```
bookableresourcecategories             bookableresources
┌──────────────────────────┐          ┌──────────────────────────────┐
│ "Leisure Centre"          │          │ "Armley Leisure Centre"       │
│ "Recycling Centre"        │◄────────►│ "Kirkstall Road Recycling"   │
│ "Sports Pitch"            │   assn   │ "Roundhay Park Pitch 1"      │
│ "Community Hub"           │          │ "Leeds Central Study Room A"  │
│ "Library"                 │          │    ...27 resources             │
│ "Register Office"         │          │                               │
│                           │          │ _calendarid_value ──► calendar │
│ tn_bufferminutes          │          └──────────────┬───────────────┘
│ tn_slotdurationmins       │                         │
└──────────────────────────┘                         │ Resource lookup
                                                      │
                                       bookableresourcebookings
                                      ┌──────────────▼───────────────┐
                                      │ name: "Lane Swimming"         │
                                      │ starttime / endtime / duration│
                                      │ Resource → venue              │
                                      │ BookingStatus → status        │
                                      │ bookingtype: 1 (Solid)        │
                                      └──────────────┬───────────────┘
                                                      │ tn_Booking lookup
                                                      │
                                      tn_citizenservicebookings
                                      ┌──────────────▼───────────────┐
contacts                              │ tn_name: "Lane Swimming"      │
┌────────────────────┐                │ tn_requestedstart / end       │
│ Sarah Johnson       │◄──────────────│ tn_Citizen → contact          │
│ James Wilson        │  tn_Citizen   │ tn_Booking → booking          │
│ Priya Patel         │  lookup       │ tn_status: Confirmed          │
└────────────────────┘                │ tn_servicetype: Leisure       │
                                      │ tn_notes: "optional"          │
bookingstatuses                       └───────────────────────────────┘
┌────────────────────┐
│ Scheduled           │
│ In Progress         │
│ Completed           │
│ Canceled            │
└────────────────────┘
```

### Option Set Values

**tn_status** (on `tn_citizenservicebooking`):

| Value | Label |
|---|---|
| 888000000 | Requested |
| 888000001 | Confirmed |
| 888000002 | In Progress |
| 888000003 | Completed |
| 888000004 | Cancelled |

**tn_servicetype** (on `tn_citizenservicebooking`):

| Value | Label | Mapped from Category |
|---|---|---|
| 888000000 | Leisure | Leisure Centre |
| 888000001 | Recycling | Recycling Centre |
| 888000002 | Sports | Sports Pitch |
| 888000003 | Community | Community Hub |
| 888000004 | Library | Library |
| 888000005 | Registration | Register Office |

## Getting Started

```bash
npm install

# Create .env from the example
cp .env.example .env
# Fill in VITE_API_BASE_URL (points to your Dataverse Contact API deployment)

npm run dev
# Opens at http://localhost:5173
```

### First Run

1. Sign in with Auth0 (citizen account)
2. Browse services on the home page
3. Pick a category → pick a venue → pick a date → pick a time slot
4. Confirm the booking
5. Go to "My Bookings" to view, filter by category, and cancel

### Environment Variables

```env
VITE_API_BASE_URL=https://api.dataverse-contact.tnapps.co.uk/api/v2
VITE_AUTH0_DOMAIN=your-auth0-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your-auth0-spa-client-id
VITE_AUTH0_AUDIENCE=your-citizenbooking-api-audience
```

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| UI Framework | React 19 + TypeScript | Component model, ecosystem, type safety |
| Build | Vite 7 | Fast HMR, ESM-native |
| Styling | Tailwind CSS v4 + shadcn/ui | Utility-first, accessible primitives, no runtime CSS |
| Auth | Auth0 SPA SDK | PKCE-based citizen authentication |
| Data | TanStack React Query | Caching, background refetch, cache invalidation |
| API | Dataverse Contact API (`citizenbooking` scope) | Secure proxy to Dataverse with RBAC + row-level scoping |
| Routing | react-router-dom v7 | Standard React routing |
| Dates | date-fns | Tree-shakeable, immutable date utils |
| Icons | lucide-react | Consistent icon set |
| Toasts | sonner | Lightweight notifications |

## Testing

Unit, hook and component tests run on [Vitest](https://vitest.dev) + React Testing Library (jsdom); end-to-end tests use Playwright.

```bash
npm test            # run the hermetic suite (unit + hooks + components)
npm run test:watch  # watch mode
npm run test:coverage   # enforce coverage thresholds (90% lines/statements/functions, 85% branches)
npm run test:e2e    # Playwright end-to-end (needs a running app + Auth0)
npm run test:live   # OPT-IN: hits real Dataverse using .env credentials (never part of CI/coverage)
```

- **Hermetic by default.** The Auth0 SDK and the Dataverse Contact API client are mocked (`__mocks__/`, wired in `tests/setup/`), so `npm test` needs no network or secrets. Shared helpers live in `tests/setup/test-utils.tsx` (`renderWithProviders`, `mockClient`, `setAuth0State`).
- **Where logic lives.** Booking/availability/pricing rules are pure functions in `src/lib/` (e.g. `availability.ts`, `slotGridLayout.ts`, `busyness.ts`, `venue.ts`, `bookings.ts`, `pricing.ts`) — unit-tested directly, with the React layer kept thin.
- **Coverage scope.** Vendored `components/ui/*`, generated types, the app entry, and the realtime transport contexts (covered by E2E) are excluded from the coverage gate.
- **`tests/live/`** is the old direct-Dataverse suite — kept as opt-in smoke tests, excluded from the default run and coverage.

## Seed Data

The seed page creates a realistic Leeds City Council environment:

**6 service categories** — Leisure Centre, Recycling Centre, Sports Pitch, Community Hub, Library, Register Office

**27 bookable resources** across those categories, with real Leeds location names (Armley, Kirkstall, Roundhay, Chapel Allerton, etc.) and appropriate capacities (leisure centres: 20-40 concurrent slots, meeting rooms: 1, sports pitches: 1)

**3 citizen contacts** — Sarah Johnson, James Wilson, Priya Patel — with ~85 sample bookings distributed across the next 12 days

## Production Considerations

This is a demo. For production, the main gaps are:

| Area | Demo | Production |
|------|------|------------|
| Conflict detection | Client-side query before create (race condition possible) | Dataverse plugin (C#) on booking create — transactional check |
| Authentication | Auth0 with demo personas | Auth0 with real citizen identity verification |
| Capacity | Calendar-based per resource | Per-activity, per-day, integrated with staff rotas and closure calendars |
| Real-time | Poll on page focus | SignalR via the API's real-time notifications (auto cache invalidation) |
| Hosting | `localhost:5173` | Azure Static Web Apps, Vercel, or any CDN (it's just static files + API calls) |
| Venue pricing & capacity | Hardcoded client-side in `src/lib/pricing.ts`, keyed by venue name | Read `tn_hourlyrate` / `tn_hourlyrateticketed` (+ a capacity column) from the API once the `citizenbooking` projection exposes them |
| Personas & locations | Hardcoded demo data in `src/lib/locations.ts` | Real signed-in identity + geocoded venue addresses from Dataverse |
| Payment | Stripe **test mode**, confirmed client-side (no webhook) | Live Stripe keys + a server-side webhook to confirm payment before the booking is written |
| Presence token | Web PubSub client-access token minted **in the browser** (`PresenceContext`) | Issue the token from a trusted backend — never ship the access key to the client |
