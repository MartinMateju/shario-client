import { cleanup, fireEvent, render, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DayCalendar from "@/components/calendar/DayCalendar";
import WeekCalendar from "@/components/calendar/WeekCalendar";
import { getMobileSlotOptions } from "@/components/calendar/MobileAgendaCalendar";
import { getCalendarSlotAvailability } from "@/components/calendar/calendar.utils";

const day = new Date("2026-12-24T12:00:00Z");
const studio = {
  id: "grohova",
  timeZone: "UTC",
  calendarHours: { start: 6, end: 12 },
  slotStepMinutes: 30,
  minBookingMinutes: 60,
  availabilityMode: "capacity",
  globalCapacity: 6,
  allowPublicOverlap: true,
  maxConcurrentOpenStudioBookings: 6,
  resources: [
    { id: "WORKSTATION", name: "Pottery wheel", capacity: 2 },
    { id: "SHARED_TABLE", name: "Modelling and glazing", capacity: 6 },
  ],
  openingHours: Object.fromEntries(
    [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ].map((weekday) => [
      weekday,
      { isOpen: true, openTime: "06:00", closeTime: "12:00" },
    ]),
  ),
};
const privateBooking = {
  id: "existing-private-booking",
  locationId: studio.id,
  kind: "exclusiveOpenStudio",
  bookingMode: "private",
  activityId: "WORKSTATION",
  title: "Existing private booking",
  start: "2026-12-24T08:00:00Z",
  end: "2026-12-24T09:00:00Z",
};

const t = (key, values = {}) => {
  if (key === "availability.insufficientTime") {
    return `Not enough consecutive time for a ${values.minutes}-minute booking.`;
  }
  if (key === "events.availability")
    return `${values.remaining} places available`;
  if (key === "events.unavailable") return "Studio unavailable";
  if (key === "events.closed") return "Closed";
  if (key === "day.publicLane") return `Place ${values.number}`;
  return key;
};

const views = [
  { name: "day resources", Component: DayCalendar, configuredStudio: studio },
  {
    name: "day lanes",
    Component: DayCalendar,
    configuredStudio: {
      ...studio,
      availabilityMode: "lanes",
      publicLaneCount: 1,
    },
  },
  { name: "week", Component: WeekCalendar, configuredStudio: studio },
];

function renderCalendar(
  view,
  { bookings = [privateBooking], audience = "customer" } = {},
) {
  const onSlotSelect = vi.fn();
  const { Component, configuredStudio } = view;
  const result = render(
    <Component
      date={day}
      bookings={bookings}
      studio={configuredStudio}
      selectedActivityId="WORKSTATION"
      audience={audience}
      locale="en-GB"
      pageScroll
      onDateChange={vi.fn()}
      onSlotSelect={onSlotSelect}
      t={t}
    />,
  );
  const column =
    view.name === "week"
      ? result.container.querySelector(
          '[data-calendar-week-day-column][aria-label="Thursday 24 December"]',
        )
      : result.container.querySelector("[data-calendar-day-column]");
  expect(column).toBeInTheDocument();
  const slot = (range) =>
    Array.from(column.querySelectorAll("[data-calendar-slot-bookable]")).find(
      (element) =>
        element
          .getAttribute("aria-label")
          .startsWith(range.replace("–", " – ")),
    );
  return { ...result, column, slot, onSlotSelect };
}

function expectUnshadedSlots(container) {
  const slots = container.querySelectorAll(
    "[data-calendar-slot-surface-state]",
  );
  expect(slots.length).toBeGreaterThan(0);
  for (const slot of slots) {
    const style = getComputedStyle(slot);
    expect(["", "none"]).toContain(style.backgroundImage);
    expect(["", "transparent", "rgba(0, 0, 0, 0)"]).toContain(
      style.backgroundColor,
    );
  }
}

describe("unshaded customer calendar slots and booking start eligibility", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-28T10:00:00Z"));
    globalThis.requestAnimationFrame = vi.fn(() => 1);
    globalThis.cancelAnimationFrame = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  for (const view of views) {
    it.each(["customer", "public"])(
      `${view.name}: leaves every slot unshaded while preserving private booking boundaries for %s`,
      (audience) => {
        const { container, column, slot, onSlotSelect } = renderCalendar(view, {
          audience,
        });
        const before = slot("07:30–08:30");
        const occupied = slot("08:00–09:00");

        expectUnshadedSlots(container);
        expect(before).toHaveAttribute("data-calendar-slot-bookable", "false");
        expect(before).toHaveAttribute(
          "data-calendar-slot-surface-state",
          "available",
        );
        expect(before).toHaveAccessibleName(
          "07:30 – 08:30, Not enough consecutive time for a 60-minute booking.",
        );
        expect(within(before).queryByRole("button")).not.toBeInTheDocument();
        expect(occupied).toHaveAttribute(
          "data-calendar-slot-surface-state",
          "blocked",
        );
        expect(occupied).toHaveAttribute(
          "data-calendar-slot-bookable",
          "false",
        );
        expect(slot("07:00–08:00")).toHaveAttribute(
          "data-calendar-slot-bookable",
          "true",
        );
        expect(slot("09:00–10:00")).toHaveAttribute(
          "data-calendar-slot-bookable",
          "true",
        );

        // The same grid is used on phones. A tap on the free-looking half-hour
        // must still refuse a new one-hour booking that crosses the private visit.
        expect(
          container.querySelector("[data-calendar-mobile-agenda]"),
        ).not.toBeInTheDocument();
        vi.spyOn(column, "getBoundingClientRect").mockReturnValue({ top: 0 });
        const pixelsPerMinute = view.name === "week" ? 42 / 30 : 52 / 30;
        const pointer = {
          pointerType: "touch",
          pointerId: 1,
          clientX: 80,
          clientY: 90 * pixelsPerMinute + 1,
        };
        fireEvent.pointerDown(before, pointer);
        fireEvent.pointerUp(before, pointer);
        expect(onSlotSelect).not.toHaveBeenCalled();
        expect(
          container.querySelector("[data-calendar-slot-preview]"),
        ).not.toBeInTheDocument();
      },
    );
  }

  it("keeps exact boundary adjacency valid without weakening whole-duration validation", () => {
    const check = (startMinute, endMinute) =>
      getCalendarSlotAvailability({
        studio,
        bookings: [privateBooking],
        day,
        startMinute,
        endMinute,
        activityId: "WORKSTATION",
      });
    expect(check(7 * 60, 8 * 60).isBookable).toBe(true);
    expect(check(7 * 60 + 30, 8 * 60).isBookable).toBe(true);
    expect(check(7 * 60 + 30, 8 * 60 + 30).isBookable).toBe(false);
    expect(check(9 * 60, 10 * 60).isBookable).toBe(true);

    // Agenda choices represent the full displayed range, so their invalid
    // one-hour start remains unavailable as well.
    const options = getMobileSlotOptions({
      day,
      studio,
      bookings: [privateBooking],
    });
    expect(
      options.find((option) => option.startMinute === 450).isBookable,
    ).toBe(false);
  });

  it.each(views)(
    "$name: retains closures and activity capacity during their real intervals",
    (view) => {
      const shared = {
        ...privateBooking,
        kind: "sharedOpenStudio",
        bookingMode: "public",
        numberOfGuests: 2,
      };
      const closure = {
        ...privateBooking,
        id: "closure",
        isClosure: true,
        kind: "block",
        start: "2026-12-24T10:00:00Z",
        end: "2026-12-24T11:00:00Z",
      };
      const { container, slot } = renderCalendar(view, {
        bookings: [shared, closure],
      });
      expectUnshadedSlots(container);
      expect(slot("07:30–08:30")).toHaveAttribute(
        "data-calendar-slot-bookable",
        "false",
      );
      expect(slot("08:00–09:00")).toHaveAttribute(
        "data-calendar-slot-surface-state",
        "full",
      );
      expect(slot("08:00–09:00")).toHaveAttribute(
        "data-calendar-slot-bookable",
        "false",
      );
      expect(slot("09:30–10:30")).toHaveAttribute(
        "data-calendar-slot-bookable",
        "false",
      );
      expect(slot("10:00–11:00")).toHaveAttribute(
        "data-calendar-slot-surface-state",
        "blocked",
      );
      expect(slot("10:00–11:00")).toHaveAttribute(
        "data-calendar-slot-bookable",
        "false",
      );
      expect(slot("11:30–12:30")).toHaveAttribute(
        "data-calendar-slot-bookable",
        "false",
      );
    },
  );
});
