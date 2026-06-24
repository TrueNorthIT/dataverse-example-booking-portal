import { describe, it, expect, vi } from "vitest"
import { renderWithProviders, screen, userEvent } from "../setup/test-utils"
import { PaymentStep } from "@/components/citizen/PaymentStep"

describe("PaymentStep", () => {
  it("renders the demo card form with the amount on the Pay button", () => {
    renderWithProviders(
      <PaymentStep amountPence={2500} onSuccess={vi.fn()} onCancel={vi.fn()} />,
    )
    expect(screen.getByText(/Demo payment — no real card is charged/)).toBeInTheDocument()
    expect(screen.getByLabelText("Card number")).toHaveValue("4242 4242 4242 4242")
    expect(screen.getByLabelText("Expiry")).toBeInTheDocument()
    expect(screen.getByLabelText("CVC")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Pay £25.00" })).toBeInTheDocument()
  })

  it("calls onCancel when Back is clicked", async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderWithProviders(
      <PaymentStep amountPence={1000} onSuccess={vi.fn()} onCancel={onCancel} />,
    )
    await user.click(screen.getByRole("button", { name: "Back" }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it("disables both buttons when the disabled prop is set", () => {
    renderWithProviders(
      <PaymentStep amountPence={1000} onSuccess={vi.fn()} onCancel={vi.fn()} disabled />,
    )
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled()
    expect(screen.getByRole("button", { name: /Pay/ })).toBeDisabled()
  })

  it("lets the user edit the card fields", async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <PaymentStep amountPence={1000} onSuccess={vi.fn()} onCancel={vi.fn()} />,
    )
    const card = screen.getByLabelText("Card number")
    await user.clear(card)
    await user.type(card, "1111")
    expect(card).toHaveValue("1111")

    const expiry = screen.getByLabelText("Expiry")
    await user.clear(expiry)
    await user.type(expiry, "01 / 30")
    expect(expiry).toHaveValue("01 / 30")

    const cvc = screen.getByLabelText("CVC")
    await user.clear(cvc)
    await user.type(cvc, "999")
    expect(cvc).toHaveValue("999")
  })

  it("simulates payment and calls onSuccess with a demo reference", async () => {
    vi.useFakeTimers()
    try {
      const onSuccess = vi.fn()
      renderWithProviders(
        <PaymentStep amountPence={1000} onSuccess={onSuccess} onCancel={vi.fn()} />,
      )
      // Fire the click directly (fake timers + userEvent don't mix well).
      screen.getByRole("button", { name: /Pay/ }).click()
      await vi.advanceTimersByTimeAsync(1000)
      expect(onSuccess).toHaveBeenCalledTimes(1)
      expect(onSuccess.mock.calls[0][0]).toMatch(/^demo_/)
    } finally {
      vi.useRealTimers()
    }
  })
})
