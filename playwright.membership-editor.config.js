import { defineConfig } from "@playwright/test";
import membershipConfig from "./playwright.membership-contract.config.js";

export default defineConfig({
  ...membershipConfig,
  testDir: "./e2e/visual",
  testMatch: "membership-editor.visual.spec.js",
  outputDir: "test-results/membership-editor-artifacts",
  webServer: membershipConfig.webServer.map((server) => ({
    ...server,
    reuseExistingServer: !process.env.CI,
  })),
});
