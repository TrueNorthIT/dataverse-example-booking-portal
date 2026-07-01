import { useAuth } from "@/auth/useAuth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function LoginPage() {
  const { loginWithRedirect } = useAuth()

  const handleLogin = () => {
    loginWithRedirect()
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-background dark:to-blue-950/20 p-4">
      <Card className="w-full max-w-md shadow-lg border-border/60">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-primary-foreground text-xl font-bold shadow-md">
            LCC
          </div>
          <CardTitle className="text-2xl">Leeds City Council</CardTitle>
          <CardDescription className="text-base mt-1">
            Sign in to browse and book council services
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2 pb-6 px-6">
          <Button className="w-full" size="lg" onClick={handleLogin}>
            Sign in
          </Button>
        </CardContent>
      </Card>

      <p className="mt-8 text-xs text-muted-foreground">
        Leeds City Council &middot; Civic Hall, Leeds LS1 1UR
      </p>
    </div>
  )
}
