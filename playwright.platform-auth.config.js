import { defineConfig } from "@playwright/test";

import visualConfig from "./playwright.visual.config.js";

const desktopProject = visualConfig.projects?.find(
  (project) => project.name === "desktop-1280",
);

if (!desktopProject) {
  throw new Error(
    "The platform auth visual configuration could not resolve its desktop baseline.",
  );
}

export default defineConfig({
  ...visualConfig,
  testIgnore: [],
  testMatch: "**/platform-auth.visual.spec.js",
  projects: [
    ...visualConfig.projects,
    {
      ...desktopProject,
      name: "laptop-short-1280",
      use: {
        ...desktopProject.use,
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      ...desktopProject,
      name: "laptop-short-1280-600",
      use: {
        ...desktopProject.use,
        viewport: { width: 1280, height: 600 },
      },
    },
  ],
});
