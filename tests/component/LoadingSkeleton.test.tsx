import { describe, it, expect } from "vitest"
import { renderWithProviders } from "../setup/test-utils"
import {
  TableSkeleton,
  CardSkeleton,
  CalendarSkeleton,
} from "@/components/common/LoadingSkeleton"

describe("LoadingSkeleton", () => {
  it("renders TableSkeleton with default rows/cols", () => {
    const { container } = renderWithProviders(<TableSkeleton />)
    // header row (4 cols) + 5 rows × 4 cols = 24 skeletons
    expect(container.querySelectorAll(".animate-pulse").length).toBe(24)
  })

  it("renders TableSkeleton with custom rows/cols", () => {
    const { container } = renderWithProviders(<TableSkeleton rows={2} cols={3} />)
    // header (3) + 2 rows × 3 = 9
    expect(container.querySelectorAll(".animate-pulse").length).toBe(9)
  })

  it("renders CardSkeleton", () => {
    const { container } = renderWithProviders(<CardSkeleton />)
    expect(container.querySelectorAll(".animate-pulse").length).toBe(4)
  })

  it("renders CalendarSkeleton", () => {
    const { container } = renderWithProviders(<CalendarSkeleton />)
    expect(container.querySelectorAll(".animate-pulse").length).toBe(3)
  })
})
