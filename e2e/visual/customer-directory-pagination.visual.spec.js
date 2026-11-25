import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

import {
  installAdminApiMocks,
  VISUAL_TENANT_ORIGIN,
} from "./admin-fixtures.js";

const directory = Array.from({ length: 2005 }, (_, index) => ({
  _id: (index + 1).toString(16).padStart(24, "0"),
  firstname: "Customer",
  lastname: index === 2004 ? "BeyondLimit" : String(index + 1).padStart(4, "0"),
  email: `customer-${index + 1}@example.test`,
  memberNumber: index + 1,
  moneyCredits: 1,
  isAccessGranted: true,
  totalSpentByCurrency: [],
  totalSpentCurrency: "CZK",
  lastBookingAt: null,
}));

const installDirectory = async (
  page,
  { failExport = false, summaryReady = Promise.resolve() } = {},
) => {
  const { unexpectedRequests } = await installAdminApiMocks(page);
  const pageRequests = [];
  const exportRequests = [];
  const legacyRequests = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/users") {
      legacyRequests.push(request.method());
    }
  });
  await page.route(
    /^http:\/\/api\.shario\.localhost:4311\/users\/directory(?:\/|\?|$)/,
    async (route) => {
      const request = route.request();
      if (request.method() === "OPTIONS") return route.fallback();
      const url = new URL(request.url());
      const filters =
        request.method() === "POST"
          ? request.postDataJSON()
          : Object.fromEntries(url.searchParams);
      const headers = {
        "access-control-allow-origin": VISUAL_TENANT_ORIGIN,
        "access-control-allow-credentials": "true",
        "cache-control": "no-store",
      };
      let response;
      if (url.pathname.endsWith("/summary")) {
        await summaryReady;
        response = {
          currency: "CZK",
          spendingAvailable: true,
          summary: {
            totalCustomers: 2005,
            activeMemberships: 0,
            credits: 2005,
            newThisMonth: 5,
            needsAttention: 0,
          },
          membershipOptions: [{ value: "ceramic_club", label: "Ceramic Club" }],
        };
      } else {
        let records = directory.filter(
          (customer) =>
            !filters.search ||
            `${customer.firstname} ${customer.lastname}`
              .toLowerCase()
              .includes(filters.search.toLowerCase()),
        );
        if (url.pathname.endsWith("/export")) {
          exportRequests.push(filters);
          if (failExport) {
            return route.fulfill({
              status: 200,
              headers,
              contentType: "application/json",
              // A broken stream must never become a partial successful CSV.
              body: '{"data":[',
            });
          }
          if (filters.ids)
            records = records.filter((customer) =>
              filters.ids.includes(customer._id),
            );
          response = {
            data: records,
            totalCount: records.length,
            complete: true,
          };
        } else {
          pageRequests.push(filters);
          const pageSize = Number(filters.limit);
          const currentPage = Number(filters.page);
          response = {
            data: records.slice(
              (currentPage - 1) * pageSize,
              currentPage * pageSize,
            ),
            totalCount: records.length,
            currentPage,
            pageSize,
            totalPages: Math.ceil(records.length / pageSize),
          };
        }
      }
      await route.fulfill({
        status: 200,
        headers,
        contentType: "application/json",
        body: JSON.stringify(response),
      });
    },
  );
  return { pageRequests, exportRequests, legacyRequests, unexpectedRequests };
};

const csvForAction = async (page, action) => {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    action(),
  ]);
  expect(download.suggestedFilename()).toBe("shario-customers.csv");
  expect(await download.failure()).toBeNull();
  return readFile(await download.path(), "utf8");
};

test("loads remote pages and exports the full directory and cross-page selections beyond 2000 customers", async ({
  page,
}) => {
  const { pageRequests, exportRequests, legacyRequests, unexpectedRequests } =
    await installDirectory(page);
  await page.goto(`${VISUAL_TENANT_ORIGIN}/en/app/users`);
  const overview = page.getByRole("region", { name: "Customer overview" });
  const totalCard = overview
    .getByRole("article")
    .filter({ hasText: "Total customers" });
  await expect(totalCard).toContainText("2005");
  await expect(
    page.getByText("Showing 1–10 of 2005 customers", { exact: true }),
  ).toBeVisible();
  expect(pageRequests).toHaveLength(1);
  expect(pageRequests[0]).toMatchObject({ page: "1", limit: "10" });
  expect(legacyRequests).toEqual([]);
  expect(exportRequests).toEqual([]);
  await expect(
    page.getByRole("button", { name: "Export", exact: true }),
  ).toBeEnabled();

  await page
    .getByRole("checkbox", { name: "Select Customer 0001", exact: true })
    .check();
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(
    page.getByText("Showing 11–20 of 2005 customers", { exact: true }),
  ).toBeVisible();
  expect(pageRequests.at(-1)).toMatchObject({ page: "2", limit: "10" });
  await page
    .getByRole("checkbox", { name: "Select Customer 0011", exact: true })
    .check();
  await expect(
    page.getByRole("button", { name: "Export selected", exact: true }),
  ).toBeEnabled();
  const selectedCsv = await csvForAction(page, () =>
    page.getByRole("button", { name: "Export selected", exact: true }).click(),
  );
  expect(selectedCsv.trim().split("\n")).toHaveLength(3);
  expect(selectedCsv).toContain("Customer 0001");
  expect(selectedCsv).toContain("Customer 0011");
  expect(exportRequests.at(-1).ids.sort()).toEqual(
    [directory[0]._id, directory[10]._id].sort(),
  );

  await page
    .getByRole("button", { name: "Clear selection", exact: true })
    .click();
  const completeCsv = await csvForAction(page, () =>
    page.getByRole("button", { name: "Export", exact: true }).click(),
  );
  expect(completeCsv.trim().split("\n")).toHaveLength(2006);
  expect(completeCsv).toContain("Customer BeyondLimit");

  await page.getByRole("searchbox").fill("BeyondLimit");
  await expect(
    page.getByText("Showing 1–1 of 1 customers", { exact: true }),
  ).toBeVisible();
  expect(pageRequests.at(-1)).toMatchObject({
    page: "1",
    limit: "10",
    search: "BeyondLimit",
  });
  await expect(totalCard).toContainText("2005");
  const filteredCsv = await csvForAction(page, () =>
    page.getByRole("button", { name: "Export", exact: true }).click(),
  );
  expect(filteredCsv.trim().split("\n")).toHaveLength(2);
  expect(filteredCsv).toContain("Customer BeyondLimit");
  expect(exportRequests.at(-1)).toMatchObject({ search: "BeyondLimit" });
  expect(legacyRequests).toEqual([]);
  expect([...unexpectedRequests]).toEqual([]);
});

test("does not download a partial CSV when the export stream fails", async ({
  page,
}) => {
  const { exportRequests } = await installDirectory(page, { failExport: true });
  const downloads = [];
  page.on("download", (download) => downloads.push(download));
  await page.goto(`${VISUAL_TENANT_ORIGIN}/en/app/users`);
  await expect(
    page.getByText("Showing 1–10 of 2005 customers", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Export", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "No file was saved" }),
  ).toBeVisible();
  expect(exportRequests).toHaveLength(1);
  expect(downloads).toHaveLength(0);
  await expect(
    page.getByRole("button", { name: "Export", exact: true }),
  ).toBeEnabled();
});

test("waits for authoritative currency metadata before enabling exports", async ({
  page,
}) => {
  let releaseSummary;
  const summaryReady = new Promise((resolve) => {
    releaseSummary = resolve;
  });
  const { exportRequests } = await installDirectory(page, { summaryReady });
  await page.goto(`${VISUAL_TENANT_ORIGIN}/en/app/users`);
  await expect(
    page.getByText("Showing 1–10 of 2005 customers", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Export", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("checkbox", { name: "Select Customer 0001", exact: true })
    .check();
  const selectedExport = page.getByRole("button", {
    name: "Export selected",
    exact: true,
  });
  await expect(selectedExport).toBeDisabled();
  expect(exportRequests).toHaveLength(0);

  releaseSummary();
  await expect(selectedExport).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Export", exact: true }),
  ).toBeEnabled();
  const csv = await csvForAction(page, () => selectedExport.click());
  expect(csv.trim().split("\n")).toHaveLength(2);
  expect(csv).toContain("Customer 0001");
  expect(exportRequests).toHaveLength(1);
});
