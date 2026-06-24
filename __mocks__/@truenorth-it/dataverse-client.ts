import { vi } from "vitest"

/**
 * Manual mock for the Dataverse Contact API SDK.
 *
 * `createClient` always returns the same `mockClient` instance, so both the
 * public singleton (`publicClient`) and the authenticated `useDataverse()`
 * client share it. Tests drive responses via, e.g.:
 *
 *   import { mockClient } from "@truenorth-it/dataverse-client"
 *   mockClient.public.list.mockResolvedValueOnce({ data: [...] })
 */

export class ApiError extends Error {
  status: number
  body: unknown
  constructor(message: string, status = 500, body: unknown = null) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.body = body
  }
}

// Permissive signatures so tests can resolve any data shape via
// mockResolvedValueOnce / mockImplementation without fighting the type checker.
/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyAsyncFn = (...args: any[]) => Promise<any>
type AnyGenFn = (...args: any[]) => AsyncGenerator<any, void, unknown>

function makeScope() {
  return {
    list: vi.fn<AnyAsyncFn>(async () => ({ data: [], page: {} })),
    get: vi.fn<AnyAsyncFn>(async () => ({ data: null })),
    // eslint-disable-next-line require-yield
    eachPage: vi.fn<AnyGenFn>(async function* () {
      return
    }),
    fetchPage: vi.fn<AnyAsyncFn>(async () => ({ data: [], page: {} })),
    lookup: vi.fn<AnyAsyncFn>(async () => ({ data: [] })),
    aggregate: vi.fn<AnyAsyncFn>(async () => ({ data: [] })),
    create: vi.fn<AnyAsyncFn>(async () => ({ data: {} })),
    update: vi.fn<AnyAsyncFn>(async () => ({ data: {} })),
    whoami: vi.fn<AnyAsyncFn>(async () => ({})),
    invokeFunction: vi.fn<AnyAsyncFn>(async () => ({ data: {} })),
    invokeAction: vi.fn<AnyAsyncFn>(async () => ({ data: {} })),
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export const mockClient = {
  me: makeScope(),
  team: makeScope(),
  all: makeScope(),
  public: makeScope(),
  getSchema: vi.fn(async () => ({})),
  negotiate: vi.fn(async () => ({ url: "wss://mock/hub" })),
}

export const createClient = vi.fn(() => mockClient)

export const useRealtime = vi.fn(() => ({ connected: false, error: null }))

export const resolveQuickDate = vi.fn()
export const quickDateToFilters = vi.fn()
export const generateTableTypes = vi.fn()
