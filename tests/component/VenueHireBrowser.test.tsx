import { describe, it, expect, beforeAll } from "vitest"
import { renderWithProviders, screen, userEvent } from "../setup/test-utils"
import { VenueHireBrowser } from "@/components/citizen/VenueHireBrowser"
import type { Venue } from "@/types/generated"

// Radix Select relies on Pointer Events APIs that jsdom doesn't implement.
// Polyfill the few it uses so the dropdown can open in tests.
beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.setPointerCapture = () => {}
    Element.prototype.releasePointerCapture = () => {}
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }
})

function venue(name: string, id: string): Venue {
  return { bookableresourceid: id, name } as Venue
}

// A spread of VENUE_ROOMS rooms with different capacities/features.
const ROOMS: Venue[] = [
  venue("Strawberry Lane Community Centre — Hall", "r1"), // cap 80, features kitchen+wetroom
  venue("Morley Town Hall — Alexandra Hall", "r2"), // cap 650, stage/bar/parking/kitchen/dancefloor
  venue("Morley Town Hall — Small Banqueting Hall", "r3"), // cap 40, no features
  venue("Mandela Centre — Main Hall", "r4"), // cap 120, kitchen/parking/dancefloor/wetroom
]

describe("VenueHireBrowser", () => {
  it("lists all rooms (capacity + from price) with no filters", () => {
    renderWithProviders(<VenueHireBrowser rooms={ROOMS} />)
    expect(screen.getByText("Strawberry Lane Community Centre — Hall")).toBeInTheDocument()
    expect(screen.getByText("Morley Town Hall — Alexandra Hall")).toBeInTheDocument()
    // capacity labels
    expect(screen.getByText("up to 650")).toBeInTheDocument()
    // a "from £x/hr" price renders for known rooms
    expect(screen.getAllByText(/from £/).length).toBeGreaterThanOrEqual(1)
  })

  it("filters by required feature via the toggle chips (aria-pressed)", async () => {
    const user = userEvent.setup()
    renderWithProviders(<VenueHireBrowser rooms={ROOMS} />)

    const stageChip = screen.getByRole("button", { name: "Stage" })
    expect(stageChip).toHaveAttribute("aria-pressed", "false")
    await user.click(stageChip)
    expect(stageChip).toHaveAttribute("aria-pressed", "true")

    // Only Alexandra Hall has "stage" among our rooms
    expect(screen.getByText("Morley Town Hall — Alexandra Hall")).toBeInTheDocument()
    expect(screen.queryByText("Morley Town Hall — Small Banqueting Hall")).not.toBeInTheDocument()
    expect(screen.queryByText("Strawberry Lane Community Centre — Hall")).not.toBeInTheDocument()
  })

  it("toggling a feature off restores the full list", async () => {
    const user = userEvent.setup()
    renderWithProviders(<VenueHireBrowser rooms={ROOMS} />)
    const wetroomChip = screen.getByRole("button", { name: "Wet room" })
    await user.click(wetroomChip)
    expect(screen.queryByText("Morley Town Hall — Alexandra Hall")).not.toBeInTheDocument()
    await user.click(wetroomChip)
    expect(screen.getByText("Morley Town Hall — Alexandra Hall")).toBeInTheDocument()
  })

  it("shows a 'no rooms match' message when filters exclude everything", async () => {
    const user = userEvent.setup()
    // Only rooms with kitchen+wetroom: Strawberry + Mandela (+ others). Combine with
    // a feature no room in our set has alongside — use bar + wetroom (none have both).
    renderWithProviders(<VenueHireBrowser rooms={ROOMS} />)
    await user.click(screen.getByRole("button", { name: "Bar" }))
    await user.click(screen.getByRole("button", { name: "Wet room" }))
    expect(
      screen.getByText(/No rooms match those filters/),
    ).toBeInTheDocument()
  })

  it("splits rooms into fits vs too-small for a guest band", async () => {
    const user = userEvent.setup()
    renderWithProviders(<VenueHireBrowser rooms={ROOMS} />)

    // Choose "Up to 100" → min capacity 100
    await user.click(screen.getByRole("combobox"))
    await user.click(await screen.findByRole("option", { name: "Up to 100" }))

    // "Too small for 100 guests" section appears for cap < 100 rooms
    expect(await screen.findByText(/Too small for 100 guests/)).toBeInTheDocument()
    // Small banqueting (40) and Strawberry (80) are too small
    expect(screen.getByText("Morley Town Hall — Small Banqueting Hall")).toBeInTheDocument()
    // Alexandra (650) and Mandela (120) fit
    expect(screen.getByText("Morley Town Hall — Alexandra Hall")).toBeInTheDocument()
    expect(screen.getByText("Mandela Centre — Main Hall")).toBeInTheDocument()
  })
})
