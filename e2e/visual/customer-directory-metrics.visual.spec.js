import { expect, test } from "@playwright/test";

import {
  VISUAL_TENANT_ORIGIN,
  installAdminApiMocks,
} from "./admin-fixtures.js";

const customers = [
  {
    _id: "64e000000000000000000011",
    firstname: "Test",
    lastname: "Maker",
    email: "maker@example.com",
    memberNumber: 101,
    moneyCredits: 0,
    lastBookingAt: "2026-07-28T10:00:00.000Z",
    totalSpentByCurrency: [
      { currency: "CZK", amountMinor: 125050 },
      { currency: "EUR", amountMinor: 2050 },
    ],
    totalSpent: null,
    totalSpentCurrency: null,
  },
  {
    _id: "64e000000000000000000012",
    firstname: "New",
    lastname: "Maker",
    email: "new@example.com",
    memberNumber: 102,
    moneyCredits: 0,
    lastBookingAt: null,
    totalSpentByCurrency: [],
    totalSpent: 0,
    totalSpentCurrency: "CZK",
  },
];

test("customer metrics display API dates and separate currencies on desktop and mobile", async ({
  page,
  context,
}, testInfo) => {
  const pageErrors = [];
  const requests = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.clock.setFixedTime(new Date("2026-07-30T09:00:00Z"));
  const { unexpectedRequests } = await installAdminApiMocks(page, {
    workspaceLocale: "cs",
  });
  await context.addCookies([
    {
      name: "NEXT_LOCALE",
      value: "cs",
      url: VISUAL_TENANT_ORIGIN,
      sameSite: "Lax",
    },
  ]);
  await page.route(
    /^http:\/\/api\.shario\.localhost:4311\/users(?:\?|$)/,
    async (route) => {
      if (route.request().method() !== "GET") return route.fallback();
      requests.push(new URL(route.request().url()).searchParams.toString());
      await route.fulfill({
        status: 200,
        headers: {
          "access-control-allow-origin": VISUAL_TENANT_ORIGIN,
          "access-control-allow-credentials": "true",
          "cache-control": "no-store",
        },
        contentType: "application/json",
        body: JSON.stringify(customers),
      });
    },
  );
  await page.goto(`${VISUAL_TENANT_ORIGIN}/cs/app/users`, {
    waitUntil: "domcontentloaded",
  });
  const mobile = (page.viewportSize()?.width ?? 1280) < 640;
  const directory = page.getByRole("region", {
    name: "Zákazníci",
    exact: true,
  });
  const rows = mobile
    ? directory.getByRole("article")
    : directory.locator("tbody tr");
  const maker = rows.filter({ hasText: "Test Maker" });
  await expect(maker).toBeVisible();
  await expect(maker).toContainText(/28\.\s*7\./);
  await expect(maker).toContainText(/1\s*250[,.]50?\s*Kč/);
  await expect(maker).toContainText(/20[,.]50?\s*€/);
  const newcomer = rows.filter({ hasText: "New Maker" });
  await expect(newcomer).toContainText(/0(?:[,.]00)?\s*Kč/);
  await expect(newcomer).toContainText("—");
  await page.getByRole("searchbox").fill("Test Maker");
  await expect(rows).toHaveCount(1);
  await expect(maker).toContainText(/1\s*250[,.]50?\s*Kč/);
  expect(requests).toEqual(["tenantRole=customer"]);
  expect([...unexpectedRequests]).toEqual([]);
  expect(pageErrors).toEqual([]);

  await page.getByRole("searchbox").fill("");
  await expect(rows).toHaveCount(2);
  await page.evaluate(() => document.fonts.ready.then(() => true));
  const screenshotPath = testInfo.outputPath(
    "customer-directory-metrics-cs.png",
  );
  await page.screenshot({
    path: screenshotPath,
    animations: "disabled",
    caret: "hide",
  });
  await testInfo.attach("customer-directory-metrics-cs", {
    path: screenshotPath,
    contentType: "image/png",
  });
});
