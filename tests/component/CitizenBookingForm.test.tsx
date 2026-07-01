import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderWithProviders, screen, userEvent, mockClient, waitFor, useAuth } from "../setup/test-utils"
import { CitizenBookingForm } from "@/components/citizen/CitizenBookingForm"
import type { TimeSlot } from "@/hooks/useAvailability"

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
import { toast } from "sonner"

// A 1-hour slot, far in the future.
function makeSlot(): TimeSlot {
  const start = new Date(2099, 5, 1, 10, 0, 0)
  const end = new Date(2099, 5, 1, 11, 0, 0)
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    startLabel: "10:00",
    endLabel: "11:00",
    available: true,
    spotsLeft: 1,
    capacity: 1,
    bufferBlocked: false,
  }
}

const SCHEDULED_STATUS = { name: "Scheduled", bookingstatusid: "status-1" }

// Branch public.list on table: "status" → statuses; "booking" → conflict check (empty = free).
function wireListNoConflict() {
  mockClient.public.list.mockImplementation(async (table: string) => {
    if (table === "status") return { data: [SCHEDULED_STATUS], page: {} }
    return { data: [], page: {} } // booking conflict check: none
  })
}

describe("CitizenBookingForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.me.create.mockResolvedValue({ data: {} })
  })

  it("confirms a FREE service booking by calling me.create and onBooked", async () => {
    wireListNoConflict()
    const user = userEvent.setup()
    const onBooked = vi.fn()
    renderWithProviders(
      <CitizenBookingForm
        resourceId="res-1"
        resourceName="Tennis Court 1"
        slot={makeSlot()}
        onCancel={vi.fn()}
        onBooked={onBooked}
      />,
    )

    // Free service → no tickets toggle, no Total, button reads "Confirm Booking"
    expect(screen.queryByText(/Will you be selling tickets/)).not.toBeInTheDocument()
    const confirm = await screen.findByRole("button", { name: "Confirm Booking" })
    await user.click(confirm)

    await waitFor(() => expect(mockClient.me.create).toHaveBeenCalledTimes(1))
    expect(mockClient.me.create.mock.calls[0][0]).toBe("servicebooking")
    await waitFor(() => expect(onBooked).toHaveBeenCalledTimes(1))
    expect(toast.success).toHaveBeenCalled()
  })

  it("blocks an anonymous visitor with a Sign in to book CTA instead of booking", async () => {
    wireListNoConflict()
    const user = userEvent.setup()
    const onBooked = vi.fn()
    renderWithProviders(
      <CitizenBookingForm
        resourceId="res-1"
        resourceName="Tennis Court 1"
        slot={makeSlot()}
        onCancel={vi.fn()}
        onBooked={onBooked}
      />,
      { auth: { isAuthenticated: false, user: undefined } },
    )

    expect(screen.queryByRole("button", { name: "Confirm Booking" })).not.toBeInTheDocument()
    expect(screen.getByText(/browsing as a guest/i)).toBeInTheDocument()
    await user.click(await screen.findByRole("button", { name: /Sign in to book/ }))
    expect(useAuth().loginWithRedirect).toHaveBeenCalled()
    expect(mockClient.me.create).not.toHaveBeenCalled()
    expect(onBooked).not.toHaveBeenCalled()
  })

  it("uses the notes field as the booking title", async () => {
    wireListNoConflict()
    const user = userEvent.setup()
    renderWithProviders(
      <CitizenBookingForm
        resourceId="res-1"
        resourceName="Tennis Court 1"
        slot={makeSlot()}
        onCancel={vi.fn()}
        onBooked={vi.fn()}
      />,
    )
    await user.type(screen.getByLabelText(/Notes/), "Family game")
    await user.click(await screen.findByRole("button", { name: "Confirm Booking" }))
    await waitFor(() => expect(mockClient.me.create).toHaveBeenCalled())
    const payload = mockClient.me.create.mock.calls[0][1]
    expect(payload.tn_name).toBe("Family game")
  })

  it("aborts and toasts when the slot is taken (conflict)", async () => {
    mockClient.public.list.mockImplementation(async (table: string) => {
      if (table === "status") return { data: [SCHEDULED_STATUS], page: {} }
      return { data: [{ bookableresourcebookingid: "other" }], page: {} } // conflict!
    })
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderWithProviders(
      <CitizenBookingForm
        resourceId="res-1"
        resourceName="Tennis Court 1"
        slot={makeSlot()}
        onCancel={onCancel}
        onBooked={vi.fn()}
      />,
    )
    await user.click(await screen.findByRole("button", { name: "Confirm Booking" }))
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(mockClient.me.create).not.toHaveBeenCalled()
    expect(onCancel).toHaveBeenCalled()
  })

  it("calls onCancel when the Cancel button is clicked", async () => {
    wireListNoConflict()
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderWithProviders(
      <CitizenBookingForm
        resourceId="res-1"
        resourceName="Tennis Court 1"
        slot={makeSlot()}
        onCancel={onCancel}
        onBooked={vi.fn()}
      />,
    )
    await user.click(await screen.findByRole("button", { name: "Cancel" }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it("shows the tickets toggle, total and a Pay button for a PAID venue", async () => {
    wireListNoConflict()
    renderWithProviders(
      <CitizenBookingForm
        resourceId="res-1"
        resourceName="Blackburn Hall, Rothwell — Main Hall"
        categoryName="Venue Hire"
        slot={makeSlot()}
        onCancel={vi.fn()}
        onBooked={vi.fn()}
      />,
    )
    // ticketed (£78.13) != standard (£31.25) → toggle shows
    expect(await screen.findByText(/Will you be selling tickets/)).toBeInTheDocument()
    expect(screen.getByText("Total")).toBeInTheDocument()
    // 1h at £31.25 standard
    expect(screen.getByRole("button", { name: /Pay £31\.25/ })).toBeInTheDocument()
  })

  it("re-prices when 'selling tickets' is toggled to Yes", async () => {
    wireListNoConflict()
    const user = userEvent.setup()
    renderWithProviders(
      <CitizenBookingForm
        resourceId="res-1"
        resourceName="Blackburn Hall, Rothwell — Main Hall"
        categoryName="Venue Hire"
        slot={makeSlot()}
        onCancel={vi.fn()}
        onBooked={vi.fn()}
      />,
    )
    await screen.findByText(/Will you be selling tickets/)
    await user.click(screen.getByRole("button", { name: "Yes" }))
    // ticketed rate £78.13/hr × 1h
    expect(screen.getByRole("button", { name: /Pay £78\.13/ })).toBeInTheDocument()
  })

  it("adds an optional extra, raising the total, and includes it in the booking notes", async () => {
    wireListNoConflict()
    const user = userEvent.setup()
    renderWithProviders(
      <CitizenBookingForm
        resourceId="res-1"
        resourceName="Mandela Centre — Main Hall"
        categoryName="Venue Hire"
        slot={makeSlot()}
        onCancel={vi.fn()}
        onBooked={vi.fn()}
      />,
    )
    // Mandela has Kitchen + Wet room add-ons
    const kitchen = await screen.findByRole("button", { name: /Kitchen/ })
    await user.click(kitchen)
    // Pay button total now includes the add-on (> base £31.25)
    const payBtn = screen.getByRole("button", { name: /Pay £/ })
    expect(payBtn.textContent).not.toMatch(/£31\.25$/)
  })

  it("toggles an extra off again", async () => {
    wireListNoConflict()
    const user = userEvent.setup()
    renderWithProviders(
      <CitizenBookingForm
        resourceId="res-1"
        resourceName="Mandela Centre — Main Hall"
        categoryName="Venue Hire"
        slot={makeSlot()}
        onCancel={vi.fn()}
        onBooked={vi.fn()}
      />,
    )
    const kitchen = await screen.findByRole("button", { name: /Kitchen/ })
    await user.click(kitchen)
    const raised = screen.getByRole("button", { name: /Pay £/ }).textContent
    await user.click(kitchen)
    const reset = screen.getByRole("button", { name: /Pay £/ }).textContent
    expect(reset).not.toBe(raised)
    expect(reset).toMatch(/£31\.25/)
  })

  it("shows an error toast and does not call onBooked when the create fails", async () => {
    wireListNoConflict()
    mockClient.me.create.mockRejectedValueOnce(new Error("boom"))
    const user = userEvent.setup()
    const onBooked = vi.fn()
    renderWithProviders(
      <CitizenBookingForm
        resourceId="res-1"
        resourceName="Tennis Court 1"
        slot={makeSlot()}
        onCancel={vi.fn()}
        onBooked={onBooked}
      />,
    )
    await user.click(await screen.findByRole("button", { name: "Confirm Booking" }))
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(onBooked).not.toHaveBeenCalled()
  })

  it("aborts a paid booking when the pre-payment conflict check fails", async () => {
    mockClient.public.list.mockImplementation(async (table: string) => {
      if (table === "status") return { data: [SCHEDULED_STATUS], page: {} }
      return { data: [{ bookableresourcebookingid: "other" }], page: {} } // conflict
    })
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderWithProviders(
      <CitizenBookingForm
        resourceId="res-1"
        resourceName="Blackburn Hall, Rothwell — Main Hall"
        categoryName="Venue Hire"
        slot={makeSlot()}
        onCancel={onCancel}
        onBooked={vi.fn()}
      />,
    )
    await user.click(await screen.findByRole("button", { name: /Pay £31\.25/ }))
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    // Should NOT reach the payment screen
    expect(screen.queryByText(/Demo payment/)).not.toBeInTheDocument()
    expect(onCancel).toHaveBeenCalled()
  })

  it("advances to the payment step for a paid venue and books after success", async () => {
    wireListNoConflict()
    const user = userEvent.setup()
    const onBooked = vi.fn()
    renderWithProviders(
      <CitizenBookingForm
        resourceId="res-1"
        resourceName="Blackburn Hall, Rothwell — Main Hall"
        categoryName="Venue Hire"
        slot={makeSlot()}
        onCancel={vi.fn()}
        onBooked={onBooked}
      />,
    )
    await user.click(await screen.findByRole("button", { name: /Pay £31\.25/ }))
    // Payment step renders
    expect(await screen.findByText(/Demo payment/)).toBeInTheDocument()
    // The PaymentStep's pay button
    const payBtn = await screen.findByRole("button", { name: /Pay £31\.25/ })
    payBtn.click()
    // Simulated payment resolves (~900ms); booking then created
    await waitFor(() => expect(mockClient.me.create).toHaveBeenCalled(), { timeout: 3000 })
    await waitFor(() => expect(onBooked).toHaveBeenCalled())
  })

  it("returns from the payment step to the confirm screen via Back", async () => {
    wireListNoConflict()
    const user = userEvent.setup()
    renderWithProviders(
      <CitizenBookingForm
        resourceId="res-1"
        resourceName="Blackburn Hall, Rothwell — Main Hall"
        categoryName="Venue Hire"
        slot={makeSlot()}
        onCancel={vi.fn()}
        onBooked={vi.fn()}
      />,
    )
    await user.click(await screen.findByRole("button", { name: /Pay £31\.25/ }))
    expect(await screen.findByText(/Demo payment/)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Back" }))
    // Back on the confirm screen (tickets question reappears)
    expect(await screen.findByText(/Will you be selling tickets/)).toBeInTheDocument()
  })
})
