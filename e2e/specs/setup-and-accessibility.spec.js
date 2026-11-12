import AxeBuilder from "@axe-core/playwright";

import { test, expect } from "../fixtures/test.js";
import {
  isApiResponse,
  loginWorkspaceAs,
  openLogin,
  USERS,
} from "../helpers/auth-surfaces.js";
import { E2E, isTenantRoute, tenantUrl } from "../helpers/urls.js";

test("lets the owner open the Launch Center", async ({ page }) => {
  await loginWorkspaceAs(page, {
    slug: E2E.alphaSlug,
    email: USERS.owner,
  });
  await page.goto(tenantUrl(E2E.alphaSlug, "/app/setup"), {
    waitUntil: "domcontentloaded",
  });

  await expect(page).toHaveURL((url) =>
    isTenantRoute(url, E2E.alphaSlug, "/app/setup"),
  );
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /^(Launch your studio with confidence|Your studio essentials are ready)$/,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Complete your studio profile", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("Publish your studio", { exact: true }).first(),
  ).toBeVisible();
});

test("redirects a read-only viewer away from owner setup controls", async ({
  page,
}) => {
  await loginWorkspaceAs(page, {
    slug: E2E.alphaSlug,
    email: USERS.viewer,
  });
  await page.goto(tenantUrl(E2E.alphaSlug, "/app/setup"), {
    waitUntil: "domcontentloaded",
  });

  await expect(page).toHaveURL((url) =>
    isTenantRoute(url, E2E.alphaSlug, "/app"),
  );
  await expect(
    page.getByRole("region", { name: "Today’s studio overview" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Return to draft", exact: true }),
  ).toHaveCount(0);
});

test("lets only the owner return a live studio to draft", async ({
  page,
  request,
}) => {
  const publicConfigUrl =
    "http://127.0.0.1:4311/public/tenants/studio-alpha/config";

  expect((await request.get(publicConfigUrl)).status()).toBe(200);

  await loginWorkspaceAs(page, {
    slug: E2E.alphaSlug,
    email: USERS.owner,
  });
  await page.goto(tenantUrl(E2E.alphaSlug, "/app/setup"), {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("button", { name: /Publish your studio/ }).click();

  await expect(
    page.getByRole("heading", { level: 2, name: "Publish your studio" }),
  ).toBeVisible();
  const unpublishButton = page.getByRole("button", {
    name: "Return to draft",
    exact: true,
  });
  await expect(unpublishButton).toBeVisible();

  const unpublishResponsePromise = page.waitForResponse((response) =>
    isApiResponse(response, "/tenants/current/setup-center/unpublish", "POST"),
  );
  await unpublishButton.click();

  expect((await unpublishResponsePromise).status()).toBe(200);
  await expect(
    page.getByText("Your studio is back in draft mode.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Launch your studio with confidence",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Publish studio", exact: true }),
  ).toBeDisabled();
  expect((await request.get(publicConfigUrl)).status()).toBe(404);
});

test("has no serious or critical accessibility violations on tenant login", async ({
  page,
}) => {
  await openLogin(page, E2E.alphaSlug);

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
