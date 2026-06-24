/**
 * One-off: produce a populated "My Bookings" screenshot (11-my-bookings.png).
 *
 * The Playwright demo citizen starts with no bookings, so the page is empty. This
 * spec creates two free bookings (Recycling + Library) in different categories so
 * the list AND the category-filter chips render, captures the shot, then cancels
 * both to clean up. Run on demand:
 *
 *   npx playwright test --project=authenticated tests/e2e/mybookings-shot.spec.ts
 */
import { test, expect, type Page } from "@playwright/test"
import { gotoAuthenticated, contentShot } from "./helpers"
import path from "node:path"

const OUT = path.resolve(process.cwd(), "docs/article/images")

test.use({ viewport: { width: 1280, height: 1500 } })
test.setTimeout(180_000)

async function openCategory(page: Page, name: string) {
  const card = page.locator('a[href^="/browse/"]').filter({ hasText: name }).first()
  await expect(card).toBeVisible({ timeout: 20_000 })
  await card.click()
}

/** Create one free booking in the given category on a future date. */
async function createBooking(page: Page, category: string) {
  await page.goto("/")
  await openCategory(page, category)
  await page.locator('a[href^="/book/"]').first().click()
  await expect(
    page.getByText(/slots available|No time slots available/i).first(),
  ).toBeVisible({ timeout: 25_000 })

  // Move a few days out to avoid "now"/seed clashes.
  const days = page.locator('button:has(span.text-lg)')
  if ((await days.count()) > 5) {
    await days.nth(5).click()
    await expect(
      page.getByText(/slots available|No time slots available/i).first(),
    ).toBeVisible({ timeout: 25_000 })
  }

  // First bookable slot (multi-capacity → "spaces left", capacity-1 → "available").
  const slot = page.getByRole("button", { name: /available|spaces left/i }).first()
  await expect(slot).toBeVisible({ timeout: 20_000 })
  await slot.click()

  const confirm = page.getByRole("button", { name: /^Confirm Booking$/ })
  await expect(confirm).toBeVisible({ timeout: 15_000 })
  await confirm.click()
  await expect(page.getByText(/Booking confirmed/i)).toBeVisible({ timeout: 20_000 })
}

test("populate, capture, then clean up My Bookings", async ({ page }) => {
  await gotoAuthenticated(page, "/")
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Hello,", {
    timeout: 20_000,
  })

  await createBooking(page, "Recycling Centre")
  await createBooking(page, "Library")

  // Capture the populated page.
  await page.goto("/my-bookings")
  await expect(page.getByRole("heading", { name: "My Bookings" })).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('button.text-destructive')).toHaveCount(2, { timeout: 20_000 })
  await page.waitForTimeout(1_000)
  await contentShot(page, path.join(OUT, "11-my-bookings.png"))

  // Clean up: cancel every upcoming booking.
  const cancelBtns = page.locator('button.text-destructive')
  let remaining = await cancelBtns.count()
  while (remaining > 0) {
    await cancelBtns.first().click()
    await page.getByRole("button", { name: "Cancel booking" }).click()
    await expect(cancelBtns).toHaveCount(remaining - 1, { timeout: 20_000 })
    remaining = await cancelBtns.count()
  }
  // Confirm nothing is left upcoming.
  await expect(page.getByText(/No upcoming bookings/i)).toBeVisible({ timeout: 20_000 })
})
