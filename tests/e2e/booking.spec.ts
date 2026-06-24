import { test, expect } from "@playwright/test"
import { gotoAuthenticated } from "./helpers"

test.describe("Booking flow", () => {
  test("navigate from category to venue to availability", async ({ page }) => {
    await gotoAuthenticated(page, "/")

    // Wait for categories to load
    const categoryLinks = page.locator('a[href^="/browse/"]')
    await expect(categoryLinks.first()).toBeVisible({ timeout: 15_000 })

    // Click the first category
    await categoryLinks.first().click()

    // Should be on /browse/<id> — see venue/resource cards
    await expect(page).toHaveURL(/\/browse\//)
    const venueLinks = page.locator('a[href^="/book/"]')
    await expect(venueLinks.first()).toBeVisible({ timeout: 15_000 })

    // Click the first venue
    await venueLinks.first().click()

    // Should be on /book/<id> — see date picker and availability
    await expect(page).toHaveURL(/\/book\//)

    // Date picker heading
    await expect(page.getByText("Select a date")).toBeVisible({
      timeout: 10_000,
    })

    // Available times heading
    await expect(page.getByText("Available times")).toBeVisible()

    // Slots should render — either time slot buttons or "No time slots available"
    // or loading placeholders (animate-pulse divs)
    await expect(
      page.locator('button:has-text("–"), [class*="animate-pulse"], :text("No time slots available")').first()
    ).toBeVisible({ timeout: 15_000 })
  })
})
