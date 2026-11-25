import { expect, test } from "@playwright/test";
import {
  installAdminApiMocks,
  VISUAL_IDS,
  VISUAL_TENANT_ORIGIN,
} from "./admin-fixtures.js";

const statuses = [
  "pending",
  "processed",
  "delivered",
  "completed",
  "cancelled",
];
const payments = ["PENDING_PAYMENT", "CONFIRMED", "FAILED", "EXPIRED"];
const products = Array.from({ length: 130 }, (_, index) => ({
  _id: (index + 1000).toString(16).padStart(24, "0"),
  name: `Historická aktivita ${index + 1}`,
  kind: "openStudio",
}));
const records = statuses.flatMap((status, statusIndex) =>
  payments.map((paymentStatus, paymentIndex) => ({
    _id: (statusIndex * 4 + paymentIndex + 1).toString(16).padStart(24, "0"),
    start: "2026-08-01T10:00:00Z",
    end: "2026-08-01T12:00:00Z",
    status,
    paymentStatus,
    bookingProduct: {
      ...products[status === "cancelled" ? 129 : 0],
      name: `Rezervace ${status} ${paymentStatus}`,
    },
    createdBy: {
      _id: "64a000000000000000000099",
      firstname: "Test",
      lastname: "Zákazník",
    },
    location: { _id: VISUAL_IDS.location, name: "Studio Olivie" },
    lecturer: paymentIndex % 2 ? "Jan Novak Jr" : "Jan Novak",
    numberOfGuests: 1,
    totalPrice: 450,
    currency: "CZK",
  })),
);

test("Czech booking filters use persisted statuses, complete activity options and exact lecturer names", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-07-30T08:30:00Z"));
  const { unexpectedRequests } = await installAdminApiMocks(page, {
    workspaceLocale: "cs",
  });
  const requests = [];
  const optionRequests = [];
  const headers = {
    "access-control-allow-origin": VISUAL_TENANT_ORIGIN,
    "access-control-allow-credentials": "true",
    "cache-control": "no-store",
  };
  await page.route(
    /^http:\/\/api\.shario\.localhost:4311\/bookings\/filter-options(?:\?|$)/,
    async (route) => {
      if (route.request().method() !== "GET") return route.fallback();
      optionRequests.push(
        Object.fromEntries(new URL(route.request().url()).searchParams),
      );
      // Historical booked activities remain selectable beyond the first100.
      await route.fulfill({
        status: 200,
        headers,
        contentType: "application/json",
        body: JSON.stringify({
          products,
          lecturers: [
            { value: "Jan Novak", label: "Jan Novak" },
            { value: "Jan Novak Jr", label: "Jan Novak Jr" },
          ],
        }),
      });
    },
  );
  await page.route(
    /^http:\/\/api\.shario\.localhost:4311\/bookings\/filter(?:\?|$)/,
    async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      const body = route.request().postDataJSON();
      requests.push(body);
      const matching = records.filter(
        (row) =>
          (!body.status || row.status === body.status) &&
          (!body.paymentStatus || row.paymentStatus === body.paymentStatus) &&
          (!body.productId || row.bookingProduct._id === body.productId) &&
          (!body.lecturerName || row.lecturer === body.lecturerName),
      );
      await route.fulfill({
        status: 200,
        headers,
        contentType: "application/json",
        body: JSON.stringify({
          bookings: matching.slice(
            (body.page - 1) * body.limit,
            body.page * body.limit,
          ),
          totalCount: matching.length,
          totalPages: Math.ceil(matching.length / body.limit),
          currentPage: body.page,
          pageSize: body.limit,
          summary: {
            totalBookings: matching.length,
            todayBookings: 0,
            awaitingPaymentBookings: matching.filter(
              (row) => row.paymentStatus === "PENDING_PAYMENT",
            ).length,
            cancelledBookings: matching.filter(
              (row) => row.status === "cancelled",
            ).length,
          },
        }),
      });
    },
  );
  await page.goto(`${VISUAL_TENANT_ORIGIN}/cs/app/bookings`);
  await expect(
    page.getByText("Zobrazeno 1–10 z 20 rezervací", { exact: true }),
  ).toBeVisible();
  expect(optionRequests).toEqual([]);
  await page.getByRole("button", { name: "Filtry", exact: true }).click();
  const advanced = page.getByRole("region", { name: "Filtry", exact: true });
  const bookingStatus = advanced.getByRole("combobox", {
    name: "Stav rezervace",
    exact: true,
  });
  const paymentStatus = advanced.getByRole("combobox", {
    name: "Stav platby",
    exact: true,
  });
  const activity = advanced.getByRole("combobox", {
    name: "Aktivita",
    exact: true,
  });
  const lecturer = advanced.getByRole("combobox", {
    name: "Lektor",
    exact: true,
  });
  const apply = advanced.getByRole("button", {
    name: "Použít filtry",
    exact: true,
  });
  await expect(activity.locator("option")).toHaveCount(131);
  expect(
    await bookingStatus
      .locator("option")
      .evaluateAll((options) => options.map((option) => option.value)),
  ).toEqual(["", ...statuses]);
  expect(
    await paymentStatus
      .locator("option")
      .evaluateAll((options) => options.map((option) => option.value)),
  ).toEqual(["", ...payments]);
  expect(optionRequests).toEqual([{ locationId: VISUAL_IDS.location }]);

  const applyAndWait = async (expected) => {
    const response = page.waitForResponse((response) => {
      if (
        !response.url().endsWith("/bookings/filter") ||
        response.request().method() !== "POST"
      )
        return false;
      const body = response.request().postDataJSON();
      return Object.entries(expected).every(
        ([key, value]) => body[key] === value,
      );
    });
    await apply.click();
    await response;
  };
  for (const status of statuses) {
    await bookingStatus.selectOption(status);
    await applyAndWait({ status });
    await expect(
      page.getByText("Zobrazeno 1–4 z 4 rezervací", { exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByText(`Rezervace ${status} CONFIRMED`, { exact: true })
        .filter({ visible: true }),
    ).toBeVisible();
  }
  await bookingStatus.selectOption("processed");
  for (const payment of payments) {
    await paymentStatus.selectOption(payment);
    await applyAndWait({ status: "processed", paymentStatus: payment });
    await expect(
      page.getByText("Zobrazeno 1–1 z 1 rezervací", { exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByText(`Rezervace processed ${payment}`, { exact: true })
        .filter({ visible: true }),
    ).toBeVisible();
  }

  // An explicit status must not be silently overridden by a quick-view tab.
  await page.getByRole("button", { name: /^Zrušené\s*\d*$/ }).click();
  await expect(
    page
      .getByText("Rezervace cancelled EXPIRED", { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
  await bookingStatus.selectOption("completed");
  await applyAndWait({ status: "completed", paymentStatus: "EXPIRED" });
  await expect(
    page.getByRole("button", { name: /^Vše\s*\d*$/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page
      .getByText("Rezervace completed EXPIRED", { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();

  await advanced
    .getByRole("button", { name: "Vymazat filtry", exact: true })
    .click();
  await expect(
    page.getByText("Zobrazeno 1–10 z 20 rezervací", { exact: true }),
  ).toBeVisible();
  await activity.selectOption(products[129]._id);
  await lecturer.selectOption("Jan Novak");
  await applyAndWait({
    productId: products[129]._id,
    lecturerName: "Jan Novak",
  });
  await expect(
    page.getByText("Zobrazeno 1–2 z 2 rezervací", { exact: true }),
  ).toBeVisible();
  expect(requests.at(-1)).not.toHaveProperty("lecturerId");
  expect([...unexpectedRequests]).toEqual([]);
});
