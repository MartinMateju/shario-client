import { defineConfig } from "@playwright/test";

import visualConfig from "./playwright.visual.config.js";

const laptopReference = visualConfig.projects?.find(
  (project) => project.name === "desktop-1280",
);

if (!laptopReference || !visualConfig.webServer) {
  throw new Error("The customer auth visual configuration is incomplete.");
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

export default defineConfig({
  ...visualConfig,
  testIgnore: [],
  testMatch: "**/customer-auth.visual.spec.js",
  outputDir: "test-results/customer-auth-artifacts",
  reporter: [
    ["list"],
    [
      "html",
      {
        outputFolder: "playwright-report/customer-auth",
        open: "never",
      },
    ],
  ],
  projects: [
    ...visualConfig.projects,
    {
      ...laptopReference,
      name: "laptop-1280-short",
      use: {
        ...laptopReference.use,
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      ...laptopReference,
      name: "laptop-1366-short",
      use: {
        ...laptopReference.use,
        viewport: { width: 1366, height: 768 },
      },
    },
  ],
  webServer: [
    {
      command: "node e2e/visual/customer-auth-fixture.mjs",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      url: "http://127.0.0.1:4311/ready",
    },
    frontendServer,
  ],
});
