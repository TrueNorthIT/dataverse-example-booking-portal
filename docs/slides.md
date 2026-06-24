# Citizen Booking Platform
### Built on Dynamics 365 Field Service

---

## 1. The Opportunity

LCC has invested in Dataverse. Citizens want to self-serve.

Any bookable service — leisure, recycling, sports, libraries, registrations, and beyond — available online, feeding straight into the platform the council already runs on.

---

## 2. What Citizens Get

- Browse services and venues by category
- Distance-sorted venues with live busyness badges
- Smart availability grid — multi-duration, changeover-aware
- Book, view, and cancel in seconds
- Real-time updates across all users

Modern, mobile-first, no app download required.

*Today's demo shows council services — but the platform works for any bookable resource in Dataverse.*

---

## 3. What the Council Gets

Every citizen booking lands directly in Dataverse. No integration layer.

- **Schedule Board** — Gantt, map, list views across all venues
- **Power Automate** — confirmations, reminders, escalations
- **Power BI** — utilisation dashboards, peak-time analysis
- **Copilot** — AI scheduling assistance
- **Audit trail** — built-in, GDPR-compliant

New service types and venues are config, not code.

---

## 4. How It Works

> See [architecture-platform.drawio](architecture-platform.drawio) for the full diagram.

Citizen books at 9:00am → dispatcher sees it on the Schedule Board at 9:01am. Same record, same entity.

---

## 5. Two Approaches to Citizen Booking

| | Dataverse-Native | Third-Party Engine + Dataverse |
|---|---|---|
| **Backends** | One | Two |
| **Booking data** | In Dataverse | In third-party cloud + synced to Dataverse |
| **Sync service** | Not needed | Must build and maintain |
| **Admin tooling** | Schedule Board (included) | Build custom or use D365 anyway |
| **Power Platform** | Works immediately | Requires integration |
| **Additional cost** | None beyond existing D365 | €249–599/mo + sync infrastructure |

LCC already owns the scheduling engine. We just gave citizens a front door to it.
