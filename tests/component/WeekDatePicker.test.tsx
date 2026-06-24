import { describe, it, expect, vi, afterEach } from "vitest"
import { addDays, startOfDay, startOfWeek, isSameDay, isBefore, nextMonday } from "date-fns"
import { renderWithProviders, screen, userEvent, fireEvent } from "../setup/test-utils"
import { WeekDatePicker } from "@/components/citizen/WeekDatePicker"

afterEach(() => {
  vi.useRealTimers()
})

describe("WeekDatePicker", () => {
  it("renders 7 day buttons plus prev/next", () => {
    renderWithProviders(<WeekDatePicker selected={new Date()} onChange={() => {}} />)
    // 7 day cells + previous + next
    expect(screen.getAllByRole("button")).toHaveLength(9)
    expect(screen.getByLabelText("Previous week")).toBeInTheDocument()
    expect(screen.getByLabelText("Next week")).toBeInTheDocument()
  })

  it("disables previous week when on the current week", () => {
    renderWithProviders(<WeekDatePicker selected={new Date()} onChange={() => {}} />)
    expect(screen.getByLabelText("Previous week")).toBeDisabled()
  })

  it("enables previous week when a future week is selected", () => {
    renderWithProviders(
      <WeekDatePicker selected={addDays(new Date(), 21)} onChange={() => {}} />
    )
    expect(screen.getByLabelText("Previous week")).not.toBeDisabled()
  })

  it("disables past days within the current week", () => {
    const today = startOfDay(new Date())
    const weekStart = startOfWeek(today, { weekStartsOn: 1 })
    renderWithProviders(<WeekDatePicker selected={today} onChange={() => {}} />)
    // any day before today this week should be disabled
    if (!isSameDay(weekStart, today)) {
      // the Monday cell is in the past unless today is Monday
      const dayCells = screen
        .getAllByRole("button")
        .filter((b) => !b.getAttribute("aria-label"))
      const pastExists = dayCells.some((b) => (b as HTMLButtonElement).disabled)
      expect(pastExists).toBe(true)
    }
  })

  it("pages forward by a week via Next", async () => {
    const onChange = vi.fn()
    const today = new Date()
    renderWithProviders(<WeekDatePicker selected={today} onChange={onChange} />)
    await userEvent.click(screen.getByLabelText("Next week"))
    const next = onChange.mock.calls[0][0] as Date
    expect(isSameDay(next, addDays(today, 7))).toBe(true)
  })

  it("clamps previous-week paging to today when it would go to the past", async () => {
    // Pin 'today' to a Friday so next-Monday is in a later week (prev enabled)
    // yet paging back a week lands before today -> exercises the clamp.
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-06-26T09:00:00Z")) // a Friday
    const today = startOfDay(new Date())
    const selected = nextMonday(today) // today + 3, in the following week
    const onChange = vi.fn()
    renderWithProviders(<WeekDatePicker selected={selected} onChange={onChange} />)

    const prev = screen.getByLabelText("Previous week")
    expect(prev).not.toBeDisabled()
    // fireEvent avoids userEvent's internal timers, which clash with fake timers
    fireEvent.click(prev)

    const result = onChange.mock.calls[0][0] as Date
    // selected - 7 days = last Friday (before today) -> clamped to today
    expect(isBefore(result, today)).toBe(false)
    expect(isSameDay(result, today)).toBe(true)
  })

  it("selects a clicked future day", async () => {
    const onChange = vi.fn()
    const today = startOfDay(new Date())
    renderWithProviders(<WeekDatePicker selected={today} onChange={onChange} />)
    const dayCells = screen
      .getAllByRole("button")
      .filter((b) => !b.getAttribute("aria-label")) as HTMLButtonElement[]
    const enabled = dayCells.find((b) => !b.disabled)!
    await userEvent.click(enabled)
    expect(onChange).toHaveBeenCalled()
  })
})
