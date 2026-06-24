import { Outlet } from "react-router-dom"
import { Database } from "lucide-react"
import { CitizenHeader } from "./CitizenHeader"
import { GlobalProgressBar } from "@/components/common/GlobalProgressBar"
import { ApiStatsPanel } from "@/components/common/ApiStatsPanel"
import { dataverseBookingsUrl } from "@/config/auth0"

function PortalApiLogo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 300 300"
      className={className}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M0,.5v300h300V.5H0ZM139.3,236.2h-75v-10.7h75v10.7ZM139.3,204.1h-75v-10.7h75v10.7ZM139.3,171.9h-75v-10.7h75v10.7ZM139.3,139.8h-75v-10.7h75v10.7ZM139.3,107.6h-75v-10.7h75v10.7ZM235.7,236.2h-75v-10.7h75v10.7ZM235.7,204.1h-75v-10.7h75v10.7ZM235.7,171.9h-75v-10.7h75v10.7ZM235.7,139.8h-75v-10.7h75v10.7ZM235.7,107.6h-75v-10.7h75v10.7ZM235.7,75.5H64.3v-10.7h171.4v10.7Z"
      />
    </svg>
  )
}

export function CitizenShell() {
  return (
    <div className="flex min-h-screen flex-col">
      <GlobalProgressBar />
      <CitizenHeader />
      <main className="flex-1 bg-gradient-to-b from-muted/40 to-muted/10">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
          <Outlet />
        </div>
      </main>
      <footer className="border-t bg-background">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground">
          <span>Leeds City Council</span>
          <div className="flex items-center gap-4">
            {dataverseBookingsUrl && (
              <a
                href={dataverseBookingsUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 transition-colors hover:text-foreground"
                title="Open the Citizen Service Bookings table in Dataverse"
              >
                <Database className="h-3.5 w-3.5" />
                <span>View in Dataverse</span>
              </a>
            )}
            <div className="flex items-center gap-1.5">
              <span>Powered by</span>
              <PortalApiLogo className="h-3.5 w-3.5" />
              <span className="font-medium">Contact Portal API</span>
            </div>
          </div>
        </div>
      </footer>
      <ApiStatsPanel />
    </div>
  )
}
