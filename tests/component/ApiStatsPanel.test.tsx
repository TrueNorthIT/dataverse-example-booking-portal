import { describe, it, expect } from "vitest"
import { renderWithProviders, screen, userEvent, waitFor } from "../setup/test-utils"
import { createTestQueryClient } from "../setup/test-utils"
import { ApiStatsPanel } from "@/components/common/ApiStatsPanel"

describe("ApiStatsPanel", () => {
  it("renders the collapsed pill with the build tag", () => {
    renderWithProviders(<ApiStatsPanel />)
    expect(screen.getByText(/^b011/)).toBeInTheDocument()
    // expanded card is hidden initially
    expect(screen.queryByText("API / Realtime")).not.toBeInTheDocument()
  })

  it("expands and collapses the panel and shows the empty state", async () => {
    renderWithProviders(<ApiStatsPanel />)
    const pill = screen.getByText(/^b011/).closest("button")!
    await userEvent.click(pill)

    expect(screen.getByText("API / Realtime")).toBeInTheDocument()
    expect(screen.getByText("No calls yet")).toBeInTheDocument()
    expect(screen.getByText("Total")).toBeInTheDocument()
    expect(screen.getByText("In-flight")).toBeInTheDocument()
    // SignalR inert in tests -> disconnected
    expect(screen.getByText("Disconnected")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Close" }))
    expect(screen.queryByText("API / Realtime")).not.toBeInTheDocument()
  })

  it("reflects a completed query in the recent calls list and totals", async () => {
    const queryClient = createTestQueryClient()
    renderWithProviders(<ApiStatsPanel />, { queryClient })

    await queryClient.fetchQuery({
      queryKey: ["panel-success"],
      queryFn: async () => "ok",
    })

    await userEvent.click(screen.getByText(/^b011/).closest("button")!)

    // a recent call row shows the serialized query key
    await waitFor(() =>
      expect(screen.getByText(/panel-success/)).toBeInTheDocument()
    )
    expect(screen.queryByText("No calls yet")).not.toBeInTheDocument()
  })

  it("shows an in-flight call with a duration placeholder", async () => {
    const queryClient = createTestQueryClient()
    renderWithProviders(<ApiStatsPanel />, { queryClient })

    let resolve!: (v: string) => void
    const pending = queryClient.fetchQuery({
      queryKey: ["panel-pending"],
      queryFn: () => new Promise<string>((r) => (resolve = r)),
    })

    await userEvent.click(screen.getByText(/^b011/).closest("button")!)

    await waitFor(() =>
      expect(screen.getByText(/panel-pending/)).toBeInTheDocument()
    )
    // pending row renders the "..." duration placeholder
    expect(screen.getByText("...")).toBeInTheDocument()

    resolve("done")
    await pending
  })
})
