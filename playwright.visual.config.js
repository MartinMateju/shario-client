import { defineConfig, devices } from "@playwright/test";

import baseConfig from "./playwright.config.js";

const frontendServer = (
  Array.isArray(baseConfig.webServer)
    ? baseConfig.webServer
    : [baseConfig.webServer]
).find((server) => server?.cwd === ".");

const chromiumProject = baseConfig.projects?.find(
  (project) => project.name === "chromium",
);
const chromiumExecutable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;

if (!frontendServer || !chromiumProject) {
  throw new Error(
    "The visual test configuration could not resolve the frontend server or Chromium project.",
  );
}

const visualFrontendServer = {
  ...frontendServer,
  command: process.env.CI
    ? "npm run start -- --hostname 0.0.0.0 --port 4310"
    : frontendServer.command,
};

const viewportProjects = [
  { name: "desktop-1920", viewport: { width: 1920, height: 1080 } },
  { name: "desktop-1536", viewport: { width: 1536, height: 1000 } },
  { name: "desktop-1440", viewport: { width: 1440, height: 1000 } },
  { name: "desktop-1280", viewport: { width: 1280, height: 900 } },
  { name: "tablet-1024", viewport: { width: 1024, height: 900 } },
  { name: "tablet-768", viewport: { width: 768, height: 1024 } },
  {
    name: "mobile-320",
    viewport: { width: 320, height: 700 },
    device: "Galaxy S9+",
  },
  {
    name: "mobile-390",
    viewport: { width: 390, height: 844 },
    device: "Pixel 5",
  },
];

export default defineConfig({
  ...baseConfig,
  testDir: "./e2e/visual",
  testIgnore: [
    "**/customer-auth.visual.spec.js",
    "**/customer-portal.visual.spec.js",
    "**/onboarding.visual.spec.js",
    "**/platform-auth.visual.spec.js",
    "**/public-site-style-rollout.visual.spec.js",
    "**/public-tenant-not-found.visual.spec.js",
  ],
  outputDir: "test-results/visual-artifacts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ["list"],
    [
      "html",
      {
        outputFolder: "playwright-report/visual",
        open: "never",
      },
    ],
  ],
  use: {
    ...baseConfig.use,
    colorScheme: "light",
    reducedMotion: "reduce",
    screenshot: "off",
    video: "off",
    trace: "retain-on-failure",
  },
  projects: viewportProjects.map(({ name, viewport, device }) => ({
    name,
    use: {
      ...chromiumProject.use,
      ...(device ? devices[device] : {}),
      launchOptions: {
        ...chromiumProject.use?.launchOptions,
        ...(chromiumExecutable
          ? { executablePath: chromiumExecutable }
          : undefined),
      },
      viewport,
      ...(device ? { screen: viewport } : {}),
    },
  })),
  webServer: visualFrontendServer,
});
