import { test, expect } from "../fixtures/test.js";
import { createPaidBooking, scenario } from "../helpers/booking-edit.js";
import { E2E, tenantUrl } from "../helpers/urls.js";

const evidenceDir =
  process.env.BOOKING_EXTENSION_EVIDENCE_DIR ||
  "test-results/booking-extension-evidence";
const minute = 60_000;
const time = (value) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
const range = (start) => `${time(start)} – ${time(start + 60 * minute)}`;

function slotAt(column, start) {
  return column.locator(
    `[data-calendar-slot-bookable][aria-label^="${range(start)},"]`,
  );
}

async function assertUnshadedSlots(calendar) {
  const slots = calendar.locator("[data-calendar-slot-surface-state]");
  await expect(slots.first()).toBeAttached();
  await expect
    .poll(() =>
      slots.evaluateAll((elements) =>
        elements
          .filter((element) => {
            const style = getComputedStyle(element);
            return (
              style.backgroundImage !== "none" ||
              style.backgroundColor !== "rgba(0, 0, 0, 0)"
            );
          })
          .map((element) => element.getAttribute("aria-label")),
      ),
    )
    .toEqual([]);
}

async function assertBoundary(column, neighborStart) {
  const before = slotAt(column, neighborStart - 30 * minute);
  const occupied = slotAt(column, neighborStart);
  const after = slotAt(column, neighborStart + 60 * minute);

  // The first half-hour is empty, while a new minimum-duration booking would
  // run into the private reservation. Occupancy and start eligibility differ.
  await expect(before).toHaveAttribute(
    "data-calendar-slot-surface-state",
    "available",
  );
  await expect(before).toHaveAttribute("data-calendar-slot-bookable", "false");
  await expect(before).toHaveCSS("background-image", "none");
  await expect(before).toHaveAccessibleName(
    `${range(neighborStart - 30 * minute)}, Not enough consecutive time for a 60-minute booking.`,
  );
  await expect(before.getByRole("button")).toHaveCount(0);
  await expect(occupied).toHaveAttribute(
    "data-calendar-slot-surface-state",
    "blocked",
  );
  await expect(occupied).toHaveAttribute(
    "data-calendar-slot-bookable",
    "false",
  );
  await expect(after).toHaveAttribute("data-calendar-slot-bookable", "true");
  return before;
}

test("week and mobile day calendars keep all slots unshaded while rejecting starts that overlap private bookings", async ({
  page,
  request,
  e2eState,
}) => {
  const { booking } = await createPaidBooking({ page, request, e2eState });
  await scenario(request, booking.id || booking._id, "private-neighbor");
  const neighborStart = new Date(booking.end).getTime() + 30 * minute;
  const bookingDay = new Date(booking.start).toISOString().slice(0, 10);
  const dayLabel = new Intl.DateTimeFormat("en", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${bookingDay}T12:00:00Z`));
  const localToday = await page.evaluate(() => {
    const now = new Date();
    return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  });
  const daysToBooking = Math.round(
    (Date.parse(`${bookingDay}T00:00:00Z`) - localToday) / 86_400_000,
  );

  await page.goto(tenantUrl(E2E.alphaSlug, "/portal"), {
    waitUntil: "domcontentloaded",
  });
  const calendar = page.locator("[data-customer-calendar-shell]");
  await expect(calendar).toBeVisible();
  const welcomeTour = page.locator("[data-customer-portal-tour-welcome]");
  // This fresh customer has not acknowledged the tour. Its welcome dialog
  // opens after session hydration, so wait for it instead of sampling visibility.
  await welcomeTour
    .getByRole("button", { name: "Not now", exact: true })
    .click();
  await expect(welcomeTour).toHaveCount(0);
  await calendar.getByRole("button", { name: "Week", exact: true }).click();
  const weekColumn = calendar.locator(
    `[data-calendar-week-day-column][aria-label="${dayLabel}"]`,
  );
  let weeksMoved = 0;
  if ((await weekColumn.count()) === 0) {
    await calendar
      .getByRole("button", { name: "Next period", exact: true })
      .click();
    weeksMoved = 1;
  }
  const before = await assertBoundary(weekColumn, neighborStart);
  await assertUnshadedSlots(calendar);
  // Scrolling dismisses pending tooltips. Settle the scroll before a separate
  // real pointer entry, so hover's automatic scrolling cannot hide the reason.
  await before.scrollIntoViewIfNeeded();
  let previousBounds;
  let stableSamples = 0;
  await expect
    .poll(
      async () => {
        const bounds = await before.boundingBox();
        stableSamples =
          bounds &&
          previousBounds &&
          ["x", "y", "width", "height"].every(
            (key) => Math.abs(bounds[key] - previousBounds[key]) <= 0.5,
          )
            ? stableSamples + 1
            : 0;
        previousBounds = bounds;
        return stableSamples;
      },
      {
        message: "The unavailable slot must stop scrolling before hover.",
        timeout: 5000,
        intervals: [50],
      },
    )
    .toBeGreaterThanOrEqual(3);
  await page.mouse.move(0, 0);
  await before.hover();
  await expect(page.getByRole("tooltip")).toContainText(
    "Not enough consecutive time for a 60-minute booking.",
  );
  await page.screenshot({
    path: `${evidenceDir}/calendar-private-boundary-desktop.png`,
    fullPage: false,
  });
  await before.click();
  await expect(calendar.locator("[data-calendar-slot-preview]")).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // The phone uses the same time-grid surfaces. Neither a mouse click nor a
  // tap should open a booking that crosses the private reservation boundary.
  await page.setViewportSize({ width: 375, height: 812 });
  await calendar.getByRole("button", { name: "Day", exact: true }).click();
  // The booking fixture uses a UTC date; the browser runs in Prague. Around
  // midnight they can differ by a day, so navigate rather than assume they match.
  const dayAdjustment = daysToBooking - weeksMoved * 7;
  for (let step = 0; step < Math.abs(dayAdjustment); step += 1) {
    await calendar
      .getByRole("button", {
        name: dayAdjustment < 0 ? "Previous period" : "Next period",
        exact: true,
      })
      .click();
  }
  const dayColumn = calendar.locator("[data-calendar-day-column]").first();
  const mobileBefore = await assertBoundary(dayColumn, neighborStart);
  await assertUnshadedSlots(calendar);
  await mobileBefore.scrollIntoViewIfNeeded();
  const bounds = await mobileBefore.boundingBox();
  expect(bounds).not.toBeNull();
  const pointer = {
    pointerType: "touch",
    pointerId: 1,
    isPrimary: true,
    clientX: bounds.x + bounds.width / 2,
    clientY: bounds.y + bounds.height / 2,
  };
  await mobileBefore.dispatchEvent("pointerdown", pointer);
  await mobileBefore.dispatchEvent("pointerup", pointer);
  // A finger tap selects on the click the browser synthesizes after it.
  await mobileBefore.dispatchEvent("click", {
    clientX: pointer.clientX,
    clientY: pointer.clientY,
    detail: 1,
  });
  await expect(calendar.locator("[data-calendar-slot-preview]")).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.screenshot({
    path: `${evidenceDir}/calendar-private-boundary-mobile.png`,
    fullPage: false,
  });
});
