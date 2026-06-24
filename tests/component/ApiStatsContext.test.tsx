import { describe, it, expect } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { ApiStatsProvider, useApiStats } from "@/contexts/ApiStatsContext"
import { createTestQueryClient } from "../setup/test-utils"

function makeWrapper() {
  const client = createTestQueryClient()
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <ApiStatsProvider>{children}</ApiStatsProvider>
      </QueryClientProvider>
    )
  }
  return { client, wrapper }
}

describe("ApiStatsContext", () => {
  it("starts with zeroed stats", () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useApiStats(), { wrapper })
    expect(result.current.totalCalls).toBe(0)
    expect(result.current.activeCalls).toBe(0)
    expect(result.current.avgDuration).toBe(0)
    expect(result.current.recentCalls).toEqual([])
  })

  it("tracks a query through pending -> success", async () => {
    const { client, wrapper } = makeWrapper()
    const { result } = renderHook(() => useApiStats(), { wrapper })

    await act(async () => {
      await client.fetchQuery({
        queryKey: ["thing", 1],
        queryFn: async () => "ok",
      })
    })

    await waitFor(() => expect(result.current.totalCalls).toBeGreaterThan(0))
    expect(result.current.activeCalls).toBe(0)
    const call = result.current.recentCalls.find((c) =>
      c.queryKey.includes("thing")
    )
    expect(call?.status).toBe("success")
    expect(result.current.avgDuration).toBeGreaterThanOrEqual(0)
  })

  it("tracks a failed query as error", async () => {
    const { client, wrapper } = makeWrapper()
    const { result } = renderHook(() => useApiStats(), { wrapper })

    await act(async () => {
      await client
        .fetchQuery({
          queryKey: ["fails"],
          queryFn: async () => {
            throw new Error("nope")
          },
        })
        .catch(() => {})
    })

    await waitFor(() =>
      expect(
        result.current.recentCalls.some((c) => c.status === "error")
      ).toBe(true)
    )
  })

  it("tracks a mutation through pending -> success", async () => {
    const { client, wrapper } = makeWrapper()
    const { result } = renderHook(() => useApiStats(), { wrapper })

    const mutation = client.getMutationCache().build(client, {
      mutationKey: ["save-thing"],
      mutationFn: async () => "saved",
    })

    await act(async () => {
      await mutation.execute(undefined)
    })

    await waitFor(() =>
      expect(
        result.current.recentCalls.some((c) => c.queryKey.includes("save-thing"))
      ).toBe(true)
    )
    const call = result.current.recentCalls.find((c) =>
      c.queryKey.includes("save-thing")
    )
    expect(call?.status).toBe("success")
    expect(result.current.activeCalls).toBe(0)
  })

  it("tracks a failed mutation as error", async () => {
    const { client, wrapper } = makeWrapper()
    const { result } = renderHook(() => useApiStats(), { wrapper })

    const mutation = client.getMutationCache().build(client, {
      mutationFn: async () => {
        throw new Error("boom")
      },
    })

    await act(async () => {
      await mutation.execute(undefined).catch(() => {})
    })

    await waitFor(() =>
      expect(
        result.current.recentCalls.some((c) => c.status === "error")
      ).toBe(true)
    )
  })

  it("throws when used outside a provider", () => {
    expect(() => renderHook(() => useApiStats())).toThrow(
      "useApiStats must be used within ApiStatsProvider"
    )
  })
})
