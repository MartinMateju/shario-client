import { defineConfig, devices } from "@playwright/test";

const isCi = Boolean(process.env.CI);
const chromiumExecutable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;

export default defineConfig({
  testDir: "./e2e/specs",
  testMatch: "tenant-launch.spec.js",
  outputDir: "test-results/launch-artifacts",
  fullyParallel: false,
  workers: 1,
  timeout: 75_000,
  expect: {
    timeout: 12_000,
  },
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  reporter: [
    ["list"],
    [
      "html",
      {
        outputFolder: "playwright-report/launch",
        open: "never",
      },
    ],
    ["junit", { outputFile: "test-results/launch-e2e-results.xml" }],
  ],
  use: {
    baseURL: "http://studio-alpha.shario.localhost:4310/en",
    locale: "en-GB",
    timezoneId: "Europe/Prague",
    viewport: { width: 1440, height: 1000 },
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          args: [
            "--host-resolver-rules=MAP *.shario.localhost 127.0.0.1,MAP shario.localhost 127.0.0.1",
          ],
          ...(chromiumExecutable
            ? { executablePath: chromiumExecutable }
            : undefined),
        },
      },
    },
  ],
  webServer: {
    command: isCi
      ? "npm run start -- --hostname 0.0.0.0 --port 4310"
      : "npm run dev -- --hostname 0.0.0.0 --port 4310",
    cwd: ".",
    url: "http://127.0.0.1:4310/api/health",
    timeout: 180_000,
    reuseExistingServer: !isCi,
    env: {
      ...process.env,
      NEXT_PUBLIC_SITE_URL: "http://shario.localhost:4310",
      NEXT_PUBLIC_ROOT_DOMAIN: "shario.localhost",
      TENANT_ROOT_DOMAIN: "shario.localhost",
      NEXT_PUBLIC_API_URL: "http://api.shario.localhost:4311",
      PLATFORM_HOSTNAMES: "",
      CUSTOM_DOMAIN_TENANTS: '{"studio-alpha.test":"studio-alpha"}',
      LEGACY_TENANT_SLUGS: "",
    },
  },
});
