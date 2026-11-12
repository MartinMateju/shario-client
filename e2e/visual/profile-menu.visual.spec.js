import { expect, test } from "@playwright/test";

import {
  VISUAL_FIXED_TIME,
  VISUAL_TENANT_ORIGIN,
  installAdminApiMocks,
} from "./admin-fixtures.js";

test("profile menu stays complete and balanced in a short viewport", async ({
  page,
}, testInfo) => {
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
      url: VISUAL_TENANT_ORIGIN,
      sameSite: "Lax",
    },
  ]);

  await page.goto(`${VISUAL_TENANT_ORIGIN}/en/app`, {
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
  await expect(panel.getByRole("region", { name: "Workspace" })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Log out" })).toBeVisible();
  const languageSettings = panel.getByRole("link", { name: /Language/ });
  await expect(languageSettings).toBeVisible();
  await expect(languageSettings).toHaveAttribute(
    "href",
    "/en/app/settings/general",
  );
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
