import { vi } from "vitest"
import type { AuthState, AuthUser } from "@/auth/useAuth"

/**
 * Mutable mock for the app's `useAuth()` adapter (backed by MSAL in production).
 *
 * Tests drive the auth surface through `setAuthState`, e.g.:
 *
 *   import { setAuthState } from "tests/setup/auth-mock"
 *   setAuthState({ isAuthenticated: false })
 *
 * `setAuth0State` is kept as an alias so existing test call-sites read the same.
 */

export type MockAuthState = AuthState

function defaultState(): MockAuthState {
  return {
    isLoading: false,
    isAuthenticated: true,
    user: { sub: "entra|test-user", name: "Test Citizen", email: "test@example.com" },
    error: undefined,
    loginWithRedirect: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    getAccessTokenSilently: vi.fn().mockResolvedValue("mock-access-token"),
  }
}

export let mockAuthState: MockAuthState = defaultState()

/** Replace part of the mock auth state (merged onto the current state). */
export function setAuthState(patch: Partial<MockAuthState>): void {
  mockAuthState = { ...mockAuthState, ...patch }
}

/** Reset the mock auth state to the signed-in default. Call in afterEach. */
export function resetAuthState(): void {
  mockAuthState = defaultState()
}

export const useAuth = vi.fn((): MockAuthState => mockAuthState)

// Back-compat aliases so existing tests keep their vocabulary.
export const setAuth0State = setAuthState
export const resetAuth0State = resetAuthState
export type { AuthUser }
