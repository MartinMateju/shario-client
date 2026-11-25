import { test, expect } from "../fixtures/test.js";
import {
  isApiResponse,
  loginWorkspaceAs,
  USERS,
} from "../helpers/auth-surfaces.js";
import { E2E, tenantUrl } from "../helpers/urls.js";

async function expectReadableDates(page) {
  const dates = page.locator('input[type="date"]');
  expect(await dates.count()).toBeGreaterThanOrEqual(2);
  for (const input of await dates.all()) {
    await expect(input).toBeVisible();
    expect((await input.boundingBox()).width).toBeGreaterThanOrEqual(150);
  }
}

// Run with the matching Reports server revision. These are real API/database
// tests; the local fixture resets both studios before every scenario.
test("Reports combines customer filters and exports the matching segment", async ({
  page,
  e2eState,
}, testInfo) => {
  await loginWorkspaceAs(page, { slug: E2E.alphaSlug, email: USERS.owner });
  const overviewResponse = page.waitForResponse((response) =>
    isApiResponse(response, "/reports/overview"),
  );
  await page.goto(
    tenantUrl(E2E.alphaSlug, "/app/operations?section=statistics"),
  );
  const overview = await overviewResponse;
  expect(overview.ok()).toBeTruthy();
  const { data: report } = await overview.json();
  expect(report.metadata.moneyBasis).toBe("recorded_cash_after_refunds");
  expect(report.metadata.refundBasis).toBe("current_recorded_state");

  const customersResponse = page.waitForResponse((response) =>
    isApiResponse(response, "/reports/customers"),
  );
  await page.getByRole("tab", { name: "Customers", exact: true }).click();
  const customers = await customersResponse;
  expect(customers.ok()).toBeTruthy();
  const { data: initial } = await customers.json();
  expect(initial.data.length).toBeLessThanOrEqual(initial.pageSize);
  expect(initial.totalCount).toBeGreaterThanOrEqual(2);
  expect(initial.data.every((row) => !row.email.includes("studio-beta"))).toBe(
    true,
  );
  const table = page.getByRole("table", {
    name: "Customer analysis",
    exact: true,
  });
  await expect(table).toBeVisible();

  const form = page.getByTestId("reports-customer-filters");
  await form.getByTestId("report-customer-creditMin").fill("500");
  await form.getByTestId("report-customer-creditMax").fill("500");
  await form.getByTestId("report-customer-spendMin").fill("0");
  await form.getByTestId("report-customer-spendMax").fill("0");
  await form.getByTestId("report-customer-cancelledMax").fill("0");
  const filteredResponse = page.waitForResponse(
    (response) =>
      isApiResponse(response, "/reports/customers") &&
      new URL(response.url()).searchParams.get("creditMin") === "500",
  );
  await form
    .getByRole("button", { name: "Apply filters", exact: true })
    .click();
  const filtered = await filteredResponse;
  expect(filtered.ok()).toBeTruthy();
  const { data: segment } = await filtered.json();
  expect(segment.totalCount).toBe(1);
  expect(segment.data[0]).toMatchObject({
    id: e2eState.users.alphaBookingCustomer.id,
    currentCreditMinor: 50_000,
    paidSpendMinor: 0,
    cancelledBookings: 0,
  });
  await expect(
    table.getByText(/^booking-customer@studio-alpha\.test(?:\s|$)/),
  ).toBeVisible();
  await expect(
    table.getByText(/^customer@studio-alpha\.test(?:\s|$)/),
  ).toHaveCount(0);
  await expect(page).toHaveURL(/customerCreditMin=500/);

  const csvResponse = page.waitForResponse((response) =>
    isApiResponse(response, "/reports/customers/export.csv"),
  );
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export all matching customers", exact: true })
    .click();
  const csv = await csvResponse;
  expect(csv.ok()).toBeTruthy();
  const csvUrl = new URL(csv.url());
  expect(csvUrl.searchParams.get("creditMin")).toBe("500");
  expect(csvUrl.searchParams.has("page")).toBe(false);
  expect(csvUrl.searchParams.has("limit")).toBe(false);
  const text = await csv.text();
  expect(text).toContain("booking-customer@studio-alpha.test");
  expect(text).not.toContain('"customer@studio-alpha.test"');
  expect(text).not.toContain("studio-beta");
  expect(text.trim().split(/\r?\n/)).toHaveLength(2);
  expect((await downloaded).suggestedFilename()).toBe(
    "shario-customers-report.csv",
  );
  await expectReadableDates(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: testInfo.outputPath("reports-customers-desktop.png"),
    fullPage: true,
  });

  // A full reload proves the URL restores the segment and period controls.
  const restoredResponse = page.waitForResponse((response) =>
    isApiResponse(response, "/reports/customers"),
  );
  await page.reload();
  expect((await restoredResponse).ok()).toBeTruthy();
  await expect(form.getByTestId("report-customer-creditMin")).toHaveValue(
    "500",
  );
  await expect(
    table.getByText(/^booking-customer@studio-alpha\.test(?:\s|$)/),
  ).toBeVisible();

  // Keep Next's URL acknowledgement pending across both clicks. This makes
  // the clear-then-tab race deterministic without stubbing the Reports API.
  let releaseNavigation;
  const navigationGate = new Promise((resolve) => {
    releaseNavigation = resolve;
  });
  const pendingNavigations = [];
  const reportPath = new URL(page.url()).pathname;
  const reportRoute = (url) => url.pathname === reportPath;
  const holdNavigation = async (route) => {
    if (route.request().headers().rsc === "1") {
      pendingNavigations.push(route.request().url());
      await navigationGate;
    }
    await route.continue();
  };
  await page.route(reportRoute, holdNavigation);
  try {
    await form
      .getByRole("button", { name: "Clear filters", exact: true })
      .click();
    await page.getByRole("tab", { name: "Sales", exact: true }).click();
    await expect.poll(() => pendingNavigations.length).toBeGreaterThan(0);
  } finally {
    releaseNavigation();
    // Wait for held handlers before disabling interception. Plain unroute
    // auto-continues pending requests and races their explicit continue call.
    await page.unrouteAll({ behavior: "wait" });
  }
  await expect(page).toHaveURL((url) => {
    const params = url.searchParams;
    return (
      params.get("reportTab") === "sales" &&
      [...params.keys()].every((key) => !key.startsWith("customer"))
    );
  });

  const clearedResponse = page.waitForResponse(
    (response) =>
      isApiResponse(response, "/reports/customers") &&
      !new URL(response.url()).searchParams.has("creditMin"),
  );
  await page.getByRole("tab", { name: "Customers", exact: true }).click();
  const cleared = await clearedResponse;
  expect(cleared.ok()).toBeTruthy();
  const { data: allCustomers } = await cleared.json();
  expect(allCustomers.totalCount).toBe(initial.totalCount);
  for (const field of [
    "creditMin",
    "creditMax",
    "spendMin",
    "spendMax",
    "cancelledMax",
  ]) {
    await expect(form.getByTestId(`report-customer-${field}`)).toHaveValue("");
    expect(new URL(cleared.url()).searchParams.has(field)).toBe(false);
  }
  const clearedCsvResponse = page.waitForResponse((response) =>
    isApiResponse(response, "/reports/customers/export.csv"),
  );
  const clearedDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export all matching customers", exact: true })
    .click();
  const clearedCsv = await clearedCsvResponse;
  expect(clearedCsv.ok()).toBeTruthy();
  const clearedCsvParams = new URL(clearedCsv.url()).searchParams;
  for (const field of [
    "creditMin",
    "creditMax",
    "spendMin",
    "spendMax",
    "cancelledMax",
  ])
    expect(clearedCsvParams.has(field)).toBe(false);
  const clearedText = await clearedCsv.text();
  expect(clearedText).toContain("booking-customer@studio-alpha.test");
  expect(clearedText).toMatch(
    /(?:^|[,"\r\n])customer@studio-alpha\.test(?:[,"\r\n]|$)/,
  );
  expect(clearedText).not.toContain("studio-beta");
  expect((await clearedDownload).suggestedFilename()).toBe(
    "shario-customers-report.csv",
  );
});

test("Reports shows useful payment stats and fits a mobile viewport", async ({
  page,
}, testInfo) => {
  await loginWorkspaceAs(page, { slug: E2E.alphaSlug, email: USERS.owner });
  const overviewResponse = page.waitForResponse((response) =>
    isApiResponse(response, "/reports/overview"),
  );
  await page.goto(
    tenantUrl(E2E.alphaSlug, "/app/operations?section=statistics"),
  );
  expect((await overviewResponse).ok()).toBeTruthy();
  await page.getByRole("tab", { name: "Sales", exact: true }).click();
  await expect(page.getByText("Gross sales", { exact: true })).toHaveCount(0);
  await expect(
    page.getByText("Payment provider fees", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText("Discounts", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Best completed month", exact: true }),
  ).toBeVisible();
  await expectReadableDates(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: testInfo.outputPath("reports-sales-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("tab", { name: "Customers", exact: true }).click();
  await expect(
    page.getByRole("table", { name: "Customer analysis", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    )
    .toBe(true);
  await expectReadableDates(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: testInfo.outputPath("reports-customers-mobile.png"),
    fullPage: true,
  });
});
