import { defineConfig } from "@playwright/test";

import baseConfig from "./playwright.config.js";

const port = Number(process.env.DASHBOARD_TEST_PORT || 3200);
const frontend = baseConfig.webServer.find((server) => server.cwd === ".");
const chromium = baseConfig.projects.find(({ name }) => name === "chromium");

export default defineConfig({
  ...baseConfig,
  testDir: "./e2e/visual",
  testMatch: "dashboard-customer-metrics.visual.spec.js",
  timeout: 120_000,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  outputDir: "test-results/dashboard-customer-metrics",
  use: {
    ...baseConfig.use,
    baseURL: `http://studio-alpha.shario.localhost:${port}`,
    reducedMotion: "reduce",
    colorScheme: "light",
    video: "off",
    screenshot: "only-on-failure",
  },
  projects: [
    ["desktop-1440", 1440, 1000],
    ["phone-390", 390, 844],
  ].map(([name, width, height]) => ({
    name,
    use: {
      ...chromium.use,
      viewport: { width, height },
      screen: { width, height },
      isMobile: width < 1280,
      hasTouch: width < 1280,
      locale: "cs-CZ",
      launchOptions: {
        ...chromium.use.launchOptions,
        ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
          : {}),
      },
    },
  })),
  webServer: {
    ...frontend,
    command: process.env.CI
      ? `npm run start -- --hostname 0.0.0.0 --port ${port}`
      : `npm run dev:webpack -- --hostname 0.0.0.0 --port ${port}`,
    url: `http://127.0.0.1:${port}/api/health`,
    reuseExistingServer: process.env.DASHBOARD_REUSE_SERVER === "1",
    env: {
      ...frontend.env,
      NEXT_PUBLIC_SITE_URL: `http://shario.localhost:${port}`,
    },
  },
});
