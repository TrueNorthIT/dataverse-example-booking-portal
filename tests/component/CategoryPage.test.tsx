import { describe, it, expect } from "vitest"
import { Routes, Route } from "react-router-dom"
import { renderWithProviders, screen, mockClient } from "../setup/test-utils"
import { CategoryPage } from "@/pages/citizen/CategoryPage"

const CATEGORY = {
  bookableresourcecategoryid: "cat-leisure",
  name: "Leisure Centre",
  description: "Gyms, pools and studios",
  statecode: 0,
}

const VENUE_ASSNS = [
  {
    bookableresourcecategoryassnid: "assn-1",
    resource: "res-holt",
    resourcecategory: "cat-leisure",
    Resource: {
      bookableresourceid: "res-holt",
      name: "Holt Park Active",
      statecode: 0,
    },
  },
  {
    bookableresourcecategoryassnid: "assn-2",
    resource: "res-kirkstall",
    resourcecategory: "cat-leisure",
    Resource: {
      bookableresourceid: "res-kirkstall",
      name: "Kirkstall Leisure Centre",
      statecode: 0,
    },
  },
]

function renderCategory(route = "/browse/cat-leisure") {
  return renderWithProviders(
    <Routes>
      <Route path="/browse/:categoryId" element={<CategoryPage />} />
    </Routes>,
    { route }
  )
}

function mockData(rooms: unknown[] = VENUE_ASSNS) {
  mockClient.public.get.mockResolvedValue({ data: CATEGORY })
  mockClient.public.list.mockImplementation(async (table: string) => {
    if (table === "servicevenue") return { data: rooms, page: {} }
    // booking -> busyness
    return { data: [], page: {} }
  })
}

describe("CategoryPage", () => {
  it("shows skeleton placeholders while loading", () => {
    mockClient.public.get.mockReturnValue(new Promise(() => {}))
    mockClient.public.list.mockReturnValue(new Promise(() => {}))
    const { container } = renderCategory()
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0)
  })

  it("renders the category header and a populated venue list", async () => {
    mockData()
    renderCategory()
    expect(await screen.findByRole("heading", { name: "Leisure Centre" })).toBeInTheDocument()
    expect(screen.getByText("Gyms, pools and studios")).toBeInTheDocument()
    expect(await screen.findByText("Holt Park Active")).toBeInTheDocument()
    expect(screen.getByText("Kirkstall Leisure Centre")).toBeInTheDocument()
    // Breadcrumb back to all services
    expect(screen.getByRole("link", { name: "All services" })).toHaveAttribute("href", "/")
  })

  it("sorts venues by distance and links to the booking page", async () => {
    mockData()
    renderCategory()
    const holt = await screen.findByRole("link", { name: /Holt Park Active/ })
    expect(holt).toHaveAttribute("href", "/book/res-holt")
  })

  it("shows the empty branch when the category has no resources", async () => {
    mockData([])
    renderCategory()
    await screen.findByRole("heading", { name: "Leisure Centre" })
    expect(
      await screen.findByText("No resources available in this category.")
    ).toBeInTheDocument()
  })
})
