import { describe, it, expect, vi } from "vitest"
import { renderWithProviders, screen, userEvent } from "../setup/test-utils"
import { DurationPicker } from "@/components/citizen/DurationPicker"

describe("DurationPicker", () => {
  it("returns null with a single option", () => {
    const { container } = renderWithProviders(
      <DurationPicker options={[60]} selected={60} onChange={() => {}} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("returns null with no options", () => {
    const { container } = renderWithProviders(
      <DurationPicker options={[]} selected={0} onChange={() => {}} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("renders a button per option and marks the selected one active", () => {
    renderWithProviders(
      <DurationPicker options={[60, 90, 120]} selected={90} onChange={() => {}} />
    )
    const buttons = screen.getAllByRole("button")
    expect(buttons).toHaveLength(3)
    expect(screen.getByText("1 hour")).toBeInTheDocument()
    expect(screen.getByText("1½ hours")).toBeInTheDocument()
    expect(screen.getByText("2 hours")).toBeInTheDocument()
    // active button carries the primary background class
    const active = screen.getByText("1½ hours").closest("button")
    expect(active?.className).toContain("bg-primary")
  })

  it("calls onChange with the clicked duration", async () => {
    const onChange = vi.fn()
    renderWithProviders(
      <DurationPicker options={[60, 120]} selected={60} onChange={onChange} />
    )
    await userEvent.click(screen.getByText("2 hours"))
    expect(onChange).toHaveBeenCalledWith(120)
  })
})
