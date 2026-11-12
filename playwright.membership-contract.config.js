import { defineConfig } from "@playwright/test";
import portalConfig from "./playwright.customer-portal-location.config.js";

const isCi = Boolean(process.env.CI);
const frontendPort = Number(
  process.env.MEMBERSHIP_FRONTEND_PORT || (isCi ? 4310 : 3107),
);
const fixturePort = Number(
  process.env.MEMBERSHIP_FIXTURE_PORT || (isCi ? 4311 : 4107),
);
export default defineConfig({
  ...portalConfig,
  testMatch: "membership-contract.spec.js",
  outputDir: "test-results/membership-contract-artifacts",
  // Local Next development routes compile on first visit; CI uses the built app.
  timeout: isCi ? 90_000 : 150_000,
  retries: 0,
  use: {
    ...portalConfig.use,
    baseURL: `http://studio-alpha.shario.localhost:${frontendPort}`,
    navigationTimeout: isCi ? 60_000 : 120_000,
  },
  webServer: [
    {
      command: "node e2e/support/membership-portal-fixture.mjs",
      env: { ...process.env, MEMBERSHIP_FIXTURE_PORT: String(fixturePort) },
      url: `http://127.0.0.1:${fixturePort}/ready`,
      timeout: 30_000,
      reuseExistingServer: false,
    },
    {
      ...portalConfig.webServer[1],
      command: `npm run ${isCi ? "start" : "dev:webpack"} -- --hostname 0.0.0.0 --port ${frontendPort}`,
      url: `http://127.0.0.1:${frontendPort}/api/health`,
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
