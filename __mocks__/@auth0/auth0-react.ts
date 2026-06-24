import { vi } from "vitest"
import type { ReactNode } from "react"

/**
 * Manual mock for @auth0/auth0-react.
 *
 * `mockAuth0State` is mutable so a test (or `renderWithProviders`) can set the
 * auth state before rendering:
 *
 *   import { setAuth0State } from "@auth0/auth0-react"
 *   setAuth0State({ isAuthenticated: false })
 */

export interface MockAuth0State {
  isLoading: boolean
  isAuthenticated: boolean
  user?: { sub?: string; name?: string; email?: string } | undefined
  error?: Error | undefined
  loginWithRedirect: ReturnType<typeof vi.fn>
  logout: ReturnType<typeof vi.fn>
  getAccessTokenSilently: ReturnType<typeof vi.fn>
  getAccessTokenWithPopup: ReturnType<typeof vi.fn>
  getIdTokenClaims: ReturnType<typeof vi.fn>
}

function defaultState(): MockAuth0State {
  return {
    isLoading: false,
    isAuthenticated: true,
    user: { sub: "auth0|test-user", name: "Test Citizen", email: "test@example.com" },
    error: undefined,
    loginWithRedirect: vi.fn(),
    logout: vi.fn(),
    getAccessTokenSilently: vi.fn().mockResolvedValue("mock-access-token"),
    getAccessTokenWithPopup: vi.fn().mockResolvedValue("mock-access-token"),
    getIdTokenClaims: vi.fn().mockResolvedValue({ __raw: "mock.jwt.token" }),
  }
}

export let mockAuth0State: MockAuth0State = defaultState()

/** Replace part of the mock auth state (merged onto the current state). */
export function setAuth0State(patch: Partial<MockAuth0State>): void {
  mockAuth0State = { ...mockAuth0State, ...patch }
}

/** Reset the mock auth state to the signed-in default. Call in afterEach. */
export function resetAuth0State(): void {
  mockAuth0State = defaultState()
}

export const useAuth0 = vi.fn(() => mockAuth0State)

export function Auth0Provider({ children }: { children: ReactNode }) {
  return children
}

export const withAuthenticationRequired = <P extends object>(component: P) => component
