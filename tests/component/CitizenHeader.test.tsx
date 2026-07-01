import { describe, it, expect } from "vitest"
import { renderWithProviders, screen, userEvent, useAuth } from "../setup/test-utils"
import { CitizenHeader } from "@/components/citizen/CitizenHeader"

describe("CitizenHeader", () => {
  it("renders the brand and nav links", () => {
    renderWithProviders(<CitizenHeader />)
    expect(screen.getByText("LCC")).toBeInTheDocument()
    expect(screen.getByText("Book a Service")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Browse Services/ })).toHaveAttribute(
      "href",
      "/"
    )
    expect(screen.getByRole("link", { name: /My Bookings/ })).toHaveAttribute(
      "href",
      "/my-bookings"
    )
  })

  it("shows the current user's name and initials", () => {
    renderWithProviders(<CitizenHeader />)
    // default mock user: Test Citizen -> TC
    expect(screen.getByText("TC")).toBeInTheDocument()
    expect(screen.getAllByText("Test Citizen").length).toBeGreaterThan(0)
  })

  it("opens the dropdown and signs out", async () => {
    renderWithProviders(<CitizenHeader />)
    await userEvent.click(screen.getByText("TC").closest("button")!)
    const signOut = await screen.findByText("Sign out")
    await userEvent.click(signOut)
    const logout = useAuth().logout
    expect(logout).toHaveBeenCalled()
  })

  it("shows a Sign in button for an anonymous visitor", async () => {
    renderWithProviders(<CitizenHeader />, { auth: { isAuthenticated: false } })
    expect(screen.queryByText("TC")).not.toBeInTheDocument()
    const signIn = screen.getByRole("button", { name: /Sign in/ })
    await userEvent.click(signIn)
    expect(useAuth().loginWithRedirect).toHaveBeenCalled()
  })
})
