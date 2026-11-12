import { defineConfig } from "@playwright/test";

import visualConfig from "./playwright.visual.config.js";

const projectNames = new Set(["desktop-1440", "mobile-390"]);
const projects = visualConfig.projects?.filter((project) =>
  projectNames.has(project.name),
);

if (!visualConfig.webServer || projects?.length !== projectNames.size) {
  throw new Error("The public-site style rollout configuration is incomplete.");
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
  testDir: "./e2e/visual",
  testIgnore: [],
  testMatch: "**/public-site-style-rollout.visual.spec.js",
  outputDir: "test-results/public-site-style-rollout-artifacts",
  reporter: [
    ["list"],
    [
      "html",
      {
        outputFolder: "playwright-report/public-site-style-rollout",
        open: "never",
      },
    ],
  ],
  projects,
  webServer: [
    {
      command: "node e2e/visual/public-site-style-rollout-fixture.mjs",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      url: "http://127.0.0.1:4311/ready",
    },
    frontendServer,
  ],
});
