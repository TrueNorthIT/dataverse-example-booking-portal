import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import type { ReactNode } from "react"
import {
  DemoProvider,
  useDemo,
  DEMO_PERSONAS,
} from "@/contexts/DemoContext"

function wrapper({ children }: { children: ReactNode }) {
  return <DemoProvider>{children}</DemoProvider>
}

describe("DemoContext", () => {
  it("defaults to the first persona and exposes all personas", () => {
    const { result } = renderHook(() => useDemo(), { wrapper })
    expect(result.current.persona).toEqual(DEMO_PERSONAS[0])
    expect(result.current.personas).toEqual(DEMO_PERSONAS)
  })

  it("setPersona updates the active persona", () => {
    const { result } = renderHook(() => useDemo(), { wrapper })
    act(() => result.current.setPersona(DEMO_PERSONAS[2]))
    expect(result.current.persona).toEqual(DEMO_PERSONAS[2])
  })

  it("throws when used outside a provider", () => {
    expect(() => renderHook(() => useDemo())).toThrow(
      "useDemo must be used within DemoProvider"
    )
  })
})
