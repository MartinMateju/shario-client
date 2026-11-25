import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";

import fullStackModule from "./playwright.config.js";
import { setupCustomDomainTls } from "./e2e/support/custom-domain-tls.mjs";

// The existing custom-domain browser tests use the real production BFF here.
// A loopback HTTPS terminator provides normal HTTPS origins without requiring
// privileged port 443 or relaxing the application's production checks.
process.env.E2E_HTTPS_MODE = "1";
const fullStackConfig = fullStackModule.default || fullStackModule;
const tls = setupCustomDomainTls();
const dnsPreload = fileURLToPath(
  new URL("./e2e/support/custom-domain-dns-preload.cjs", import.meta.url),
);
const sharedSecret = "shario-e2e-first-party-proxy-secret-not-production-2026";
const [backendServer, frontendServer] = fullStackConfig.webServer;
const fixtureEnvironment = {
  ...process.env,
  E2E_HTTPS_MODE: "1",
  AUTH_FIRST_PARTY_PROXY_SECRET: sharedSecret,
  AUTH_SESSION_HANDOFF_SECRET:
    "shario-e2e-session-handoff-secret-not-production-2026",
  NODE_EXTRA_CA_CERTS: tls.caPath,
  NODE_OPTIONS:
    `${process.env.NODE_OPTIONS || ""} --require=${JSON.stringify(dnsPreload)}`.trim(),
  NEXT_TELEMETRY_DISABLED: "1",
};

export default defineConfig({
  ...fullStackConfig,
  testMatch: [
    "**/booking-authentication.spec.js",
    "**/customer-booking-intent.spec.js",
  ],
  grep: /@custom-domain-auth/,
  grepInvert: undefined,
  retries: 0,
  timeout: 120_000,
  outputDir: "test-results/custom-domain-auth-artifacts",
  reporter: [
    ["list"],
    [
      "html",
      { outputFolder: "playwright-report/custom-domain-auth", open: "never" },
    ],
    ["junit", { outputFile: "test-results/custom-domain-auth-results.xml" }],
  ],
  use: {
    ...fullStackConfig.use,
    baseURL: "https://studio-alpha.test/en",
  },
  projects: fullStackConfig.projects.map((project) => ({
    ...project,
    use: {
      ...project.use,
      launchOptions: {
        ...project.use.launchOptions,
        args: [
          "--host-resolver-rules=MAP studio-alpha.test 127.0.0.1:3443,MAP api.shario.localhost 127.0.0.1,MAP *.shario.localhost 127.0.0.1:3443,MAP shario.localhost 127.0.0.1:3443",
          `--ignore-certificate-errors-spki-list=${tls.spkiHash}`,
        ],
      },
    },
  })),
  webServer: [
    {
      command: "node e2e/support/custom-domain-https-proxy.mjs",
      cwd: ".",
      url: "https://127.0.0.1:3443/__e2e_https_ready",
      ignoreHTTPSErrors: true,
      timeout: 30_000,
      reuseExistingServer: false,
      stdout: "pipe",
      stderr: "pipe",
      env: fixtureEnvironment,
    },
    {
      ...backendServer,
      cwd: process.env.E2E_BACKEND_DIR || backendServer.cwd,
      reuseExistingServer: false,
      stdout: "pipe",
      stderr: "pipe",
      env: { ...backendServer.env, ...fixtureEnvironment },
    },
    {
      ...frontendServer,
      command:
        "npm run build && node e2e/support/custom-domain-next-server.mjs",
      timeout: 600_000,
      reuseExistingServer: false,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        ...frontendServer.env,
        ...fixtureEnvironment,
        NEXT_PUBLIC_SITE_URL: "https://shario.localhost",
        NEXT_PUBLIC_ROOT_DOMAIN: "shario.localhost",
        TENANT_ROOT_DOMAIN: "shario.localhost",
        NEXT_PUBLIC_API_URL: "https://api.shario.localhost:3443",
        CUSTOM_DOMAIN_TENANTS: '{"studio-alpha.test":"studio-alpha"}',
        PLATFORM_HOSTNAMES: "",
        LEGACY_TENANT_SLUGS: "",
      },
    },
  ],
});
