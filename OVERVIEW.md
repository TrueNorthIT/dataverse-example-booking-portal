# dataverse-rbooking — Book a Service (Citizen Booking Portal)

## What it does — user, customer & business value

This is a citizen-facing booking portal for council services, demonstrated as "Leeds City Council — Book a Service". A resident signs in, browses service categories (Leisure Centre, Recycling Centre, Sports Pitch, Community Hub, Library, Register Office, Venue Hire), picks a nearby venue, chooses a date and time slot from a live availability grid, and confirms a booking — then views, filters, and cancels their bookings from a "My Bookings" page. Paid services (Venue Hire — town halls, community centres and school halls) take card payment via Stripe before the booking is created, with a "selling tickets / not selling tickets" rate choice mirroring Leeds' real venue-hire pricing. Venue Hire deliberately does **not** reuse the drop-in slot-grid model: it has its own event-led journey — an event date (defaulting ~4 weeks ahead) and guest-count filter that matches rooms by capacity, then booking by **session block** (Morning / Afternoon / Evening / Full day) rather than the hour, since nobody hires a hall for an hour. Helpful touches include venues sorted by distance from the user, quiet/moderate/busy indicators, and slot capacity ("X spots left").

For a local authority, the key value is that every booking lands directly in the council's own Microsoft Dataverse environment, using the standard Dynamics 365 Field Service booking tables. There is no separate booking SaaS and no sync layer: a booking a citizen makes at 9am is immediately visible to council staff on the D365 Schedule Board, can trigger Power Automate notifications, and feeds Power BI reporting — one source of truth. The accompanying COMPARISON-VS-HAPIO.md makes this strategic case in detail against a standalone booking engine (Hapio).

Citizens never need a Dynamics licence or any Microsoft credentials — they authenticate with Microsoft Entra External ID and only ever talk to the council's Contact Portal API, which enforces who can see and do what. The project is currently a demo/pilot with seeded Leeds data (6 categories, 27 venues, sample citizens and bookings); the README documents the known gaps to production (server-side conflict enforcement, real identity verification, notifications).

## Architecture overview

A React single-page application that talks exclusively to the **Dataverse Contact API** (`citizenbooking` scope) — the LA Stack's secure proxy in front of Dataverse. The SPA never calls Microsoft APIs directly.

```
Browser (React SPA) --Entra JWT--> Dataverse Contact API --S2S OAuth--> Dataverse Web API (OData)
     /api/v2/citizenbooking/...    (JWT validation, RBAC,               (D365 Field Service
                                    email->contact scoping)              booking tables)
```

Key components:

- **Frontend:** React 19 + TypeScript, Vite 7, Tailwind CSS v4 + shadcn/ui (Radix), react-router-dom v7, date-fns, sonner toasts.
- **Auth:** Microsoft Entra External ID via MSAL PKCE (`@azure/msal-browser` + `@azure/msal-react`, wrapped by the app's `useAuth()` adapter in `src/auth/useAuth.ts`); JWT sent on every API call. Public catalogue endpoints need no auth; `me/` endpoints are row-scoped to the signed-in citizen's Dataverse contact.
- **Data layer:** TanStack React Query hooks (`src/hooks/`) per entity — categories, venues, availability, my bookings — with cache invalidation after mutations; SignalR/Azure Web PubSub contexts (`src/contexts/`) for real-time cache invalidation, presence, and an API stats panel.
- **Dataverse tables:** `bookableresourcecategories`, `bookableresources`, `bookableresourcecategoryassns`, `bookingstatuses`, `bookableresourcebookings`, custom `tn_citizenservicebookings` (links citizen contact to the underlying booking), `contacts`, plus the native `ExpandCalendar` function for working hours and capacity.
- **Availability logic:** client-side — ExpandCalendar blocks are divided into slots, overlapping bookings counted against per-block capacity, with per-category buffer minutes and slot durations.
- **Booking flow:** conflict check, then two writes — `POST me/booking` (Field Service booking) and `POST me/servicebooking` (citizen record, contact auto-bound by the API). Cancel is two PATCHes.
- **Tooling:** generated TypeScript types via `@truenorth-it/dataverse-client`; `npm run schema` / `seed` / `clean` scripts to provision demo data.
- **Testing & code layout:** business logic (availability slots, busyness, venue matching, pricing, booking matching) lives as pure functions in `src/lib/` so the React layer stays thin. Tests are Vitest + React Testing Library (jsdom) with the `useAuth()` MSAL adapter (`tests/setup/auth-mock.ts`) and Dataverse client mocked (`__mocks__/`, `tests/setup/`); `npm run test:coverage` enforces a 90% gate (vendored UI primitives, generated types and the realtime transport contexts are excluded — the latter are covered by Playwright E2E). `tests/live/` is an opt-in suite that hits real Dataverse (`npm run test:live`), kept out of CI/coverage.
- **Payments:** Stripe (test mode) for Venue Hire. A single Vercel serverless function (`api/payment/create-intent.ts`) creates a PaymentIntent server-side (keeping `STRIPE_SECRET_KEY` off the client); the SPA confirms it with an embedded `PaymentElement` and only creates the booking once payment succeeds (client-side confirmation, no webhook in the demo). Per-room hourly rates and the tickets/no-tickets choice are currently held client-side in `src/lib/pricing.ts` (the Contact API's `citizenbooking` projection does not yet expose the new `tn_hourlyrate*` columns); the matching Dataverse columns exist (`tn_hourlyrate`, `tn_hourlyrateticketed` on `bookableresource`; `tn_amountpaid`, `tn_sellingtickets`, `tn_paymentreference` on the booking) and seeded data is written to them directly.
- **Deployment:** SPA (Vite build) deployed to Vercel (`vercel.json`) **plus** the payment serverless function under `/api`; runtime dependencies are the Contact API URL, Microsoft Entra External ID settings, and the Stripe keys (`VITE_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`) via env vars.
