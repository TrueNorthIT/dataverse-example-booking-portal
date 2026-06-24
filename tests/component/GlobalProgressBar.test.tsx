import { describe, it, expect } from "vitest"
import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { renderWithProviders, waitFor } from "../setup/test-utils"
import { GlobalProgressBar } from "@/components/common/GlobalProgressBar"

describe("GlobalProgressBar", () => {
  it("renders nothing when idle", () => {
    const { container } = renderWithProviders(<GlobalProgressBar />)
    expect(container.querySelector(".animate-progress-bar")).toBeNull()
    expect(container).toBeEmptyDOMElement()
  })

  it("shows the bar while a query is in flight, then hides it", async () => {
    let resolve!: (v: string) => void
    function Fetcher() {
      // a query that stays pending until we resolve it
      useQuery({
        queryKey: ["progress-test"],
        queryFn: () => new Promise<string>((r) => (resolve = r)),
      })
      return null
    }
    function Resolver() {
      useEffect(() => {
        // keep pending for the initial assertion
      }, [])
      return null
    }

    const { container } = renderWithProviders(
      <>
        <GlobalProgressBar />
        <Fetcher />
        <Resolver />
      </>
    )

    await waitFor(() =>
      expect(container.querySelector(".animate-progress-bar")).not.toBeNull()
    )

    resolve("done")

    await waitFor(() =>
      expect(container.querySelector(".animate-progress-bar")).toBeNull()
    )
  })
})
