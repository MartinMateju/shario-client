import { defineConfig, devices } from "@playwright/test";

import visualConfig from "./playwright.visual.config.js";

const chromiumReference = visualConfig.projects?.find(
  (project) => project.name === "desktop-1280",
);

if (!chromiumReference || !visualConfig.webServer) {
  throw new Error("The customer portal visual configuration is incomplete.");
}

const frontendServer = {
  ...visualConfig.webServer,
  env: {
    ...visualConfig.webServer.env,
    NEXT_PUBLIC_API_URL: "http://api.shario.localhost:4311",
    NEXT_PUBLIC_ROOT_DOMAIN: "shario.localhost",
    NEXT_PUBLIC_SITE_URL: "http://shario.localhost:4310",
    PLATFORM_HOSTNAMES: "",
    TENANT_ROOT_DOMAIN: "shario.localhost",
  },
};

const viewportProjects = [
  { name: "desktop-1920", viewport: { width: 1920, height: 1080 } },
  { name: "desktop-1440", viewport: { width: 1440, height: 900 } },
  { name: "laptop-1366-short", viewport: { width: 1366, height: 768 } },
  { name: "laptop-1280-short", viewport: { width: 1280, height: 720 } },
  { name: "tablet-1024", viewport: { width: 1024, height: 768 } },
  { name: "tablet-768", viewport: { width: 768, height: 1024 } },
  {
    name: "mobile-390",
    viewport: { width: 390, height: 844 },
    device: "Pixel 5",
  },
  {
    name: "mobile-320",
    viewport: { width: 320, height: 700 },
    device: "Galaxy S9+",
  },
];

export default defineConfig({
  ...visualConfig,
  testIgnore: [],
  testMatch: "**/customer-portal.visual.spec.js",
  expect: {
    ...visualConfig.expect,
    timeout: 15_000,
  },
  outputDir: "test-results/customer-portal-artifacts",
  reporter: [
    ["list"],
    [
      "html",
      {
        outputFolder: "playwright-report/customer-portal",
        open: "never",
      },
    ],
  ],
  projects: viewportProjects.map(({ device, name, viewport }) => ({
    ...chromiumReference,
    name,
    use: {
      ...chromiumReference.use,
      ...(device ? devices[device] : {}),
      launchOptions: chromiumReference.use?.launchOptions,
      ...(device ? { screen: viewport } : {}),
      viewport,
    },
  })),
  webServer: [
    {
      command: "node e2e/visual/customer-portal-fixture.mjs",
      env: {
        ...process.env,
        CUSTOMER_PORTAL_FIXTURE_PORT: "4311",
      },
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      url: "http://127.0.0.1:4311/ready",
    },
    frontendServer,
  ],
});
