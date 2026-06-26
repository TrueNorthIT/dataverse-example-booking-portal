import { describe, it, expect } from "vitest"
import { renderWithProviders, screen } from "../setup/test-utils"
import { CategoryCard } from "@/components/citizen/CategoryCard"
import type { Service } from "@/types/generated"

function makeCategory(overrides: Partial<Service> = {}): Service {
  return {
    bookableresourcecategoryid: "cat-1",
    name: "Library",
    description: "Reserve a study room",
    ...overrides,
  } as Service
}

describe("CategoryCard", () => {
  it("renders the name, description and links to the category", () => {
    renderWithProviders(<CategoryCard category={makeCategory()} />)
    expect(screen.getByText("Library")).toBeInTheDocument()
    expect(screen.getByText("Reserve a study room")).toBeInTheDocument()
    expect(screen.getByRole("link")).toHaveAttribute("href", "/browse/cat-1")
  })

  it("falls back to a default description when none provided", () => {
    renderWithProviders(
      <CategoryCard category={makeCategory({ description: undefined })} />
    )
    expect(screen.getByText("Browse available services")).toBeInTheDocument()
  })

  it("shows a singular location count", () => {
    renderWithProviders(<CategoryCard category={makeCategory()} resourceCount={1} />)
    expect(screen.getByText("1 location")).toBeInTheDocument()
  })

  it("shows a plural location count", () => {
    renderWithProviders(<CategoryCard category={makeCategory()} resourceCount={3} />)
    expect(screen.getByText("3 locations")).toBeInTheDocument()
  })

  it("omits the count when undefined", () => {
    renderWithProviders(<CategoryCard category={makeCategory()} />)
    expect(screen.queryByText(/location/)).not.toBeInTheDocument()
  })

  it("uses the fallback meta for an unknown category name", () => {
    renderWithProviders(
      <CategoryCard category={makeCategory({ name: "Totally Unknown" })} />
    )
    expect(screen.getByText("Totally Unknown")).toBeInTheDocument()
  })
})
