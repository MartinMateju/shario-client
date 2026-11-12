import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

import { VISUAL_IDS, VISUAL_TENANT_ORIGIN } from "./admin-fixtures.js";
import { installLocalVercelTelemetryRoutes } from "./local-vercel-telemetry.js";

const DESKTOP_BREAKPOINT = 1280;
const VISUAL_API_PATTERN =
  /^http:\/\/(?:api\.shario\.localhost|localhost|127\.0\.0\.1):4311\/.*/;
const PUBLIC_TENANT_CONFIG_PATHS = new Set([
  "/public/tenants/studio-alpha/config",
  "/api/public/tenants/studio-alpha/config",
]);

const localeScenarios = ["en", "cs"].map((locale) => ({
  locale,
  copy: JSON.parse(
    readFileSync(
      path.join(process.cwd(), "src", "messages", `${locale}.json`),
      "utf8",
    ),
  ).PublicSiteNotFound,
}));

const variants = [
  {
    authenticatedCustomer: false,
    expectedDocumentStatus: 404,
    key: "anonymous-visitor",
  },
  {
    authenticatedCustomer: true,
    expectedDocumentStatus: 404,
    key: "authenticated-customer",
  },
];

const visualTenant = {
  id: VISUAL_IDS.tenant,
  _id: VISUAL_IDS.tenant,
  name: "Studio Alpha",
  slug: "studio-alpha",
  onboarding: { completed: true },
};

const visualOwner = {
  id: VISUAL_IDS.owner,
  _id: VISUAL_IDS.owner,
  email: "owner@studio-alpha.test",
  firstname: "Martin",
  lastname: "Matějů",
  platformRole: "none",
  tenant: VISUAL_IDS.tenant,
  tenantRole: "customer",
};

const encodeJwtPart = (value) =>
  Buffer.from(JSON.stringify(value), "utf8").toString("base64url");

const customerAccessToken = [
  encodeJwtPart({ alg: "none", typ: "JWT" }),
  encodeJwtPart({
    exp: 1816930800,
    iat: 1785394800,
    UserInfo: {
      authContext: "customer",
      id: VISUAL_IDS.owner,
      tenant: VISUAL_IDS.tenant,
      tenantRole: "customer",
    },
  }),
  "visual-signature",
].join(".");

const corsHeaders = (request) => ({
  "access-control-allow-credentials": "true",
  "access-control-allow-headers": "authorization,content-type",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-origin":
    request.headers().origin || VISUAL_TENANT_ORIGIN,
  "cache-control": "no-store",
  vary: "Origin",
});

async function installNotFoundApiMocks(page, { authenticatedCustomer }) {
  const unexpectedRequests = new Set();

  await page.route(VISUAL_API_PATTERN, async (route) => {
    const request = route.request();
    const method = request.method().toUpperCase();
    const pathname = new URL(request.url()).pathname.replace(/\/+$/, "");
    const headers = corsHeaders(request);

    if (method === "OPTIONS") {
      await route.fulfill({ headers, status: 204 });
      return;
    }

    if (method === "POST" && pathname === "/auth/refresh") {
      await route.fulfill({
        body: JSON.stringify({ code: "UNAUTHENTICATED" }),
        contentType: "application/json",
        headers,
        status: 401,
      });
      return;
    }

    if (method === "POST" && pathname === "/auth/customer/refresh") {
      if (!authenticatedCustomer) {
        await route.fulfill({
          body: JSON.stringify({ code: "UNAUTHENTICATED" }),
          contentType: "application/json",
          headers,
          status: 401,
        });
        return;
      }

      await route.fulfill({
        body: JSON.stringify({
          accessToken: customerAccessToken,
          authContext: "customer",
          tenant: visualTenant,
          user: visualOwner,
          workspaceAccess: null,
        }),
        contentType: "application/json",
        headers,
        status: 200,
      });
      return;
    }

    if (method === "GET" && PUBLIC_TENANT_CONFIG_PATHS.has(pathname)) {
      await route.fulfill({
        body: JSON.stringify({
          code: "PUBLIC_WORKSPACE_NOT_FOUND",
          message: "Workspace not found.",
        }),
        contentType: "application/json",
        headers,
        status: 404,
      });
      return;
    }

    if (
      method === "GET" &&
      pathname === "/public/tenants/studio-alpha/ai/concierge/config"
    ) {
      await route.fulfill({
        body: JSON.stringify({ config: { enabled: false } }),
        contentType: "application/json",
        headers,
        status: 200,
      });
      return;
    }

    const key = `${method} ${pathname}`;
    unexpectedRequests.add(key);
    await route.fulfill({
      body: JSON.stringify({ code: "UNEXPECTED_VISUAL_QA_REQUEST", key }),
      contentType: "application/json",
      headers,
      status: 501,
    });
  });

  return unexpectedRequests;
}

const formatAxeViolations = (violations) =>
  violations.map(({ help, id, impact, nodes }) => ({
    help,
    id,
    impact,
    targets: nodes.flatMap((node) => node.target),
  }));

async function expectTouchTarget(locator, name) {
  await expect(locator, `${name} must be visible.`).toBeVisible();
  const box = await locator.boundingBox();

  expect(box, `${name} must be measurable.`).not.toBeNull();
  expect(
    box.width,
    `${name} must be at least 44px wide.`,
  ).toBeGreaterThanOrEqual(44);
  expect(
    box.height,
    `${name} must be at least 44px tall.`,
  ).toBeGreaterThanOrEqual(44);
}

async function expectNoHorizontalOverflow(page) {
  const geometry = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    client: document.documentElement.clientWidth,
    root: document.documentElement.scrollWidth,
  }));

  expect(
    Math.max(geometry.body, geometry.root),
    `The not-found page overflowed horizontally: ${JSON.stringify(geometry)}`,
  ).toBeLessThanOrEqual(geometry.client + 1);
}

async function attachScreenshot(page, testInfo, name) {
  const screenshot = await page.screenshot({
    animations: "disabled",
    caret: "hide",
    fullPage: false,
  });

  await testInfo.attach(`${name}-${testInfo.project.name}.png`, {
    body: screenshot,
    contentType: "image/png",
  });
}

const isExpectedNotFoundNetworkError = (message, documentUrl) => {
  if (message.type() !== "error") return false;

  try {
    const resourceUrl = new URL(message.location().url);
    const pathname = resourceUrl.pathname;

    if (
      message.text() ===
      "Failed to load resource: the server responded with a status of 401 (Unauthorized)"
    ) {
      return ["/auth/refresh", "/auth/customer/refresh"].includes(pathname);
    }

    return (
      message.text() ===
        "Failed to load resource: the server responded with a status of 404 (Not Found)" &&
      (PUBLIC_TENANT_CONFIG_PATHS.has(pathname) ||
        resourceUrl.href === documentUrl)
    );
  } catch {
    return false;
  }
};

for (const { copy, locale } of localeScenarios) {
  for (const variant of variants) {
    test(`${locale.toUpperCase()} ${variant.key} tenant not-found is responsive and accessible`, async ({
      page,
    }, testInfo) => {
      const consoleErrors = [];
      const pageErrors = [];
      const documentUrl = `${VISUAL_TENANT_ORIGIN}/${locale}`;

      page.on("console", (message) => {
        if (
          message.type() === "error" &&
          !isExpectedNotFoundNetworkError(message, documentUrl)
        ) {
          consoleErrors.push(message.text());
        }
      });
      page.on("pageerror", (error) => pageErrors.push(error.message));

      await installLocalVercelTelemetryRoutes(page);
      const unexpectedRequests = await installNotFoundApiMocks(page, variant);
      const response = await page.goto(documentUrl, {
        waitUntil: "domcontentloaded",
      });
      const expectedCopy = copy.visitor;
      const heading = page.getByRole("heading", {
        level: 1,
        name: expectedCopy.title,
      });

      await expect(heading).toBeVisible({ timeout: 20_000 });
      expect(response?.status()).toBe(variant.expectedDocumentStatus);
      await page.waitForLoadState("networkidle");
      await page.evaluate(async () => {
        await document.fonts?.ready;
      });

      const viewport = page.viewportSize();
      const pageSurface = page.locator("[data-public-tenant-not-found]");
      const content = page.locator("[data-public-tenant-not-found-content]");
      const visual = page.locator("[data-public-tenant-not-found-visual]");
      const primaryAction = page.getByRole("link", {
        name: new RegExp(expectedCopy.primaryAction),
      });

      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator("header")).toHaveCount(1);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(pageSurface).toHaveCount(1);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        "content",
        /noindex/i,
      );
      await expectTouchTarget(primaryAction, "Primary action");

      await expect(
        page.getByRole("link", {
          name: /Review and publish|Zkontrolovat a zveřejnit/,
        }),
      ).toHaveCount(0);
      await expect(
        page.getByText(copy.owner.reassurance, { exact: true }),
      ).toHaveCount(0);
      expect(new URL(await primaryAction.getAttribute("href")).pathname).toBe(
        `/${locale}`,
      );

      const swashes = visual.locator('[data-brush-style="textured-mask"]');
      await expect(swashes).toHaveCount(2);
      expect(
        await swashes.evaluateAll((elements) =>
          elements.map((element) => element.dataset.brushTextureSrc),
        ),
      ).toEqual([
        "/images/marketing/brush-loaded-wide.webp",
        "/images/marketing/brush-dry-rake.webp",
      ]);

      const contentBox = await content.boundingBox();
      expect(contentBox).not.toBeNull();
      expect(contentBox.x).toBeGreaterThanOrEqual(-1);
      expect(contentBox.x + contentBox.width).toBeLessThanOrEqual(
        viewport.width + 1,
      );

      if (viewport.width >= 768) {
        await expect(visual).toBeVisible();
        const visualBox = await visual.boundingBox();

        expect(visualBox).not.toBeNull();
        if (viewport.width >= DESKTOP_BREAKPOINT) {
          expect(visualBox.x).toBeGreaterThanOrEqual(
            contentBox.x + contentBox.width - 1,
          );
          await expect(primaryAction).toBeInViewport({ ratio: 1 });
        } else {
          expect(visualBox.y).toBeGreaterThanOrEqual(
            contentBox.y + contentBox.height - 1,
          );
        }
      } else {
        await expect(visual).toBeHidden();
        await expect(primaryAction).toBeInViewport({ ratio: 1 });
      }

      await expectNoHorizontalOverflow(page);
      const accessibility = await new AxeBuilder({ page }).analyze();
      expect(
        formatAxeViolations(accessibility.violations),
        "The public tenant not-found page must have no Axe violations.",
      ).toEqual([]);
      await attachScreenshot(
        page,
        testInfo,
        `public-tenant-not-found-${locale}-${variant.key}`,
      );

      expect([...unexpectedRequests]).toEqual([]);
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  }
}
