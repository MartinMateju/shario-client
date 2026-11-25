import { defineConfig, devices } from "@playwright/test";

import baseConfig from "./playwright.config.js";

const port = 3120;
const frontendServer = baseConfig.webServer.find(
  (server) => server.cwd === ".",
);
const chromiumProject = baseConfig.projects.find(
  (project) => project.name === "chromium",
);
const chromiumExecutable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;

const projects = [
  { name: "settings-desktop-1440", viewport: { width: 1440, height: 1000 } },
  { name: "settings-tablet-600", viewport: { width: 600, height: 960 } },
  { name: "settings-tablet-768", viewport: { width: 768, height: 1024 } },
  { name: "settings-tablet-landscape", viewport: { width: 1024, height: 768 } },
  { name: "settings-phone-375", viewport: { width: 375, height: 812 } },
  { name: "settings-phone-320", viewport: { width: 320, height: 700 } },
].map(({ name, viewport }) => ({
  name,
  use: {
    ...chromiumProject.use,
    viewport,
    screen: viewport,
    ...(viewport.width <= 1024 ? { isMobile: true, hasTouch: true } : {}),
    launchOptions: {
      ...chromiumProject.use.launchOptions,
      ...(chromiumExecutable ? { executablePath: chromiumExecutable } : {}),
    },
  },
}));

if (process.env.SETTINGS_WEBKIT === "1") {
  projects.push({
    name: "settings-iphone-webkit",
    use: { ...devices["iPhone 13"], browserName: "webkit" },
  });
}

export default defineConfig({
  testDir: "./e2e/visual",
  testMatch: "settings-unified.visual.spec.js",
  outputDir: "test-results/settings-unified-artifacts",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [
    ["list"],
    [
      "html",
      { outputFolder: "playwright-report/settings-unified", open: "never" },
    ],
  ],
  use: {
    ...baseConfig.use,
    baseURL: `http://studio-alpha.shario.localhost:${port}/en`,
    colorScheme: "light",
    reducedMotion: "reduce",
    screenshot: "only-on-failure",
    video: "off",
    trace: "retain-on-failure",
  },
  projects,
  webServer: {
    ...frontendServer,
    command: `npm run dev:webpack -- --hostname 0.0.0.0 --port ${port}`,
    url: `http://127.0.0.1:${port}/api/health`,
    reuseExistingServer: process.env.SETTINGS_REUSE_SERVER === "1",
    env: {
      ...frontendServer.env,
      NEXT_PUBLIC_SITE_URL: `http://shario.localhost:${port}`,
    },
  },
});
