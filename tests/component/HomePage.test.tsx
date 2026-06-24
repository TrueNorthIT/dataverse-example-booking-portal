import { describe, it, expect, beforeEach } from "vitest"
import { renderWithProviders, screen, userEvent, mockClient, setAuth0State, waitFor } from "../setup/test-utils"
import { HomePage } from "@/pages/citizen/HomePage"

const CATEGORIES = [
  {
    bookableresourcecategoryid: "cat-leisure",
    name: "Leisure Centre",
    description: "Gyms and pools",
    statecode: 0,
  },
  {
    bookableresourcecategoryid: "cat-recycling",
    name: "Recycling Centre",
    description: "Tip and waste",
    statecode: 0,
  },
]

const ASSNS = [
  {
    resource: "res-gym",
    resourcecategory: "cat-leisure",
    resourcecategory_label: "Leisure Centre",
    Resource: { bookableresourceid: "res-gym", name: "Holt Park Active" },
  },
  {
    resource: "res-tip",
    resourcecategory: "cat-recycling",
    resourcecategory_label: "Recycling Centre",
    Resource: { bookableresourceid: "res-tip", name: "Seacroft Recycling Centre" },
  },
]

function mockHomeData() {
  mockClient.public.list.mockResolvedValue({ data: CATEGORIES, page: {} })
  mockClient.public.eachPage.mockImplementation(async function* () {
    yield { data: ASSNS, page: {} }
  })
}

describe("HomePage", () => {
  beforeEach(() => {
    setAuth0State({
      isAuthenticated: true,
      user: { sub: "x", name: "Sarah Johnson", email: "sarah@example.com" },
    })
  })

  it("greets the user and renders the search box", () => {
    mockHomeData()
    renderWithProviders(<HomePage />)
    expect(screen.getByText("Hello, Sarah")).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText(/Search services/)
    ).toBeInTheDocument()
  })

  it("shows loading skeletons before categories arrive", () => {
    // list never resolves on first paint -> isLoading true
    mockClient.public.list.mockReturnValue(new Promise(() => {}))
    mockClient.public.eachPage.mockImplementation(async function* () {})
    const { container } = renderWithProviders(<HomePage />)
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0)
  })

  it("renders the populated category grid", async () => {
    mockHomeData()
    renderWithProviders(<HomePage />)
    expect(await screen.findByText("Leisure Centre")).toBeInTheDocument()
    expect(screen.getByText("Recycling Centre")).toBeInTheDocument()
    expect(screen.getByText("Gyms and pools")).toBeInTheDocument()
  })

  it("filters categories by the search term", async () => {
    mockHomeData()
    renderWithProviders(<HomePage />)
    await screen.findByText("Leisure Centre")

    const search = screen.getByPlaceholderText(/Search services/)
    // "Gyms and pools" is the Leisure description; matches the category only
    // (no venue name contains "gyms"), so Recycling drops out.
    await userEvent.type(search, "gyms")

    await waitFor(() => {
      expect(screen.queryByText("Recycling Centre")).not.toBeInTheDocument()
    })
    expect(screen.getByText("Leisure Centre")).toBeInTheDocument()
    // when searching, a "Categories" heading appears
    expect(screen.getByText("Categories")).toBeInTheDocument()
  })

  it("matches an individual venue by name and shows the Matching venues section", async () => {
    mockHomeData()
    renderWithProviders(<HomePage />)
    await screen.findByText("Leisure Centre")

    const search = screen.getByPlaceholderText(/Search services/)
    await userEvent.type(search, "holt park")

    expect(await screen.findByText("Matching venues")).toBeInTheDocument()
    const link = screen.getByRole("link", { name: /Holt Park Active/ })
    expect(link).toHaveAttribute("href", "/book/res-gym")
  })

  it("shows the no-results message when nothing matches", async () => {
    mockHomeData()
    renderWithProviders(<HomePage />)
    await screen.findByText("Leisure Centre")

    const search = screen.getByPlaceholderText(/Search services/)
    await userEvent.type(search, "zzzznotathing")

    expect(await screen.findByText(/No services match/)).toBeInTheDocument()
  })
})
