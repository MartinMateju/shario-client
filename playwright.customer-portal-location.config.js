import { defineConfig, devices } from "@playwright/test";

const frontendPort = Number(process.env.PORTAL_LOCATION_FRONTEND_PORT || 3098);
const fixturePort = Number(process.env.PORTAL_LOCATION_FIXTURE_PORT || 4098);
const isCi = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e/portal",
  testMatch: [
    "customer-portal-location.spec.js",
    "customer-booking-details.spec.js",
  ],
  outputDir: "test-results/customer-portal-location-artifacts",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://studio-alpha.shario.localhost:${frontendPort}`,
    locale: "en-GB",
    timezoneId: "Europe/Prague",
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      args: [
        "--host-resolver-rules=MAP *.shario.localhost 127.0.0.1,MAP shario.localhost 127.0.0.1",
      ],
    },
    ...(process.env.PLAYWRIGHT_BROWSER_CHANNEL
      ? { channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL }
      : {}),
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
  webServer: [
    {
      command: "node e2e/visual/customer-portal-fixture.mjs",
      env: {
        ...process.env,
        CUSTOMER_PORTAL_FIXTURE_PORT: String(fixturePort),
      },
      url: `http://127.0.0.1:${fixturePort}/ready`,
      timeout: 30_000,
      reuseExistingServer: false,
    },
    {
      command: isCi
        ? `npm run start -- --hostname 0.0.0.0 --port ${frontendPort}`
        : `npm run dev:webpack -- --hostname 0.0.0.0 --port ${frontendPort}`,
      url: `http://127.0.0.1:${frontendPort}/api/health`,
      timeout: 180_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        NEXT_PUBLIC_SITE_URL: `http://shario.localhost:${frontendPort}`,
        NEXT_PUBLIC_ROOT_DOMAIN: "shario.localhost",
        TENANT_ROOT_DOMAIN: "shario.localhost",
        NEXT_PUBLIC_API_URL: `http://api.shario.localhost:${fixturePort}`,
        PLATFORM_HOSTNAMES: "",
        LEGACY_TENANT_SLUGS: "",
      },
    },
  ],
});
