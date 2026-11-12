import { defineConfig, devices } from "@playwright/test";

import portalConfig from "./playwright.customer-portal-location.config.js";

const isCi = Boolean(process.env.CI);
const useLocalBuild = process.env.CREDIT_PURCHASE_USE_BUILD === "true";
const baseURL = isCi
  ? "http://studio-credits.shario.localhost:4310"
  : portalConfig.use.baseURL.replace("studio-alpha", "studio-credits");
const [fixtureServer, frontendServer] = portalConfig.webServer;

const viewports = [
  ["desktop", 1920, 1080],
  ["desktop-1440", 1440, 900],
  ["small-laptop", 1366, 600],
  ["short-laptop", 1280, 500],
  ["tablet-landscape", 1024, 768],
  ["tablet-portrait", 768, 1024],
  ["phone", 390, 844],
  ["small-phone", 320, 568],
  ["phone-landscape", 844, 390],
];

export default defineConfig({
  ...portalConfig,
  testMatch: "customer-credit-purchase.spec.js",
  outputDir: "test-results/credit-purchase-artifacts",
  use: { ...portalConfig.use, baseURL },
  projects: viewports.map(([name, width, height]) => ({
    name,
    ...(name === "desktop" ? {} : { grep: /every screen/ }),
    use: {
      ...(width <= 390 ? devices["Pixel 5"] : devices["Desktop Chrome"]),
      viewport: { width, height },
      screen: { width, height },
      baseURL,
    },
  })),
  // CI runs the production build, whose public API URL is compiled at build time.
  webServer: isCi
    ? [
        {
          ...fixtureServer,
          url: "http://127.0.0.1:4311/ready",
          env: {
            ...fixtureServer.env,
            CUSTOMER_PORTAL_FIXTURE_PORT: "4311",
          },
        },
        {
          ...frontendServer,
          command: "npm run start -- --hostname 0.0.0.0 --port 4310",
          url: "http://127.0.0.1:4310/api/health",
          env: {
            ...frontendServer.env,
            NEXT_PUBLIC_SITE_URL: "http://shario.localhost:4310",
            NEXT_PUBLIC_API_URL: "http://api.shario.localhost:4311",
          },
        },
      ]
    : useLocalBuild
      ? [
          fixtureServer,
          {
            ...frontendServer,
            command: `npm run start -- --hostname 0.0.0.0 --port ${new URL(baseURL).port}`,
          },
        ]
      : portalConfig.webServer,
});
