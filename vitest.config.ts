import { fileURLToPath } from "node:url"

import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

/** Keep tests independent of developer .env files and the legacy node:test suite. */
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "jsdom",
    // HTTP boundaries run on a test-only same origin. Real browser CORS and
    // Secure/HttpOnly cookie behavior belong to live browser integration checks.
    environmentOptions: { jsdom: { url: "https://api.test/login" } },
    include: ["src/**/*.test.{ts,tsx}", "tests/integration/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
    clearMocks: true,
    restoreMocks: true,
    // Isolated files have their own MSW server, auth coordinator and DOM.
    maxWorkers: 2,
    env: { VITE_API_BASE_URL: "https://api.test", VITE_SIGNALR_HUB_URL: "", MAX_QUERY_RETRIES: "2" },
  },
})
