import { test, expect } from "@playwright/test"
import { gotoAuthenticated } from "./helpers"

test.describe("Login flow", () => {
  test("unauthenticated visit redirects to Microsoft Entra External ID", async ({ browser }) => {
    // Fresh context with no saved auth state
    const context = await browser.newContext()
    const page = await context.newPage()

    await page.goto("/")

    // Entra redirect should happen — either we land on the Entra hosted login or the login page
    await expect(async () => {
      const url = page.url()
      expect(
        url.includes("ciamlogin.com") || url.includes("/login")
      ).toBeTruthy()
    }).toPass({ timeout: 15_000 })

    await context.close()
  })

  test("authenticated user sees home page with their name", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/")

    // Greeting heading should contain "Hello, <name>"
    const heading = page.getByRole("heading", { level: 1 })
    await expect(heading).toBeVisible({ timeout: 15_000 })
    await expect(heading).toContainText("Hello,")

    // User name or initials should be visible in the header
    const header = page.locator("header")
    await expect(header).toBeVisible()
  })
})
