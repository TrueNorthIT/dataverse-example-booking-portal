/**
 * Article screenshot capture (not a behavioural test).
 *
 * Drives the live, authenticated app via the SPA and saves PNGs into
 * docs/article/images/ for the LinkedIn write-up. It navigates by clicking
 * through the UI (home → category → venue) so no resource GUIDs are hardcoded,
 * and it deliberately STOPS before any "Confirm"/final "Pay" action so no real
 * bookings are created against Dataverse.
 *
 * Run:  npx playwright test --project=authenticated tests/e2e/screenshots.spec.ts
 */
import { test, expect, type Page } from "@playwright/test"
import { gotoAuthenticated, contentShot } from "./helpers"
import path from "node:path"

const OUT = path.resolve(process.cwd(), "docs/article/images")
const shot = (page: Page, name: string) => contentShot(page, path.join(OUT, name))

// A tall viewport so each booking page's key card is captured in one frame.
test.use({ viewport: { width: 1280, height: 1500 } })
test.describe.configure({ mode: "serial", timeout: 180_000 })

/** On the home page, open a category by its visible name. */
async function openCategory(page: Page, name: string) {
  const card = page.locator('a[href^="/browse/"]').filter({ hasText: name }).first()
  await expect(card).toBeVisible({ timeout: 20_000 })
  await card.click()
}

/** On a category page, open the first venue (book) card. */
async function openFirstVenue(page: Page) {
  const venue = page.locator('a[href^="/book/"]').first()
  await expect(venue).toBeVisible({ timeout: 20_000 })
  await venue.click()
}

/** On a category page, open a specific venue by name. */
async function openVenueNamed(page: Page, name: string) {
  const venue = page.locator('a[href^="/book/"]').filter({ hasText: name }).first()
  await expect(venue).toBeVisible({ timeout: 20_000 })
  await venue.click()
}

/** Wait until the availability grid has rendered (or reports none). */
async function waitForSlots(page: Page) {
  await expect(
    page.getByText(/slots available|No time slots available/i).first(),
  ).toBeVisible({ timeout: 25_000 })
}

test("capture article screenshots", async ({ page }) => {
  // ---- 01 Catalogue (home) -------------------------------------------------
  await gotoAuthenticated(page, "/")
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Hello,", {
    timeout: 20_000,
  })
  await expect(page.locator('a[href^="/browse/"]').first()).toBeVisible({
    timeout: 20_000,
  })
  await shot(page, "01-catalogue.png")

  // ---- 02/03 Recycling Centre — capacity countdown + Friday notice ---------
  await openCategory(page, "Recycling Centre")
  await openFirstVenue(page)
  await waitForSlots(page)
  await shot(page, "02-recycling-slots.png")

  // Find a Friday in the date strip to surface the reduced-capacity banner.
  const dayButtons = page.locator('button:has(span.text-lg)')
  const friNotice = page.getByText(/reduced capacity on Fridays/i)
  let foundFriday = false
  const count = await dayButtons.count()
  for (let i = 0; i < count; i++) {
    const btn = dayButtons.nth(i)
    if ((await btn.locator("span", { hasText: /^Fri$/ }).count()) > 0) {
      await btn.click()
      await waitForSlots(page)
      if (await friNotice.isVisible().catch(() => false)) {
        foundFriday = true
        break
      }
    }
  }
  if (foundFriday) await shot(page, "03-recycling-friday.png")
  else console.log("[screenshots] Friday notice not surfaced — skipped 03")

  // ---- 04 Register Office — fixed 30-min slots ----------------------------
  await page.goto("/")
  await openCategory(page, "Register Office")
  await openFirstVenue(page)
  await waitForSlots(page)
  await shot(page, "04-register-office.png")

  // ---- 05 Sports Pitch — session length picker + changeover notice --------
  await page.goto("/")
  await openCategory(page, "Sports Pitch")
  await openFirstVenue(page)
  await waitForSlots(page)
  await shot(page, "05-sports-session-length.png")

  // (The 05 shot already shows the auto-inserted "Changeover" cells, so there is
  //  no separate changeover capture.)

  // ---- 07 Venue Hire — event-led filter (guests + facilities) -------------
  await page.goto("/")
  await openCategory(page, "Venue Hire")
  await expect(page.getByText(/How many guests\?/i)).toBeVisible({ timeout: 20_000 })
  // Select a large party so smaller rooms drop into the "too small" section.
  await page.locator("#guests").click()
  await page.getByRole("option", { name: "300+" }).click()
  // Toggle a facility filter chip to show filtering in action.
  await page.getByRole("button", { name: /^Kitchen$/ }).first().click()
  await expect(page.locator('a[href^="/book/"]').first()).toBeVisible({ timeout: 20_000 })
  await shot(page, "07-venue-filter.png")

  // ---- 08 Venue Hire — session blocks with prices -------------------------
  // Go to a room that has BOTH a ticketed-rate difference and add-ons.
  await page.goto("/")
  await openCategory(page, "Venue Hire")
  await expect(page.getByText(/How many guests\?/i)).toBeVisible({ timeout: 20_000 })
  await openVenueNamed(page, "Alexandra Hall")
  await expect(page.getByText(/Choose a session/i)).toBeVisible({ timeout: 20_000 })
  // Wait for session prices (not skeletons) to render.
  await expect(page.getByRole("button", { name: /Morning/i })).toBeVisible({ timeout: 20_000 })
  await shot(page, "08-venue-sessions.png")

  // ---- 09 Venue Hire — tickets toggle + add-ons + total -------------------
  // Evening (18:00–23:00) avoids the daytime seed bookings, so the slot is free
  // and the payment step below will open.
  await page.getByRole("button", { name: /Evening/i }).click()
  const confirmCard = page.getByText(/Confirm your booking/i)
  await expect(confirmCard).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText(/selling tickets/i)).toBeVisible({ timeout: 10_000 })
  await confirmCard.scrollIntoViewIfNeeded()
  await shot(page, "09-venue-tickets-addons.png")

  // (No separate payment-screen capture: it's a simulated card form, and reaching
  //  it depends on a free venue slot in live data. Shot 09 already shows the price,
  //  tickets toggle, add-ons and the "Pay £…" total — the payment story.)

  // (11-my-bookings.png is owned by mybookings-shot.spec.ts, which populates the
  //  account with real bookings first — this account is otherwise empty.)
})
