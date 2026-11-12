import { test, expect } from "../fixtures/test.js";
import { isApiResponse } from "../helpers/auth.js";
import { E2E, tenantUrl } from "../helpers/urls.js";
import { createPaidBooking, scenario } from "../helpers/booking-edit.js";

const evidenceDir =
  process.env.BOOKING_EXTENSION_EVIDENCE_DIR ||
  "test-results/booking-extension-evidence";
const api = (path) => `http://127.0.0.1:4311${path}`;

async function openActions(page) {
  await page.goto(tenantUrl(E2E.alphaSlug, "/portal/bookings"));
  await page
    .getByRole("button", { name: /^(Edit|Upravit)$/ })
    .first()
    .click();
  return page.getByRole("dialog", { name: "Edit booking", exact: true });
}

async function extendWithCredits(page, drawer, bookingId) {
  await drawer
    .getByRole("radio", { name: "Studio credits", exact: true })
    .check();
  const responsePromise = page.waitForResponse((response) =>
    isApiResponse(response, `/bookings/mine/${bookingId}/extension`, "POST"),
  );
  await drawer.getByRole("button", { name: /Extend booking ·/ }).click();
  const response = await responsePromise;
  expect(response.ok(), await response.text()).toBe(true);
  const result = await response.json();
  expect(result.status).toBe("confirmed");
  const confirmation = page.getByRole("dialog", {
    name: "Booking extended",
    exact: true,
  });
  await expect(confirmation.locator("[data-dialog-layout]")).toBeVisible();
  await confirmation
    .getByRole("button", { name: "Close", exact: true })
    .click();
  return result;
}

test("extends only into available time, moves the same booking, and refunds original plus extension once", async ({
  page,
  request,
  e2eState,
}) => {
  const { read, headers, booking, initialBalance, originalAmount } =
    await createPaidBooking({ page, request, e2eState });
  const bookingId = booking.id || booking._id;
  await scenario(request, bookingId, "private-neighbor");
  const quote = await read(`/bookings/mine/${bookingId}/extension/options`);
  expect(quote.options.find((option) => option.minutes === 30).available).toBe(
    true,
  );
  expect(
    quote.options
      .filter((option) => option.minutes > 30)
      .every((option) => !option.available),
  ).toBe(true);
  const extraAmount = quote.options.find(
    (option) => option.minutes === 30,
  ).amountMinor;
  expect(extraAmount).toBeGreaterThan(0);
  const drawer = await openActions(page);
  await expect(
    drawer.getByRole("radio", { name: "Extend", exact: true }),
  ).toBeChecked();
  await expect(drawer.getByRole("radio", { name: /\+30 min/ })).toBeEnabled();
  for (const minutes of [60, 90, 120])
    await expect(
      drawer.getByRole("radio", { name: new RegExp(`\\+${minutes} min`) }),
    ).toBeDisabled();
  await page.screenshot({
    path: `${evidenceDir}/booking-actions-desktop.png`,
    fullPage: false,
  });
  await extendWithCredits(page, drawer, bookingId);
  const afterExtension = (await read("/bookings/mine")).bookings;
  expect(afterExtension).toHaveLength(1);
  expect(afterExtension[0].id || afterExtension[0]._id).toBe(bookingId);
  expect(afterExtension[0].start).toBe(booking.start);
  expect(new Date(afterExtension[0].end).getTime()).toBe(
    new Date(booking.end).getTime() + 30 * 60_000,
  );
  expect((await read("/credits/mine/balance")).balanceMinor).toBe(
    initialBalance - originalAmount - extraAmount,
  );

  const moveDrawer = await openActions(page);
  await moveDrawer
    .getByRole("radio", { name: "Move", exact: true })
    .locator("..")
    .click();
  const newDate = new Date(Date.now() + 8 * 86400000)
    .toISOString()
    .slice(0, 10);
  const availabilityPromise = page.waitForResponse(
    (response) =>
      isApiResponse(
        response,
        `/bookings/mine/${bookingId}/reschedule/availability`,
      ) && new URL(response.url()).searchParams.get("date") === newDate,
  );
  await moveDrawer.getByLabel("New date", { exact: true }).fill(newDate);
  expect((await availabilityPromise).ok()).toBe(true);
  await moveDrawer
    .getByRole("group", { name: "Available start times" })
    .getByRole("radio", { disabled: false })
    .first()
    .check();
  const movedPromise = page.waitForResponse((response) =>
    isApiResponse(response, `/bookings/mine/${bookingId}/reschedule`, "PATCH"),
  );
  await moveDrawer
    .getByRole("button", { name: "Confirm new time", exact: true })
    .click();
  expect((await movedPromise).ok()).toBe(true);
  const moved = (await read(`/bookings/mine/${bookingId}`)).booking;
  expect(moved.id || moved._id).toBe(bookingId);
  expect(new Date(moved.end) - new Date(moved.start)).toBe(
    new Date(booking.end) - new Date(booking.start) + 30 * 60_000,
  );
  await page
    .getByRole("dialog", { name: "Booking moved", exact: true })
    .getByRole("button", { name: "Close", exact: true })
    .click();

  const cancelDrawer = await openActions(page);
  await cancelDrawer
    .getByRole("radio", { name: "Cancel", exact: true })
    .locator("..")
    .click();
  await expect(
    cancelDrawer.getByLabel("New date", { exact: true }),
  ).toHaveCount(0);
  await cancelDrawer
    .getByRole("button", { name: "Cancel booking", exact: true })
    .click();
  const cancelledPromise = page.waitForResponse((response) =>
    isApiResponse(response, `/bookings/mine/${bookingId}/cancel`, "PATCH"),
  );
  await page
    .getByRole("dialog", { name: "Cancel this booking?", exact: true })
    .getByRole("button", { name: "Yes, cancel", exact: true })
    .click();
  expect((await cancelledPromise).ok()).toBe(true);
  await expect(
    page
      .getByRole("dialog", { name: "Booking was cancelled", exact: true })
      .locator("[data-dialog-layout]"),
  ).toBeVisible();
  expect((await read("/credits/mine/balance")).balanceMinor).toBe(
    initialBalance,
  );
  const duplicateCancel = await request.patch(
    api(`/bookings/mine/${bookingId}/cancel`),
    { headers },
  );
  expect(duplicateCancel.ok()).toBe(true);
  expect((await read("/credits/mine/balance")).balanceMinor).toBe(
    initialBalance,
  );
});

test("extends an active booking after its door code was issued without enabling move or cancel", async ({
  page,
  request,
  e2eState,
}) => {
  const { read, booking, initialBalance, originalAmount } =
    await createPaidBooking({ page, request, e2eState });
  const bookingId = booking.id || booking._id;
  await scenario(request, bookingId, "active");
  const active = (await read(`/bookings/mine/${bookingId}`)).booking;
  expect(active.canExtend).toBe(true);
  expect(active.canCancel).toBe(false);
  expect(active.canReschedule).toBe(false);
  expect(new Date(active.start).getTime()).toBeLessThan(Date.now());
  const quote = await read(`/bookings/mine/${bookingId}/extension/options`);
  const extraAmount = quote.options.find(
    (option) => option.minutes === 30,
  ).amountMinor;
  const drawer = await openActions(page);
  await expect(
    drawer.getByRole("radio", { name: "Extend", exact: true }),
  ).toBeEnabled();
  await expect(
    drawer.getByRole("radio", { name: "Move", exact: true }),
  ).toBeDisabled();
  await expect(
    drawer.getByRole("radio", { name: "Cancel", exact: true }),
  ).toBeDisabled();
  await page.screenshot({
    path: `${evidenceDir}/booking-actions-active-desktop.png`,
    fullPage: false,
  });
  const originalViewport = page.viewportSize();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(
    tenantUrl(E2E.alphaSlug, "/portal/bookings").replace("/en/", "/cs/"),
  );
  await page
    .getByRole("button", { name: /^(Edit|Upravit)$/ })
    .first()
    .click();
  const czechDrawer = page.getByRole("dialog", {
    name: "Upravit rezervaci",
    exact: true,
  });
  await expect(
    czechDrawer.getByRole("radio", { name: "Prodloužit", exact: true }),
  ).toBeChecked();
  await expect(
    czechDrawer.getByRole("radio", { name: /\+30 min/ }),
  ).toBeEnabled();
  expect(
    await czechDrawer.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `${evidenceDir}/booking-actions-active-czech-mobile.png`,
    fullPage: false,
  });
  await page.setViewportSize(originalViewport);
  const finalDrawer = await openActions(page);
  await extendWithCredits(page, finalDrawer, bookingId);
  const updated = (await read(`/bookings/mine/${bookingId}`)).booking;
  expect(updated.start).toBe(active.start);
  expect(new Date(updated.end).getTime()).toBe(
    new Date(active.end).getTime() + 30 * 60_000,
  );
  expect(updated.canCancel).toBe(false);
  expect((await read("/credits/mine/balance")).balanceMinor).toBe(
    initialBalance - originalAmount - extraAmount,
  );
});
