import { NavLink } from "react-router-dom"
import { useAuth0 } from "@auth0/auth0-react"
import { Home, CalendarDays, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCurrentUser } from "@/components/auth/AuthGuard"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const citizenNav = [
  { to: "/", label: "Browse Services", icon: Home },
  { to: "/my-bookings", label: "My Bookings", icon: CalendarDays },
]

export function CitizenHeader() {
  const { name, initials, email } = useCurrentUser()
  const { logout } = useAuth0()

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 md:px-6">
        {/* Brand */}
        <NavLink to="/" className="flex items-center gap-2 font-semibold shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">
            LCC
          </div>
          <span className="hidden sm:inline">Book a Service</span>
        </NavLink>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {citizenNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )
              }
            >
              <item.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="flex-1" />

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-full p-0.5 pr-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {initials}
            </div>
            <span className="hidden md:inline text-sm font-medium">{name}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{name}</p>
                {email && (
                  <p className="text-xs text-muted-foreground truncate">{email}</p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
