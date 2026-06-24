import { createContext, useContext, useState, type ReactNode } from "react"

export interface DemoPersona {
  id: string
  name: string
  email: string
  role: "citizen" | "admin"
  initials: string
}

/** Static persona definitions for demo distance sorting. */
export const DEMO_PERSONAS: DemoPersona[] = [
  {
    id: "sarah-johnson",
    name: "Sarah Johnson",
    email: "sarah.johnson@example.com",
    role: "citizen",
    initials: "SJ",
  },
  {
    id: "james-wilson",
    name: "James Wilson",
    email: "james.wilson@example.com",
    role: "citizen",
    initials: "JW",
  },
  {
    id: "priya-patel",
    name: "Priya Patel",
    email: "priya.patel@example.com",
    role: "citizen",
    initials: "PP",
  },
  {
    id: "steve-drake",
    name: "Steve Drake",
    email: "steve@drakey.co.uk",
    role: "citizen",
    initials: "SD",
  },
]

interface DemoContextValue {
  persona: DemoPersona
  personas: DemoPersona[]
  setPersona: (persona: DemoPersona) => void
}

const DemoContext = createContext<DemoContextValue | null>(null)

export function DemoProvider({ children }: { children: ReactNode }) {
  const [persona, setPersona] = useState<DemoPersona>(DEMO_PERSONAS[0])

  return (
    <DemoContext.Provider value={{ persona, personas: DEMO_PERSONAS, setPersona }}>
      {children}
    </DemoContext.Provider>
  )
}

export function useDemo() {
  const ctx = useContext(DemoContext)
  if (!ctx) throw new Error("useDemo must be used within DemoProvider")
  return ctx
}
