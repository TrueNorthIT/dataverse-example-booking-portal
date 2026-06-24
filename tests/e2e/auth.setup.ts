import { test as setup, expect } from "@playwright/test"

setup("authenticate via Auth0", async ({ page }) => {
  const email = process.env.AUTH0_TEST_EMAIL
  const password = process.env.AUTH0_TEST_PASSWORD

  if (!email || !password) {
    throw new Error(
      "AUTH0_TEST_EMAIL and AUTH0_TEST_PASSWORD must be set in .env"
    )
  }

  // Navigate to app — AuthGuard will redirect to Auth0
  await page.goto("/")
  await page.waitForURL(/auth0\.com/, { timeout: 15_000 })

  // Fill Auth0 Universal Login form
  await page.fill('input[name="username"], input[name="email"]', email)
  await page.fill('input[name="password"]', password)
  await page.getByRole("button", { name: "Continue", exact: true }).click()

  // Auth0 may show a consent screen — accept it if it appears
  try {
    await page.waitForURL(/\/u\/consent/, { timeout: 5_000 })
    // Click the Accept / Allow button on the consent page
    await page
      .getByRole("button", { name: /accept|allow|authorize/i })
      .click({ timeout: 5_000 })
  } catch {
    // No consent screen — already redirecting back
  }

  // Wait for redirect back to our app
  await page.waitForURL("http://localhost:5173/**", { timeout: 30_000 })

  // Verify we're authenticated — the greeting should appear
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Hello,",
    { timeout: 15_000 }
  )

  // Save auth state for other tests
  await page.context().storageState({ path: ".auth/user.json" })
})
