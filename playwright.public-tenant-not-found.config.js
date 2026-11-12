import { defineConfig } from "@playwright/test";

import visualConfig from "./playwright.visual.config.js";

const desktopReference = visualConfig.projects?.find(
  (project) => project.name === "desktop-1280",
);

if (!desktopReference || !visualConfig.webServer) {
  throw new Error(
    "The public tenant not-found visual configuration is incomplete.",
  );
}

const frontendServer = {
  ...visualConfig.webServer,
  env: {
    ...visualConfig.webServer.env,
    NEXT_PUBLIC_API_URL: "http://api.shario.localhost:4311",
  },
};

export default defineConfig({
  ...visualConfig,
  testIgnore: [],
  testMatch: "**/public-tenant-not-found.visual.spec.js",
  outputDir: "test-results/public-tenant-not-found-artifacts",
  reporter: [
    ["list"],
    [
      "html",
      {
        outputFolder: "playwright-report/public-tenant-not-found",
        open: "never",
      },
    ],
  ],
  projects: [
    ...visualConfig.projects,
    {
      ...desktopReference,
      name: "laptop-1280-short",
      use: {
        ...desktopReference.use,
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
  webServer: [
    {
      command: "node e2e/visual/public-tenant-not-found-fixture.mjs",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      url: "http://127.0.0.1:4311/ready",
    },
    frontendServer,
  ],
});
