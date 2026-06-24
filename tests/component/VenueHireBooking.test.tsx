import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderWithProviders, screen, userEvent, mockClient, waitFor } from "../setup/test-utils"
import { VenueHireBooking } from "@/components/citizen/VenueHireBooking"
import type { Venue } from "@/types/generated"

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const ROOM_NAME = "Blackburn Hall, Rothwell — Main Hall"

function venue(): Venue {
  return { bookableresourceid: "res-1", name: ROOM_NAME } as Venue
}

function wireEmptyDay() {
  // useResourceCategoryMap → eachPage (servicevenue); useVenueDayBookings & status → list
  mockClient.public.eachPage.mockImplementation(async function* () {
    yield { data: [], page: {} }
  })
  mockClient.public.list.mockImplementation(async (table: string) => {
    if (table === "status") return { data: [{ name: "Scheduled", bookingstatusid: "s1" }], page: {} }
    return { data: [], page: {} } // venue day bookings + conflict
  })
}

describe("VenueHireBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.me.create.mockResolvedValue({ data: {} })
  })

  it("renders the room header, price and session picker", async () => {
    wireEmptyDay()
    renderWithProviders(<VenueHireBooking resource={venue()} />)

    expect(screen.getByRole("heading", { name: ROOM_NAME })).toBeInTheDocument()
    expect(screen.getByText("Choose a session")).toBeInTheDocument()
    // Sessions appear once day bookings resolve
    expect(await screen.findByText("Morning")).toBeInTheDocument()
    expect(screen.getByText("Afternoon")).toBeInTheDocument()
  })

  it("uses the ?date= search param to seed the selected date", async () => {
    wireEmptyDay()
    renderWithProviders(<VenueHireBooking resource={venue()} />, {
      route: "/book/res-1?date=2099-07-15",
    })
    // 2099-07-15 is a Wednesday
    expect(await screen.findByText(/Wednesday 15 July 2099/)).toBeInTheDocument()
  })

  it("selecting a session reveals the confirm/pay form", async () => {
    wireEmptyDay()
    const user = userEvent.setup()
    renderWithProviders(<VenueHireBooking resource={venue()} />)

    await user.click(await screen.findByText("Morning"))
    // CitizenBookingForm appears for the venue (paid → Pay button)
    expect(await screen.findByText("Confirm your booking")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Pay £/ })).toBeInTheDocument()
  })

  it("changing the date clears the selected session", async () => {
    wireEmptyDay()
    const user = userEvent.setup()
    renderWithProviders(<VenueHireBooking resource={venue()} />)

    await user.click(await screen.findByText("Morning"))
    expect(await screen.findByText("Confirm your booking")).toBeInTheDocument()

    // Paging to next week triggers handleDateChange → session cleared
    await user.click(screen.getByRole("button", { name: "Next week" }))
    await waitFor(() =>
      expect(screen.queryByText("Confirm your booking")).not.toBeInTheDocument(),
    )
  })

  it("renders the Venue Hire breadcrumb link when the category map resolves", async () => {
    mockClient.public.eachPage.mockImplementation(async function* () {
      yield {
        data: [
          {
            resource: "res-1",
            resourcecategory: "cat-1",
            ResourceCategory: { name: "Venue Hire" },
          },
        ],
        page: {},
      }
    })
    mockClient.public.list.mockImplementation(async (table: string) => {
      if (table === "status") return { data: [{ name: "Scheduled", bookingstatusid: "s1" }], page: {} }
      return { data: [], page: {} }
    })
    renderWithProviders(<VenueHireBooking resource={venue()} />)
    expect(await screen.findByRole("link", { name: "Venue Hire" })).toBeInTheDocument()
  })

  it("completes a booking and clears the session (handleBooked)", async () => {
    wireEmptyDay()
    const user = userEvent.setup()
    renderWithProviders(<VenueHireBooking resource={venue()} />)

    await user.click(await screen.findByText("Morning"))
    // Advance to payment, then pay
    await user.click(await screen.findByRole("button", { name: /Pay £/ }))
    const payBtn = await screen.findByText(/Demo payment/)
    expect(payBtn).toBeInTheDocument()
    ;(await screen.findByRole("button", { name: /^Pay £/ })).click()

    await waitFor(() => expect(mockClient.me.create).toHaveBeenCalled(), { timeout: 3000 })
    // After booking, the form is cleared
    await waitFor(() =>
      expect(screen.queryByText("Payment")).not.toBeInTheDocument(),
    )
  })

  it("cancelling the booking form clears the selected session", async () => {
    wireEmptyDay()
    const user = userEvent.setup()
    renderWithProviders(<VenueHireBooking resource={venue()} />)

    await user.click(await screen.findByText("Morning"))
    const form = await screen.findByText("Confirm your booking")
    expect(form).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Cancel" }))
    await waitFor(() =>
      expect(screen.queryByText("Confirm your booking")).not.toBeInTheDocument(),
    )
  })
})
