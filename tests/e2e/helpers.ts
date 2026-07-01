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
 * Navigate to a page and handle the full Microsoft Entra External ID re-auth flow.
 *
 * On page load the app redirects to the Entra hosted login. With a saved Entra
 * session, the redirect auto-authenticates but may show a consent / "stay signed
 * in?" interstitial screen.
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
      // But MSAL might still trigger a redirect — wait a moment to be sure
      await page.waitForTimeout(2_000)
      const urlAfter = page.url()
      if (urlAfter.includes("localhost:5173")) {
        return
      }
      // It redirected to Entra, continue the loop
      continue
    }

    // Entra consent / "stay signed in?" interstitial — click the primary button
    if (url.includes("ciamlogin.com")) {
      const primaryBtn = page.locator('input[type="submit"], button[type="submit"]').first()
      if (await primaryBtn.isVisible().catch(() => false)) {
        await primaryBtn.click()
        await page.waitForTimeout(2_000)
        continue
      }

      // Entra might auto-redirect — wait a bit
      await page.waitForTimeout(2_000)
    }
  }

  throw new Error(`Auth flow timed out. Final URL: ${page.url()}`)
}
