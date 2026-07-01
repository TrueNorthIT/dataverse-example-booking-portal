import { defineConfig } from "vitest/config"
import { loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig(({ mode }) => {
  // Load all env vars (no prefix filter) so the opt-in live tests can read
  // CLIENT_SECRET etc. Hermetic tests get deterministic defaults below.
  const fileEnv = loadEnv(mode ?? "test", process.cwd(), "")

  // Defaults so importing src/config/entra.ts (which calls `new URL(...)` at
  // module load) never throws in a clean checkout without a .env file.
  const testEnv = {
    VITE_API_BASE_URL: "https://api.dataverse-contact.tnapps.co.uk/api/v2/citizenbooking",
    VITE_ENTRA_TENANT_ID: "00000000-0000-0000-0000-000000000000",
    VITE_ENTRA_CLIENT_ID: "test-client-id",
    VITE_ENTRA_API_SCOPE: "api://test-api-app-id/access_as_user",
    ...fileEnv,
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["tests/setup/vitest.setup.ts"],
      testTimeout: 30_000,
      env: testEnv,
      // The opt-in live suite (tests/live) is excluded from the default run and
      // from coverage; invoke it explicitly via `npm run test:live`.
      exclude: ["tests/live/**", "tests/e2e/**", "node_modules/**", "dist/**"],
      coverage: {
        provider: "v8",
        reporter: ["text", "html", "json-summary"],
        include: ["src/**"],
        exclude: [
          "src/types/**",
          "src/main.tsx",
          "src/App.tsx",
          "src/components/ui/**",
          "src/components/common/DevHint.tsx",
          // Realtime transports are exercised by Playwright E2E, not unit coverage.
          "src/contexts/RealtimeContext.tsx",
          "src/contexts/PresenceContext.tsx",
          "src/hooks/useDataverse.ts",
          // MSAL wiring — mocked in the hermetic suite (see tests/setup/auth-mock.ts).
          "src/auth/useAuth.ts",
          "src/vite-env.d.ts",
          "src/**/*.css",
        ],
        thresholds: {
          lines: 90,
          statements: 90,
          functions: 90,
          branches: 85,
        },
      },
    },
  }
})
