import type { ReactElement, ReactNode } from "react"
import { render, type RenderOptions } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router-dom"
import { DemoProvider } from "@/contexts/DemoContext"
import { ApiStatsProvider } from "@/contexts/ApiStatsContext"
import { RealtimeProvider } from "@/contexts/RealtimeContext"
import { PresenceProvider } from "@/contexts/PresenceContext"
// Mock-control helpers are imported from the manual mock files directly: the
// real package types don't export them, and Vitest resolves them to the same
// module instance that `vi.mock(...)` activates.
import { setAuth0State, type MockAuth0State } from "../../__mocks__/@auth0/auth0-react"
import { mockClient } from "../../__mocks__/@truenorth-it/dataverse-client"

export interface RenderWithProvidersOptions extends Omit<RenderOptions, "wrapper"> {
  /** Initial router entry (default "/"). */
  route?: string
  /** Route patterns the wrapper should know about (unused by default). */
  auth0?: Partial<MockAuth0State>
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
 * Auth0 and the SDK client mocked. Realtime/Presence providers are inert in
 * tests (no env, useRealtime mocked), so they're safe to include.
 */
export function renderWithProviders(
  ui: ReactElement,
  { route = "/", auth0, queryClient, ...options }: RenderWithProvidersOptions = {}
) {
  if (auth0) setAuth0State(auth0)
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
export { setAuth0State, resetAuth0State } from "../../__mocks__/@auth0/auth0-react"
export type { MockAuth0State } from "../../__mocks__/@auth0/auth0-react"
export * from "@testing-library/react"
export { default as userEvent } from "@testing-library/user-event"
