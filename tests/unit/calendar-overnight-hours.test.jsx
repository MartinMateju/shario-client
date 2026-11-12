import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DayCalendar from "@/components/calendar/DayCalendar";
import WeekCalendar from "@/components/calendar/WeekCalendar";
import { normalizeLocationToCalendarStudio } from "@/components/calendar/calendar.adapters";
import { getCustomerCalendarBookingPreview } from "@/components/calendar/calendar.bookingSelection";
import {
  getBookableSlotsForDay,
  getCalendarDayAvailability,
  getCalendarDisplayHours,
  getCalendarSlotAvailability,
  getMonthDays,
  getStudioOpeningWindow,
  makeSlotDate,
} from "@/components/calendar/calendar.utils";
import {
  buildDurationOptions,
  buildStartTimeOptions,
} from "@/utils/locationBookingUtils";
import { OPENING_HOURS_WEEKDAYS } from "@/utils/openingHours";

const day = new Date("2026-11-08T12:00:00Z"); // Last visible weekday.
const now = new Date("2026-11-02T12:00:00Z");
const location = {
  _id: "overnight-studio",
  openingHours: Object.fromEntries(
    OPENING_HOURS_WEEKDAYS.map((key) => [
      key,
      { isOpen: true, openTime: "05:00", closeTime: "01:00" },
    ]),
  ),
  booking: {
    enabled: true,
    timezone: "Europe/Prague",
    slotStepMinutes: 30,
    minBookingMinutes: 60,
    maxBookingMinutes: 360,
    globalCapacity: 6,
    allowPublicOverlap: true,
    maxConcurrentOpenStudioBookings: 6,
    activityCapacities: [{ activity: "SHARED_TABLE", capacity: 6 }],
  },
};
const studio = normalizeLocationToCalendarStudio(location);
const availability = (startMinute, endMinute, overrides = {}) =>
  getCalendarSlotAvailability({
    studio,
    day,
    startMinute,
    endMinute,
    activityId: "SHARED_TABLE",
    now,
    ...overrides,
  });
const t = (key, values = {}) => {
  if (key === "events.closed") return "Closed";
  if (key === "events.availability")
    return `${values.remaining} places available`;
  return key;
};

describe("overnight studio opening hours", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("keeps each civil day open before01:00 and from05:00, with the overnight end intact", () => {
    expect(studio.calendarHours).toEqual({ start: 0, end: 24 });
    expect(getCalendarDisplayHours(studio, [day])).toEqual({
      start: 0,
      end: 24,
    });
    expect(availability(0, 60).isBookable).toBe(true);
    expect(availability(300, 360).isBookable).toBe(true);
    expect(availability(1410, 1470)).toMatchObject({
      isBookable: true,
      start: new Date("2026-11-08T22:30:00Z"),
      end: new Date("2026-11-08T23:30:00Z"),
    });
    for (const [start, end] of [
      [60, 120],
      [240, 300],
      [0, 61],
      [270, 330],
      [1470, 1530],
    ]) {
      expect(availability(start, end).isBookable).toBe(false);
    }
    expect(buildStartTimeOptions(location, "2026-11-08")).toContain("23:30");
    expect(buildStartTimeOptions(location, "2026-11-08")).not.toContain(
      "01:00",
    );
    expect(buildDurationOptions(location, "2026-11-08", "23:30")).toEqual([
      60, 90,
    ]);
    expect(buildDurationOptions(location, "2026-11-08", "00:00")).toEqual([60]);
    expect(buildDurationOptions(location, "2026-11-08", "02:00")).toEqual([]);
  });

  it("supports the legacy06:00–00:00 midnight close without an early-morning spill", () => {
    const midnightLocation = {
      ...location,
      openingHours: Object.fromEntries(
        OPENING_HOURS_WEEKDAYS.map((key) => [
          key,
          { isOpen: true, openTime: "06:00", closeTime: "00:00" },
        ]),
      ),
    };
    const midnightStudio = normalizeLocationToCalendarStudio(midnightLocation);
    expect(midnightStudio.calendarHours).toEqual({ start: 6, end: 24 });
    expect(availability(360, 420, { studio: midnightStudio }).isBookable).toBe(
      true,
    );
    expect(
      availability(1380, 1440, { studio: midnightStudio }).isBookable,
    ).toBe(true);
    expect(
      availability(1410, 1470, { studio: midnightStudio }).isBookable,
    ).toBe(false);
    expect(availability(0, 60, { studio: midnightStudio }).isBookable).toBe(
      false,
    );
    expect(buildStartTimeOptions(midnightLocation, "2026-11-08").at(-1)).toBe(
      "23:00",
    );
  });

  it("takes early hours from the preceding weekday, including Sunday→Monday", () => {
    const selective = {
      ...studio,
      openingHours: {
        sunday: { isOpen: true, openTime: "22:00", closeTime: "01:00" },
        monday: { isOpen: false },
      },
    };
    const monday = new Date("2026-11-09T12:00:00Z");
    expect(
      availability(0, 60, { studio: selective, day: monday }).isBookable,
    ).toBe(true);
    expect(
      availability(300, 360, { studio: selective, day: monday }).isBookable,
    ).toBe(false);
    expect(getStudioOpeningWindow(selective, monday)).toMatchObject({
      isOpen: true,
      openMinutes: 0,
      closeMinutes: 60,
    });
  });

  it("keeps an offset opening grid when enumerating both overnight day segments", () => {
    const offsetLocation = {
      ...location,
      openingHours: Object.fromEntries(
        OPENING_HOURS_WEEKDAYS.map((key) => [
          key,
          { isOpen: true, openTime: "05:15", closeTime: "01:00" },
        ]),
      ),
    };
    const offsetStudio = normalizeLocationToCalendarStudio(offsetLocation);
    const options = buildStartTimeOptions(offsetLocation, "2026-11-08");
    expect(options).not.toContain("00:00");
    expect(options).toContain("05:15");
    expect(options).toContain("23:45");
    const starts = getBookableSlotsForDay({
      studio: offsetStudio,
      day,
      now,
    }).map(({ startMinute }) => startMinute);
    expect(starts[0]).toBe(315); // 00:15 cannot fit the one-hour minimum before01:00.
    expect(starts.every((minute) => minute % 30 === 15)).toBe(true);
    const shortMinimum = {
      ...offsetLocation,
      booking: { ...offsetLocation.booking, minBookingMinutes: 30 },
    };
    expect(buildStartTimeOptions(shortMinimum, "2026-11-08")[0]).toBe("00:15");
  });

  it("checks next-day occupancy for a late Sunday booking without crossing locations", () => {
    const occupied = {
      id: "next-day-full",
      locationId: studio.id,
      kind: "sharedOpenStudio",
      activityId: "SHARED_TABLE",
      guests: 6,
      start: "2026-11-08T23:00:00Z",
      end: "2026-11-09T00:00:00Z",
    };
    expect(availability(1410, 1470, { bookings: [occupied] })).toMatchObject({
      isBookable: false,
      state: "full",
    });
    expect(availability(1380, 1440, { bookings: [occupied] }).isBookable).toBe(
      true,
    );
    expect(
      availability(1410, 1470, {
        bookings: [{ ...occupied, locationId: "another-studio" }],
      }).isBookable,
    ).toBe(true);
  });

  it("keeps month/day summaries available and excludes closure-gap starts", () => {
    const futureDays = getMonthDays(day).filter(
      (candidate) => candidate >= day,
    );
    for (const candidate of futureDays) {
      expect(
        getCalendarDayAvailability({ studio, day: candidate, now }).isBookable,
      ).toBe(true);
    }
    const starts = getBookableSlotsForDay({ studio, day, now }).map(
      (slot) => slot.startMinute,
    );
    expect(starts).toContain(0);
    expect(starts).toContain(300);
    expect(starts).toContain(1410);
    expect(starts.some((minute) => minute >= 60 && minute < 300)).toBe(false);
    expect(starts.every((minute) => minute < 1440)).toBe(true);
  });

  it.each([
    { label: "blocked", earlyKind: "block", fullSlots: 0, blockedSlots: 39 },
    {
      label: "full",
      earlyKind: "sharedOpenStudio",
      fullSlots: 1,
      blockedSlots: 38,
    },
  ])(
    "summarizes an unavailable overnight day as $label without counting its closure gap",
    ({ label, earlyKind, fullSlots, blockedSlots }) => {
      const bookings = [
        {
          id: "unavailable-early-window",
          locationId: studio.id,
          kind: earlyKind,
          activityId: "SHARED_TABLE",
          guests: 6,
          start: "2026-11-07T23:00:00Z",
          end: "2026-11-08T00:00:00Z",
        },
        {
          id: "blocked-main-window",
          locationId: studio.id,
          kind: "block",
          start: "2026-11-08T04:00:00Z",
          end: "2026-11-09T00:00:00Z",
        },
      ];
      const request = { studio, day, now, bookings };
      expect(getCalendarDayAvailability(request)).toMatchObject({
        state: label,
        isBookable: false,
        totalSlots: 39,
        fullSlots,
        blockedSlots,
        availableSlots: 0,
        bookableSlots: [],
        nextAvailable: null,
      });
      expect(getBookableSlotsForDay(request)).toEqual([]);
    },
  );

  it("preserves a late occupancy-card preview until the overnight close", () => {
    expect(
      getCustomerCalendarBookingPreview({
        studio,
        event: {
          id: "late-occupancy",
          locationId: studio.id,
          kind: "sharedOpenStudio",
          start: "2026-11-08T22:30:00Z",
          end: "2026-11-08T23:30:00Z",
        },
      }),
    ).toMatchObject({ startMinute: 1410, endMinute: 1470 });
  });

  it.each(["2026-03-28", "2026-10-24"])(
    "converts a late booking across local midnight without truncation on%s",
    (date) => {
      const startDay = new Date(`${date}T12:00:00Z`);
      const start = makeSlotDate(startDay, 1410, "Europe/Prague");
      const end = makeSlotDate(startDay, 1470, "Europe/Prague");
      expect(end - start).toBe(60 * 60_000);
      expect(
        new Intl.DateTimeFormat("en-GB", {
          timeZone: "Europe/Prague",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        }).format(end),
      ).toBe("00:30");
    },
  );

  it.each([
    ["2026-03-28", 7],
    ["2026-10-24", 9],
  ])(
    "resolves the next-day closing clock across a DST change on%s",
    (date, elapsedHours) => {
      const startDay = new Date(`${date}T12:00:00Z`);
      expect(
        makeSlotDate(startDay, 30 * 60, "Europe/Prague") -
          makeSlotDate(startDay, 22 * 60, "Europe/Prague"),
      ).toBe(elapsedHours * 60 * 60_000);
    },
  );

  it.each([
    { label: "day", Component: DayCalendar },
    { label: "week", Component: WeekCalendar },
  ])(
    "shows selectable midnight/day/late starts and preserves their selected duration in$label",
    ({ Component }) => {
      const onSlotSelect = vi.fn();
      const { container } = render(
        <Component
          date={day}
          bookings={[]}
          studio={studio}
          audience="customer"
          locale="en-GB"
          pageScroll
          onDateChange={vi.fn()}
          onSlotSelect={onSlotSelect}
          t={t}
        />,
      );
      const column =
        Component === WeekCalendar
          ? container.querySelector(
              '[data-calendar-week-day-column][aria-label="Sunday 8 November"]',
            )
          : container.querySelector("[data-calendar-day-column]");
      expect(column).toBeInTheDocument();
      const slot = (range) =>
        Array.from(
          column.querySelectorAll("[data-calendar-slot-bookable]"),
        ).find((element) =>
          element.getAttribute("aria-label").startsWith(range),
        );
      expect(slot("00:00 – 01:00")).toHaveAttribute(
        "data-calendar-slot-bookable",
        "true",
      );
      expect(slot("01:00 – 02:00")).toHaveAttribute(
        "data-calendar-slot-bookable",
        "false",
      );
      expect(slot("04:30 – 05:30")).toHaveAttribute(
        "data-calendar-slot-bookable",
        "false",
      );
      expect(slot("05:00 – 06:00")).toHaveAttribute(
        "data-calendar-slot-bookable",
        "true",
      );
      vi.spyOn(column, "getBoundingClientRect").mockReturnValue({ top: 0 });
      const pixelsPerMinute = Component === WeekCalendar ? 42 / 30 : 52 / 30;
      const tap = (element, minute) => {
        const pointer = {
          pointerType: "touch",
          pointerId: 1,
          clientX: 80,
          clientY: minute * pixelsPerMinute + 1,
        };
        fireEvent.pointerDown(element, pointer);
        fireEvent.pointerUp(element, pointer);
        fireEvent.click(element, pointer);
      };
      tap(slot("01:00 – 02:00"), 60);
      expect(
        container.querySelector("[data-calendar-slot-preview]"),
      ).not.toBeInTheDocument();
      expect(onSlotSelect).not.toHaveBeenCalled();
      for (const [range, minute, start, end] of [
        ["00:00 – 01:00", 0, "2026-11-07T23:00:00Z", "2026-11-08T00:00:00Z"],
        ["05:00 – 06:00", 300, "2026-11-08T04:00:00Z", "2026-11-08T05:00:00Z"],
        ["23:30 – 00:30", 1410, "2026-11-08T22:30:00Z", "2026-11-08T23:30:00Z"],
      ]) {
        expect(slot(range)).toHaveAttribute(
          "data-calendar-slot-bookable",
          "true",
        );
        tap(slot(range), minute);
        const confirm = container.querySelector("[data-calendar-slot-confirm]");
        expect(confirm).toBeInTheDocument();
        fireEvent.click(confirm);
        expect(onSlotSelect).toHaveBeenLastCalledWith(
          expect.objectContaining({
            start: new Date(start),
            end: new Date(end),
          }),
        );
      }
    },
  );
});
