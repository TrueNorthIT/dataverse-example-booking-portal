import { describe, it, expect, vi } from "vitest"
import { renderWithProviders, screen, userEvent, setAuth0State } from "../setup/test-utils"
import { LoginPage } from "@/pages/LoginPage"

describe("LoginPage", () => {
  it("renders the council branding and sign-in CTA", () => {
    renderWithProviders(<LoginPage />)
    expect(screen.getByText("Leeds City Council")).toBeInTheDocument()
    expect(
      screen.getByText("Sign in to browse and book council services")
    ).toBeInTheDocument()
    expect(screen.getByText(/Civic Hall, Leeds LS1 1UR/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument()
  })

  it("calls loginWithRedirect when the Sign in button is clicked", async () => {
    const loginWithRedirect = vi.fn()
    setAuth0State({ loginWithRedirect })
    renderWithProviders(<LoginPage />)

    await userEvent.click(screen.getByRole("button", { name: "Sign in" }))
    expect(loginWithRedirect).toHaveBeenCalledTimes(1)
  })
})
