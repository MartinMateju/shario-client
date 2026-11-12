import { fireEvent, render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import StudioCalendar from "@/components/calendar/StudioCalendar";
import messages from "@/messages/en.json";

const date = new Date("2026-12-24T12:00:00Z");
const location = {
  id: "studio",
  booking: {
    enabled: true,
    timezone: "UTC",
    allowPublicOverlap: true,
    maxConcurrentOpenStudioBookings: 6,
    globalCapacity: 6,
    slotStepMinutes: 30,
    minBookingMinutes: 60,
    activityCapacities: [{ activity: "WORKSTATION", capacity: 6 }],
  },
  openingHours: {
    thursday: { isOpen: true, openTime: "08:00", closeTime: "14:00" },
  },
};
const course = {
  id: "course-session",
  locationId: location.id,
  productId: "course-product",
  productName: "Course with an off-grid start",
  kind: "class",
  activityId: "WORKSTATION",
  start: "2026-12-24T09:15:00Z",
  end: "2026-12-24T10:45:00Z",
  capacity: 6,
  guests: 4,
  remainingCapacity: 2,
  available: true,
};

function renderCourse(view) {
  const onSlotSelect = vi.fn();
  const calendar = render(
    <NextIntlClientProvider locale="en-GB" timeZone="UTC" messages={messages}>
      <StudioCalendar
        audience="customer"
        location={location}
        bookings={[course]}
        date={date}
        view={view}
        onSlotSelect={onSlotSelect}
      />
    </NextIntlClientProvider>,
  );
  fireEvent.click(
    calendar.container.querySelector("[data-calendar-event-card]"),
  );
  const preview = calendar.container.querySelector(
    "[data-calendar-slot-preview]",
  );
  expect(preview).toHaveAccessibleName(expect.stringContaining("09:15"));
  expect(preview).toHaveAccessibleName(expect.stringContaining("10:45"));
  expect(preview).toHaveAttribute("data-calendar-slot-bookable", "true");
  expect(onSlotSelect).not.toHaveBeenCalled();
  return { ...calendar, preview, onSlotSelect };
}

function resizeByPointer(
  handle,
  deltaMinutes,
  pixelsPerMinute,
  cancel = false,
) {
  handle.setPointerCapture = vi.fn();
  handle.releasePointerCapture = vi.fn();
  const pointer = { button: 0, pointerId: 21, pointerType: "mouse" };
  fireEvent.pointerDown(handle, { ...pointer, buttons: 1, clientY: 300 });
  const clientY = 300 + deltaMinutes * pixelsPerMinute;
  fireEvent.pointerMove(handle, { ...pointer, buttons: 1, clientY });
  fireEvent[cancel ? "pointerCancel" : "pointerUp"](handle, {
    ...pointer,
    clientY,
  });
}

describe("resizing an exact off-grid course preview", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-28T10:00:00Z"));
  });

  afterEach(() => vi.useRealTimers());

  it.each([
    ["day", "start", "09:00", "11:00", 4],
    ["day", "end", "09:30", "11:30", 3],
    ["week", "start", "09:00", "11:00", 4],
    ["week", "end", "09:30", "11:30", 3],
  ])(
    "normalizes the %s %s resize and confirms only the edited generic range",
    (view, edge, expectedStart, expectedEnd, moves) => {
      const { preview, onSlotSelect } = renderCourse(view);
      const handle = preview.querySelector(
        `[data-calendar-slot-resize="${edge}"]`,
      );
      if (view === "day") {
        fireEvent.keyDown(handle, {
          key: edge === "start" ? "ArrowUp" : "ArrowDown",
        });
      } else {
        resizeByPointer(handle, edge === "start" ? -30 : 30, 42 / 30);
      }
      expect(preview).toHaveAccessibleName(
        expect.stringContaining(expectedStart),
      );
      expect(preview).toHaveAccessibleName(
        expect.stringContaining(expectedEnd),
      );
      // The edited range still overlaps the course; move beyond it before
      // confirming a new studio reservation with no course identity.
      expect(preview).toHaveAttribute("data-calendar-slot-bookable", "false");
      for (let index = 0; index < moves; index += 1) {
        fireEvent.keyDown(preview, { key: "ArrowDown" });
      }
      expect(preview).toHaveAttribute("data-calendar-slot-bookable", "true");
      fireEvent.click(preview.querySelector("[data-calendar-slot-confirm]"));
      expect(onSlotSelect).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          start: new Date("2026-12-24T11:00:00Z"),
          end: new Date("2026-12-24T13:00:00Z"),
        }),
      );
      const selection = onSlotSelect.mock.lastCall[0];
      expect(selection).not.toHaveProperty("courseSessionId");
      expect(selection).not.toHaveProperty("productId");
    },
  );

  it("restores the exact course intent when an off-grid pointer resize is canceled", () => {
    const { preview, onSlotSelect } = renderCourse("week");
    resizeByPointer(
      preview.querySelector('[data-calendar-slot-resize="end"]'),
      30,
      42 / 30,
      true,
    );
    expect(preview).toHaveAccessibleName(expect.stringContaining("09:15"));
    expect(preview).toHaveAccessibleName(expect.stringContaining("10:45"));
    fireEvent.click(preview.querySelector("[data-calendar-slot-confirm]"));
    expect(onSlotSelect).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        start: new Date(course.start),
        end: new Date(course.end),
        courseSessionId: course.id,
        productId: course.productId,
      }),
    );
  });
});
