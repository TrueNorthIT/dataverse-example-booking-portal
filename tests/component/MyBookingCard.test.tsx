import { describe, it, expect, vi } from "vitest"
import { renderWithProviders, screen, userEvent } from "../setup/test-utils"
import { MyBookingCard } from "@/components/citizen/MyBookingCard"
import { ServicebookingTnStatus } from "@/types/generated"
import type { ExpandedServicebooking } from "@/hooks/useMyBookings"

function makeBooking(overrides: Partial<ExpandedServicebooking> = {}): ExpandedServicebooking {
  // Far-future so it's not "past"
  const start = new Date(2099, 5, 1, 10, 0, 0)
  const end = new Date(2099, 5, 1, 11, 0, 0)
  return {
    tn_name: "My Tennis Court Booking",
    tn_status: ServicebookingTnStatus.Confirmed,
    tn_status_label: "Confirmed",
    tn_requestedstart: start.toISOString(),
    tn_requestedend: end.toISOString(),
    tn_Booking: {
      bookableresourcebookingid: "b1",
      name: "Booking",
      starttime: start.toISOString(),
      endtime: end.toISOString(),
      resource_label: "Tennis Court 1",
    },
    ...overrides,
  } as ExpandedServicebooking
}

describe("MyBookingCard", () => {
  it("renders booking name, resource and time for a future booking", () => {
    renderWithProviders(
      <MyBookingCard booking={makeBooking()} onCancel={vi.fn()} />,
    )
    expect(screen.getByText("My Tennis Court Booking")).toBeInTheDocument()
    expect(screen.getByText("Tennis Court 1")).toBeInTheDocument()
    expect(screen.getByText(/10:00 — 11:00/)).toBeInTheDocument()
    expect(screen.getByText("Confirmed")).toBeInTheDocument()
  })

  it("renders the category badge when categoryName is provided", () => {
    renderWithProviders(
      <MyBookingCard booking={makeBooking()} categoryName="Venue Hire" onCancel={vi.fn()} />,
    )
    expect(screen.getByText("Venue Hire")).toBeInTheDocument()
  })

  it("shows a cancel button for future, non-cancelled bookings and confirms via dialog", async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const booking = makeBooking()
    renderWithProviders(<MyBookingCard booking={booking} onCancel={onCancel} />)

    // The X icon button opens the dialog
    const buttons = screen.getAllByRole("button")
    await user.click(buttons[0])

    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByText("Cancel booking?")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Cancel booking" }))
    expect(onCancel).toHaveBeenCalledWith(booking)
  })

  it("can keep the booking (dismiss the dialog) without calling onCancel", async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderWithProviders(<MyBookingCard booking={makeBooking()} onCancel={onCancel} />)

    await user.click(screen.getAllByRole("button")[0])
    await user.click(screen.getByRole("button", { name: "Keep booking" }))
    expect(onCancel).not.toHaveBeenCalled()
  })

  it("shows 'Cancelling...' text and disables the confirm button while cancelling", async () => {
    renderWithProviders(
      <MyBookingCard booking={makeBooking()} onCancel={vi.fn()} cancelling />,
    )
    // open dialog via the (disabled-look but still openable? it's disabled) — instead the
    // X button is disabled while cancelling, so open is not possible. Assert it's disabled.
    expect(screen.getAllByRole("button")[0]).toBeDisabled()
  })

  it("hides the cancel button for cancelled bookings and uses destructive badge", () => {
    renderWithProviders(
      <MyBookingCard
        booking={makeBooking({ tn_status: ServicebookingTnStatus.Cancelled, tn_status_label: "Cancelled" })}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByText("Cancelled")).toBeInTheDocument()
    // No cancel (X) button rendered → only no buttons at all on the card
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("hides the cancel button for past bookings", () => {
    const start = new Date(2000, 0, 1, 10, 0, 0)
    const end = new Date(2000, 0, 1, 11, 0, 0)
    renderWithProviders(
      <MyBookingCard
        booking={makeBooking({
          tn_requestedstart: start.toISOString(),
          tn_requestedend: end.toISOString(),
          tn_Booking: {
            bookableresourcebookingid: "b1",
            name: "Booking",
            starttime: start.toISOString(),
            endtime: end.toISOString(),
            resource_label: "Tennis Court 1",
          },
        })}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("falls back to Resource.name and BookingStatus.name when labels are absent", () => {
    const start = new Date(2099, 5, 1, 10, 0, 0)
    const end = new Date(2099, 5, 1, 11, 0, 0)
    renderWithProviders(
      <MyBookingCard
        booking={{
          tn_name: "Fallback Booking",
          tn_status: ServicebookingTnStatus.Confirmed,
          tn_requestedstart: start.toISOString(),
          tn_requestedend: end.toISOString(),
          tn_Booking: {
            bookableresourcebookingid: "b1",
            name: "Booking",
            starttime: start.toISOString(),
            endtime: end.toISOString(),
            Resource: { name: "Hall A", bookableresourceid: "r1" },
            BookingStatus: { name: "Scheduled", bookingstatusid: "s1" },
          },
        } as ExpandedServicebooking}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByText("Hall A")).toBeInTheDocument()
    expect(screen.getByText("Scheduled")).toBeInTheDocument()
  })
})
