import { type Page } from "@playwright/test"

/**
 * Screenshot the page cropped to the actual content height (header through the end
 * of the main content container), trimming the dead whitespace below short pages
 * and the floating dev widgets pinned to the viewport bottom.
 */
export async function contentShot(page: Page, outPath: string) {
  const vp = page.viewportSize()
  const width = vp?.width ?? 1280
  const maxH = vp?.height ?? 1500
  const box = await page.locator("main > div").first().boundingBox()
  const height = box ? Math.min(maxH, Math.ceil(box.y + box.height + 24)) : maxH
  await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width, height } })
}

/**
 * Navigate to a page and handle the full Auth0 re-auth flow.
 *
 * The app uses Auth0 with cacheLocation:"memory", so every page load triggers
 * a fresh loginWithRedirect(). With saved Auth0 session cookies, the redirect
 * auto-authenticates but may show consent + welcome interstitial screens.
 */
export async function gotoAuthenticated(page: Page, path = "/") {
  await page.goto(path)

  // Wait up to 45s for the full auth round-trip to complete
  const deadline = Date.now() + 45_000

  while (Date.now() < deadline) {
    await page.waitForTimeout(500)
    const url = page.url()

    // We're on the app — done!
    if (url.includes("localhost:5173")) {
      // But Auth0 SDK might still trigger a redirect — wait a moment to be sure
      await page.waitForTimeout(2_000)
      const urlAfter = page.url()
      if (urlAfter.includes("localhost:5173")) {
        return
      }
      // It redirected to Auth0, continue the loop
      continue
    }

    // Auth0 consent page — click Accept
    if (url.includes("auth0.com") && url.includes("/u/consent")) {
      const primaryBtn = page.locator('[data-action-button-primary="true"]')
      if (await primaryBtn.isVisible().catch(() => false)) {
        await primaryBtn.click()
        await page.waitForTimeout(2_000)
        continue
      }
    }

    // Auth0 welcome/interstitial page — look for a continue/accept button
    if (url.includes("auth0.com")) {
      // Try clicking any primary action button (Continue, Accept, etc.)
      const primaryBtn = page.locator('[data-action-button-primary="true"]')
      if (await primaryBtn.isVisible().catch(() => false)) {
        await primaryBtn.click()
        await page.waitForTimeout(2_000)
        continue
      }

      // Auth0 might auto-redirect — wait a bit
      await page.waitForTimeout(2_000)
    }
  }

  throw new Error(`Auth flow timed out. Final URL: ${page.url()}`)
}
