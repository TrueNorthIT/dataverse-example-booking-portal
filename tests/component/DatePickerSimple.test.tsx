import { describe, it, expect, vi } from "vitest"
import { addDays, isSameDay } from "date-fns"
import { renderWithProviders, screen, userEvent } from "../setup/test-utils"
import { DatePickerSimple } from "@/components/citizen/DatePickerSimple"

describe("DatePickerSimple", () => {
  it("renders the default 14-day strip starting today", () => {
    renderWithProviders(<DatePickerSimple selected={new Date()} onChange={() => {}} />)
    expect(screen.getAllByRole("button")).toHaveLength(14)
    expect(screen.getByText("Today")).toBeInTheDocument()
  })

  it("respects a custom days count", () => {
    renderWithProviders(
      <DatePickerSimple selected={new Date()} onChange={() => {}} days={5} />
    )
    expect(screen.getAllByRole("button")).toHaveLength(5)
  })

  it("calls onChange with the clicked date", async () => {
    const onChange = vi.fn()
    const today = new Date()
    renderWithProviders(<DatePickerSimple selected={today} onChange={onChange} days={7} />)
    const buttons = screen.getAllByRole("button")
    await userEvent.click(buttons[2])
    expect(onChange).toHaveBeenCalledTimes(1)
    const clicked = onChange.mock.calls[0][0] as Date
    expect(isSameDay(clicked, addDays(today, 2))).toBe(true)
  })

  it("honours startOffset so the strip begins in the future (no Today)", () => {
    renderWithProviders(
      <DatePickerSimple
        selected={addDays(new Date(), 14)}
        onChange={() => {}}
        days={7}
        startOffset={14}
      />
    )
    expect(screen.queryByText("Today")).not.toBeInTheDocument()
    expect(screen.getAllByRole("button")).toHaveLength(7)
  })
})
