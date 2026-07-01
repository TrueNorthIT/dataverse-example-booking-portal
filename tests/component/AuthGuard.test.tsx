import { describe, it, expect, vi } from "vitest"
import { renderHook } from "@testing-library/react"
import { renderWithProviders, screen, setAuth0State } from "../setup/test-utils"
import { AuthGuard, useCurrentUser } from "@/components/auth/AuthGuard"

describe("AuthGuard", () => {
  it("renders a loading spinner while auth is loading", () => {
    setAuth0State({ isLoading: true, isAuthenticated: false })
    const { container } = renderWithProviders(
      <AuthGuard>
        <div>protected content</div>
      </AuthGuard>
    )
    expect(screen.queryByText("protected content")).not.toBeInTheDocument()
    // LoadingSpinner renders animate-pulse skeleton placeholders
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0)
  })

  it("renders children when authenticated", () => {
    setAuth0State({ isLoading: false, isAuthenticated: true })
    renderWithProviders(
      <AuthGuard>
        <div>protected content</div>
      </AuthGuard>
    )
    expect(screen.getByText("protected content")).toBeInTheDocument()
  })

  it("renders children for an anonymous visitor (public-browse mode)", () => {
    const loginWithRedirect = vi.fn()
    setAuth0State({ isLoading: false, isAuthenticated: false, loginWithRedirect })
    renderWithProviders(
      <AuthGuard>
        <div>protected content</div>
      </AuthGuard>
    )
    // Guests can browse — no forced redirect, content renders.
    expect(screen.getByText("protected content")).toBeInTheDocument()
    expect(loginWithRedirect).not.toHaveBeenCalled()
  })

  it("shows the Authentication Error screen when an auth error is present", () => {
    setAuth0State({ isLoading: false, isAuthenticated: false, error: new Error("token expired") })
    renderWithProviders(
      <AuthGuard>
        <div>protected content</div>
      </AuthGuard>
    )
    expect(screen.getByText("Authentication Error")).toBeInTheDocument()
    expect(screen.getByText("token expired")).toBeInTheDocument()
    expect(screen.queryByText("protected content")).not.toBeInTheDocument()
  })

  it("shows fallback message when error has no message", () => {
    setAuth0State({ isLoading: false, isAuthenticated: true, error: new Error("") })
    renderWithProviders(
      <AuthGuard>
        <div>child</div>
      </AuthGuard>
    )
    expect(
      screen.getByText("An error occurred during authentication.")
    ).toBeInTheDocument()
  })
})

describe("useCurrentUser", () => {
  it("derives name, email and initials from the signed-in user", () => {
    setAuth0State({
      isAuthenticated: true,
      user: { sub: "x", name: "Sarah Johnson", email: "sarah@example.com" },
    })
    const { result } = renderHook(() => useCurrentUser())
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.name).toBe("Sarah Johnson")
    expect(result.current.email).toBe("sarah@example.com")
    expect(result.current.initials).toBe("SJ")
  })

  it("falls back to ?? initials and empty strings when no user", () => {
    setAuth0State({ isAuthenticated: false, user: undefined })
    const { result } = renderHook(() => useCurrentUser())
    expect(result.current.name).toBe("")
    expect(result.current.email).toBe("")
    expect(result.current.initials).toBe("??")
  })
})
