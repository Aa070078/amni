import { defineConfig, devices } from "@playwright/test";

import { API_V1_URL, E2E_ENCRYPTION_KEY, WEB_PORT, WEB_URL } from "./support/constants.js";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  globalSetup: "./support/global-setup.ts",
  globalTeardown: "./support/global-teardown.ts",
  use: {
    baseURL: WEB_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "en-US",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "pnpm --filter @amni/api start",
      url: "http://localhost:4000/healthz",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        ENCRYPTION_KEY: E2E_ENCRYPTION_KEY,
        WEB_ORIGIN: WEB_URL,
      },
    },
    {
      command: `pnpm --filter @amni/web exec next dev -p ${WEB_PORT}`,
      url: WEB_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        ...process.env,
        NEXT_DIST_DIR: `.next-e2e-${process.pid}`,
        NEXT_PUBLIC_API_BASE_URL: API_V1_URL,
      },
    },
  ],
});
