import { test, expect } from "../fixtures/test.js";
import { isApiResponse, PASSWORD } from "../helpers/auth.js";
import { E2E, tenantOrigin, tenantUrl } from "../helpers/urls.js";

test("pays for a booking, waits for cancellation confirmation and refunds once", async ({
  page,
  request,
  e2eState,
}) => {
  await exercisePaidBookingCancellation({ page, request, e2eState });
});

test("shows overnight opening hours, pays for 23:30–00:30 and refunds once", async ({
  page,
  request,
  e2eState,
}) => {
  await exercisePaidBookingCancellation(
    { page, request, e2eState },
    { overnight: true },
  );
});

async function verifyOvernightCalendar({ page, request, e2eState }) {
  // This API address and tenant are the disposable release-smoke fixtures.
  // The automatic fixture resets the database before each independent case.
  const ownerLogin = await request.post("http://127.0.0.1:4311/auth", {
    data: {
      email: e2eState.users.alphaOwner.email,
      password: PASSWORD,
      tenantSlug: E2E.alphaSlug,
    },
  });
  expect(ownerLogin.ok()).toBe(true);
  const { accessToken } = await ownerLogin.json();
  expect(accessToken).toBeTruthy();
  const openingHours = Object.fromEntries(
    [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ].map((day) => [
      day,
      { isOpen: true, openTime: "05:00", closeTime: "01:00" },
    ]),
  );
  const updated = await request.patch(
    `http://127.0.0.1:4311/locations/${e2eState.locations.alpha.id}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { openingHours },
    },
  );
  expect(updated.ok(), `Overnight fixture update: ${updated.status()}`).toBe(
    true,
  );

  await page.goto(
    tenantUrl(E2E.alphaSlug, `/book?location=${e2eState.locations.alpha.id}`),
  );
  // Public and customer-portal calendars share StudioCalendar/WeekCalendar,
  // the location adapter and slot surfaces; this one is read-only. Inspect
  // actual rendered intervals before selecting and paying through the public
  // slot picker below, with no mocked availability or booking responses.
  const calendar = page.locator('[data-calendar-shell="true"]');
  await expect(calendar).toBeVisible();
  await calendar
    .getByRole("button", { name: "Next period", exact: true })
    .click();
  const days = calendar.locator(
    '[data-calendar-desktop-grid="true"] [data-calendar-week-day-column="true"]',
  );
  await expect(days).toHaveCount(7);
  await expect(
    days.filter({ has: page.locator('[data-calendar-slot-bookable="true"]') }),
  ).toHaveCount(7);
  const day = days.first();
  await expect(day).toHaveAttribute("data-calendar-day-state", "future");
  const slot = (range) =>
    day.locator(`[data-calendar-slot-state][aria-label^="${range},"]`).first();
  for (const range of [
    "00:00 – 01:00",
    "05:00 – 06:00",
    "12:00 – 13:00",
    "23:30 – 00:30",
  ]) {
    await expect(slot(range)).toHaveAttribute(
      "data-calendar-slot-bookable",
      "true",
    );
    await expect(slot(range)).toHaveAttribute(
      "data-calendar-slot-state",
      "available",
    );
  }
  // 00:30–01:00 is open, but cannot fit the fixture's one-hour minimum.
  await expect(slot("00:30 – 01:30")).toHaveAttribute(
    "data-calendar-slot-surface-state",
    "available",
  );
  await expect(slot("00:30 – 01:30")).toHaveAttribute(
    "data-calendar-slot-bookable",
    "false",
  );
  for (const start of [60, 90, 120, 150, 180, 210, 240, 270]) {
    const time = (minute) =>
      `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
    const closed = slot(`${time(start)} – ${time(start + 60)}`);
    await expect(closed).toHaveAttribute(
      "data-calendar-slot-bookable",
      "false",
    );
    await expect(closed).toHaveAttribute(
      "data-calendar-slot-surface-state",
      "closed",
    );
  }
}

async function exercisePaidBookingCancellation(
  { page, request, e2eState },
  { overnight = false } = {},
) {
  const customer = e2eState.users.alphaBookingCustomer;
  const product = e2eState.products.alphaOpenStudio;
  expect(customer, "Use matching server release-smoke fixtures").toBeTruthy();
  expect(product).toBeTruthy();
  const cancellationSubject = `${e2eState.locations.alpha.name} | Booking cancelled`;
  const date = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  await page.context().addCookies([
    {
      name: "shario_language",
      value: "EN",
      url: tenantOrigin(E2E.alphaSlug),
    },
  ]);
  if (overnight) await verifyOvernightCalendar({ page, request, e2eState });
  await page.goto(tenantUrl(E2E.alphaSlug, `/book/${product.id}?date=${date}`));
  await expect(
    page.getByRole("heading", { level: 1, name: product.name }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Planned activity", exact: true })
    .selectOption("SHARED_TABLE");
  if (overnight) {
    const lateSlot = page.getByRole("radio", { name: /11:30\s*PM–12:30\s*AM/ });
    await expect(lateSlot).toBeEnabled();
    await lateSlot.check();
    await expect(lateSlot).toBeChecked();
  } else {
    await page.getByRole("radio").first().check();
  }
  await page
    .getByRole("button", { name: "Book with my account", exact: true })
    .click();
  await expect(page).toHaveURL(/\/en\/login\?next=/);
  await page.getByLabel(/^e-?mail\s*\*?$/i).fill(customer.email);
  await page.getByLabel(/^Password\s*\*?$/).fill(PASSWORD);
  const loginResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      /^\/auth(?:\/customer)?(?:\/login)?$/.test(
        new URL(response.url()).pathname,
      ),
  );
  const quoteResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      /^\/booking-intents\/[^/]+$/.test(new URL(response.url()).pathname),
  );
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const login = await loginResponse;
  expect(login.ok()).toBe(true);
  const { accessToken } = await login.json();
  expect(accessToken).toBeTruthy();
  const headers = { Authorization: `Bearer ${accessToken}` };
  const api = (path) => `http://127.0.0.1:4311${path}`;
  // Verify persisted state independently of UI rendering and Redux caching.
  const read = async (path) => {
    const response = await request.get(api(path), { headers });
    expect(response.ok(), `${path}: ${response.status()}`).toBe(true);
    return response.json();
  };
  const quote = await (await quoteResponse).json();
  const totalMinor = quote.quote.totalAmountMinor;
  expect(totalMinor).toBeGreaterThan(0);
  const initialBalance = await read("/credits/mine/balance");
  expect(initialBalance.balanceMinor).toBe(customer.moneyCreditsMinor);
  await expect(
    page.getByRole("heading", { level: 1, name: "Review and confirm" }),
  ).toBeVisible();
  await page.getByRole("radio", { name: /Use studio credit/ }).check();
  const terms = page.getByRole("checkbox", {
    name: "I have read and accept the booking terms.",
  });
  if (await terms.count()) await terms.check();
  const checkoutResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      /^\/booking-intents\/[^/]+\/checkout$/.test(
        new URL(response.url()).pathname,
      ),
  );
  await page
    .getByRole("button", { name: "Confirm booking", exact: true })
    .click();
  const checkout = await checkoutResponse;
  expect(checkout.ok()).toBe(true);
  const order = await checkout.json();
  expect(order.status).toBe("confirmed");
  expect(order.orderId).toBeTruthy();
  await expect(page).toHaveURL(
    new RegExp(`/portal/success\\?orderId=${order.orderId}`),
  );
  expect((await read("/credits/mine/balance")).balanceMinor).toBe(
    initialBalance.balanceMinor - totalMinor,
  );
  const bookings = (await read("/bookings/mine")).bookings;
  expect(bookings).toHaveLength(1);
  const booking = bookings[0];
  if (overnight) {
    // The local fixture uses UTC. This verifies a real next-day persisted end,
    // not just a time label or a midnight-truncated client selection.
    const expectedStart = new Date(`${date}T23:30:00.000Z`);
    const expectedEnd = new Date(expectedStart.getTime() + 60 * 60_000);
    expect(new Date(booking.start).toISOString()).toBe(
      expectedStart.toISOString(),
    );
    expect(new Date(booking.end).toISOString()).toBe(expectedEnd.toISOString());
    expect(
      new Date(booking.end).getTime() - new Date(booking.start).getTime(),
    ).toBe(60 * 60_000);
  }
  expect(booking.canCancel).toBe(true);
  const bookingId = booking.id || booking._id;
  const cancelPath = `/bookings/mine/${bookingId}/cancel`;
  // The hermetic API deliberately disables email workers. Read the committed
  // system outbox through the real staff history API, without claiming delivery.
  const ownerLogin = await request.post(api("/auth"), {
    data: {
      email: e2eState.users.alphaOwner.email,
      password: PASSWORD,
      tenantSlug: E2E.alphaSlug,
    },
  });
  expect(ownerLogin.ok()).toBe(true);
  const { accessToken: ownerAccessToken } = await ownerLogin.json();
  expect(ownerAccessToken).toBeTruthy();
  const cancellationEmails = async () => {
    const response = await request.get(api("/communication-email-logs"), {
      headers: { Authorization: `Bearer ${ownerAccessToken}` },
      params: {
        emailType: "bookingCancelled",
        relatedEntityId: bookingId,
        recipientEmail: customer.email,
      },
    });
    expect(response.ok(), `Email history: ${response.status()}`).toBe(true);
    const result = await response.json();
    expect(result.totalCount).toBe(result.logs.length);
    return result.logs;
  };
  expect(await cancellationEmails()).toHaveLength(0);
  await page.goto(tenantUrl(E2E.alphaSlug, "/portal"));
  const welcomeTour = page.locator("[data-customer-portal-tour-welcome]");
  const dismissTour = welcomeTour.getByRole("button", {
    name: "Not now",
    exact: true,
  });
  // This fresh customer/browser has not acknowledged the first-visit tour.
  // Its dialog mounts after session restoration, so wait for that welcome
  // before dismissing it instead of racing an immediate visibility check.
  await expect(dismissTour).toBeVisible();
  await dismissTour.click();
  await expect(welcomeTour).toHaveCount(0);
  await page.locator("[data-customer-portal-cancel-booking]").click();
  const confirmation = page.getByRole("dialog", {
    name: "Cancel this booking?",
    exact: true,
  });
  await expect(confirmation).toHaveAttribute("aria-modal", "true");
  await expect(confirmation.locator("[data-dialog-layout]")).toBeVisible();
  await expect(confirmation.locator("[data-confirmation-success]")).toHaveCount(
    0,
  );
  // Simulate a transient failure, then retry against the real isolated server.
  await page.route(
    `**${cancelPath}`,
    (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        headers: {
          "access-control-allow-origin": tenantOrigin(E2E.alphaSlug),
          "access-control-allow-credentials": "true",
        },
        body: JSON.stringify({
          message: "Temporary cancellation failure. Please retry.",
        }),
      }),
    { times: 1 },
  );
  await confirmation
    .getByRole("button", { name: "Yes, cancel", exact: true })
    .click();
  await expect(confirmation.getByRole("alert")).toContainText(
    "Temporary cancellation failure",
  );
  await expect(confirmation.locator("[data-confirmation-success]")).toHaveCount(
    0,
  );
  expect((await read("/credits/mine/balance")).balanceMinor).toBe(
    initialBalance.balanceMinor - totalMinor,
  );
  expect(await cancellationEmails()).toHaveLength(0);
  let releaseCancellation;
  const cancellationGate = new Promise((resolve) => {
    releaseCancellation = resolve;
  });
  let markRequestStarted;
  const requestStarted = new Promise((resolve) => {
    markRequestStarted = resolve;
  });
  await page.route(
    `**${cancelPath}`,
    async (route) => {
      markRequestStarted();
      await cancellationGate;
      await route.continue();
    },
    { times: 1 },
  );
  const cancelledResponse = page.waitForResponse((response) =>
    isApiResponse(response, cancelPath, "PATCH"),
  );
  await confirmation
    .getByRole("button", { name: "Yes, cancel", exact: true })
    .click();
  try {
    await requestStarted;
    await expect(
      confirmation
        .locator("[data-dialog-footer]")
        .getByRole("button", { name: "Keep booking", exact: true }),
    ).toBeDisabled();
    await expect(
      confirmation.locator("[data-confirmation-success]"),
    ).toHaveCount(0);
    await expect(
      page.getByRole("dialog", { name: "Booking was cancelled", exact: true }),
    ).toHaveCount(0);
    expect(await cancellationEmails()).toHaveLength(0);
  } finally {
    releaseCancellation();
  }
  expect((await cancelledResponse).ok()).toBe(true);
  const success = page.getByRole("dialog", {
    name: "Booking was cancelled",
    exact: true,
  });
  await expect(success).toHaveAttribute("aria-modal", "true");
  await expect(success.locator("[data-dialog-layout]")).toBeVisible();
  await expect(success.locator("[data-confirmation-success]")).toBeVisible();
  expect((await read("/credits/mine/balance")).balanceMinor).toBe(
    initialBalance.balanceMinor,
  );
  await expect.poll(async () => (await cancellationEmails()).length).toBe(1);
  const [email] = await cancellationEmails();
  expect(email).toMatchObject({
    automation: null,
    emailType: "bookingCancelled",
    recipientEmail: customer.email,
    subject: cancellationSubject,
    status: "scheduled",
    purpose: "transactional",
    allowanceClass: "essential_system",
    relatedEntityId: bookingId,
    relatedEntityType: "booking",
    location: e2eState.locations.alpha.id,
    attempts: 0,
    providerMessageId: "",
    providerAttemptStartedAt: null,
  });
  expect(email.body).toContain("Your booking has been cancelled successfully.");
  expect(email.body).toContain(`Booking: ${product.name}`);
  expect(email.body).toContain(`Studio: ${e2eState.locations.alpha.name}`);
  const bookingDate = new Intl.DateTimeFormat("en-GB", {
    timeZone: booking.location.timezone,
    dateStyle: "medium",
  }).format(new Date(booking.start));
  const bookingTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: booking.location.timezone,
    timeStyle: "short",
  });
  expect(email.body).toContain(
    `Time: ${bookingDate}, ${bookingTime.format(new Date(booking.start))}–${bookingTime.format(new Date(booking.end))}`,
  );
  const returnedCredit = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: customer.currency,
  }).format(totalMinor / 100);
  expect(email.body).toContain(
    `${returnedCredit} was returned as studio credit.`,
  );
  expect(email.body).toContain(
    `Manage bookings: ${tenantUrl(E2E.alphaSlug, "/portal?tab=my-bookings")}`,
  );
  const repeated = await request.patch(api(cancelPath), { headers });
  expect(repeated.ok()).toBe(true);
  expect((await read("/credits/mine/balance")).balanceMinor).toBe(
    initialBalance.balanceMinor,
  );
  const retriedEmails = await cancellationEmails();
  expect(retriedEmails.map(({ _id }) => _id)).toEqual([email._id]);
  expect(retriedEmails[0]).toMatchObject({
    status: "scheduled",
    attempts: 0,
    deduplicationKey: email.deduplicationKey,
  });
  const reloadedBookings = page.waitForResponse((response) =>
    isApiResponse(response, "/bookings/mine", "GET"),
  );
  await page.reload();
  expect((await reloadedBookings).ok()).toBe(true);
  await expect(
    page.locator('[data-customer-portal-upcoming][data-empty-state="true"]'),
  ).toBeVisible();
  await expect(
    page.locator("[data-customer-portal-cancel-booking]"),
  ).toHaveCount(0);
}
