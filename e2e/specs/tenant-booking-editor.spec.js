import { test, expect } from "../fixtures/test.js";
import {
  loginWorkspaceAs,
  USERS,
  isApiResponse,
} from "../helpers/auth-surfaces.js";
import { E2E, tenantUrl } from "../helpers/urls.js";
import { createPaidBooking, scenario } from "../helpers/booking-edit.js";

// This journey also runs against the development server, where cold route
// compilation can take longer than the default per-test timeout.
test.setTimeout(300_000);

const studioWallTime = (value, timeZone) =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(new Date(value))
    .replace(" ", "T");

test("staff edit a course on a dedicated page and manage attendance without a payment", async ({
  page,
  request,
  e2eState,
}) => {
  const login = await loginWorkspaceAs(page, {
    slug: E2E.alphaSlug,
    email: USERS.owner,
  });
  const { accessToken } = await login.json();
  const bookingId = e2eState.courseSessions.alpha.id;
  const editorUrl = `http://127.0.0.1:4311/bookings/${bookingId}/editor`;
  const headers = { Authorization: `Bearer ${accessToken}` };
  const read = async () => {
    const response = await request.get(editorUrl, { headers });
    expect(response.ok(), await response.text()).toBe(true);
    return response.json();
  };
  const before = await read();
  await page.goto(tenantUrl(E2E.alphaSlug, `/app/bookings/${bookingId}/edit`));
  await expect(
    page.getByRole("heading", { level: 1, name: "Edit booking" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByLabel("People attending", { exact: true }),
  ).toHaveValue("0");
  await expect(
    page.getByLabel("People attending", { exact: true }),
  ).toHaveAttribute("readonly", "");

  await page.getByRole("button", { name: "Guest", exact: true }).click();
  await page.getByRole("button", { name: "Add guest", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "Enter the guest’s name.",
  );
  await page.getByLabel("Guest name").fill("Local test guest");
  await page.getByLabel("Email (optional)").fill("invalid-email");
  await page.getByRole("button", { name: "Add guest", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "Enter a valid email address.",
  );
  await page.getByLabel("Email (optional)").fill("");
  await page.getByRole("button", { name: "Add guest", exact: true }).click();
  await expect(page.getByLabel("Guest name")).toHaveValue("");

  await page
    .getByRole("button", { name: "Registered customer", exact: true })
    .click();
  await page.getByLabel("Customer ID", { exact: true }).fill("ALPHA-CUSTOMER");
  await page
    .getByRole("button", { name: "Find customer", exact: true })
    .click();
  await page.getByRole("button", { name: "Add customer", exact: true }).click();
  await expect(
    page.getByLabel("People attending", { exact: true }),
  ).toHaveValue("2");
  const shift = (value) => new Date(new Date(value).getTime() + 30 * 60_000);
  await page
    .getByLabel("Start", { exact: true })
    .fill(
      studioWallTime(shift(before.booking.start), before.location.timeZone),
    );
  await page
    .getByLabel("End", { exact: true })
    .fill(studioWallTime(shift(before.booking.end), before.location.timeZone));
  await page
    .getByLabel("Staff note")
    .fill("Attendance edited in the local browser test");
  const save = page.waitForResponse((response) =>
    isApiResponse(response, `/bookings/${bookingId}/editor`, "PUT"),
  );
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  expect((await save).ok()).toBe(true);
  await expect(page.locator("form").getByRole("status")).toContainText(
    "Booking saved.",
  );

  const after = await read();
  expect(after.booking.numberOfGuests).toBe(2);
  expect(after.booking.paymentStatus).toBe(before.booking.paymentStatus);
  expect(after.booking.start).toBe(shift(before.booking.start).toISOString());
  expect(after.booking.end).toBe(shift(before.booking.end).toISOString());
  expect(after.participants).toHaveLength(2);
  expect(
    after.participants.find((entry) => entry.name === "Local test guest"),
  ).toBeTruthy();
  expect(
    after.participants.find(
      (entry) => entry.customerId === e2eState.users.alphaCustomer.id,
    ),
  ).toBeTruthy();
  await page.reload();
  await expect(
    page.getByLabel("People attending", { exact: true }),
  ).toHaveValue("2");
  await expect(page.getByLabel("Staff note")).toHaveValue(
    "Attendance edited in the local browser test",
  );
  await page.screenshot({
    path: "test-results/booking-editor-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "Save changes", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: "test-results/booking-editor-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Remove Local test guest", exact: true })
    .click();
  await expect(
    page.getByLabel("People attending", { exact: true }),
  ).toHaveValue("1");
  await page.getByLabel("Staff note").fill("");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.locator("form").getByRole("status")).toContainText(
    "Booking saved.",
  );
  const removed = await read();
  expect(removed.participants).toHaveLength(1);
  expect(removed.booking.numberOfGuests).toBe(1);
  expect(removed.booking.note).toBe("");
  expect(removed.booking.paymentStatus).toBe(before.booking.paymentStatus);
});

for (const accessScenario of ["issued-access", "legacy-access"]) {
  test(`staff move a paid ${accessScenario} booking without unlocking customer changes or charging again`, async ({
    page,
    request,
    e2eState,
  }) => {
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    const {
      booking,
      read: readCustomer,
      initialBalance,
      originalAmount,
    } = await createPaidBooking({ page, request, e2eState });
    const bookingId = booking.id || booking._id;
    const orderId = new URL(page.url()).searchParams.get("orderId");
    expect(orderId).toBeTruthy();
    const orderBefore = await readCustomer(
      `/orders/mine/${orderId}/confirmation`,
    );
    expect(orderBefore.isPaid).toBe(true);
    expect(orderBefore.totals.grossAmountMinor).toBe(originalAmount);
    expect(orderBefore.paymentAllocations).toContainEqual({
      method: "credits",
      amountMinor: originalAmount,
    });
    await scenario(request, bookingId, accessScenario);
    const customerBefore = (await readCustomer(`/bookings/mine/${bookingId}`))
      .booking;
    // Legacy suppression alone does not establish that access was issued.
    // Only the issued scenario must already lock customer changes before staff act.
    if (accessScenario === "issued-access") {
      expect(customerBefore.canCancel).toBe(false);
      expect(customerBefore.canReschedule).toBe(false);
    }
    const balanceBefore = (await readCustomer("/credits/mine/balance"))
      .balanceMinor;
    expect(balanceBefore).toBe(initialBalance - originalAmount);

    const recipient = e2eState.users.alphaBookingCustomer.email;
    const controlHeaders = {
      "x-e2e-key": process.env.E2E_TEST_KEY || "shario-e2e-local-key",
    };
    const deliverMoveNotice = async () => {
      const response = await request.post(
        "http://127.0.0.1:4311/__e2e/booking-lifecycle-delivery",
        { headers: controlHeaders, data: { bookingId } },
      );
      expect(response.ok(), await response.text()).toBe(true);
      const result = await response.json();
      expect(result.bookingId).toBe(bookingId);
      expect(result.logs).toHaveLength(1);
      expect(result.logs[0]).toMatchObject({
        id: expect.any(String),
        emailType: "bookingRescheduled",
        status: "sent",
        providerMessageId: expect.any(String),
      });
      expect(result.logs[0].providerMessageId).toBeTruthy();
      return result.logs[0];
    };
    const readMoveNotices = async (emailLogId) => {
      const response = await request.get(
        "http://127.0.0.1:4100/__e2e/messages",
        {
          headers: controlHeaders,
          params: { emailLogId, to: recipient },
        },
      );
      expect(response.ok(), await response.text()).toBe(true);
      return (await response.json()).messages;
    };

    const login = await loginWorkspaceAs(page, {
      slug: E2E.alphaSlug,
      email: USERS.owner,
    });
    const { accessToken } = await login.json();
    const editorUrl = `http://127.0.0.1:4311/bookings/${bookingId}/editor`;
    const headers = { Authorization: `Bearer ${accessToken}` };
    const readEditor = async () => {
      const response = await request.get(editorUrl, { headers });
      expect(response.ok(), await response.text()).toBe(true);
      return response.json();
    };
    const before = await readEditor();
    expect(before.booking.paymentStatus).toBe("CONFIRMED");
    expect(before.capabilities.canReschedule).toBe(true);
    expect(before.capabilities.preserveDuration).toBe(true);
    await page.goto(
      tenantUrl(E2E.alphaSlug, `/app/bookings/${bookingId}/edit`),
    );
    await expect(
      page.getByRole("heading", { level: 1, name: "Edit booking" }),
    ).toBeVisible();
    const startInput = page.getByLabel("Start", { exact: true });
    const endInput = page.getByLabel("End", { exact: true });
    await expect(startInput).toBeEnabled();
    await expect(endInput).toBeEnabled();
    await expect(
      page.getByText(
        "This booking has already been paid. Keep the same duration when moving it.",
        { exact: true },
      ),
    ).toBeVisible();

    const nextStart = new Date(Date.parse(before.booking.start) + 86_400_000);
    const nextEnd = new Date(Date.parse(before.booking.end) + 86_400_000);
    const nextStartWall = studioWallTime(nextStart, before.location.timeZone);
    const nextEndWall = studioWallTime(nextEnd, before.location.timeZone);
    await startInput.fill(nextStartWall);
    await endInput.fill(nextEndWall);
    const saveResponse = page.waitForResponse((response) =>
      isApiResponse(response, `/bookings/${bookingId}/editor`, "PUT"),
    );
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    const savedResponse = await saveResponse;
    expect(savedResponse.ok(), await savedResponse.text()).toBe(true);
    await expect(page.locator("form").getByRole("status")).toHaveText(
      "Booking saved.",
    );

    const after = await readEditor();
    expect(after.booking.start).toBe(nextStart.toISOString());
    expect(after.booking.end).toBe(nextEnd.toISOString());
    expect(
      Date.parse(after.booking.end) - Date.parse(after.booking.start),
    ).toBe(Date.parse(before.booking.end) - Date.parse(before.booking.start));
    expect(after.booking.paymentStatus).toBe(before.booking.paymentStatus);
    expect(after.booking.numberOfGuests).toBe(before.booking.numberOfGuests);
    expect(after.participants).toEqual(before.participants);
    const orderAfter = await readCustomer(
      `/orders/mine/${orderId}/confirmation`,
    );
    expect(orderAfter).toMatchObject({
      orderId,
      status: orderBefore.status,
      isPaid: true,
      currency: orderBefore.currency,
      totals: orderBefore.totals,
      paymentAllocations: orderBefore.paymentAllocations,
      items: orderBefore.items,
    });
    expect((await readCustomer("/credits/mine/balance")).balanceMinor).toBe(
      balanceBefore,
    );
    const customerAfter = (await readCustomer(`/bookings/mine/${bookingId}`))
      .booking;
    expect(customerAfter.start).toBe(nextStart.toISOString());
    expect(customerAfter.end).toBe(nextEnd.toISOString());
    expect(customerAfter.canCancel).toBe(false);
    expect(customerAfter.canReschedule).toBe(false);
    expect(customerAfter.location.arrival.accessCodeDelivered).toBe(false);

    await page.reload();
    await expect(startInput).toHaveValue(nextStartWall);
    await expect(endInput).toHaveValue(nextEndWall);
    await expect(startInput).toBeEnabled();
    await page.screenshot({
      path: `test-results/booking-editor-${accessScenario}-desktop.png`,
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
    await page.screenshot({
      path: `test-results/booking-editor-${accessScenario}-mobile.png`,
      fullPage: true,
    });

    // The isolated E2E server disables background queues. Claim the actual
    // persisted log and run the canonical delivery processor against Postmark's
    // loopback capture, then verify that exactly one provider request occurred.
    const deliveryLog = await deliverMoveNotice();
    const notices = await readMoveNotices(deliveryLog.id);
    expect(notices).toHaveLength(1);
    const [notice] = notices;
    expect(notice).toMatchObject({
      messageId: deliveryLog.providerMessageId,
      to: recipient,
      metadata: { emailLogId: deliveryLog.id },
    });
    expect(notice.subject).toMatch(/Booking rescheduled|Rezervace přesunuta/);
    const noticeLocale = /Rezervace přesunuta/.test(notice.subject)
      ? "cs-CZ"
      : "en-GB";
    expect(notice.textBody).toContain(
      new Intl.DateTimeFormat(noticeLocale, {
        timeZone: before.location.timeZone,
        dateStyle: "medium",
      }).format(nextStart),
    );
    for (const instant of [nextStart, nextEnd]) {
      expect(notice.textBody).toContain(
        new Intl.DateTimeFormat(noticeLocale, {
          timeZone: before.location.timeZone,
          timeStyle: "short",
        }).format(instant),
      );
    }

    await page.getByLabel("Staff note").fill("Staff confirmed the new time");
    const metadataSave = page.waitForResponse((response) =>
      isApiResponse(response, `/bookings/${bookingId}/editor`, "PUT"),
    );
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    expect((await metadataSave).ok()).toBe(true);
    await expect(page.locator("form").getByRole("status")).toHaveText(
      "Booking saved.",
    );
    await page.reload();
    await expect(page.getByLabel("Staff note")).toHaveValue(
      "Staff confirmed the new time",
    );
    await expect(startInput).toHaveValue(nextStartWall);
    expect(await deliverMoveNotice()).toEqual(deliveryLog);
    expect(await readMoveNotices(deliveryLog.id)).toEqual([notice]);

    await scenario(request, bookingId, "access-processing");
    await page.reload();
    await expect(startInput).toBeDisabled();
    await expect(endInput).toBeDisabled();
    await expect(startInput).toHaveValue(nextStartWall);
    await expect(page.getByLabel("Staff note")).toBeEnabled();
    await expect(
      page.getByText(
        "Access delivery is still in progress or needs review. Finish or review the delivery, then reload this booking.",
        { exact: true },
      ),
    ).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
}
