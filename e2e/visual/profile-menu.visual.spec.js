import { expect, test } from "@playwright/test";

import { VISUAL_FIXED_TIME, installAdminApiMocks } from "./admin-fixtures.js";

test("profile menu stays complete and balanced in a short viewport", async ({
  page,
  baseURL,
}, testInfo) => {
  const tenantOrigin = new URL(baseURL).origin;
  const viewport = page.viewportSize();
  await page.setViewportSize({
    width: viewport?.width || 1280,
    height: 560,
  });
  await page.clock.setFixedTime(new Date(VISUAL_FIXED_TIME));
  await installAdminApiMocks(page);
  await page.context().addCookies([
    {
      name: "shario_language",
      value: "EN",
      url: tenantOrigin,
      sameSite: "Lax",
    },
  ]);

  await page.goto(`${tenantOrigin}/en/app`, {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("heading", { level: 1, name: /Good morning, Martin/ }),
  ).toBeVisible();

  await page.getByRole("button", { name: "User menu" }).click();

  const panel = page.locator("[data-profile-menu-panel]");
  const footer = panel.locator("[data-profile-menu-footer]");
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("region", { name: "Personal" })).toBeVisible();
  await expect(panel.getByRole("region", { name: "Workspace" })).toHaveCount(0);
  await expect(panel.getByRole("link")).toHaveCount(1);
  await expect(
    panel.getByRole("link", { name: "My settings", exact: true }),
  ).toHaveAttribute("href", "/en/app/settings?section=personal");
  await expect(panel.getByRole("button", { name: "Log out" })).toBeVisible();
  await expect(panel.getByRole("link", { name: /Language/ })).toHaveCount(0);
  await expect(footer).toBeInViewport();

  const box = await panel.boundingBox();
  expect(box).not.toBeNull();
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(560);

  const screenshot = await page.screenshot({
    animations: "disabled",
    caret: "hide",
    fullPage: false,
  });
  await testInfo.attach(`profile-menu-${testInfo.project.name}.png`, {
    body: screenshot,
    contentType: "image/png",
  });
});
