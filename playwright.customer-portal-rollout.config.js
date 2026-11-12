import { defineConfig } from "@playwright/test";

import customerPortalConfig from "./playwright.customer-portal.config.js";

const projectNames = new Set(["desktop-1440", "mobile-390"]);
const projects = customerPortalConfig.projects?.filter((project) =>
  projectNames.has(project.name),
);
const [fixtureServer, frontendServer] = customerPortalConfig.webServer || [];

if (
  !fixtureServer ||
  !frontendServer ||
  projects?.length !== projectNames.size
) {
  throw new Error("The customer portal rollout configuration is incomplete.");
}

export default defineConfig({
  ...customerPortalConfig,
  projects,
  webServer: [
    {
      ...fixtureServer,
      env: {
        ...process.env,
        ...fixtureServer.env,
        CUSTOMER_PORTAL_FIXTURE_PORT: "4311",
      },
      url: "http://127.0.0.1:4311/ready",
    },
    {
      ...frontendServer,
      env: {
        ...frontendServer.env,
        NEXT_PUBLIC_API_URL: "http://api.shario.localhost:4311",
      },
    },
  ],
});
