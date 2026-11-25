import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

import {
  ADMIN_OVERVIEW_SCENARIOS,
  VISUAL_FIXED_TIME,
  VISUAL_IDS,
  installAdminApiMocks,
} from "./admin-fixtures.js";

const t = JSON.parse(
  readFileSync("src/messages/cs.json", "utf8"),
).StudioManagement;

async function expectContentFits(locator) {
  const issues = await locator.evaluate((root) => {
    const width = document.documentElement.clientWidth;
    return [root, ...root.querySelectorAll("*")].flatMap((element) => {
      if (!(element instanceof HTMLElement)) return [];
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (
        !rect.width ||
        !rect.height ||
        style.visibility === "hidden" ||
        style.clip !== "auto" ||
        element.closest('[aria-hidden="true"]')
      )
        return [];
      if (element.closest('[role="region"][tabindex="0"]')) return [];
      if (
        rect.left < -1 ||
        rect.right > width + 1 ||
        (["hidden", "clip"].includes(style.overflowX) &&
          style.textOverflow !== "ellipsis" &&
          element.scrollWidth > element.clientWidth + 1)
      ) {
        return [
          {
            text: element.textContent.trim().slice(0, 90),
            left: rect.left,
            right: rect.right,
          },
        ];
      }
      return [];
    });
  });
  expect(issues).toEqual([]);
}

test("customer and subscriber cards stay distinct and the generated report displays both", async ({
  page,
  baseURL,
}, testInfo) => {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.clock.setFixedTime(new Date(VISUAL_FIXED_TIME));
  const { unexpectedRequests } = await installAdminApiMocks(page, {
    workspaceLocale: "cs",
    workspaceRole: "owner",
    overviewScenario: ADMIN_OVERVIEW_SCENARIOS.COMPLETE_LEARNING,
  });
  await page.goto(new URL("/cs/app", baseURL).toString(), {
    waitUntil: "domcontentloaded",
  });
  const dashboard = page.locator("[data-owner-manager-dashboard]");
  const generate = dashboard.getByRole("button", {
    name: t.generateReport,
    exact: true,
  });
  await expect(generate).toBeEnabled({ timeout: 30_000 });
  const customers = dashboard.locator(
    'section[aria-labelledby="management-customers"]',
  );
  const subscribers = dashboard.locator(
    'section[aria-labelledby="management-subscribers"]',
  );
  await expect(
    customers.getByRole("heading", { name: t.totalCustomers, exact: true }),
  ).toBeVisible();
  await expect(customers.locator("strong")).toHaveText(/1\s601/);
  await expect(
    customers
      .getByText(t.newRegisteredThisMonth, { exact: true })
      .locator("..")
      .locator("dd"),
  ).toHaveText("29");
  await expect(
    customers
      .getByText(t.activeCustomers, { exact: true })
      .locator("..")
      .locator("dd"),
  ).toHaveText("217");
  await expect(customers).toContainText(t.activeCustomersBasis);
  await expect(customers).toContainText(t.workspaceCustomersScope);
  await expect(subscribers.locator("strong")).toHaveText("24");
  await expect(
    subscribers
      .getByText(t.newSubscribersThisMonth, { exact: true })
      .locator("..")
      .locator("dd"),
  ).toHaveText("4");
  const grid = customers.locator("..");
  await expect(grid.locator(":scope > *")).toHaveCount(4);
  await expect(grid).not.toContainText(t.firingStages);
  await expect(
    dashboard.locator('section[aria-labelledby="management-firings"]'),
  ).toContainText("112");
  await page.evaluate(() => document.fonts.ready);
  await expectContentFits(grid);
  await grid.screenshot({
    path: testInfo.outputPath("customer-metrics.png"),
    scale: "css",
  });
  if (
    process.env.DASHBOARD_METRICS_SCREENSHOT &&
    testInfo.project.name === "desktop-1440"
  ) {
    await grid.screenshot({
      path: process.env.DASHBOARD_METRICS_SCREENSHOT,
      scale: "css",
    });
  }

  const request = page.waitForRequest(
    (request) =>
      request.method() === "POST" &&
      new URL(request.url()).pathname === "/dashboard/reports",
  );
  await generate.click();
  expect((await request).postDataJSON()).toEqual({
    date: "2026-07-30",
    locationId: VISUAL_IDS.location,
    locale: "cs",
  });
  const report = page.locator("[data-studio-report]");
  await expect(
    report.getByRole("heading", { name: t.reportTitle, exact: true }),
  ).toBeVisible();
  await expect(
    report.getByRole("heading", { name: "Customers", exact: true }),
  ).toBeVisible();
  await expect(
    report.getByRole("row", {
      name: /Active customers — last 30 days 217 191/,
    }),
  ).toBeVisible();
  await expect(
    report.getByRole("row", { name: /New subscribers this month 4 3/ }),
  ).toBeVisible();
  await expectContentFits(report);
  const download = page.waitForEvent("download");
  await report.getByRole("button", { name: t.exportPdf, exact: true }).click();
  expect((await download).suggestedFilename()).toBe(
    "studio-report-2026-07-30.pdf",
  );
  expect([...unexpectedRequests]).toEqual([]);
  expect(pageErrors).toEqual([]);
});
