import { describe, it, expect } from "vitest"
import { Routes, Route } from "react-router-dom"
import { renderWithProviders, screen } from "../setup/test-utils"
import { CitizenShell } from "@/components/citizen/CitizenShell"

describe("CitizenShell", () => {
  it("renders header, footer and the routed outlet", () => {
    renderWithProviders(
      <Routes>
        <Route element={<CitizenShell />}>
          <Route path="/" element={<div>Outlet content</div>} />
        </Route>
      </Routes>,
      { route: "/" }
    )
    // header
    expect(screen.getByText("LCC")).toBeInTheDocument()
    // outlet
    expect(screen.getByText("Outlet content")).toBeInTheDocument()
    // footer
    expect(screen.getByText("Leeds City Council")).toBeInTheDocument()
    expect(screen.getByText("Contact Portal API")).toBeInTheDocument()
  })
})
