import { describe, it, expect } from "vitest"
import { Inbox } from "lucide-react"
import { renderWithProviders, screen } from "../setup/test-utils"
import { EmptyState } from "@/components/common/EmptyState"

describe("EmptyState", () => {
  it("renders title and description", () => {
    renderWithProviders(
      <EmptyState icon={Inbox} title="Nothing here" description="No items found" />
    )
    expect(screen.getByRole("heading", { name: "Nothing here" })).toBeInTheDocument()
    expect(screen.getByText("No items found")).toBeInTheDocument()
  })

  it("does not render an action when none is provided", () => {
    renderWithProviders(
      <EmptyState icon={Inbox} title="T" description="D" />
    )
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("renders the action node when provided", () => {
    renderWithProviders(
      <EmptyState
        icon={Inbox}
        title="T"
        description="D"
        action={<button type="button">Do it</button>}
      />
    )
    expect(screen.getByRole("button", { name: "Do it" })).toBeInTheDocument()
  })
})
