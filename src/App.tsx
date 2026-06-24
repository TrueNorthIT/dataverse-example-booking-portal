import { BrowserRouter, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "sonner"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { ContactProvider } from "@/components/auth/ContactProvider"
import { DemoProvider } from "@/contexts/DemoContext"
import { RealtimeProvider } from "@/contexts/RealtimeContext"
import { PresenceProvider } from "@/contexts/PresenceContext"
import { ApiStatsProvider } from "@/contexts/ApiStatsContext"
import { CitizenShell } from "@/components/citizen/CitizenShell"
import { LoginPage } from "@/pages/LoginPage"
import { HomePage } from "@/pages/citizen/HomePage"
import { CategoryPage } from "@/pages/citizen/CategoryPage"
import { BookResourcePage } from "@/pages/citizen/BookResourcePage"
import { MyBookingsPage } from "@/pages/citizen/MyBookingsPage"
import { ErrorBoundary } from "@/components/common/ErrorBoundary"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ApiStatsProvider>
      <ErrorBoundary>
        <BrowserRouter>
          <DemoProvider>
          <RealtimeProvider>
          <PresenceProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              {/* Citizen portal */}
              <Route
                element={
                  <AuthGuard>
                    <ContactProvider>
                      <CitizenShell />
                    </ContactProvider>
                  </AuthGuard>
                }
              >
                <Route path="/" element={<HomePage />} />
                <Route path="/browse/:categoryId" element={<CategoryPage />} />
                <Route path="/book/:resourceId" element={<BookResourcePage />} />
                <Route path="/my-bookings" element={<MyBookingsPage />} />
              </Route>
            </Routes>
          </PresenceProvider>
          </RealtimeProvider>
          </DemoProvider>
        </BrowserRouter>
      </ErrorBoundary>
      <Toaster position="top-right" richColors />
      </ApiStatsProvider>
    </QueryClientProvider>
  )
}
