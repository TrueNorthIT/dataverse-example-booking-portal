# Dataverse Schema — Citizen Booking Portal

This document describes the Dataverse entities, custom columns, and relationships used by the Citizen Booking Portal. Everything is managed through the **CitizenBookings** solution (publisher prefix: `tn`).

## Solution

| Property | Value |
|---|---|
| Publisher | TrueNorth (`tn`, option prefix `88800`) |
| Solution | CitizenBookings |
| Version | 1.0.0.0 |

---

## OOB Entities (Customised)

These are out-of-box Dataverse entities that we've added to our solution. Custom columns (prefixed `tn_`) are ours; everything else is standard Dataverse.

### bookableresourcecategory

**Purpose:** Service categories — the top-level groupings citizens browse (e.g. "Leisure Centre", "Recycling Centre").

| Column | Type | Description |
|---|---|---|
| `bookableresourcecategoryid` | GUID | Primary key |
| `name` | String | Category name (e.g. "Leisure Centre") |
| `description` | String | Displayed on the category card |
| `tn_bufferminutes` | Integer (0–120) | Dead time after each booking for changeover (e.g. 15 min for Sports Pitch) |
| `tn_slotdurationmins` | Integer (15–480) | Duration of each booking slot in the availability grid |
| `tn_searchaliases` | String (max 1000) | Comma-separated search keywords citizens might use (e.g. "skip,tip,dump,rubbish"). Drives the search-as-you-type on the home page. Editable in Dataverse — changes appear in the portal immediately. |

### bookableresource

**Purpose:** Individual bookable venues/facilities (e.g. "Holt Park Active", "Kirkstall Road Recycling Centre").

| Column | Type | Description |
|---|---|---|
| `bookableresourceid` | GUID | Primary key |
| `name` | String | Resource name |
| `resourcetype` | Integer | Always `7` (Facility) for our seed data |
| `timezone` | Integer | Timezone code (85 = GMT Standard Time) |
| `statecode` | Integer | 0 = Active, 1 = Inactive |
| `_calendarid_value` | GUID | Link to the Work Hours calendar (capacity + hours) |

**Work Hours:** Capacity and operating hours are set via the `msdyn_SaveCalendar` action, which writes to the resource's calendar. This drives the availability grid — the portal reads calendar rules to determine open slots and per-slot capacity.

### bookableresourcebooking

**Purpose:** The actual bookings — one record per citizen booking.

| Column | Type | Description |
|---|---|---|
| `bookableresourcebookingid` | GUID | Primary key |
| `name` | String | Booking title (e.g. "Gym Session") |
| `starttime` | DateTime | Start time |
| `endtime` | DateTime | End time |
| `duration` | Integer | Duration in minutes |
| `bookingtype` | Integer | Always `1` (Solid) |
| `_resource_value` | GUID | FK → `bookableresource` |
| `_bookingstatus_value` | GUID | FK → `bookingstatus` |
| `statecode` | Integer | 0 = Active, 1 = Inactive (cancelled) |

### bookableresourcecategoryassn

**Purpose:** Junction table linking resources to categories (many-to-many). Each resource belongs to exactly one category in our model.

| Column | Type | Description |
|---|---|---|
| `bookableresourcecategoryassnid` | GUID | Primary key |
| `_resource_value` | GUID | FK → `bookableresource` |
| `_resourcecategory_value` | GUID | FK → `bookableresourcecategory` |

### bookingstatus

**Purpose:** Status values for bookings (OOB, not customised). Standard statuses include Scheduled, In Progress, Completed, Canceled.

| Column | Type | Description |
|---|---|---|
| `bookingstatusid` | GUID | Primary key |
| `name` | String | Status name |
| `status` | Integer | Status code |

### contact

**Purpose:** Demo citizen personas. Each persona is a contact record with an email address used to link bookings to citizens.

| Column | Type | Description |
|---|---|---|
| `contactid` | GUID | Primary key |
| `firstname` | String | First name |
| `lastname` | String | Last name |
| `emailaddress1` | String | Email — used as the unique key for persona matching |

---

## Custom Entity

### tn_citizenservicebooking

**Purpose:** Citizen-facing booking wrapper. Links a citizen (contact) to an underlying `bookableresourcebooking`. This is the entity the citizen portal reads/writes for "My Bookings". Separates the citizen-facing data model from the scheduling engine.

| Column | Type | Description |
|---|---|---|
| `tn_citizenservicebookingid` | GUID | Primary key |
| `tn_name` | String (200) | Booking name / title |
| `tn_requestedstart` | DateTime | Requested start time |
| `tn_requestedend` | DateTime | Requested end time |
| `tn_duration` | Integer (0–1440) | Duration in minutes |
| `tn_notes` | Memo (2000) | Free-text notes from the citizen |
| `tn_servicetype` | Picklist | Service type (see option set below) |
| `tn_status` | Picklist | Booking status (see option set below) |
| `_tn_citizen_value` | Lookup | FK → `contact` (nav prop: `tn_Citizen`) |
| `_tn_booking_value` | Lookup | FK → `bookableresourcebooking` (nav prop: `tn_Booking`) |

#### tn_servicetype Option Set

| Value | Label |
|---|---|
| 888000000 | Leisure |
| 888000001 | Recycling |
| 888000002 | Sports |
| 888000003 | Community |
| 888000004 | Library |
| 888000005 | Registration |

#### tn_status Option Set

| Value | Label |
|---|---|
| 888000000 | Requested |
| 888000001 | Confirmed |
| 888000002 | In Progress |
| 888000003 | Completed |
| 888000004 | Cancelled |

---

## Relationships

| Relationship Schema | From (Referencing) | To (Referenced) | Nav Property | Purpose |
|---|---|---|---|---|
| `tn_citizen_csb` | `tn_citizenservicebooking` | `contact` | `tn_Citizen` | Which citizen made the booking |
| `tn_booking_csb` | `tn_citizenservicebooking` | `bookableresourcebooking` | `tn_Booking` | Links to the underlying scheduling booking |

---

## Seed Data Summary

Created by `npm run seed`:

| Entity | Count | Notes |
|---|---|---|
| Contacts | 5 | 4 demo citizens + 1 traffic contact |
| Categories | 6 | Leisure Centre, Recycling Centre, Sports Pitch, Community Hub, Library, Register Office |
| Resources | 28 | Distributed across 6 categories |
| Category Assignments | 28 | 1:1 resource → category |
| Sample Bookings | ~85 | Named bookings spread across 2 weeks, attributed to citizen personas |
| Fill Bookings | ~477 | Traffic bookings across 10 days for busyness indicators |

---

## CLI Scripts

| Command | Script | Description |
|---|---|---|
| `npm run schema` | `scripts/schema.ts` | Creates/updates publisher, solution, custom entity, columns, relationships. Adds OOB entities to solution. Idempotent. |
| `npm run seed` | `scripts/seed.ts` | Creates contacts, categories (with aliases), resources, work hours, category assignments, bookings, and CSB records. Idempotent. |
| `npm run clean` | `scripts/clean.ts` | Deletes all seed data. Use `--force` to skip confirmation prompt. Leaves publisher, solution, and schema in place. |

All scripts use client-credentials OAuth via `.env` variables: `CLIENT_ID`, `CLIENT_SECRET`, `TENANT_ID`, `DATAVERSE_URL`.
