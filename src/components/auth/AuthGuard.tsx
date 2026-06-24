import { useEffect } from "react"
import { useAuth0 } from "@auth0/auth0-react"
import { Skeleton } from "@/components/ui/skeleton"

function LoadingSpinner() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-4 w-48" />
      </div>
    </div>
  )
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, error, loginWithRedirect } = useAuth0()

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !error) {
      loginWithRedirect()
    }
  }, [isLoading, isAuthenticated, error, loginWithRedirect])

  if (isLoading || !isAuthenticated) {
    return <LoadingSpinner />
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-destructive">Authentication Error</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {error.message || "An error occurred during authentication."}
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export function useCurrentUser() {
  const { user, isAuthenticated } = useAuth0()

  return {
    isAuthenticated,
    name: user?.name || "",
    email: user?.email || "",
    initials: user?.name
      ? user.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "??",
  }
}
