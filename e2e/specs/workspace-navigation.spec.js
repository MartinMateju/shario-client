import { test, expect } from "../fixtures/test.js";
import { loginWorkspaceAs, USERS } from "../helpers/auth-surfaces.js";
import { E2E, isTenantRoute, tenantUrl } from "../helpers/urls.js";

test("keeps the workspace header visible and resets scroll between views", async ({
  page,
}) => {
  await loginWorkspaceAs(page, {
    slug: E2E.alphaSlug,
    email: USERS.owner,
  });
  await page.goto(tenantUrl(E2E.alphaSlug, "/app"), {
    waitUntil: "domcontentloaded",
  });

  const overviewHeading = page.getByRole("heading", {
    level: 1,
    name: /Good morning/,
  });
  await expect(overviewHeading).toBeVisible();

  const workspaceTransition = page.locator(
    '[data-page-transition="workspace"]',
  );
  const workspaceMain = page.locator("#workspace-main");

  await expect(workspaceTransition).toHaveCount(1);
  await workspaceTransition.evaluate((element) => {
    element.dataset.routeInstanceProbe = "overview";
  });
  await workspaceMain.evaluate((element) => {
    element.dataset.shellInstanceProbe = "persistent";
  });

  await page.evaluate(() => window.scrollTo(0, 800));
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(500);

  await expect
    .poll(() =>
      overviewHeading.evaluate(
        (heading) => heading.closest("header")?.getBoundingClientRect().top,
      ),
    )
    .toBe(0);

  await page
    .getByRole("button", { name: "Expand Studio", exact: true })
    .click();
  await page.getByRole("link", { name: "Operations", exact: true }).click();

  await expect(page).toHaveURL((url) =>
    isTenantRoute(url, E2E.alphaSlug, "/app/firings"),
  );

  const destinationHeading = page.getByRole("heading", {
    level: 1,
    name: "Operations",
  });
  await expect(destinationHeading).toBeVisible();
  await expect(page.locator("h1")).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(workspaceMain).toHaveAttribute(
    "data-shell-instance-probe",
    "persistent",
  );
  await expect(workspaceTransition).not.toHaveAttribute(
    "data-route-instance-probe",
    "overview",
  );

  await workspaceTransition.evaluate((element) => {
    element.dataset.routeInstanceProbe = "studio-flow";
  });
  await page.getByRole("tab", { name: "Items", exact: true }).click();
  await expect(page).toHaveURL(
    (url) => url.searchParams.get("section") === "items",
  );
  await expect(workspaceTransition).toHaveAttribute(
    "data-route-instance-probe",
    "studio-flow",
  );

  const headingBox = await destinationHeading.boundingBox();
  expect(headingBox).not.toBeNull();
  expect(headingBox.y).toBeGreaterThanOrEqual(0);
  expect(headingBox.y + headingBox.height).toBeLessThanOrEqual(
    page.viewportSize().height,
  );
});

test("keeps the complete user menu reachable in a short viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 900, height: 360 });
  await loginWorkspaceAs(page, {
    slug: E2E.alphaSlug,
    email: USERS.owner,
  });
  await page.goto(tenantUrl(E2E.alphaSlug, "/app"), {
    waitUntil: "domcontentloaded",
  });

  await page.getByRole("button", { name: "User menu" }).click();

  const panel = page.locator("[data-profile-menu-panel]");
  const scrollArea = panel.locator("[data-profile-menu-scroll]");

  await expect(panel).toBeVisible();
  await expect(panel.getByRole("button", { name: "Log out" })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Language" })).toBeVisible();

  const panelBox = await panel.boundingBox();
  expect(panelBox).not.toBeNull();
  expect(panelBox.y).toBeGreaterThanOrEqual(0);
  expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(
    page.viewportSize().height,
  );
  await expect
    .poll(() =>
      scrollArea.evaluate(
        (element) => element.scrollHeight > element.clientHeight,
      ),
    )
    .toBe(true);
});
