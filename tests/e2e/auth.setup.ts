import { test as setup, expect } from "@playwright/test"

setup("authenticate via Microsoft Entra External ID", async ({ page }) => {
  const email = process.env.ENTRA_TEST_EMAIL
  const password = process.env.ENTRA_TEST_PASSWORD

  if (!email || !password) {
    throw new Error(
      "ENTRA_TEST_EMAIL and ENTRA_TEST_PASSWORD must be set in .env"
    )
  }

  // Navigate to app — signing in redirects to the Entra hosted login page
  await page.goto("/")
  await page.waitForURL(/ciamlogin\.com/, { timeout: 15_000 })

  // Fill the Entra External ID sign-in form
  await page.fill('input[name="loginfmt"], input[type="email"]', email)
  await page.getByRole("button", { name: /next|continue/i }).click({ timeout: 5_000 }).catch(() => {})
  await page.fill('input[name="passwd"], input[type="password"]', password)
  await page.getByRole("button", { name: /sign in|next|continue/i }).click()

  // Entra may show a "stay signed in?" / consent screen — accept it if it appears
  try {
    await page
      .getByRole("button", { name: /yes|accept|allow|authorize/i })
      .click({ timeout: 5_000 })
  } catch {
    // No interstitial — already redirecting back
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
