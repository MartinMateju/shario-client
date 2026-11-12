import { defineConfig, devices } from "@playwright/test";
import { ROLLOUT_ELIGIBLE_LOCALE_CODES } from "./src/i18n/locales.js";

const isCi = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e/specs",
  testMatch: "marketing-home.spec.js",
  outputDir: "test-results/marketing-playwright-artifacts",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4310",
    locale: "en-GB",
    timezoneId: "Europe/Prague",
    viewport: { width: 1440, height: 1000 },
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
  ],
  webServer: {
    command: isCi
      ? "npm run start -- --hostname 0.0.0.0 --port 4310"
      : "npm run dev -- --hostname 0.0.0.0 --port 4310",
    url: "http://127.0.0.1:4310/api/health",
    timeout: 180_000,
    reuseExistingServer: !isCi,
    env: {
      ...process.env,
      NEXT_PUBLIC_ENABLED_LOCALES: ROLLOUT_ELIGIBLE_LOCALE_CODES.join(","),
      NEXT_PUBLIC_ENABLE_PREVIEW_LOCALES: "true",
      NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:4310",
      NEXT_PUBLIC_ROOT_DOMAIN: "localhost",
      TENANT_ROOT_DOMAIN: "localhost",
      PLATFORM_HOSTNAMES: "127.0.0.1,localhost",
    },
  },
});
