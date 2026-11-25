import { defineConfig } from "@playwright/test";
import smokeConfig from "./playwright.smoke.config.js";

// Use E2E_BACKEND_DIR to select the matching server checkout. This suite uses
// the same isolated services and production client build as release smoke.
export default defineConfig({
  ...smokeConfig,
  testMatch: ["**/reports-customer-analytics.spec.js"],
  outputDir: "test-results/reports-artifacts",
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report/reports", open: "never" }],
    ["junit", { outputFile: "test-results/reports-results.xml" }],
  ],
});
