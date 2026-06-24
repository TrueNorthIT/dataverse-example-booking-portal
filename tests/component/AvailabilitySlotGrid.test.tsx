import { describe, it, expect, vi } from "vitest"
import { renderWithProviders, screen, userEvent } from "../setup/test-utils"
import { AvailabilitySlotGrid } from "@/components/citizen/AvailabilitySlotGrid"
import type { TimeSlot } from "@/lib/availability"

// Build a slot on 2099-06-01 at a given hour:minute, 30-minute default.
function slot(
  hour: number,
  minute: number,
  overrides: Partial<TimeSlot> = {},
  durationMins = 30,
): TimeSlot {
  const start = new Date(2099, 5, 1, hour, minute, 0, 0)
  const end = new Date(start.getTime() + durationMins * 60000)
  const pad = (n: number) => String(n).padStart(2, "0")
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    startLabel: `${pad(hour)}:${pad(minute)}`,
    endLabel: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
    available: true,
    spotsLeft: 1,
    capacity: 1,
    bufferBlocked: false,
    ...overrides,
  }
}

describe("AvailabilitySlotGrid", () => {
  it("renders a loading skeleton when isLoading", () => {
    const { container } = renderWithProviders(
      <AvailabilitySlotGrid
        slots={[]}
        selectedStartIndex={null}
        spanCount={1}
        bookingDuration={30}
        onSelectSlot={vi.fn()}
        isLoading
      />,
    )
    expect(container.querySelectorAll(".animate-pulse").length).toBe(20)
  })

  it("renders an empty message when there are no slots", () => {
    renderWithProviders(
      <AvailabilitySlotGrid
        slots={[]}
        selectedStartIndex={null}
        spanCount={1}
        bookingDuration={30}
        onSelectSlot={vi.fn()}
      />,
    )
    expect(screen.getByText(/No time slots available for this date/)).toBeInTheDocument()
  })

  it("renders available / full / changeover states with correct aria-labels", () => {
    const slots = [
      slot(9, 0), // available
      slot(9, 30, { available: false, spotsLeft: 0 }), // full
      slot(10, 0, { available: false, spotsLeft: 0, bufferBlocked: true }), // changeover
    ]
    renderWithProviders(
      <AvailabilitySlotGrid
        slots={slots}
        selectedStartIndex={null}
        spanCount={1}
        bookingDuration={30}
        onSelectSlot={vi.fn()}
      />,
    )
    expect(screen.getByText("1 of 3 slots available")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /09:00 to 09:30, available/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /09:30 to 10:00, full/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /10:00 to 10:30, changeover/ })).toBeInTheDocument()
    // Booked / Changeover sub-labels (Changeover also appears in the legend)
    expect(screen.getByText("Booked")).toBeInTheDocument()
    expect(screen.getAllByText("Changeover").length).toBeGreaterThanOrEqual(1)
  })

  it("calls onSelectSlot when an available slot is clicked", async () => {
    const user = userEvent.setup()
    const onSelectSlot = vi.fn()
    const slots = [slot(9, 0)]
    renderWithProviders(
      <AvailabilitySlotGrid
        slots={slots}
        selectedStartIndex={null}
        spanCount={1}
        bookingDuration={30}
        onSelectSlot={onSelectSlot}
      />,
    )
    await user.click(screen.getByRole("button", { name: /09:00 to 09:30, available/ }))
    expect(onSelectSlot).toHaveBeenCalledWith(slots[0], 0)
  })

  it("does not fire onSelectSlot for a full slot (disabled)", async () => {
    const user = userEvent.setup()
    const onSelectSlot = vi.fn()
    const slots = [slot(9, 0, { available: false, spotsLeft: 0 })]
    renderWithProviders(
      <AvailabilitySlotGrid
        slots={slots}
        selectedStartIndex={null}
        spanCount={1}
        bookingDuration={30}
        onSelectSlot={onSelectSlot}
      />,
    )
    const btn = screen.getByRole("button", { name: /09:00 to 09:30, full/ })
    expect(btn).toBeDisabled()
    await user.click(btn)
    expect(onSelectSlot).not.toHaveBeenCalled()
  })

  it("renders 'mine' slots and calls onCancelSlot when clicked", async () => {
    const user = userEvent.setup()
    const onCancelSlot = vi.fn()
    const onSelectSlot = vi.fn()
    const slots = [slot(9, 0, { available: false, spotsLeft: 0 })]
    const myBookedStarts = new Set([slots[0].start])
    renderWithProviders(
      <AvailabilitySlotGrid
        slots={slots}
        selectedStartIndex={null}
        spanCount={1}
        bookingDuration={30}
        onSelectSlot={onSelectSlot}
        onCancelSlot={onCancelSlot}
        myBookedStarts={myBookedStarts}
      />,
    )
    const btn = screen.getByRole("button", { name: /09:00 to 09:30, your booking/ })
    expect(screen.getByText("Yours")).toBeInTheDocument()
    expect(screen.getByText("Your booking")).toBeInTheDocument()
    await user.click(btn)
    expect(onCancelSlot).toHaveBeenCalledWith(slots[0])
    expect(onSelectSlot).not.toHaveBeenCalled()
  })

  it("renders a contiguous run of 'mine' slots with a combined duration label", () => {
    const slots = [
      slot(9, 0, { available: false, spotsLeft: 0 }),
      slot(9, 30, { available: false, spotsLeft: 0 }),
    ]
    const myBookedStarts = new Set([slots[0].start, slots[1].start])
    renderWithProviders(
      <AvailabilitySlotGrid
        slots={slots}
        selectedStartIndex={null}
        spanCount={1}
        bookingDuration={30}
        onSelectSlot={vi.fn()}
        onCancelSlot={vi.fn()}
        myBookedStarts={myBookedStarts}
      />,
    )
    // run length 2, bookingDuration 30 / spanCount 1 → "Yours · 60 min"
    expect(screen.getByText(/Yours · 60 min/)).toBeInTheDocument()
  })

  it("renders multi-capacity 'X left' and low-stock states", () => {
    const slots = [
      slot(9, 0, { capacity: 10, spotsLeft: 8 }), // plenty
      slot(9, 30, { capacity: 10, spotsLeft: 1 }), // low stock (<=25%)
      slot(10, 0, { capacity: 10, spotsLeft: 0, available: false }), // full
    ]
    renderWithProviders(
      <AvailabilitySlotGrid
        slots={slots}
        selectedStartIndex={null}
        spanCount={1}
        bookingDuration={30}
        onSelectSlot={vi.fn()}
      />,
    )
    expect(screen.getByText(/up to 10 spaces per slot/)).toBeInTheDocument()
    expect(screen.getByText("8 left")).toBeInTheDocument()
    expect(screen.getByText("1 left")).toBeInTheDocument()
    // "Full" appears as a slot sub-label and in the legend
    expect(screen.getAllByText("Full").length).toBeGreaterThanOrEqual(1)
    // aria-label uses "spaces left"
    expect(screen.getByRole("button", { name: /8 spaces left/ })).toBeInTheDocument()
  })

  it("shows 'Won't fit' for available slots that cannot start a multi-cell span", () => {
    // Two available slots but NOT time-contiguous (gap), so a 2-span can't fit either.
    const slots = [
      slot(9, 0),
      slot(11, 0), // gap — not contiguous with previous
    ]
    renderWithProviders(
      <AvailabilitySlotGrid
        slots={slots}
        selectedStartIndex={null}
        spanCount={2}
        bookingDuration={60}
        onSelectSlot={vi.fn()}
      />,
    )
    expect(screen.getByText(/booking 60 min \(2 cells\)/)).toBeInTheDocument()
    // both available slots won't fit (2 button labels + 1 legend entry)
    expect(screen.getAllByText("Won't fit").length).toBe(3)
    expect(screen.getAllByRole("button", { name: /won't fit/ }).length).toBe(2)
  })

  it("selects a span and marks cells aria-pressed", () => {
    const slots = [slot(9, 0), slot(9, 30)] // contiguous
    renderWithProviders(
      <AvailabilitySlotGrid
        slots={slots}
        selectedStartIndex={0}
        spanCount={2}
        bookingDuration={60}
        onSelectSlot={vi.fn()}
      />,
    )
    const pressed = screen.getAllByRole("button", { pressed: true })
    expect(pressed.length).toBe(2)
  })

  it("renders viewer count and flashing indicators", () => {
    const slots = [slot(9, 0)]
    renderWithProviders(
      <AvailabilitySlotGrid
        slots={slots}
        selectedStartIndex={null}
        spanCount={1}
        bookingDuration={30}
        onSelectSlot={vi.fn()}
        viewersForSlot={(s) => (s === slots[0].start ? 3 : 0)}
        flashingSlots={new Set([slots[0].start])}
      />,
    )
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.getByText("Someone's looking")).toBeInTheDocument()
  })
})
