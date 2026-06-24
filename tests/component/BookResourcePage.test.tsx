import { describe, it, expect, vi, beforeEach } from "vitest"
import { Routes, Route } from "react-router-dom"
import { renderWithProviders, screen, userEvent, mockClient, setAuth0State, waitFor } from "../setup/test-utils"
import { BookResourcePage } from "@/pages/citizen/BookResourcePage"

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}))

const VENUE = {
  bookableresourceid: "res-gym",
  name: "Holt Park Active",
  calendarid: "cal-1",
  statecode: 0,
}

const VENUE_HIRE = {
  bookableresourceid: "res-hall",
  name: "Morley Town Hall — Alexandra Hall",
  calendarid: "cal-2",
  statecode: 0,
}

// One Available work-hours block for today (capacity 1), 09:00–12:00 local.
function availableBlock() {
  const d = new Date()
  d.setHours(9, 0, 0, 0)
  const start = d.toISOString()
  const e = new Date()
  e.setHours(12, 0, 0, 0)
  const end = e.toISOString()
  return { TimeCode: "Available", Start: start, End: end, Effort: 1 }
}

function mockCommon(category: string, resourceId: string, bufferMinutes = 0) {
  mockClient.public.get.mockResolvedValue({
    data: resourceId === "res-hall" ? VENUE_HIRE : VENUE,
  })
  mockClient.public.eachPage.mockImplementation(async function* () {
    yield {
      data: [
        {
          resource: resourceId,
          resourcecategory: "cat-x",
          resourcecategory_label: category,
          ResourceCategory: { name: category, tn_bufferminutes: bufferMinutes },
        },
      ],
      page: {},
    }
  })
  mockClient.public.invokeFunction.mockResolvedValue({
    data: { result: [availableBlock()] },
  })
  mockClient.public.list.mockImplementation(async (table: string) => {
    if (table === "status")
      return { data: [{ bookingstatusid: "st-cancel", name: "Canceled" }], page: {} }
    // booking availability + venue day bookings
    return { data: [], page: {} }
  })
  mockClient.me.list.mockResolvedValue({ data: [], page: {} })
}

function renderBook(route = "/book/res-gym") {
  return renderWithProviders(
    <Routes>
      <Route path="/book/:resourceId" element={<BookResourcePage />} />
    </Routes>,
    { route }
  )
}

describe("BookResourcePage", () => {
  beforeEach(() => {
    setAuth0State({
      isAuthenticated: true,
      user: { sub: "x", name: "Sarah Johnson", email: "sarah@example.com" },
    })
  })

  it("shows a skeleton while the resource is loading", () => {
    mockClient.public.get.mockReturnValue(new Promise(() => {}))
    mockClient.public.eachPage.mockImplementation(async function* () {})
    mockClient.public.list.mockResolvedValue({ data: [], page: {} })
    mockClient.public.invokeFunction.mockResolvedValue({ data: { result: [] } })
    mockClient.me.list.mockResolvedValue({ data: [], page: {} })
    const { container } = renderBook()
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0)
  })

  it("renders the resource header for the standard slot-grid view", async () => {
    mockCommon("Leisure Centre", "res-gym")
    renderBook()
    expect(
      await screen.findByRole("heading", { name: "Holt Park Active" })
    ).toBeInTheDocument()
    // standard view section headings
    expect(screen.getByText("Select a date")).toBeInTheDocument()
    expect(screen.getByText("Available times")).toBeInTheDocument()
  })

  it("renders the availability slot grid with generated slots", async () => {
    mockCommon("Leisure Centre", "res-gym")
    renderBook()
    await screen.findByRole("heading", { name: "Holt Park Active" })
    // generateAvailabilitySlots makes hourly cells (Leisure default 60 min)
    expect(await screen.findByText(/of .* slots available/)).toBeInTheDocument()
  })

  it("shows the changeover buffer notice when the category has a buffer", async () => {
    mockCommon("Recycling Centre", "res-gym", 15)
    renderBook()
    await screen.findByRole("heading", { name: "Holt Park Active" })
    expect(
      await screen.findByText(/15-minute changeover is automatically applied/)
    ).toBeInTheDocument()
  })

  it("renders the booking form when an available slot is selected", async () => {
    mockCommon("Leisure Centre", "res-gym")
    renderBook()
    await screen.findByRole("heading", { name: "Holt Park Active" })
    // Wait for the grid to render, then click the first enabled "available" slot.
    await screen.findByText(/of .* slots available/)
    const slotButtons = screen
      .getAllByRole("button")
      .filter((b) => /, available$/.test(b.getAttribute("aria-label") ?? ""))
    expect(slotButtons.length).toBeGreaterThan(0)
    await userEvent.click(slotButtons[0])
    // CitizenBookingForm renders a confirm step.
    expect(await screen.findByText("Confirm your booking")).toBeInTheDocument()
  })

  it("shows 'Resource not found' when the venue lookup returns null", async () => {
    mockClient.public.get.mockResolvedValue({ data: null })
    mockClient.public.eachPage.mockImplementation(async function* () {})
    mockClient.public.invokeFunction.mockResolvedValue({ data: { result: [] } })
    mockClient.public.list.mockResolvedValue({ data: [], page: {} })
    mockClient.me.list.mockResolvedValue({ data: [], page: {} })
    renderBook()
    expect(await screen.findByText("Resource not found")).toBeInTheDocument()
  })

  it("renders the session-length picker for multi-duration categories and changes duration", async () => {
    mockCommon("Sports Pitch", "res-gym")
    renderBook()
    await screen.findByRole("heading", { name: "Holt Park Active" })
    // Sports Pitch has multiple duration options -> picker is shown
    expect(await screen.findByText("Session length")).toBeInTheDocument()
    // Pick a different duration (120 min -> "2 hours")
    const twoHours = await screen.findByRole("button", { name: "2 hours" })
    await userEvent.click(twoHours)
    // Grid still renders after duration change
    expect(await screen.findByText(/of .* slots available/)).toBeInTheDocument()
  })

  it("cancels one of the citizen's own booked slots", async () => {
    mockCommon("Leisure Centre", "res-gym")
    // A booking for this resource at today's first slot (09:00–10:00 local)
    const start = new Date(); start.setHours(9, 0, 0, 0)
    const end = new Date(); end.setHours(10, 0, 0, 0)
    mockClient.me.list.mockResolvedValue({
      data: [
        {
          tn_citizenservicebookingid: "csb-mine",
          tn_name: "My gym slot",
          tn_Booking: {
            bookableresourcebookingid: "bk-mine",
            name: "Holt Park Active",
            starttime: start.toISOString(),
            endtime: end.toISOString(),
          },
        },
      ],
      page: {},
    })

    renderBook()
    await screen.findByText(/of .* slots available/)

    // The slot the citizen owns is labelled "your booking"
    const mineButton = await screen.findByRole("button", { name: /your booking$/ })
    await userEvent.click(mineButton)

    // Cancel confirmation card appears
    expect(await screen.findByText("Cancel this booking?")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Cancel booking" }))

    await waitFor(() => {
      expect(mockClient.me.update).toHaveBeenCalledWith(
        "servicebooking",
        "csb-mine",
        expect.objectContaining({ statecode: 1 })
      )
    })
    expect(mockClient.all.update).toHaveBeenCalledWith(
      "booking",
      "bk-mine",
      expect.anything()
    )
  })

  it("renders the Venue Hire branch for a Venue Hire resource", async () => {
    mockCommon("Venue Hire", "res-hall")
    renderBook("/book/res-hall")
    expect(
      await screen.findByRole("heading", {
        name: "Morley Town Hall — Alexandra Hall",
      })
    ).toBeInTheDocument()
    // VenueHireBooking-specific copy
    expect(await screen.findByText("Choose your date")).toBeInTheDocument()
    expect(screen.getByText("Choose a session")).toBeInTheDocument()
  })
})
