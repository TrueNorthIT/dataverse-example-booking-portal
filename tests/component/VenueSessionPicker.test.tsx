import { describe, it, expect, vi } from "vitest"
import { renderWithProviders, screen, userEvent, mockClient } from "../setup/test-utils"
import { VenueSessionPicker } from "@/components/citizen/VenueSessionPicker"
import type { HireRate } from "@/lib/pricing"

const RATE: HireRate = { standard: 31.25, ticketed: 78.13 }
const DATE = new Date(2099, 5, 1) // far-future fixed date

describe("VenueSessionPicker", () => {
  it("shows a loading skeleton while bookings load", () => {
    // Never resolve → stays in loading state
    mockClient.public.list.mockImplementationOnce(() => new Promise(() => {}))
    const { container } = renderWithProviders(
      <VenueSessionPicker resourceId="r1" date={DATE} rate={RATE} onSelect={vi.fn()} />,
    )
    // Skeletons render 4 placeholders
    expect(container.querySelectorAll(".h-20").length).toBe(4)
  })

  it("renders all sessions with prices when no bookings exist", async () => {
    mockClient.public.list.mockResolvedValueOnce({ data: [], page: {} })
    renderWithProviders(
      <VenueSessionPicker resourceId="r1" date={DATE} rate={RATE} onSelect={vi.fn()} />,
    )
    expect(await screen.findByText("Morning")).toBeInTheDocument()
    expect(screen.getByText("Afternoon")).toBeInTheDocument()
    expect(screen.getByText("Evening")).toBeInTheDocument()
    expect(screen.getByText("Full day")).toBeInTheDocument()
    // 4h morning at £31.25/hr = £125.00 (afternoon is also 4h → appears twice)
    expect(screen.getAllByText("£125.00").length).toBeGreaterThanOrEqual(1)
    // Full day = 8h × £31.25 = £250.00
    expect(screen.getByText("£250.00")).toBeInTheDocument()
  })

  it("fires onSelect with the chosen session", async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    mockClient.public.list.mockResolvedValueOnce({ data: [], page: {} })
    renderWithProviders(
      <VenueSessionPicker resourceId="r1" date={DATE} rate={RATE} onSelect={onSelect} />,
    )
    const morning = await screen.findByText("Morning")
    await user.click(morning)
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect.mock.calls[0][0]).toMatchObject({ key: "morning", label: "Morning" })
  })

  it("marks an overlapping session as taken/unavailable and disables it", async () => {
    // Morning session is 09:00–13:00 local on the date. Build a booking that overlaps.
    const bStart = new Date(2099, 5, 1, 9, 0, 0).toISOString()
    const bEnd = new Date(2099, 5, 1, 13, 0, 0).toISOString()
    mockClient.public.list.mockResolvedValueOnce({
      data: [{ starttime: bStart, endtime: bEnd }],
      page: {},
    })
    const onSelect = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(
      <VenueSessionPicker resourceId="r1" date={DATE} rate={RATE} onSelect={onSelect} />,
    )
    const morning = await screen.findByText("Morning")
    const btn = morning.closest("button")!
    expect(btn).toBeDisabled()
    expect(screen.getAllByText("Unavailable").length).toBeGreaterThanOrEqual(1)
    await user.click(btn)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it("omits prices when no rate is provided", async () => {
    mockClient.public.list.mockResolvedValueOnce({ data: [], page: {} })
    renderWithProviders(
      <VenueSessionPicker resourceId="r1" date={DATE} onSelect={vi.fn()} />,
    )
    await screen.findByText("Morning")
    expect(screen.queryByText(/£/)).not.toBeInTheDocument()
  })
})
