import { defineConfig } from "@playwright/test";

import visualConfig from "./playwright.visual.config.js";

const desktopReference = visualConfig.projects?.find(
  (project) => project.name === "desktop-1280",
);
const onboardingWebServer = {
  ...visualConfig.webServer,
  command: process.env.CI
    ? "npm run start -- --hostname 0.0.0.0 --port 4310"
    : visualConfig.webServer?.command,
};

if (!desktopReference) {
  throw new Error(
    "The onboarding visual configuration could not resolve the desktop Chromium project.",
  );
}

export default defineConfig({
  ...visualConfig,
  testIgnore: [],
  testMatch: "**/onboarding.visual.spec.js",
  webServer: onboardingWebServer,
  outputDir: "test-results/onboarding-visual-artifacts",
  reporter: [
    ["list"],
    [
      "html",
      {
        outputFolder: "playwright-report/onboarding",
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
    {
      ...desktopReference,
      name: "laptop-1280-short-600",
      use: {
        ...desktopReference.use,
        viewport: { width: 1280, height: 600 },
      },
    },
  ],
});
