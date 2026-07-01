import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useAuth } from "@/auth/useAuth"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useDataverse } from "@/hooks/useDataverse"
import { apiBaseUrl } from "@/config/entra"
import "./contact-provision.css"

interface ContactInfo {
  contactid: string
  fullname: string
  emailaddress1: string
}

const ContactContext = createContext<ContactInfo | null>(null)

export function useContact() {
  return useContext(ContactContext)
}

type ProvisionState =
  | { status: "checking" }
  | { status: "creating" }
  | { status: "ready"; contact: ContactInfo }
  | { status: "error"; message: string }

export function ContactProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const client = useDataverse()
  const [state, setState] = useState<ProvisionState>({ status: "checking" })

  useEffect(() => {
    if (!user?.email) return

    let cancelled = false

    async function ensureContact() {
      // 1. Check if contact exists via whoami
      // SDK returns raw JSON — no .data wrapper
      let whoami: Record<string, unknown>
      try {
        whoami = await client.me.whoami() as Record<string, unknown>
      } catch (err: unknown) {
        if (!cancelled) {
          setState({
            status: "error",
            message: err instanceof Error ? err.message : "Failed to check contact",
          })
        }
        return
      }

      // 2. Contact exists — we're good
      const contact = whoami.dataverseContact as ContactInfo | null
      if (contact) {
        if (!cancelled) {
          setState({ status: "ready", contact })
        }
        return
      }

      // 3. dataverseContact is null — create via public route
      //    Show the animated logo for at least one full animation cycle (~2.5s)
      const animStart = Date.now()
      const MIN_ANIM_MS = 2500
      if (!cancelled) setState({ status: "creating" })

      try {
        const [firstname, ...rest] = (user!.name || user!.email!).split(" ")
        const lastname = rest.join(" ") || firstname

        const createResp = await fetch(`${apiBaseUrl}/public/citizen`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ firstname, lastname, emailaddress1: user!.email }),
        })
        if (!createResp.ok) {
          throw new Error(`Failed to create contact: ${createResp.status}`)
        }

        // Re-fetch via whoami to get the canonical record
        const whoami2 = await client.me.whoami() as Record<string, unknown>
        const contact2 = whoami2.dataverseContact as ContactInfo | null

        // Wait for animation to finish if the API was faster
        const elapsed = Date.now() - animStart
        if (elapsed < MIN_ANIM_MS) {
          await new Promise((r) => setTimeout(r, MIN_ANIM_MS - elapsed))
        }

        if (!cancelled) {
          if (contact2) {
            setState({ status: "ready", contact: contact2 })
          } else {
            setState({ status: "error", message: "Contact created but not found — please try again" })
          }
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            status: "error",
            message: err instanceof Error ? err.message : "Failed to create contact",
          })
        }
      }
    }

    ensureContact()
    return () => { cancelled = true }
    // Intentionally keyed on email/name only — avoids re-running on `user` identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email, user?.name, client])

  // Creating a contact — show the full provisioning screen
  if (state.status === "creating") {
    return <ProvisioningScreen />
  }

  if (state.status === "error") {
    return <ErrorScreen message={state.message} />
  }

  // "checking" or "ready" — render children immediately (no blocking)
  return (
    <ContactContext.Provider value={state.status === "ready" ? state.contact : null}>
      {children}
    </ContactContext.Provider>
  )
}

function ProvisioningScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6">
        {/* Animated TrueNorth logo */}
        <div className="tn-logo-wrap">
          <div className="tn-logo-box" />
          <div className="tn-logo-shimmer-clip">
            <div className="tn-logo-shimmer" />
          </div>
          <svg viewBox="0 0 300 300" className="tn-logo-svg">
            <rect className="tn-bar tn-bar-left" x="64.3" y="225.5" width="75" height="10.7" fill="currentColor" style={{ animationDelay: "0ms" }} />
            <rect className="tn-bar tn-bar-right" x="160.7" y="225.5" width="75" height="10.7" fill="currentColor" style={{ animationDelay: "110ms" }} />
            <rect className="tn-bar tn-bar-left" x="64.3" y="193.4" width="75" height="10.7" fill="currentColor" style={{ animationDelay: "220ms" }} />
            <rect className="tn-bar tn-bar-right" x="160.7" y="193.4" width="75" height="10.7" fill="currentColor" style={{ animationDelay: "330ms" }} />
            <rect className="tn-bar tn-bar-left" x="64.3" y="161.2" width="75" height="10.7" fill="currentColor" style={{ animationDelay: "440ms" }} />
            <rect className="tn-bar tn-bar-right" x="160.7" y="161.2" width="75" height="10.7" fill="currentColor" style={{ animationDelay: "550ms" }} />
            <rect className="tn-bar tn-bar-left" x="64.3" y="129.1" width="75" height="10.7" fill="currentColor" style={{ animationDelay: "660ms" }} />
            <rect className="tn-bar tn-bar-right" x="160.7" y="129.1" width="75" height="10.7" fill="currentColor" style={{ animationDelay: "770ms" }} />
            <rect className="tn-bar tn-bar-left" x="64.3" y="96.9" width="75" height="10.7" fill="currentColor" style={{ animationDelay: "880ms" }} />
            <rect className="tn-bar tn-bar-right" x="160.7" y="96.9" width="75" height="10.7" fill="currentColor" style={{ animationDelay: "990ms" }} />
            <rect className="tn-bar tn-bar-capstone" x="64.3" y="64.8" width="171.4" height="10.7" fill="currentColor" style={{ animationDelay: "1150ms" }} />
          </svg>
        </div>

        {/* Status text */}
        <div className="tn-provision-text">
          <p className="text-sm font-medium text-foreground">Setting up your account...</p>
          <p className="text-xs text-muted-foreground mt-1">Creating your citizen record</p>
        </div>
      </div>
    </div>
  )
}

function ErrorScreen({ message }: { message: string }) {
  const { logout } = useAuth()

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4 max-w-sm">
        <h2 className="text-lg font-semibold text-destructive">Account Error</h2>
        <p className="text-sm text-muted-foreground">{message}</p>
        <Button
          variant="outline"
          onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out and try again
        </Button>
      </div>
    </div>
  )
}
