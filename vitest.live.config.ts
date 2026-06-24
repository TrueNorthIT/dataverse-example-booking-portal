import { defineConfig } from "vitest/config"
import { loadEnv } from "vite"
import path from "path"

/**
 * Opt-in "live" suite — hits real Dataverse with client-credentials from .env
 * and asserts on seeded demo data. NEVER part of the default `npm test` or
 * coverage run. Invoke with `npm run test:live` (requires a populated .env).
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode ?? "test", process.cwd(), "")
  return {
    resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
    test: {
      include: ["tests/live/**/*.test.ts"],
      testTimeout: 30_000,
      env,
    },
  }
})
