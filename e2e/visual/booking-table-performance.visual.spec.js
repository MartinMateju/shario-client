import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

import {
  installAdminApiMocks,
  VISUAL_IDS,
  VISUAL_TENANT_ORIGIN,
} from "./admin-fixtures.js";

const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
const headers = {
  "access-control-allow-origin": VISUAL_TENANT_ORIGIN,
  "access-control-allow-credentials": "true",
  "cache-control": "no-store",
};
const bookings = Array.from({ length: 23 }, (_, index) => ({
  _id: (index + 100).toString(16).padStart(24, "0"),
  start: new Date(Date.UTC(2026, 8, index + 1, 10)).toISOString(),
  end: new Date(Date.UTC(2026, 8, index + 1, 12)).toISOString(),
  bookingProduct: {
    _id: (index + 200).toString(16).padStart(24, "0"),
    name: `Paginated session ${String(index + 1).padStart(2, "0")}`,
    kind: "openStudio",
  },
  createdBy: {
    _id: (index + 300).toString(16).padStart(24, "0"),
    firstname: "Page",
    lastname: `Customer ${index + 1}`,
    email: `page-customer-${index + 1}@example.test`,
  },
  location: { _id: VISUAL_IDS.location, name: "Studio Olivie" },
  status: "processed",
  paymentStatus: "CONFIRMED",
  numberOfGuests: 1,
  totalPrice: 450,
  currency: "CZK",
}));

test("shares the customer loader and pages bookings without downloading the customer directory or waiting for advanced filters", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-07-30T08:30:00Z"));
  const { unexpectedRequests } = await installAdminApiMocks(page);
  const bulkRequests = [];
  const bookingRequests = [];
  const customerReady = deferred();
  const firstPageReady = deferred();
  const secondPageReady = deferred();
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (
      request.method() === "GET" &&
      (path === "/users" ||
        path === "/products" ||
        path === "/bookings/filter-options" ||
        path.startsWith("/lecturers/"))
    )
      bulkRequests.push(path);
  });
  await page.route(
    /^http:\/\/api\.shario\.localhost:4311\/users\/directory(?:\?|$)/,
    async (route) => {
      if (route.request().method() !== "GET") return route.fallback();
      await customerReady.promise;
      await route.fulfill({
        status: 200,
        headers,
        contentType: "application/json",
        body: JSON.stringify({
          data: [bookings[0].createdBy],
          totalCount: 1,
          currentPage: 1,
          pageSize: 10,
          totalPages: 1,
        }),
      });
    },
  );
  await page.route(
    /^http:\/\/api\.shario\.localhost:4311\/bookings\/filter(?:\?|$)/,
    async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      const body = route.request().postDataJSON();
      bookingRequests.push(body);
      await (body.page === 2
        ? secondPageReady.promise
        : firstPageReady.promise);
      await route.fulfill({
        status: 200,
        headers,
        contentType: "application/json",
        body: JSON.stringify({
          bookings: bookings.slice(
            (body.page - 1) * body.limit,
            body.page * body.limit,
          ),
          totalCount: bookings.length,
          totalPages: Math.ceil(bookings.length / body.limit),
          currentPage: body.page,
          pageSize: body.limit,
          summary: {
            totalBookings: 23,
            todayBookings: 0,
            awaitingPaymentBookings: 0,
            cancelledBookings: 0,
          },
        }),
      });
    },
  );

  await page.goto(`${VISUAL_TENANT_ORIGIN}/en/app/users`);
  const loading = page.getByTestId("table-loading-state");
  await expect(loading).toBeVisible();
  await expect(loading).toHaveAttribute("data-mode", "initial");
  const customerLoaderClass = await loading.getAttribute("class");
  customerReady.resolve();
  await expect(
    page.getByText("Showing 1–1 of 1 customers", { exact: true }),
  ).toBeVisible();

  await page.goto(`${VISUAL_TENANT_ORIGIN}/en/app/bookings`);
  await expect(loading).toBeVisible();
  await expect(loading).toHaveAttribute("data-mode", "initial");
  expect(await loading.getAttribute("class")).toBe(customerLoaderClass);
  await expect(
    page.getByRole("searchbox", { name: "Search bookings" }),
  ).toBeVisible();
  await expect.poll(() => bookingRequests.length).toBe(1);
  expect(bookingRequests[0]).toMatchObject({
    page: 1,
    limit: 10,
    locationId: VISUAL_IDS.location,
  });
  expect(bulkRequests).toEqual([]);

  firstPageReady.resolve();
  await expect(
    page.getByText("Showing 1–10 of 23 bookings", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByText("Paginated session 01", { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(loading).toBeVisible();
  await expect(
    page
      .getByText("Paginated session 01", { exact: true })
      .filter({ visible: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("searchbox", { name: "Search bookings" }),
  ).toBeEnabled();
  secondPageReady.resolve();
  await expect(
    page.getByText("Showing 11–20 of 23 bookings", { exact: true }),
  ).toBeVisible();
  expect(bookingRequests.at(-1)).toMatchObject({ page: 2, limit: 10 });
  expect(bookingRequests.at(-1).endAfter).toBe(bookingRequests[0].endAfter);

  await page
    .getByRole("button", { name: "Previous page", exact: true })
    .click();
  await expect(
    page.getByText("Showing 1–10 of 23 bookings", { exact: true }),
  ).toBeVisible();
  expect(bookingRequests).toHaveLength(2);
  expect(bulkRequests).toEqual([]);

  const pendingDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const download = await pendingDownload;
  expect(await download.failure()).toBeNull();
  const csv = await readFile(await download.path(), "utf8");
  expect(csv.trim().split("\n")).toHaveLength(11);
  expect(csv).toContain("Page Customer 1");
  expect(csv).toContain("Paginated session 01");
  expect(csv).not.toContain("Paginated session 11");
  expect([...unexpectedRequests]).toEqual([]);
});

test("a late booking response cannot replace the newly applied filter", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-07-30T08:30:00Z"));
  const { unexpectedRequests } = await installAdminApiMocks(page);
  const slowReady = deferred();
  const requests = [];
  await page.route(
    /^http:\/\/api\.shario\.localhost:4311\/bookings\/filter(?:\?|$)/,
    async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      const body = route.request().postDataJSON();
      requests.push(body);
      if (body.search === "slow") await slowReady.promise;
      const booking = {
        ...bookings[0],
        bookingProduct: {
          ...bookings[0].bookingProduct,
          name:
            body.search === "fast"
              ? "Newest filtered session"
              : body.search === "slow"
                ? "Stale filtered session"
                : "Original session",
        },
      };
      await route.fulfill({
        status: 200,
        headers,
        contentType: "application/json",
        body: JSON.stringify({
          bookings: [booking],
          totalCount: 1,
          totalPages: 1,
          currentPage: 1,
          pageSize: 10,
          summary: {
            totalBookings: 1,
            todayBookings: 0,
            awaitingPaymentBookings: 0,
            cancelledBookings: 0,
          },
        }),
      });
    },
  );
  await page.goto(`${VISUAL_TENANT_ORIGIN}/en/app/bookings`);
  await expect(
    page
      .getByText("Original session", { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
  const search = page.getByRole("searchbox", { name: "Search bookings" });
  await search.fill("slow");
  await page
    .getByRole("button", { name: "Apply filters", exact: true })
    .click();
  await expect.poll(() => requests.at(-1)?.search).toBe("slow");
  await expect(page.getByTestId("table-loading-state")).toBeVisible();
  await search.fill("fast");
  await page
    .getByRole("button", { name: "Apply filters", exact: true })
    .click();
  await expect(
    page
      .getByText("Newest filtered session", { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
  const staleResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/bookings/filter") &&
      response.request().postDataJSON()?.search === "slow",
  );
  slowReady.resolve();
  await staleResponse;
  await expect(
    page
      .getByText("Newest filtered session", { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Stale filtered session", { exact: true }),
  ).toHaveCount(0);
  expect(requests).toHaveLength(3);
  expect([...unexpectedRequests]).toEqual([]);
});
