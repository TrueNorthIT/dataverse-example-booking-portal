import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderWithProviders, screen, userEvent, mockClient, setAuth0State, waitFor, within } from "../setup/test-utils"
import { MyBookingsPage } from "@/pages/citizen/MyBookingsPage"
import { ServicebookingTnStatus } from "@/types/generated"
import { toast } from "sonner"

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}))

const FUTURE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
const FUTURE_END = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3600_000).toISOString()
const PAST = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
const PAST_END = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 3600_000).toISOString()

const UPCOMING_BOOKING = {
  tn_citizenservicebookingid: "csb-up",
  tn_name: "Gym session",
  tn_booking: "bk-up",
  tn_requestedstart: FUTURE,
  tn_requestedend: FUTURE_END,
  tn_status: ServicebookingTnStatus.Confirmed,
  tn_Booking: {
    bookableresourcebookingid: "bk-up",
    name: "Gym session",
    starttime: FUTURE,
    endtime: FUTURE_END,
    resource: "res-gym",
    resource_label: "Holt Park Active",
  },
}

const PAST_BOOKING = {
  tn_citizenservicebookingid: "csb-past",
  tn_name: "Old swim",
  tn_booking: "bk-past",
  tn_requestedstart: PAST,
  tn_requestedend: PAST_END,
  tn_status: ServicebookingTnStatus.Completed,
  tn_Booking: {
    bookableresourcebookingid: "bk-past",
    name: "Old swim",
    starttime: PAST,
    endtime: PAST_END,
    resource: "res-pool",
    resource_label: "Kirkstall Leisure Centre",
  },
}

const STATUSES = [
  { bookingstatusid: "st-cancel", name: "Canceled" },
  { bookingstatusid: "st-active", name: "Active" },
]

const RECYCLING_BOOKING = {
  tn_citizenservicebookingid: "csb-tip",
  tn_name: "Tip run",
  tn_booking: "bk-tip",
  tn_requestedstart: FUTURE,
  tn_requestedend: FUTURE_END,
  tn_status: ServicebookingTnStatus.Confirmed,
  tn_Booking: {
    bookableresourcebookingid: "bk-tip",
    name: "Tip run",
    starttime: FUTURE,
    endtime: FUTURE_END,
    resource: "res-tip",
    resource_label: "Seacroft Recycling Centre",
  },
}

const ASSNS = [
  {
    resource: "res-gym",
    resourcecategory: "cat-leisure",
    resourcecategory_label: "Leisure Centre",
    ResourceCategory: { name: "Leisure Centre" },
  },
  {
    resource: "res-pool",
    resourcecategory: "cat-leisure",
    resourcecategory_label: "Leisure Centre",
    ResourceCategory: { name: "Leisure Centre" },
  },
  {
    resource: "res-tip",
    resourcecategory: "cat-recycling",
    resourcecategory_label: "Recycling Centre",
    ResourceCategory: { name: "Recycling Centre" },
  },
]

function mockData(bookings: unknown[]) {
  mockClient.me.list.mockResolvedValue({ data: bookings, page: {} })
  mockClient.public.list.mockImplementation(async (table: string) => {
    if (table === "status") return { data: STATUSES, page: {} }
    return { data: [], page: {} }
  })
  mockClient.public.eachPage.mockImplementation(async function* () {
    yield { data: ASSNS, page: {} }
  })
}

describe("MyBookingsPage", () => {
  beforeEach(() => {
    setAuth0State({
      isAuthenticated: true,
      user: { sub: "x", name: "Sarah Johnson", email: "sarah@example.com" },
    })
  })

  it("shows skeletons while bookings load", () => {
    mockClient.me.list.mockReturnValue(new Promise(() => {}))
    const { container } = renderWithProviders(<MyBookingsPage />)
    expect(screen.getByText(/Viewing bookings for/)).toBeInTheDocument()
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0)
  })

  it("shows the empty upcoming state when there are no bookings", async () => {
    mockData([])
    renderWithProviders(<MyBookingsPage />)
    expect(await screen.findByText("No upcoming bookings")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Browse services" })).toBeInTheDocument()
  })

  it("renders the tab counts and the upcoming booking", async () => {
    mockData([UPCOMING_BOOKING, PAST_BOOKING])
    renderWithProviders(<MyBookingsPage />)
    expect(await screen.findByText("Gym session")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Upcoming \(1\)/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Past \(1\)/ })).toBeInTheDocument()
    // past booking not visible under the default Upcoming tab
    expect(screen.queryByText("Old swim")).not.toBeInTheDocument()
  })

  it("switches to the Past tab and shows past bookings", async () => {
    mockData([UPCOMING_BOOKING, PAST_BOOKING])
    renderWithProviders(<MyBookingsPage />)
    await screen.findByText("Gym session")

    await userEvent.click(screen.getByRole("button", { name: /Past \(1\)/ }))
    expect(await screen.findByText("Old swim")).toBeInTheDocument()
    expect(screen.queryByText("Gym session")).not.toBeInTheDocument()
  })

  it("filters bookings by category chip when multiple categories are present", async () => {
    mockData([UPCOMING_BOOKING, RECYCLING_BOOKING])
    renderWithProviders(<MyBookingsPage />)
    await screen.findByText("Gym session")
    expect(screen.getByText("Tip run")).toBeInTheDocument()

    // Category chips appear (>1 category). Click "Recycling Centre".
    const chip = await screen.findByRole("button", { name: /Recycling Centre \(1\)/ })
    await userEvent.click(chip)

    await waitFor(() => {
      expect(screen.queryByText("Gym session")).not.toBeInTheDocument()
    })
    expect(screen.getByText("Tip run")).toBeInTheDocument()
  })

  it("shows the past-empty state on the Past tab with no past bookings", async () => {
    mockData([UPCOMING_BOOKING])
    renderWithProviders(<MyBookingsPage />)
    await screen.findByText("Gym session")
    await userEvent.click(screen.getByRole("button", { name: /Past \(0\)/ }))
    expect(await screen.findByText("No past bookings")).toBeInTheDocument()
  })

  it("cancels an upcoming booking via the confirm dialog", async () => {
    mockData([UPCOMING_BOOKING])
    renderWithProviders(<MyBookingsPage />)
    await screen.findByText("Gym session")

    // The cancel X button on the card (the only icon button before the dialog opens)
    const buttons = screen.getAllByRole("button")
    const cancelIconBtn = buttons.find((b) => b.querySelector("svg.lucide-x"))
    expect(cancelIconBtn).toBeTruthy()
    await userEvent.click(cancelIconBtn!)

    // Dialog opens
    const dialog = await screen.findByRole("dialog")
    await userEvent.click(within(dialog).getByRole("button", { name: /Cancel booking/ }))

    await waitFor(() => {
      expect(mockClient.me.update).toHaveBeenCalledWith(
        "servicebooking",
        "csb-up",
        expect.objectContaining({ tn_status: ServicebookingTnStatus.Cancelled })
      )
    })
    expect(mockClient.all.update).toHaveBeenCalledWith(
      "booking",
      "bk-up",
      expect.objectContaining({ bookingstatus: "st-cancel" })
    )
  })

  it("toasts an error when the cancel status is not loaded", async () => {
    mockClient.me.list.mockResolvedValue({ data: [UPCOMING_BOOKING], page: {} })
    // status list returns no "Canceled" status -> cancelStatus undefined
    mockClient.public.list.mockImplementation(async (table: string) => {
      if (table === "status") return { data: [{ bookingstatusid: "x", name: "Active" }], page: {} }
      return { data: [], page: {} }
    })
    mockClient.public.eachPage.mockImplementation(async function* () {
      yield { data: ASSNS, page: {} }
    })

    renderWithProviders(<MyBookingsPage />)
    await screen.findByText("Gym session")

    const buttons = screen.getAllByRole("button")
    const cancelIconBtn = buttons.find((b) => b.querySelector("svg.lucide-x"))
    await userEvent.click(cancelIconBtn!)
    const dialog = await screen.findByRole("dialog")
    await userEvent.click(within(dialog).getByRole("button", { name: /Cancel booking/ }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Booking statuses not loaded")
    })
    expect(mockClient.me.update).not.toHaveBeenCalled()
  })
})
