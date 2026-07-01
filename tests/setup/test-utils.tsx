import type { ReactElement, ReactNode } from "react"
import { render, type RenderOptions } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router-dom"
import { DemoProvider } from "@/contexts/DemoContext"
import { ApiStatsProvider } from "@/contexts/ApiStatsContext"
import { RealtimeProvider } from "@/contexts/RealtimeContext"
import { PresenceProvider } from "@/contexts/PresenceContext"
// Mock-control helpers are imported from the mock modules directly: the real
// package types don't export them, and Vitest resolves them to the same module
// instance that `vi.mock(...)` activates.
import { setAuthState, type MockAuthState } from "./auth-mock"
import { mockClient } from "../../__mocks__/@truenorth-it/dataverse-client"

export interface RenderWithProvidersOptions extends Omit<RenderOptions, "wrapper"> {
  /** Initial router entry (default "/"). */
  route?: string
  /** Override the mock auth state before rendering. */
  auth?: Partial<MockAuthState>
  /** Provide a shared QueryClient (otherwise a fresh retry-off one is created). */
  queryClient?: QueryClient
}

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })
}

/**
 * Renders a UI tree inside the full app provider stack (mirrors App.tsx), with
 * auth and the SDK client mocked. Realtime/Presence providers are inert in
 * tests (no env, useRealtime mocked), so they're safe to include.
 */
export function renderWithProviders(
  ui: ReactElement,
  { route = "/", auth, queryClient, ...options }: RenderWithProvidersOptions = {}
) {
  if (auth) setAuthState(auth)
  const client = queryClient ?? createTestQueryClient()

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <ApiStatsProvider>
          <MemoryRouter initialEntries={[route]}>
            <DemoProvider>
              <RealtimeProvider>
                <PresenceProvider>{children}</PresenceProvider>
              </RealtimeProvider>
            </DemoProvider>
          </MemoryRouter>
        </ApiStatsProvider>
      </QueryClientProvider>
    )
  }

  return { queryClient: client, ...render(ui, { wrapper: Wrapper, ...options }) }
}

/** Lightweight provider wrapper for `renderHook` — query client + router only. */
export function createHookWrapper(queryClient?: QueryClient) {
  const client = queryClient ?? createTestQueryClient()
  return function HookWrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    )
  }
}

export { mockClient }
export { setAuthState, resetAuthState, useAuth } from "./auth-mock"
// Back-compat aliases so existing tests keep their `setAuth0State` vocabulary.
export { setAuth0State, resetAuth0State } from "./auth-mock"
export type { MockAuthState } from "./auth-mock"
export type { MockAuthState as MockAuth0State } from "./auth-mock"
export * from "@testing-library/react"
export { default as userEvent } from "@testing-library/user-event"
