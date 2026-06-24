import { test, expect } from "@playwright/test"
import { gotoAuthenticated } from "./helpers"

test.describe("Services home page", () => {
  test("displays service categories from API", async ({ page }) => {
    await gotoAuthenticated(page, "/")

    // Wait for greeting to confirm we're authenticated
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Hello,",
      { timeout: 15_000 }
    )

    // At least one category card link should be visible
    const categoryLinks = page.locator('a[href^="/browse/"]')
    await expect(categoryLinks.first()).toBeVisible({ timeout: 15_000 })

    // Check for known service category names
    const pageText = await page.textContent("body")
    const knownCategories = ["Leisure Centre", "Recycling Centre"]
    const found = knownCategories.filter((cat) => pageText?.includes(cat))
    expect(found.length).toBeGreaterThan(0)
  })

  test("search filters categories", async ({ page }) => {
    await gotoAuthenticated(page, "/")

    // Wait for categories to load
    const categoryLinks = page.locator('a[href^="/browse/"]')
    await expect(categoryLinks.first()).toBeVisible({ timeout: 15_000 })
    const countBefore = await categoryLinks.count()

    // Type a search term
    const searchInput = page.getByPlaceholder(/search/i)
    await searchInput.fill("leisure")

    // Wait for filtering — should have fewer (or same if only match) categories
    await expect(async () => {
      const countAfter = await categoryLinks.count()
      expect(countAfter).toBeLessThanOrEqual(countBefore)
      expect(countAfter).toBeGreaterThan(0)
    }).toPass({ timeout: 5_000 })
  })

  test("venue search shows matching venues", async ({ page }) => {
    await gotoAuthenticated(page, "/")

    // Wait for greeting
    await expect(
      page.getByRole("heading", { level: 1 })
    ).toContainText("Hello,", { timeout: 15_000 })

    // Search for a specific venue name (partial match)
    const searchInput = page.getByPlaceholder(/search/i)
    await searchInput.fill("holt park")

    // Should show matching venues section with direct book links
    const venueLinks = page.locator('a[href^="/book/"]')
    await expect(venueLinks.first()).toBeVisible({ timeout: 10_000 })
  })
})
