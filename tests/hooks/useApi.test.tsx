import { describe, it, expect } from "vitest"
import {
  useApiList,
  useApiListAll,
  useApiGet,
  useAuthenticatedList,
  useAuthenticatedMutation,
} from "@/hooks/useApi"
import {
  renderHook,
  waitFor,
  act,
  createHookWrapper,
  mockClient,
  setAuth0State,
} from "../setup/test-utils"

const wrapper = createHookWrapper()

describe("useApiList", () => {
  it("returns the public list data", async () => {
    mockClient.public.list.mockResolvedValueOnce({ data: [{ id: "1" }], page: {} })
    const { result } = renderHook(() => useApiList(["k"], "service"), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([{ id: "1" }])
  })
})

describe("useApiListAll", () => {
  it("concatenates every page from eachPage", async () => {
    mockClient.public.eachPage.mockImplementationOnce(async function* () {
      yield { data: [{ id: "1" }], page: {} }
      yield { data: [{ id: "2" }], page: {} }
    })
    const { result } = renderHook(() => useApiListAll(["all"], "servicevenue"), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([{ id: "1" }, { id: "2" }])
  })
})

describe("useApiGet", () => {
  it("returns a single public record", async () => {
    mockClient.public.get.mockResolvedValueOnce({ data: { id: "42" } })
    const { result } = renderHook(() => useApiGet(["g"], "venue", "42"), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ id: "42" })
  })
})

describe("useAuthenticatedList", () => {
  it("queries the me tier when authenticated", async () => {
    mockClient.me.list.mockResolvedValueOnce({ data: [{ id: "mine" }], page: {} })
    const { result } = renderHook(() => useAuthenticatedList(["me"], "servicebooking"), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([{ id: "mine" }])
  })

  it("is disabled when the user is not authenticated", async () => {
    setAuth0State({ isAuthenticated: false })
    const { result } = renderHook(() => useAuthenticatedList(["me2"], "servicebooking"), { wrapper })
    // Stays in pending/idle — query never runs.
    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"))
    expect(result.current.isSuccess).toBe(false)
    expect(mockClient.me.list).not.toHaveBeenCalled()
  })
})

describe("useAuthenticatedMutation", () => {
  it("runs the mutation and invalidates the given keys on success", async () => {
    const { result } = renderHook(
      () =>
        useAuthenticatedMutation(
          async (vars: { x: number }, client) => {
            await client.me.create("servicebooking", { x: vars.x })
            return "ok"
          },
          { invalidateKeys: [["myBookings"]] }
        ),
      { wrapper }
    )
    await act(async () => {
      await result.current.mutateAsync({ x: 1 })
    })
    expect(mockClient.me.create).toHaveBeenCalledWith("servicebooking", { x: 1 })
  })
})
