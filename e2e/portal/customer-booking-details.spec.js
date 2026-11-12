import { expect, test } from "@playwright/test";

const BOOKING_ID = "64b000000000000000000043";
const COMPACT_BOOKING_ID = "64b000000000000000000051";
const COURSE_BOOKING_ID = "64b000000000000000000056";
const OCCUPANCY_BOOKING_ID = "64b000000000000000000061";
const PRODUCT_ID = "64b000000000000000000031";
const COURSE_PRODUCT_ID = "64b000000000000000000033";
const LOCATION_ID = "64b000000000000000000021";
const BOOKING_PATH = `/bookings/mine/${BOOKING_ID}`;
const PORTAL_PATH = "/en/portal?location=atelier-brno";
const FIXED_TIME = "2026-08-11T10:30:00+02:00";

const calendar = (page) => page.locator("[data-customer-portal-calendar]");
const ownBooking = (page) =>
  calendar(page)
    .locator(`[data-calendar-booking-id="${BOOKING_ID}"]`)
    .filter({ visible: true })
    .first();
const otherBooking = (page) =>
  calendar(page)
    .locator(
      `[data-calendar-event-card][data-calendar-product="${PRODUCT_ID}"]:not([data-calendar-my-booking="true"])`,
    )
    .and(page.getByRole("button", { name: /10:00\s*[–-]\s*12:00/ }))
    .filter({ visible: true })
    .first();
const bookingDrawer = (page) => page.locator("[data-customer-booking-drawer]");
const bookingDraft = (page) =>
  calendar(page).locator('[data-calendar-slot-preview="true"]');

async function activateBooking(event, isMobile, nearStart = true) {
  await event.scrollIntoViewIfNeeded();
  const bounds = await event.boundingBox();
  // Use the first time band; a pointer lower in the card selects that later time.
  const options = nearStart
    ? { position: { x: bounds.width / 2, y: Math.min(8, bounds.height / 2) } }
    : {};
  if (isMobile) await event.tap(options);
  else await event.click(options);
}

async function expectBookingDraft(page, range = /10:00\s*[–-]\s*11:00/) {
  const draft = bookingDraft(page);
  await expect(draft).toHaveCount(1);
  await expect(draft).toHaveAttribute("data-calendar-slot-phase", "ready");
  await expect(draft).toHaveAttribute("data-calendar-slot-bookable", "true");
  await expect(draft).toContainText(range);
  await expect(
    draft.locator('[data-calendar-slot-resize="start"]'),
  ).toBeVisible();
  await expect(
    draft.locator('[data-calendar-slot-resize="end"]'),
  ).toBeVisible();
  await expect(bookingDrawer(page)).toHaveCount(0);
  await expect(page.locator("[data-customer-booking-details]")).toHaveCount(0);
  return draft;
}

async function confirmBookingDraft(page, isMobile) {
  const confirm = isMobile
    ? calendar(page).locator('[data-calendar-mobile-continue="true"]')
    : bookingDraft(page).locator('[data-calendar-slot-confirm="true"]');
  await expect(confirm).toBeVisible();
  await expect(confirm).toBeEnabled();
  if (isMobile) await confirm.tap();
  else await confirm.click();
  await expect(bookingDraft(page)).toHaveCount(0);
}

async function dragVertically(page, target, distance, isMobile, body = false) {
  await target.scrollIntoViewIfNeeded();
  await settleScroll(page);
  const bounds = await target.boundingBox();
  expect(bounds).not.toBeNull();
  // The draft body's left edge avoids the central resize handles and the +.
  const x = bounds.x + (body ? 8 : bounds.width / 2);
  const y = bounds.y + bounds.height / 2;
  if (isMobile) {
    const cdp = await page.context().newCDPSession(page);
    const point = (offset) => [
      { x, y: y + offset, id: 1, radiusX: 1, radiusY: 1, force: 1 },
    ];
    try {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: point(0),
      });
      for (let step = 1; step <= 6; step += 1) {
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: point((distance * step) / 6),
        });
      }
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    } finally {
      await cdp.detach();
    }
  } else {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + distance, { steps: 6 });
    await page.mouse.up();
  }
}

async function settleScroll(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
}

async function clickSlotSurface(page, surface, isMobile) {
  await surface.scrollIntoViewIfNeeded();
  const bounds = await surface.boundingBox();
  expect(bounds).not.toBeNull();
  const point = {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
  // Exercise the visible grid through a real pointer event, including the
  // unavailable surface that must reject a booking selection.
  if (isMobile) await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);
}
async function confirmDraft(page) {
  const preview = calendar(page).locator('[data-calendar-slot-preview="true"]');
  await expect(preview).toBeVisible();
  await expect(preview).toHaveAttribute("data-calendar-slot-bookable", "true");
  await expect(bookingDrawer(page)).toHaveCount(0);
  const action =
    page.viewportSize().width < 1024
      ? calendar(page).locator('[data-calendar-mobile-continue="true"]')
      : preview.locator('[data-calendar-slot-confirm="true"]');
  await expect(action).toBeEnabled();
  await action.click();
}

async function expectBookingMaker(
  page,
  { date = "2026-08-12", start = "10:00", duration = "1 h" } = {},
) {
  const dialog = bookingDrawer(page);
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "Book a session" }),
  ).toBeVisible();
  await expect(dialog).toContainText("Atelier Brno");
  await expect(dialog.getByLabel("Date", { exact: true })).toHaveValue(date);
  await expect(
    dialog.getByRole("combobox", { name: "Start time", exact: true }),
  ).toHaveValue(start);
  await expect(
    dialog.getByRole("combobox", { name: "Session type", exact: true }),
  ).toHaveValue(PRODUCT_ID);
  await expect(
    dialog.locator('[data-booking-duration-selected="true"]'),
  ).toHaveText(duration);
  await expect(dialog.locator("[data-booking-submit]")).toBeEnabled();
  await expect(
    dialog.getByRole("button", { name: "Add to cart" }),
  ).toBeVisible();
  await expect(page.locator("[data-customer-booking-details]")).toHaveCount(0);
  await expect(page).toHaveURL(
    new RegExp(`${PORTAL_PATH.replace("?", "\\?")}$`),
  );
  return dialog;
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(FIXED_TIME));
  await page.addLocatorHandler(
    page.locator("[data-customer-portal-tour-dismiss]"),
    async (dismiss) => {
      await dismiss.click();
    },
  );
  await page.route("https://visual-assets.example.test/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40"><text x="0" y="28">Nami</text></svg>',
    }),
  );
});

test("an existing weekly booking opens a new booking maker without leaving the calendar", async ({
  isMobile,
  page,
}, testInfo) => {
  const availabilityResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/bookings/mine/availability",
    { timeout: 60_000 },
  );
  const secondOwnedPageResponse = page.waitForResponse(
    (response) => {
      const url = new URL(response.url());
      return (
        url.pathname === "/bookings/mine" &&
        url.searchParams.get("scope") === "all" &&
        url.searchParams.get("page") === "2"
      );
    },
    { timeout: 60_000 },
  );
  const upcomingResponse = page.waitForResponse(
    (response) => {
      const url = new URL(response.url());
      return (
        url.pathname === "/bookings/mine" &&
        url.searchParams.get("scope") === "upcoming"
      );
    },
    { timeout: 60_000 },
  );
  await page.goto(PORTAL_PATH);
  const availability = await (await availabilityResponse).json();
  expect(availability.bookings.map((booking) => booking.id)).toContain(
    OCCUPANCY_BOOKING_ID,
  );
  for (const booking of availability.bookings) {
    expect(booking).not.toHaveProperty("isMine");
    expect(booking).not.toHaveProperty("createdBy");
    expect(typeof booking.location).toBe("string");
    expect(typeof booking.bookingProduct).toBe("string");
  }
  const upcoming = await (await upcomingResponse).json();
  expect(upcoming.bookings).toHaveLength(5);
  expect(upcoming.bookings.map((booking) => booking.id)).not.toContain(
    BOOKING_ID,
  );
  const secondOwnedPage = await (await secondOwnedPageResponse).json();
  expect(secondOwnedPage.currentPage).toBe(2);
  expect(secondOwnedPage.bookings.map((booking) => booking.id)).toContain(
    BOOKING_ID,
  );
  const event = ownBooking(page);
  await expect(event).toBeVisible();
  await expect(event).toHaveAttribute("data-calendar-my-booking", "true");
  await expect(
    event.locator("[data-calendar-own-booking-badge]"),
  ).toBeVisible();
  await activateBooking(event, page.viewportSize().width < 1024);
  await confirmDraft(page);
  const dialog = await expectBookingMaker(page);

  const panel = bookingDrawer(page);
  // Visibility alone can pass while the drawer is still sliding in. Wait for
  // its actual geometry, retaining strict bounds once the transition settles.
  await expect
    .poll(async () => {
      const bounds = await panel.boundingBox();
      const viewport = page.viewportSize();
      return Boolean(
        bounds &&
        bounds.x >= 0 &&
        bounds.y >= 0 &&
        bounds.x + bounds.width <= viewport.width &&
        bounds.y + bounds.height <= viewport.height,
      );
    })
    .toBe(true);
  const bounds = await panel.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(
    page.viewportSize().width,
  );
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(
    page.viewportSize().height,
  );
  const screenshotPath = testInfo.outputPath("booking-maker.png");
  await page.screenshot({
    path: screenshotPath,
    animations: "disabled",
    scale: "css",
    timeout: 30_000,
  });
  await testInfo.attach(`booking-maker-${testInfo.project.name}.png`, {
    path: screenshotPath,
    contentType: "image/png",
  });

  await dialog.getByRole("button", { name: /Close/i }).first().click();
  await expect(dialog).toBeHidden();
  await expect(event).toBeFocused();
  await event.press("Enter");
  await confirmDraft(page);
  await expectBookingMaker(page);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(event).toBeFocused();
  await event.press("Enter");
  await confirmDraft(page);
  await expectBookingMaker(page);
  if (isMobile)
    await dialog.getByRole("button", { name: "Close", exact: true }).tap();
  else await page.mouse.click(2, 2);
  await expect(dialog).toBeHidden();
  await expect(event).toBeFocused();
});

test("owned bookings stay distinct while studio and course clicks start a new booking", async ({
  isMobile,
  page,
}, testInfo) => {
  await page.goto(PORTAL_PATH);
  const compact = calendar(page).locator(
    `[data-calendar-booking-id="${COMPACT_BOOKING_ID}"]`,
  );
  const course = calendar(page).locator(
    `[data-calendar-booking-id="${COURSE_BOOKING_ID}"]`,
  );
  const occupancy = otherBooking(page);
  const event = ownBooking(page);
  for (const owned of [compact, event, course]) {
    await expect(owned).toHaveAttribute("data-calendar-my-booking", "true");
    await expect(
      owned.locator("[data-calendar-own-booking-badge]"),
    ).toBeVisible();
    await expect(
      owned.locator("[data-calendar-own-booking-icon]"),
    ).toBeVisible();
    const cardBounds = await owned.boundingBox();
    const badgeBounds = await owned
      .locator("[data-calendar-own-booking-badge]")
      .boundingBox();
    expect(badgeBounds.y - cardBounds.y).toBeGreaterThanOrEqual(0);
    expect(badgeBounds.y + badgeBounds.height).toBeLessThanOrEqual(
      cardBounds.y + cardBounds.height,
    );
    expect(badgeBounds.x + badgeBounds.width).toBeLessThanOrEqual(
      cardBounds.x + cardBounds.width,
    );
    await expect(owned.locator("[data-calendar-event-time]")).toBeVisible();
    await expect(owned).not.toContainText(/Customer|Zákazník/);
  }
  await expect(occupancy).not.toHaveAttribute(
    "data-calendar-my-booking",
    "true",
  );
  await expect(
    occupancy.locator("[data-calendar-own-booking-badge]"),
  ).toHaveCount(0);
  await expect(occupancy).not.toContainText(/Customer|Zákazník/);
  if (!isMobile) {
    await event.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    await settleScroll(page);
    await event.hover();
    const tooltip = page.getByRole("tooltip");
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText("Open Studio");
    await expect(tooltip).toContainText(/10:00\s*[–-]\s*12:00/);
    await expect(event).toHaveAttribute(
      "aria-describedby",
      await tooltip.getAttribute("id"),
    );
    const tooltipScreenshot = testInfo.outputPath(
      "calendar-clarity-tooltip.png",
    );
    await page.screenshot({
      path: tooltipScreenshot,
      animations: "disabled",
      scale: "css",
      timeout: 30_000,
    });
    await testInfo.attach("calendar-clarity-tooltip-desktop.png", {
      path: tooltipScreenshot,
      contentType: "image/png",
    });
    await page.keyboard.press("Escape");
    await expect(tooltip).toBeHidden();
    await page.mouse.move(0, 0);
    await page.keyboard.press("Tab");
    await event.focus();
    await expect(event).toBeFocused();
    expect(
      await event.evaluate((element) => element.matches(":focus-visible")),
    ).toBe(true);
    await expect(event).toHaveCSS("outline-width", "2px");
    await expect(event).toHaveCSS("outline-style", "solid");
    await expect(tooltip).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(tooltip).toBeHidden();
  }
  expect(
    await event.evaluate((element) => getComputedStyle(element).borderColor),
  ).not.toBe(
    await occupancy.evaluate(
      (element) => getComputedStyle(element).borderColor,
    ),
  );
  await expect(event).toHaveCSS("border-top-width", "2px");
  expect((await compact.boundingBox()).height).toBeLessThan(60);
  await activateBooking(compact, page.viewportSize().width < 1024);
  await confirmDraft(page);
  await expectBookingMaker(page, { date: "2026-08-11", start: "11:00" });
  await page.keyboard.press("Escape");

  await event.scrollIntoViewIfNeeded();
  if (page.viewportSize().width >= 1024) {
    const scrollBefore = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, 400);
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(scrollBefore);
  }
  const screenshotPath = testInfo.outputPath("booking-ownership-week.png");
  await page.screenshot({
    path: screenshotPath,
    animations: "disabled",
    scale: "css",
    timeout: 30_000,
  });
  await testInfo.attach(`booking-ownership-${testInfo.project.name}.png`, {
    path: screenshotPath,
    contentType: "image/png",
  });

  const courseSessionsResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname ===
      `/products/customer-catalog/${COURSE_PRODUCT_ID}/sessions`,
    { timeout: 60_000 },
  );
  await course.click();
  await confirmDraft(page);
  await expect(page).toHaveURL(
    (url) =>
      url.pathname === `/en/portal/courses/${COURSE_PRODUCT_ID}` &&
      url.searchParams.get("location") === "atelier-brno" &&
      url.searchParams.get("courseSessionId") === COURSE_BOOKING_ID,
    { timeout: 60_000 },
  );
  const sessionsResponse = await courseSessionsResponse;
  expect(sessionsResponse.status()).toBe(200);
  expect(new URL(sessionsResponse.url()).searchParams.get("locationId")).toBe(
    LOCATION_ID,
  );
  await expect(
    page.getByRole("heading", { name: "Creative Workshop" }),
  ).toBeVisible();
  const selectedSession = page.locator(
    `input[name="course-session"][value="${COURSE_BOOKING_ID}"]`,
  );
  await expect(selectedSession).toBeChecked();
  await expect(selectedSession).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Add to cart", exact: true }),
  ).toBeEnabled();
  await expect(bookingDrawer(page)).toHaveCount(0);
});

test("private and public bookings have distinct readable colors in the week and month agenda", async ({
  isMobile,
  page,
}, testInfo) => {
  const privateId = "64b000000000000000000098";
  await page.route("**/bookings/mine/availability?**", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    body.bookings.push({
      id: privateId,
      location: LOCATION_ID,
      bookingProduct: PRODUCT_ID,
      kind: "exclusiveOpenStudio",
      bookingMode: "private",
      plannedActivity: "WORKSTATION",
      start: "2026-08-12T10:00:00.000Z",
      end: "2026-08-12T11:00:00.000Z",
      numberOfGuests: 1,
    });
    await route.fulfill({ response, json: body });
  });
  await page.goto(PORTAL_PATH);
  const publicCard = ownBooking(page);
  // Customer occupancy uses a privacy-safe grouped ID, not the source booking ID.
  // Match the unique mode and time range users actually see in either view.
  const privateBookingIn = (scope, locale = "en") =>
    scope
      .locator('[data-calendar-booking-mode="private"]')
      .and(
        page.getByRole("button", {
          name:
            locale === "cs"
              ? /Otevřený ateliér.*12:00\s*[–-]\s*13:00/
              : /Open Studio.*12:00\s*[–-]\s*13:00/,
        }),
      )
      .filter({ visible: true });
  const privateCard = privateBookingIn(calendar(page));
  const checkModeColors = async (publicEvent, privateEvent) => {
    await expect(publicEvent).toHaveCSS(
      "background-color",
      "rgb(221, 238, 233)",
    );
    await expect(publicEvent).toHaveCSS("color", "rgb(37, 79, 72)");
    await expect(publicEvent).toHaveAccessibleName(/Public/);
    await expect(privateEvent).toHaveCSS(
      "background-color",
      "rgb(103, 74, 100)",
    );
    await expect(privateEvent).toHaveCSS("color", "rgb(255, 255, 255)");
    await expect(privateEvent).toHaveAccessibleName(/Private/);
    await expect(
      publicEvent.locator("[data-calendar-own-booking-badge]"),
    ).toBeVisible();
    await expect(
      publicEvent.locator("[data-calendar-own-booking-badge]"),
    ).toHaveCSS("background-color", "rgb(31, 54, 212)");
    await expect(publicEvent).toHaveCSS("border-top-width", "2px");
    await expect(publicEvent).toHaveCSS("border-top-color", "rgb(31, 54, 212)");
  };
  await checkModeColors(publicCard, privateCard);
  if (isMobile) {
    await calendar(page)
      .getByRole("button", { name: "Open legend", exact: true })
      .tap();
  }
  for (const [mode, color] of [
    ["public", "rgb(221, 238, 233)"],
    ["private", "rgb(103, 74, 100)"],
  ]) {
    const legend = calendar(page).locator(
      `[data-calendar-mode-legend="${mode}"]`,
    );
    await expect(legend).toBeVisible();
    await expect(legend.locator(":scope > span").first()).toHaveCSS(
      "background-color",
      color,
    );
  }
  if (isMobile) {
    await calendar(page).locator('[data-calendar-filter-trigger="true"]').tap();
  }
  await privateCard.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await settleScroll(page);
  const weekScreenshot = testInfo.outputPath(
    "calendar-privacy-colors-week.png",
  );
  await page.screenshot({
    path: weekScreenshot,
    animations: "disabled",
    scale: "css",
  });
  await testInfo.attach(
    `calendar-privacy-colors-week-${testInfo.project.name}.png`,
    {
      path: weekScreenshot,
      contentType: "image/png",
    },
  );

  await calendar(page)
    .getByRole("button", { name: "Month", exact: true })
    .click();
  await calendar(page)
    .locator('[data-calendar-month-day="2026-08-12"]')
    .click();
  const agenda = calendar(page).locator(
    '[data-calendar-month-agenda="2026-08-12"]',
  );
  await checkModeColors(
    agenda.locator(`[data-calendar-booking-id="${BOOKING_ID}"]`),
    privateBookingIn(agenda),
  );
  const privateAgenda = privateBookingIn(agenda);
  await expect(
    agenda.locator(
      `[data-calendar-booking-id="${BOOKING_ID}"] [data-calendar-privacy-icon="public"]`,
    ),
  ).toBeVisible();
  await expect(
    privateAgenda.locator('[data-calendar-privacy-icon="private"]'),
  ).toBeVisible();
  await expect(privateAgenda.getByText("Private", { exact: false })).toHaveCSS(
    "color",
    "rgb(255, 255, 255)",
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(page.viewportSize().width);
  await agenda.scrollIntoViewIfNeeded();
  const monthScreenshot = testInfo.outputPath(
    "calendar-privacy-colors-month.png",
  );
  await agenda.screenshot({
    path: monthScreenshot,
    animations: "disabled",
    scale: "css",
  });
  await testInfo.attach(
    `calendar-privacy-colors-month-${testInfo.project.name}.png`,
    {
      path: monthScreenshot,
      contentType: "image/png",
    },
  );

  await page.goto(PORTAL_PATH.replace("/en/", "/cs/"));
  await calendar(page)
    .getByRole("button", { name: "Týden", exact: true })
    .click();
  await expect(ownBooking(page)).toHaveAccessibleName(
    /Veřejná.*Moje rezervace/,
  );
  await expect(privateBookingIn(calendar(page), "cs")).toHaveAccessibleName(
    /Soukromá/,
  );
  await expect(
    calendar(page).getByText(
      "Fialová označuje soukromé rezervace, tyrkysová veřejné. Vaše rezervace mají modrý štítek.",
      { exact: true },
    ),
  ).toBeVisible();
  await calendar(page)
    .getByRole("button", { name: "Měsíc", exact: true })
    .click();
  await calendar(page)
    .locator('[data-calendar-month-day="2026-08-12"]')
    .click();
  await expect(
    agenda.locator(
      `[data-calendar-booking-id="${BOOKING_ID}"] [data-calendar-mode-badge]`,
    ),
  ).toHaveText("Veřejná");
  await expect(
    privateBookingIn(agenda, "cs").locator("[data-calendar-mode-badge]"),
  ).toHaveText("Soukromá");
  await agenda.scrollIntoViewIfNeeded();
  const czechMonthScreenshot = testInfo.outputPath(
    "calendar-privacy-colors-month-cs.png",
  );
  await agenda.screenshot({
    path: czechMonthScreenshot,
    animations: "disabled",
    scale: "css",
  });
  await testInfo.attach(
    `calendar-privacy-colors-month-cs-${testInfo.project.name}.png`,
    {
      path: czechMonthScreenshot,
      contentType: "image/png",
    },
  );
});

test("another customer's shared occupancy opens a new booking without requesting private details", async ({
  page,
}) => {
  const privateDetailRequests = [];
  page.on("request", (request) => {
    const pathname = new URL(request.url()).pathname;
    if (/^\/bookings\/mine\/[a-f\d]{24}$/.test(pathname))
      privateDetailRequests.push(pathname);
  });
  await page.goto(PORTAL_PATH);
  await expect(ownBooking(page)).toHaveAttribute(
    "data-calendar-my-booking",
    "true",
  );
  const occupancy = otherBooking(page);
  await expect(occupancy).not.toHaveAttribute(
    "data-calendar-my-booking",
    "true",
  );
  await activateBooking(occupancy, page.viewportSize().width < 1024);
  await confirmDraft(page);
  const dialog = await expectBookingMaker(page);
  await expect(dialog.getByText("Status", { exact: true })).toHaveCount(0);
  await expect(dialog.getByText("Payment", { exact: true })).toHaveCount(0);
  await expect(dialog.getByText("Paid", { exact: true })).toHaveCount(0);
  await expect(dialog).not.toContainText("martin.maker@example.test");
  expect(privateDetailRequests).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(
    new RegExp(`${PORTAL_PATH.replace("?", "\\?")}$`),
  );
});

test("booking creation does not depend on the private booking detail endpoint", async ({
  page,
}) => {
  let detailRequests = 0;
  await page.route(`**${BOOKING_PATH}`, (route) => {
    if (route.request().method() !== "GET") return route.continue();
    detailRequests += 1;
    return route.fulfill({
      status: 503,
      contentType: "application/json",
      headers: {
        "access-control-allow-credentials": "true",
        "access-control-allow-origin": route.request().headers().origin,
      },
      body: JSON.stringify({
        message: "Booking details temporarily unavailable",
      }),
    });
  });
  await page.goto(PORTAL_PATH);
  const event = ownBooking(page);
  await expect(event).toHaveAttribute("data-calendar-my-booking", "true");
  await activateBooking(event, page.viewportSize().width < 1024);
  await confirmDraft(page);
  await expectBookingMaker(page);
  expect(detailRequests).toBe(0);
});

for (const view of ["Week", "Day"]) {
  test(`${view.toLowerCase()} existing shared bookings allow resizing and moving the draft before confirmation`, async ({
    isMobile,
    page,
  }, testInfo) => {
    await page.goto(PORTAL_PATH);
    await expect(ownBooking(page)).toHaveAttribute(
      "data-calendar-my-booking",
      "true",
    );
    if (view === "Day") {
      await calendar(page)
        .getByRole("button", { name: "Month", exact: true })
        .click();
      await calendar(page)
        .locator('[data-calendar-month-day="2026-08-12"]')
        .click();
      await calendar(page)
        .locator('[data-calendar-month-view-day="true"]')
        .click();
    }
    const event = view === "Day" ? ownBooking(page) : otherBooking(page);
    await activateBooking(event, isMobile);
    const draft = await expectBookingDraft(page);
    const originalHeight = (await draft.boundingBox()).height;

    // Extend one step beyond the initial minimum duration using a real pointer.
    await dragVertically(
      page,
      draft.locator('[data-calendar-slot-resize="end"]'),
      originalHeight / 2,
      isMobile,
    );
    await expectBookingDraft(page, /10:00\s*[–-]\s*11:30/);
    // Move the complete interval by one step without changing its duration.
    await dragVertically(page, draft, originalHeight / 2, isMobile, true);
    await expectBookingDraft(page, /10:30\s*[–-]\s*12:00/);

    const eventBounds = await event.boundingBox();
    const draftBounds = await draft.boundingBox();
    expect(
      Math.min(
        eventBounds.y + eventBounds.height,
        draftBounds.y + draftBounds.height,
      ) - Math.max(eventBounds.y, draftBounds.y),
    ).toBeGreaterThan(0);
    expect(
      await draft.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      ),
    ).not.toBe(
      await event.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      ),
    );
    const screenshotPath = testInfo.outputPath(
      `booking-draft-overlap-${view.toLowerCase()}.png`,
    );
    await draft.scrollIntoViewIfNeeded();
    await settleScroll(page);
    await page.screenshot({
      path: screenshotPath,
      animations: "disabled",
      scale: "css",
    });
    await testInfo.attach(
      `booking-draft-overlap-${view.toLowerCase()}-${testInfo.project.name}.png`,
      { path: screenshotPath, contentType: "image/png" },
    );

    await confirmBookingDraft(page, isMobile);
    const dialog = await expectBookingMaker(page, {
      start: "10:30",
      duration: "1 h 30 min",
    });
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(event).toBeFocused();
  });
  test(`${view.toLowerCase()} private booking click creates a gray editable preview that can move into free time`, async ({
    page,
    isMobile,
  }, testInfo) => {
    await page.route("**/bookings/mine/availability?**", async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      body.bookings.push({
        id: "64b000000000000000000099",
        location: LOCATION_ID,
        bookingProduct: PRODUCT_ID,
        kind: "privateStudio",
        bookingMode: "private",
        plannedActivity: "WORKSTATION",
        start: "2026-08-11T10:00:00.000Z",
        end: "2026-08-11T11:00:00.000Z",
        numberOfGuests: 1,
      });
      await route.fulfill({ response, json: body });
    });
    await page.goto(PORTAL_PATH);
    await calendar(page)
      .getByRole("button", { name: view, exact: true })
      .click();
    const privateCard = calendar(page)
      .locator('[data-calendar-booking-mode="private"]')
      .filter({ visible: true })
      .first();
    await activateBooking(privateCard, isMobile);
    const preview = calendar(page).locator(
      '[data-calendar-slot-preview="true"]',
    );
    await expect(preview).toBeVisible();
    await expect(preview).toHaveAttribute(
      "data-calendar-slot-bookable",
      "false",
    );
    await expect(preview).toHaveAttribute(
      "data-calendar-slot-state",
      "blocked",
    );
    await expect(bookingDrawer(page)).toHaveCount(0);
    await expect(
      preview.locator('[data-calendar-slot-confirm="true"]'),
    ).toBeDisabled();
    await expect(
      preview.locator('[data-calendar-slot-resize="end"]'),
    ).toBeVisible();
    const gray = await preview.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    );
    const blockedScreenshot = testInfo.outputPath(
      `private-${view.toLowerCase()}-gray.png`,
    );
    await page.screenshot({ path: blockedScreenshot, animations: "disabled" });
    await testInfo.attach("private-gray-preview", {
      path: blockedScreenshot,
      contentType: "image/png",
    });
    if (isMobile) {
      await preview.focus();
      await preview.press("ArrowDown");
      await preview.press("ArrowDown");
    } else {
      const bounds = await preview.boundingBox();
      await page.mouse.move(
        bounds.x + bounds.width / 2,
        bounds.y + bounds.height / 2,
      );
      await page.mouse.down();
      await page.mouse.move(
        bounds.x + bounds.width / 2,
        bounds.y + bounds.height * 1.5,
        { steps: 12 },
      );
      await page.mouse.up();
    }
    await expect(preview).toHaveAttribute(
      "data-calendar-slot-bookable",
      "true",
    );
    await expect(preview).toHaveAttribute("aria-label", /13:00.*14:00/);
    expect(
      await preview.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      ),
    ).not.toBe(gray);
    const availableScreenshot = testInfo.outputPath(
      `private-${view.toLowerCase()}-moved-blue.png`,
    );
    await page.screenshot({
      path: availableScreenshot,
      animations: "disabled",
    });
    await testInfo.attach("moved-blue-preview", {
      path: availableScreenshot,
      contentType: "image/png",
    });
    await confirmDraft(page);
    await expectBookingMaker(page, { date: "2026-08-11", start: "13:00" });
  });
  test(`${view.toLowerCase()} slots stay unshaded while preserving availability and selection`, async ({
    isMobile,
    page,
  }, testInfo) => {
    await page.goto(PORTAL_PATH);
    await expect(
      calendar(page).locator(
        `[data-calendar-booking-id="${COMPACT_BOOKING_ID}"]`,
      ),
    ).toHaveAttribute("data-calendar-my-booking", "true");
    await calendar(page)
      .getByRole("button", { name: view, exact: true })
      .click();
    if (view === "Day")
      await expect(
        calendar(page).locator('[data-calendar-capacity-rail="true"]'),
      ).toHaveCount(0);
    const column =
      view === "Week"
        ? calendar(page)
            .locator('[data-calendar-week-day-column="true"]')
            .nth(1)
        : calendar(page).locator('[data-calendar-day-column="true"]').first();
    const slot = (start) =>
      column.locator(
        `[data-calendar-slot-state][aria-label^="${start}"]:not([data-calendar-slot-preview])`,
      );
    const limited = slot("16:00");
    const full = slot("17:00");
    const available = slot("18:00");
    const closed = slot("19:30");
    await expect(limited).toHaveAttribute(
      "data-calendar-slot-state",
      "limited",
    );
    await expect(limited).toHaveAttribute(
      "data-calendar-slot-bookable",
      "true",
    );
    await expect(full).toHaveAttribute("data-calendar-slot-state", "full");
    await expect(full).toHaveAttribute("data-calendar-slot-bookable", "false");
    await expect(available).toHaveAttribute(
      "data-calendar-slot-state",
      "available",
    );
    await expect(available).toHaveAttribute(
      "data-calendar-slot-bookable",
      "true",
    );
    await expect(closed).toHaveAttribute("data-calendar-slot-state", "closed");
    const shadedSlots = await calendar(page)
      .locator("[data-calendar-slot-surface-state]")
      .evaluateAll((elements) =>
        elements
          .filter((element) => {
            const style = getComputedStyle(element);
            return (
              style.backgroundImage !== "none" ||
              style.backgroundColor !== "rgba(0, 0, 0, 0)"
            );
          })
          .map((element) => element.getAttribute("aria-label")),
      );
    expect(shadedSlots).toEqual([]);
    for (const unavailable of [full, closed]) {
      await expect(unavailable).toHaveAttribute(
        "data-calendar-slot-bookable",
        "false",
      );
      await expect(
        unavailable.locator("[data-calendar-slot-availability-label]"),
      ).toHaveCount(0);
    }
    await expect(
      column
        .locator("[data-calendar-slot-availability-label]")
        .filter({ visible: true })
        .first(),
    ).toBeVisible();

    await clickSlotSurface(page, closed, isMobile);
    await expect(
      calendar(page).locator('[data-calendar-slot-preview="true"]'),
    ).toHaveCount(0);
    const availableAction = available.locator(
      '[data-calendar-slot-availability-label="true"]',
    );
    await expect(availableAction).toBeVisible();
    if (!isMobile) {
      await availableAction.hover();
      const tooltip = page.getByRole("tooltip");
      await expect(tooltip).toBeVisible();
      await expect(tooltip).toContainText("Available");
      await expect(tooltip).toContainText("Select this time");
      await page.keyboard.press("Escape");
      await expect(tooltip).toBeHidden();
      await availableAction.click();
    } else {
      await availableAction.tap();
    }
    const selection = calendar(page).locator(
      '[data-calendar-slot-preview="true"]',
    );
    await expect(selection).toHaveAttribute(
      "data-calendar-slot-phase",
      "ready",
    );
    await expect(selection).toHaveAttribute(
      "data-calendar-slot-bookable",
      "true",
    );
    await expect(selection).toContainText(/18:00\s*[–-]\s*19:00/);
    const continueButton = isMobile
      ? calendar(page).locator('[data-calendar-mobile-continue="true"]')
      : selection.locator('[data-calendar-slot-confirm="true"]');
    await expect(continueButton).toBeVisible();
    await expect(continueButton).toBeEnabled();
    const screenshotPath = testInfo.outputPath(
      `calendar-clarity-${view.toLowerCase()}.png`,
    );
    await selection.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    await settleScroll(page);
    await page.screenshot({
      path: screenshotPath,
      animations: "disabled",
      scale: "css",
      timeout: 30_000,
    });
    await testInfo.attach(
      `calendar-clarity-${view.toLowerCase()}-${testInfo.project.name}.png`,
      { path: screenshotPath, contentType: "image/png" },
    );
    if (isMobile) {
      await calendar(page)
        .getByRole("button", { name: "Clear selected time", exact: true })
        .click();
    } else {
      await continueButton.press("Escape");
    }
    await expect(selection).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
}
test("a compact month agenda opens an editable day preview before booking confirmation", async ({
  page,
}, testInfo) => {
  await page.goto(PORTAL_PATH);
  const monthButton = calendar(page).getByRole("button", {
    name: "Month",
    exact: true,
  });
  await monthButton.click();
  await expect(monthButton).toHaveAttribute("aria-pressed", "true");
  const dateButton = calendar(page).locator(
    '[data-calendar-month-day="2026-08-12"]',
  );
  await dateButton.click();
  await expect(dateButton).toHaveAttribute("aria-pressed", "true");
  await expect(monthButton).toHaveAttribute("aria-pressed", "true");
  const agenda = calendar(page).locator(
    '[data-calendar-month-agenda="2026-08-12"]',
  );
  await expect(agenda).toBeVisible();
  const event = agenda.locator(`[data-calendar-booking-id="${BOOKING_ID}"]`);
  await expect(event).toHaveAttribute("data-calendar-my-booking", "true");
  await expect(
    agenda.locator(`[data-calendar-booking-id="${COURSE_BOOKING_ID}"]`),
  ).toBeVisible();
  await expect(
    agenda.locator(`[data-calendar-booking-id="${COMPACT_BOOKING_ID}"]`),
  ).toHaveCount(0);
  const monthGrid = calendar(page).locator('[data-calendar-month-grid="true"]');
  expect((await monthGrid.boundingBox()).height).toBeLessThan(650);
  const originalViewport = page.viewportSize();
  // A taller capture at the same responsive width includes the compact month
  // and its agenda without sticky headers covering parts of the screenshot.
  await page.setViewportSize({ ...originalViewport, height: 1600 });
  const monthShell = calendar(page).locator('[data-calendar-shell="true"]');
  await monthShell.evaluate((element) =>
    element.scrollIntoView({ block: "center", behavior: "instant" }),
  );
  await page.mouse.move(0, 0);
  await settleScroll(page);
  const screenshotPath = testInfo.outputPath("calendar-clarity-month.png");
  await monthShell.screenshot({
    path: screenshotPath,
    animations: "disabled",
    scale: "css",
    timeout: 30_000,
  });
  await testInfo.attach(
    `booking-ownership-month-${testInfo.project.name}.png`,
    { path: screenshotPath, contentType: "image/png" },
  );
  await page.setViewportSize(originalViewport);
  await activateBooking(event, page.viewportSize().width < 1024);
  const dayButton = calendar(page).getByRole("button", {
    name: "Day",
    exact: true,
  });
  await expect(dayButton).toHaveAttribute("aria-pressed", "true");
  await confirmDraft(page);
  const dialog = await expectBookingMaker(page);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(ownBooking(page)).toBeFocused();
  await expect(dayButton).toHaveAttribute("aria-pressed", "true");
  await expect(ownBooking(page)).toBeVisible();
});
