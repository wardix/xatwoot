import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E Configuration — VS-QA-001
 *
 * Tests run against the local Vite dev server (frontend) and
 * Bun API server (backend). Both are started automatically via webServer.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  fullyParallel: false,

  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    headless: true,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Start Bun API server before running tests
  webServer: [
    {
      command: "bun run src/index.ts",
      url: "http://localhost:3000/health",
      reuseExistingServer: !process.env.CI,
      timeout: 15000,
      env: {
        PORT: "3000",
        NODE_ENV: "test",
        DATABASE_URL: process.env.DATABASE_URL ?? "",
        JWT_SECRET: "e2e_test_secret",
        STORAGE_DRIVER: "local",
      },
    },
    {
      command: "npx vite --port 5173",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 20000,
    },
  ],
});
