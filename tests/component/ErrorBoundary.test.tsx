import { describe, it, expect, vi, afterEach } from "vitest"
import { renderWithProviders, screen, userEvent } from "../setup/test-utils"
import { ErrorBoundary } from "@/components/common/ErrorBoundary"

function Boom({ message }: { message?: string }): never {
  throw new Error(message ?? "")
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("ErrorBoundary", () => {
  it("renders children when no error is thrown", () => {
    renderWithProviders(
      <ErrorBoundary>
        <div>Safe child</div>
      </ErrorBoundary>
    )
    expect(screen.getByText("Safe child")).toBeInTheDocument()
  })

  it("renders the fallback with the error message", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    renderWithProviders(
      <ErrorBoundary>
        <Boom message="Kaboom" />
      </ErrorBoundary>
    )
    expect(screen.getByText("Something went wrong")).toBeInTheDocument()
    expect(screen.getByText("Kaboom")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Reload page" })).toBeInTheDocument()
    spy.mockRestore()
  })

  it("falls back to a default message when the error has none", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    renderWithProviders(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    )
    expect(screen.getByText("An unexpected error occurred.")).toBeInTheDocument()
    spy.mockRestore()
  })

  it("attempts to reload when the button is clicked", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    const reload = vi.fn()
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload },
    })
    renderWithProviders(
      <ErrorBoundary>
        <Boom message="x" />
      </ErrorBoundary>
    )
    await userEvent.click(screen.getByRole("button", { name: "Reload page" }))
    expect(reload).toHaveBeenCalled()
    spy.mockRestore()
  })
})
