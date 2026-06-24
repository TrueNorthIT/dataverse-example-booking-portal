import { describe, it, expect } from "vitest"
import { renderWithProviders, screen } from "../setup/test-utils"
import { ResourceCard } from "@/components/citizen/ResourceCard"
import type { Venue } from "@/types/generated"

function makeVenue(overrides: Partial<Venue> = {}): Venue {
  return {
    bookableresourceid: "res-1",
    name: "Some Resource",
    ...overrides,
  } as Venue
}

describe("ResourceCard", () => {
  it("links to the booking page", () => {
    renderWithProviders(<ResourceCard resource={makeVenue()} />)
    expect(screen.getByRole("link")).toHaveAttribute("href", "/book/res-1")
  })

  it("shows the hire rate for a known venue name", () => {
    // Alexandra Hall standard rate is 62.5/hr -> £62.50/hr
    renderWithProviders(
      <ResourceCard
        resource={makeVenue({ name: "Morley Town Hall — Alexandra Hall" })}
      />
    )
    expect(screen.getByText("Morley Town Hall — Alexandra Hall")).toBeInTheDocument()
    expect(screen.getByText(/from £62\.50\/hr/)).toBeInTheDocument()
  })

  it("shows the plain description branch when no rate or location info", () => {
    renderWithProviders(<ResourceCard resource={makeVenue()} />)
    expect(screen.getByText("Click to view availability and book")).toBeInTheDocument()
    expect(screen.queryByText(/away/)).not.toBeInTheDocument()
  })

  it("shows distance and busy level when provided", () => {
    renderWithProviders(
      <ResourceCard resource={makeVenue()} distance={2.4} busyLevel="busy" />
    )
    expect(screen.getByText(/2\.4 mi away/)).toBeInTheDocument()
    expect(screen.getByText("Busy today")).toBeInTheDocument()
    // location info branch replaces the plain description
    expect(
      screen.queryByText("Click to view availability and book")
    ).not.toBeInTheDocument()
  })

  it("renders distance only (no busy level)", () => {
    renderWithProviders(<ResourceCard resource={makeVenue()} distance={0.05} />)
    expect(screen.getByText(/<0\.1 mi away/)).toBeInTheDocument()
  })

  it("renders busy level only (quiet) with no distance", () => {
    renderWithProviders(
      <ResourceCard resource={makeVenue()} distance={null} busyLevel="quiet" />
    )
    expect(screen.getByText("Quiet today")).toBeInTheDocument()
    expect(screen.queryByText(/away/)).not.toBeInTheDocument()
  })
})
