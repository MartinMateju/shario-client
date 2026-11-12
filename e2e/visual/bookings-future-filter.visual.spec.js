import { expect, test } from "@playwright/test";

import {
  VISUAL_IDS,
  VISUAL_TENANT_ORIGIN,
  installAdminApiMocks,
} from "./admin-fixtures.js";

const cutoff = new Date("2026-07-30T09:05:00+02:00").toISOString();
const makeBooking = (
  name,
  startHours,
  endHours,
  index,
  locationId = VISUAL_IDS.location,
) => ({
  _id: `visual-filter-booking-${index}`,
  start: new Date(Date.parse(cutoff) + startHours * 3_600_000).toISOString(),
  end: new Date(Date.parse(cutoff) + endHours * 3_600_000).toISOString(),
  bookingProduct: { _id: `visual-product-${index}`, name, kind: "openStudio" },
  createdBy: {
    _id: `visual-customer-${index}`,
    firstname: "Test",
    lastname: "Maker",
  },
  location: { _id: locationId, name: "Studio Olivie" },
  status: "confirmed",
  paymentStatus: "CONFIRMED",
  numberOfGuests: 1,
  totalPrice: 450,
  currency: "CZK",
});
const bookings = [
  makeBooking("Historická rezervace", -48, -47, 1),
  makeBooking("Dnešní dokončená rezervace", -2, -1, 2),
  makeBooking("Právě končící rezervace", -1, 0, 3),
  makeBooking("Probíhající rezervace 9–12", -5 / 60, 175 / 60, 4),
  makeBooking("Dnešní rezervace 15–17", 355 / 60, 475 / 60, 5),
  makeBooking("Právě začínající rezervace", 0, 1, 6),
  makeBooking("Rezervace končící za milisekundu", -1, 1 / 3_600_000, 7),
  makeBooking("Dokončená rezervace ze včerejška", -24, -23, 8),
  makeBooking(
    "Rezervace v jiném studiu",
    -5 / 60,
    175 / 60,
    9,
    "64b000000000000000000099",
  ),
  ...Array.from({ length: 12 }, (_, index) =>
    makeBooking(
      `Budoucí rezervace ${String(index + 1).padStart(2, "0")}`,
      (index + 1) * 24,
      (index + 1) * 24 + 1,
      index + 10,
    ),
  ),
];

test("ongoing bookings stay visible through Today, history toggles and pagination", async ({
  page,
  context,
}, testInfo) => {
  const requests = [];
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.clock.setFixedTime(new Date(cutoff));
  const { unexpectedRequests } = await installAdminApiMocks(page, {
    workspaceLocale: "cs",
  });
  await context.addCookies([
    {
      name: "shario_language",
      value: "CS",
      url: VISUAL_TENANT_ORIGIN,
      sameSite: "Lax",
    },
  ]);
  const headers = {
    "access-control-allow-origin": VISUAL_TENANT_ORIGIN,
    "access-control-allow-credentials": "true",
    "cache-control": "no-store",
  };
  await page.route(
    /^http:\/\/api\.shario\.localhost:4311\/lecturers\/[^/?]+(?:\?|$)/,
    async (route) => {
      if (route.request().method() !== "GET") return route.fallback();
      await route.fulfill({
        status: 200,
        headers,
        contentType: "application/json",
        body: "[]",
      });
    },
  );
  await page.route(
    /^http:\/\/api\.shario\.localhost:4311\/bookings\/filter(?:\?|$)/,
    async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      const body = route.request().postDataJSON();
      requests.push(body);
      // Match the API: intersect dates, end > now and studio before counting
      // and paginating, so an already-started booking can remain visible.
      const from = body.dateFrom ? Date.parse(body.dateFrom) : -Infinity;
      const to = body.dateTo
        ? new Date(body.dateTo).setHours(23, 59, 59, 999)
        : Infinity;
      const filtered = bookings
        .filter(
          (booking) =>
            Date.parse(booking.start) >= from &&
            Date.parse(booking.start) <= to &&
            (!body.endAfter ||
              Date.parse(booking.end) > Date.parse(body.endAfter)) &&
            (!body.locationId || booking.location._id === body.locationId),
        )
        .sort(
          (first, second) =>
            (Date.parse(first.start) - Date.parse(second.start)) *
            (body.sortOrder === "asc" ? 1 : -1),
        );
      const currentPage = Number(body.page);
      const pageSize = Number(body.limit);
      await route.fulfill({
        status: 200,
        headers,
        contentType: "application/json",
        body: JSON.stringify({
          bookings: filtered.slice(
            (currentPage - 1) * pageSize,
            currentPage * pageSize,
          ),
          totalCount: filtered.length,
          totalPages: Math.ceil(filtered.length / pageSize),
          currentPage,
          pageSize,
          summary: {
            totalBookings: filtered.length,
            todayBookings: filtered.filter((booking) =>
              booking.start.startsWith("2026-07-30"),
            ).length,
            awaitingPaymentBookings: 0,
          },
        }),
      });
    },
  );

  await page.goto(`${VISUAL_TENANT_ORIGIN}/cs/app/bookings`, {
    waitUntil: "domcontentloaded",
  });
  const checkbox = page.getByRole("checkbox", {
    name: "Zobrazit pouze probíhající a budoucí rezervace",
    exact: true,
  });
  await expect(checkbox).toBeChecked();
  const table = checkbox.locator("xpath=ancestor::section[1]");
  const mobile = (page.viewportSize()?.width ?? 1280) < 640;
  const rows = mobile ? table.getByRole("article") : table.locator("tbody tr");
  const footer = table.locator("footer");
  const next = footer.getByRole("button", {
    name: "Další stránka",
    exact: true,
  });
  await expect(rows).toHaveCount(10);
  await expect(footer).toContainText("Zobrazeno 1–10 z 16 rezervací");
  expect(requests.at(-1)).toMatchObject({
    endAfter: cutoff,
    page: 1,
    limit: 10,
    locationId: VISUAL_IDS.location,
  });
  expect(requests.at(-1)).not.toHaveProperty("futureOnly");
  expect(requests.at(-1)).not.toHaveProperty("dateFrom");
  await expect(
    table.getByText("Historická rezervace", { exact: true }),
  ).toHaveCount(0);
  await expect(
    table.getByText("Dnešní dokončená rezervace", { exact: true }),
  ).toHaveCount(0);

  await next.click();
  await expect(rows).toHaveCount(6);
  await expect(footer).toContainText("Zobrazeno 11–16 z 16 rezervací");
  await expect(
    rows.filter({ hasText: "Probíhající rezervace 9–12" }),
  ).toHaveCount(1);
  await expect(
    rows.filter({ hasText: "Právě začínající rezervace" }),
  ).toHaveCount(1);
  await expect(
    rows.filter({ hasText: "Rezervace končící za milisekundu" }),
  ).toHaveCount(1);
  await expect(rows.filter({ hasText: "Právě končící rezervace" })).toHaveCount(
    0,
  );
  await expect(
    rows.filter({ hasText: "Rezervace v jiném studiu" }),
  ).toHaveCount(0);
  expect(requests.at(-1)).toMatchObject({ endAfter: cutoff, page: 2 });

  await table.getByRole("button", { name: /^Dnes\s*\d*$/ }).click();
  await expect(rows).toHaveCount(4);
  await expect(footer).toContainText("Zobrazeno 1–4 z 4 rezervací");
  await expect(
    rows.filter({ hasText: "Probíhající rezervace 9–12" }),
  ).toHaveCount(1);
  await expect(rows.filter({ hasText: "Dnešní rezervace 15–17" })).toHaveCount(
    1,
  );
  expect(requests.at(-1)).toMatchObject({
    dateFrom: "2026-07-30",
    dateTo: "2026-07-30",
    endAfter: cutoff,
    page: 1,
  });

  await checkbox.uncheck();
  await expect(rows).toHaveCount(6);
  await expect(footer).toContainText("Zobrazeno 1–6 z 6 rezervací");
  await expect(
    rows.filter({ hasText: "Dnešní dokončená rezervace" }),
  ).toHaveCount(1);
  await expect(rows.filter({ hasText: "Právě končící rezervace" })).toHaveCount(
    1,
  );
  expect(requests.at(-1)).not.toHaveProperty("endAfter");

  await table.getByRole("button", { name: /^Vše\s*\d*$/ }).click();
  await expect(footer).toContainText("Zobrazeno 1–10 z 20 rezervací");
  expect(requests.at(-1)).toMatchObject({ page: 1 });
  expect(requests.at(-1)).not.toHaveProperty("dateFrom");
  expect(requests.at(-1)).not.toHaveProperty("dateTo");
  await next.click();
  await expect(rows).toHaveCount(10);
  await expect(footer).toContainText("Zobrazeno 11–20 z 20 rezervací");
  await expect(rows.filter({ hasText: "Historická rezervace" })).toHaveCount(1);
  await expect(
    rows.filter({ hasText: "Dnešní dokončená rezervace" }),
  ).toHaveCount(1);
  await expect(
    rows.filter({ hasText: "Rezervace v jiném studiu" }),
  ).toHaveCount(0);

  await checkbox.check();
  await expect(footer).toContainText("Zobrazeno 1–10 z 16 rezervací");
  await expect(rows).toHaveCount(10);
  await expect(
    table.getByText("Historická rezervace", { exact: true }),
  ).toHaveCount(0);
  await expect(
    table.getByText("Dnešní dokončená rezervace", { exact: true }),
  ).toHaveCount(0);
  expect(requests.at(-1)).toMatchObject({ endAfter: cutoff, page: 1 });
  expect([...unexpectedRequests]).toEqual([]);
  expect(pageErrors).toEqual([]);

  await checkbox.scrollIntoViewIfNeeded();
  await page.evaluate(() => document.fonts.ready.then(() => true));
  const screenshotPath = testInfo.outputPath("bookings-future-filter-cs.png");
  await page.screenshot({
    path: screenshotPath,
    animations: "disabled",
    caret: "hide",
  });
  await testInfo.attach("bookings-future-filter-cs", {
    path: screenshotPath,
    contentType: "image/png",
  });
});
