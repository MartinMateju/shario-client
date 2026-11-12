import { defineConfig } from "@playwright/test";

import customerPortalConfig from "./playwright.customer-portal.config.js";

export default defineConfig({
  ...customerPortalConfig,
  testDir: "./e2e/portal",
  testMatch: "**/customer-language.spec.js",
  projects: customerPortalConfig.projects.filter((project) =>
    ["desktop-1440", "mobile-390"].includes(project.name),
  ),
  use: {
    ...customerPortalConfig.use,
    locale: "en-GB",
    screenshot: "only-on-failure",
  },
  outputDir: "test-results/customer-language-artifacts",
  reporter: [
    ["list"],
    [
      "html",
      { outputFolder: "playwright-report/customer-language", open: "never" },
    ],
  ],
});
