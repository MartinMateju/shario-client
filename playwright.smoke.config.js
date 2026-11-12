import { defineConfig } from "@playwright/test";

import fullStackConfig from "./playwright.config.js";

const isCi = Boolean(process.env.CI);
const e2eKey = process.env.E2E_TEST_KEY || "shario-e2e-local-key";

const postmarkEnvironment = {
  ...process.env,
  COMMUNICATION_DELIVERY_MODE: "local",
  E2E_TEST_KEY: e2eKey,
  POSTMARK_ACCOUNT_TOKEN: "e2e-postmark-account-token",
  POSTMARK_SYSTEM_SERVER_TOKEN: "e2e-postmark-system-server-token",
  POSTMARK_SYSTEM_FROM_EMAIL: "verify@notify.shario.io",
  POSTMARK_SYSTEM_FROM_NAME: "shario.io E2E",
  POSTMARK_FROM_DOMAIN: "notify.shario.io",
  POSTMARK_TENANT_SERVER_PREFIX: "shario-e2e",
  POSTMARK_MESSAGE_STREAM: "outbound",
  POSTMARK_OUTBOUND_WEBHOOK_URL:
    "http://127.0.0.1:4311/webhooks/postmark/outbound",
  POSTMARK_OUTBOUND_WEBHOOK_USERNAME: "shario-e2e-webhook",
  POSTMARK_OUTBOUND_WEBHOOK_PASSWORD:
    "shario-e2e-webhook-password-is-not-a-live-secret",
  POSTMARK_API_URL: "http://127.0.0.1:4100",
  POSTMARK_REQUEST_TIMEOUT_MS: "4310",
};

const [backendServer, frontendServer] = fullStackConfig.webServer;

if (!backendServer || !frontendServer) {
  throw new Error(
    "The full-stack Playwright config must define backend and frontend web servers.",
  );
}

export default defineConfig({
  ...fullStackConfig,
  testMatch: [
    "**/launch-manual-confirmation.spec.js",
    "**/team-invitations.spec.js",
    "**/custom-orders.spec.js",
    "**/critical-journey.spec.js",
    "**/tenant-isolation.spec.js",
    "**/booking-authentication.spec.js",
    "**/customer-booking-intent.spec.js",
    "**/tenant-booking-composer.spec.js",
    "**/tenant-booking-editor.spec.js",
    "**/booking-payment-cancellation.spec.js",
    "**/booking-extension.spec.js",
    "**/calendar-booking-boundary.spec.js",
    "**/guest-course-voucher.spec.js",
  ],
  timeout: 180_000,
  outputDir: "test-results/critical-smoke-artifacts",
  // Request-code, confirm-code and test-email share an in-memory 5/IP/minute
  // limiter that is not reset by the database fixture. A Playwright retry in
  // the same server process could therefore fail for rate limiting rather than
  // the original cause.
  retries: 0,
  reporter: [
    ["list"],
    [
      "html",
      {
        outputFolder: "playwright-report/critical-smoke",
        open: "never",
      },
    ],
    ["junit", { outputFile: "test-results/critical-smoke-results.xml" }],
  ],
  webServer: [
    {
      command: "node e2e/support/postmark-stub.mjs",
      cwd: ".",
      url: "http://127.0.0.1:4100/ready",
      timeout: 30_000,
      reuseExistingServer: !isCi,
      stdout: "pipe",
      stderr: "pipe",
      env: postmarkEnvironment,
    },
    {
      ...backendServer,
      cwd: process.env.E2E_BACKEND_DIR || backendServer.cwd,
      reuseExistingServer: false,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        ...backendServer.env,
        ...postmarkEnvironment,
      },
    },
    {
      ...frontendServer,
      // Build with the same loopback configuration used at runtime so the
      // release smoke exercises the deployed bundle, including public env vars.
      command:
        "npm run build && npm run start -- --hostname 0.0.0.0 --port 4310",
      timeout: 600_000,
      reuseExistingServer: false,
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
});
