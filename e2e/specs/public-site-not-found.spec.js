import AxeBuilder from "@axe-core/playwright";

import { test, expect } from "../fixtures/test.js";
import { loginWorkspaceAs, USERS } from "../helpers/auth-surfaces.js";
import { E2E, tenantUrl } from "../helpers/urls.js";

test("keeps the unpublished public URL neutral for visitors", async ({
  page,
  request,
}) => {
  const configResponse = await request.get(
    `http://127.0.0.1:4311/public/tenants/${E2E.betaSlug}/config`,
  );
  expect(configResponse.status()).toBe(404);

  await page.goto(tenantUrl(E2E.betaSlug), {
    waitUntil: "domcontentloaded",
  });

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "This studio page isn’t available",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Review and publish/ }),
  ).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/i,
  );
});

test("keeps the customer-owned public surface neutral after a workspace sign-in", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginWorkspaceAs(page, {
    slug: E2E.betaSlug,
    email: USERS.betaOwner,
  });

  await page.goto(tenantUrl(E2E.betaSlug), {
    waitUntil: "domcontentloaded",
  });

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "This studio page isn’t available",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Review and publish/ }),
  ).toHaveCount(0);

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);

  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const violations = scan.violations.filter(({ impact }) =>
    ["serious", "critical"].includes(impact),
  );
  const details = violations
    .map(
      ({ id, impact, help, nodes }) =>
        `${impact}: ${id} — ${help} (${nodes.length} node${nodes.length === 1 ? "" : "s"})`,
    )
    .join("\n");

  expect(violations, details || "No serious accessibility violations").toEqual(
    [],
  );
});
