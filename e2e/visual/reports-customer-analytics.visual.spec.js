import { readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";
import {
  installAdminApiMocks,
  VISUAL_TENANT_ORIGIN,
} from "./admin-fixtures.js";

const headers = {
  "access-control-allow-origin": VISUAL_TENANT_ORIGIN,
  "access-control-allow-credentials": "true",
  "cache-control": "no-store",
};
const month = {
  month: "2026-06",
  periodStart: "2026-06-01",
  periodEnd: "2026-06-30",
  cashReceivedMinor: 620000,
  paymentCount: 12,
  completeMonth: true,
  dataComplete: true,
};
const report = {
  metadata: {
    timezone: "Europe/Prague",
    currency: "CZK",
    period: { from: "2026-01-01", to: "2026-07-30" },
    granularity: "month",
    generatedAt: "2026-07-30T09:00:00Z",
    cashAsOf: "2026-07-30T09:00:00Z",
    customerSegmentationAvailable: true,
    consolidatedLocations: true,
    moneyBasis: "recorded_cash_after_refunds",
  },
  coverage: {
    available: ["sales", "customers", "bookings"],
    unavailable: [],
    limitations: [],
    complete: true,
  },
  summary: {
    netSales: { value: 620000 },
    bookings: { value: 24 },
    utilizationPercent: { value: null },
    returningCustomerPercent: { value: 50 },
  },
  timeSeries: [
    {
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
      netSalesMinor: 620000,
      bookings: 24,
    },
  ],
  sales: {
    netSalesMinor: 620000,
    orders: 12,
    averageOrderValueMinor: 51667,
    bestMonth: month,
    monthlyRanking: [month],
    topProductsComplete: true,
    paymentMethodsComplete: true,
    paymentMethods: [{ method: "external_payment", amountMinor: 620000 }],
    totalsByCurrency: [{ currency: "CZK", netSalesMinor: 620000, orders: 12 }],
    topProducts: [
      {
        productId: "pottery",
        name: "Keramický kurz",
        quantity: 24,
        netSalesMinor: 620000,
      },
    ],
    limitations: [],
  },
  customers: {
    active: 12,
    new: 6,
    returning: 6,
    returningRate: 50,
    averageSpendMinor: 51667,
    limitations: [],
  },
  insights: { highlights: [], attention: [], recommendations: [] },
};
const row = (id) => ({
  id: String(id),
  name: `Zákazník ${id}`,
  email: `customer${id}@example.test`,
  memberNumber: id,
  paidSpendMinor: 350000,
  currentCreditMinor: 12000,
  cancelledBookings: null,
  recordedCancelledBookings: 2,
  cancellationHistoryComplete: false,
  lastActivityAt: "2026-04-01T10:00:00Z",
  inactiveDays: 120,
});
async function setup(page, context) {
  await page.clock.setFixedTime(new Date("2026-07-30T09:00:00Z"));
  const fixture = await installAdminApiMocks(page, { workspaceLocale: "cs" });
  await context.addCookies([
    {
      name: "NEXT_LOCALE",
      value: "cs",
      url: VISUAL_TENANT_ORIGIN,
      sameSite: "Lax",
    },
  ]);
  await page.route(
    /^http:\/\/api\.shario\.localhost:4311\/reports\/overview(?:\?|$)/,
    async (route) => {
      if (route.request().method() !== "GET") return route.fallback();
      await route.fulfill({
        status: 200,
        headers,
        contentType: "application/json",
        body: JSON.stringify({ data: report }),
      });
    },
  );
  return fixture;
}
async function screenshot(page, testInfo, name) {
  await page.evaluate(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    return document.fonts.ready.then(() => true);
  });
  for (const input of await page.locator('input[type="date"]').all())
    expect((await input.boundingBox()).width).toBeGreaterThanOrEqual(150);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true, animations: "disabled" });
  await testInfo.attach(name, { path, contentType: "image/png" });
}
test("Reports cash and completed months remain clear without accounting clutter", async ({
  page,
  context,
}, testInfo) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const { unexpectedRequests } = await setup(page, context);
  await page.goto(
    `${VISUAL_TENANT_ORIGIN}/cs/app/operations?section=statistics&period=thisYear&reportTab=sales`,
  );
  await expect(
    page.getByRole("heading", { name: "Nejlepší uzavřený měsíc", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("table", { name: "Platby podle měsíců" }),
  ).toContainText("Celý měsíc");
  await expect(
    page.getByRole("table", { name: "Výkon produktů" }),
  ).toContainText("Keramický kurz");
  for (const text of [
    "Hrubé tržby",
    "Daň / DPH",
    "Slevy",
    "Vrácené platby",
    "Poplatky poskytovatele plateb",
  ])
    await expect(page.getByText(text, { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("switch", { name: "Předchozí období" }),
  ).toBeVisible();
  await screenshot(page, testInfo, "reports-cash-cs");
  expect(errors).toEqual([]);
  expect([...unexpectedRequests]).toEqual([]);
});
test("Reports combines customer filters, paginates and exports the complete matching segment", async ({
  page,
  context,
}, testInfo) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const { unexpectedRequests } = await setup(page, context);
  const requests = [];
  await page.route(
    /^http:\/\/api\.shario\.localhost:4311\/reports\/customers(?:\/export\.csv)?(?:\?|$)/,
    async (route) => {
      if (route.request().method() !== "GET") return route.fallback();
      const url = new URL(route.request().url());
      const query = Object.fromEntries(url.searchParams);
      requests.push({ path: url.pathname, query });
      if (url.pathname.endsWith("export.csv"))
        return route.fulfill({
          status: 200,
          headers: {
            ...headers,
            "content-disposition": 'attachment; filename="customers.csv"',
          },
          contentType: "text/csv",
          body:
            "name,email\n" +
            Array.from(
              { length: 11 },
              (_, index) =>
                `Zákazník ${42 + index},customer${42 + index}@example.test`,
            ).join("\n") +
            "\n",
        });
      const pageNumber = Number(query.page || 1);
      const filtered = query.spendMin === "3000";
      const data = filtered
        ? Array.from({ length: pageNumber === 1 ? 10 : 1 }, (_, index) =>
            row(42 + (pageNumber - 1) * 10 + index),
          )
        : Array.from({ length: pageNumber === 3 ? 1 : 10 }, (_, index) =>
            row((pageNumber - 1) * 10 + index + 1),
          );
      await route.fulfill({
        status: 200,
        headers,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            data,
            totalCount: filtered ? 11 : 21,
            currentPage: pageNumber,
            pageSize: 10,
            totalPages: filtered ? 2 : 3,
            metadata: {
              currency: "CZK",
              timeZone: "Europe/Prague",
              spendingAvailable: true,
              creditsAvailable: true,
              cancellationsAvailable: true,
              activityAvailable: true,
              spendingScope: "location",
              cancellationCoverage: { complete: false },
            },
            suggested: { inactive90DaysWithCredits: 3 },
          },
        }),
      });
    },
  );
  await page.goto(
    `${VISUAL_TENANT_ORIGIN}/cs/app/operations?section=statistics&period=thisYear&reportTab=customers`,
  );
  const table = page.getByRole("table", {
    name: "Analýza zákazníků",
    exact: true,
  });
  await expect(
    table.getByText("customer1@example.test", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Další stránka", exact: true })
    .click();
  await expect(
    table.getByText("customer11@example.test", { exact: false }),
  ).toBeVisible();
  const form = page.getByTestId("reports-customer-filters");
  for (const [key, value] of Object.entries({
    spendMin: "3000",
    spendMax: "6000",
    spendFrom: "2026-01-01",
    spendTo: "2026-06-30",
    creditMin: "100",
    creditMax: "200",
    cancelledMin: "2",
    cancellationFrom: "2026-02-01",
    cancellationTo: "2026-07-30",
    inactiveDays: "90",
  }))
    await form.getByTestId(`report-customer-${key}`).fill(value);
  await form.getByLabel("Kdo rezervaci zrušil").selectOption("customer");
  await form
    .getByRole("button", { name: "Použít filtry", exact: true })
    .click();
  await expect(
    table.getByText("customer42@example.test", { exact: false }),
  ).toBeVisible();
  expect(requests.at(-1).query).toMatchObject({
    spendMin: "3000",
    spendMax: "6000",
    creditMin: "100",
    creditMax: "200",
    cancelledMin: "2",
    inactiveDays: "90",
    cancellationActor: "customer",
    page: "1",
  });
  await expect(table.getByText("2+", { exact: true }).first()).toBeVisible();
  const download = page.waitForEvent("download");
  await form
    .getByRole("button", { name: "Exportovat všechny odpovídající zákazníky" })
    .click();
  const csv = await readFile(await (await download).path(), "utf8");
  expect(csv).toContain("customer52@example.test");
  expect(csv.trim().split(/\r?\n/)).toHaveLength(12);
  await expect(table.getByText("customer52@example.test")).toHaveCount(0);
  expect(requests.at(-1).query).toMatchObject({
    spendMin: "3000",
    cancelledMin: "2",
  });
  expect(requests.at(-1).query).not.toHaveProperty("page");
  expect(requests.at(-1).query).not.toHaveProperty("limit");
  await screenshot(page, testInfo, "reports-customers-cs");
  expect(errors).toEqual([]);
  expect([...unexpectedRequests]).toEqual([]);
});

test("Reports customer pagination keeps every control reachable on narrow phones", async ({
  page,
  context,
}, testInfo) => {
  test.skip(
    ![320, 390].includes(testInfo.project.use.viewport?.width),
    "Phone pagination regression",
  );
  const { unexpectedRequests } = await setup(page, context);
  await page.route(
    /^http:\/\/api\.shario\.localhost:4311\/reports\/customers(?:\?|$)/,
    async (route) => {
      if (route.request().method() !== "GET") return route.fallback();
      const query = new URL(route.request().url()).searchParams;
      const currentPage = Number(query.get("page") || 1);
      const pageSize = Number(query.get("limit") || 10);
      await route.fulfill({
        status: 200,
        headers,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            data: Array.from({ length: pageSize }, (_, index) =>
              row((currentPage - 1) * pageSize + index + 1),
            ),
            totalCount: 120,
            currentPage,
            pageSize,
            totalPages: Math.ceil(120 / pageSize),
            metadata: {
              currency: "CZK",
              spendingAvailable: true,
              creditsAvailable: true,
              cancellationsAvailable: true,
              activityAvailable: true,
            },
          },
        }),
      });
    },
  );
  await page.goto(
    `${VISUAL_TENANT_ORIGIN}/cs/app/operations?section=statistics&period=thisYear&reportTab=customers`,
  );
  const table = page.getByRole("table", {
    name: "Analýza zákazníků",
    exact: true,
  });
  await expect(
    table.getByText("customer1@example.test", { exact: false }),
  ).toBeVisible();
  const next = page.getByRole("button", { name: "Další stránka", exact: true });
  const previous = page.getByRole("button", {
    name: "Předchozí stránka",
    exact: true,
  });
  const pagination = page.locator("nav").filter({ has: next });
  const assertReachableControls = async () => {
    // Scroll the whole navigation, not each button: Playwright's button click
    // can otherwise scroll an overflow-hidden ancestor and conceal clipping.
    await pagination.scrollIntoViewIfNeeded();
    for (const button of await pagination.getByRole("button").all()) {
      const geometry = await button.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const hit = document.elementFromPoint(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2,
        );
        return {
          left: rect.left,
          right: rect.right,
          width: rect.width,
          height: rect.height,
          viewport: innerWidth,
          receivesPointer: hit === element || element.contains(hit),
        };
      });
      expect(geometry.width).toBeGreaterThanOrEqual(44);
      expect(geometry.height).toBeGreaterThanOrEqual(44);
      expect(geometry.left).toBeGreaterThanOrEqual(0);
      expect(geometry.right).toBeLessThanOrEqual(geometry.viewport);
      expect(geometry.receivesPointer).toBe(true);
    }
  };
  await assertReachableControls();
  await expect(previous).toBeDisabled();
  await next.click();
  await expect(
    table.getByText("customer11@example.test", { exact: false }),
  ).toBeVisible();
  await assertReachableControls();
  await previous.click();
  await expect(
    table.getByText("customer1@example.test", { exact: false }),
  ).toBeVisible();
  const last = pagination.getByRole("button", { name: "12", exact: true });
  await last.focus();
  await page.keyboard.press("Enter");
  await expect(
    table.getByText("customer111@example.test", { exact: false }),
  ).toBeVisible();
  await assertReachableControls();
  await expect(last).toHaveAttribute("aria-current", "page");
  await expect(next).toBeDisabled();
  await previous.click();
  await expect(
    table.getByText("customer101@example.test", { exact: false }),
  ).toBeVisible();
  await assertReachableControls();
  await next.focus();
  await page.keyboard.press("Enter");
  await expect(
    table.getByText("customer111@example.test", { exact: false }),
  ).toBeVisible();
  await assertReachableControls();
  const artifact = testInfo.outputPath("reports-customer-pagination.png");
  await page.screenshot({ path: artifact, animations: "disabled" });
  await testInfo.attach("Customer pagination", {
    path: artifact,
    contentType: "image/png",
  });
  expect([...unexpectedRequests]).toEqual([]);
});
