import "@testing-library/jest-dom/vitest"
import { afterEach, vi } from "vitest"
import { cleanup } from "@testing-library/react"

// Replace the MSAL-backed auth adapter with a mutable mock (driven via
// setAuthState). This keeps the suite hermetic — no real @azure/msal-* imports.
vi.mock("@/auth/useAuth", () => import("./auth-mock"))
// Activate manual mocks (resolved from the root-level __mocks__ folder).
vi.mock("@truenorth-it/dataverse-client")
vi.mock("@azure/web-pubsub-client")

// jsdom doesn't implement these; some Radix/UI primitives touch them.
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn()
}

afterEach(async () => {
  cleanup()
  // Reset auth state and mock call history between tests. Implementations set
  // with vi.fn(impl) survive clearAllMocks; queued *Once values are cleared.
  const auth = await import("./auth-mock")
  auth.resetAuthState()
  vi.clearAllMocks()
})
