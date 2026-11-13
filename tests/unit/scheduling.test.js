import { describe, expect, it } from "vitest";

import {
  addMonths,
  asDate,
  bookingIsVisible,
  bookingUnits,
  bookingsForDay,
  buildCustomerEvents,
  capacityAt,
  cx,
  dateKey,
  durationMinutes,
  eventPosition,
  formatRange,
  formatTime,
  getBookableSlotsForDay,
  getCalendarDayAvailability,
  getCalendarDisplayHours,
  getCalendarHours,
  getCalendarSlotAvailability,
  getCapacityTone,
  getCustomerCalendarSlotSurface,
  getMonthDays,
  getStudioOpeningWindow,
  getTimeSlots,
  getWeekDays,
  layoutOverlaps,
  localDateKey,
  makeSlotDate,
  minutesToDate,
  overlaps,
  pickSuggestedCalendarSlot,
  slotFitsOpeningHours,
  startOfMonthGrid,
  startOfWeek,
  wallTimeMinutes,
} from "@/components/calendar/calendar.utils";
import {
  normalizeBookingToCalendarEvent,
  normalizeLocationToCalendarStudio,
} from "@/components/calendar/calendar.adapters";
import {
  buildDurationOptions,
  buildStartTimeOptions,
  checkLocationAvailability,
  durationInMinutes,
  formatDuration,
  formatLocationAddress,
  formatWallDate,
  formatWallTime,
  formatZonedDate,
  getBookingLocationId,
  getEntityId,
  getLocationTimeZone,
  getOpeningWindow,
  zonedDateTimeToUtc,
} from "@/utils/locationBookingUtils";

const monday = new Date("2026-07-20T12:00:00.000Z");

const studio = {
  id: "location-1",
  timeZone: "Europe/Prague",
  calendarHours: { start: 8, end: 18 },
  openingHours: {
    monday: {
      isOpen: true,
      openTime: "09:00",
      closeTime: "17:00",
    },
    tuesday: {
      isOpen: false,
      openTime: "09:00",
      closeTime: "17:00",
    },
  },
  resources: [{ id: "wheel", capacity: 5 }],
};

const location = {
  _id: "location-1",
  timeZone: "Europe/Prague",
  address: {
    line1: "Clay Street 1",
    line2: "Studio B",
    postalCode: "110 00",
    city: "Prague",
    country: "CZ",
  },
  openingHours: studio.openingHours,
  booking: {
    enabled: true,
    timezone: "Europe/Prague",
    slotStepMinutes: 30,
    minBookingMinutes: 60,
    maxBookingMinutes: 180,
    globalCapacity: 4,
    allowPublicSoloOverlap: true,
    maxPublicSoloOverlaps: 3,
    privateSessionBlocksAll: true,
    groupBookingBlocksAll: false,
    activityCapacities: [{ activity: "WHEEL", capacity: 2 }],
  },
};

const booking = (overrides = {}) => ({
  _id: "booking-1",
  locationId: "location-1",
  activityId: "wheel",
  plannedActivity: "WHEEL",
  start: "2026-07-20T08:00:00.000Z",
  end: "2026-07-20T09:00:00.000Z",
  status: "confirmed",
  paymentStatus: "CONFIRMED",
  tag: "workshop",
  bookingType: "public",
  numberOfGuests: 1,
  ...overrides,
});

describe("calendar interval and opening-hours rules", () => {
  it.each(["25:00", "12:60", "24:01"])(
    "rejects an out-of-range opening time %s instead of offering slots",
    (openTime) => {
      const invalidStudio = {
        ...studio,
        openingHours: {
          monday: { isOpen: true, openTime, closeTime: "23:00" },
        },
      };

      expect(getStudioOpeningWindow(invalidStudio, monday)).toEqual({
        isOpen: false,
        openMinutes: 0,
        closeMinutes: 0,
      });
      expect(
        getBookableSlotsForDay({
          studio: invalidStudio,
          day: monday,
          now: new Date("2026-07-19T00:00:00Z"),
        }),
      ).toEqual([]);
    },
  );

  it.each([
    { start: 18, end: 8 },
    { start: "invalid", end: 18 },
  ])(
    "keeps a readable but unbookable canvas for invalid fallback hours %j",
    (calendarHours) => {
      const invalidStudio = { calendarHours };

      expect(getCalendarDisplayHours(invalidStudio, [monday])).toEqual({
        start: 8,
        end: 20,
      });
      expect(getStudioOpeningWindow(invalidStudio, monday)).toEqual({
        isOpen: false,
        openMinutes: 0,
        closeMinutes: 0,
      });
      expect(slotFitsOpeningHours(invalidStudio, monday, 9 * 60, 10 * 60)).toBe(
        false,
      );
    },
  );

  it("provides stable date, range, and class-name helpers", () => {
    expect(cx("base", false, null, "active")).toBe("base active");
    expect(asDate("invalid")).toBeNull();
    expect(localDateKey("invalid")).toBe("");
    expect(dateKey("invalid", "Europe/Prague")).toBe("");

    expect(addMonths(new Date("2026-01-31T12:00:00.000Z"), 1).getDate()).toBe(
      28,
    );
    expect(
      localDateKey(startOfWeek(new Date("2026-07-23T12:00:00.000Z"))),
    ).toBe("2026-07-20");
    expect(
      localDateKey(startOfMonthGrid(new Date("2026-07-23T12:00:00.000Z"))),
    ).toBe("2026-06-29");
    expect(getWeekDays(new Date("2026-07-23T12:00:00.000Z"))).toHaveLength(7);
    expect(getMonthDays(new Date("2026-07-23T12:00:00.000Z"))).toHaveLength(42);

    expect(
      formatTime("2026-07-20T07:05:00.000Z", "en-GB", "Europe/Prague"),
    ).toBe("09:05");
    expect(formatTime("invalid", "en-GB", "Europe/Prague")).toBe("");
    expect(
      formatRange(
        "2026-07-20T07:05:00.000Z",
        "2026-07-20T08:05:00.000Z",
        "en-GB",
        "Europe/Prague",
      ),
    ).toBe("09:05 – 10:05");
  });

  it("treats adjacent intervals as available and real intersections as overlaps", () => {
    const base = {
      start: "2026-07-20T08:00:00.000Z",
      end: "2026-07-20T09:00:00.000Z",
    };

    expect(
      overlaps(base, {
        start: "2026-07-20T09:00:00.000Z",
        end: "2026-07-20T10:00:00.000Z",
      }),
    ).toBe(false);
    expect(
      overlaps(base, {
        start: "2026-07-20T08:59:59.999Z",
        end: "2026-07-20T10:00:00.000Z",
      }),
    ).toBe(true);
    expect(overlaps(base, { start: "invalid", end: "invalid" })).toBe(false);
  });

  it("allows exact opening boundaries and rejects closed or overflowing slots", () => {
    expect(getStudioOpeningWindow(studio, monday)).toEqual({
      isOpen: true,
      openMinutes: 9 * 60,
      closeMinutes: 17 * 60,
    });
    expect(slotFitsOpeningHours(studio, monday, 9 * 60, 17 * 60)).toBe(true);
    expect(slotFitsOpeningHours(studio, monday, 8 * 60 + 59, 10 * 60)).toBe(
      false,
    );
    expect(slotFitsOpeningHours(studio, monday, 16 * 60, 17 * 60 + 1)).toBe(
      false,
    );
    expect(
      slotFitsOpeningHours(
        studio,
        new Date("2026-07-21T12:00:00.000Z"),
        9 * 60,
        10 * 60,
      ),
    ).toBe(false);
  });

  it("uses calendar fallbacks and clamps slot granularity to fifteen minutes", () => {
    expect(getCalendarHours()).toEqual({ start: 8, end: 20 });
    expect(
      getStudioOpeningWindow({ calendarHours: { start: 7, end: 21 } }, monday),
    ).toEqual({
      isOpen: true,
      openMinutes: 7 * 60,
      closeMinutes: 21 * 60,
    });

    const slots = getTimeSlots(
      {
        calendarHours: { start: 9, end: 10 },
        slotStepMinutes: 10,
      },
      30,
    );

    expect(slots.map(({ label }) => label)).toEqual([
      "09:00",
      "09:15",
      "09:30",
      "09:45",
      "10:00",
    ]);
    expect(slots[0]).toMatchObject({ minute: 540, isHour: true });
  });

  it.each(["25:00", "24:01", "09:60"])(
    "keeps a configured day closed when its opening clock is invalid (%s)",
    (openTime) => {
      const invalidStudio = {
        ...studio,
        openingHours: {
          monday: { isOpen: true, openTime, closeTime: "17:00" },
        },
      };
      expect(getStudioOpeningWindow(invalidStudio, monday)).toEqual({
        isOpen: false,
        openMinutes: 0,
        closeMinutes: 0,
      });
      expect(
        getBookableSlotsForDay({
          studio: invalidStudio,
          day: monday,
          now: new Date("2026-07-20T00:00:00Z"),
        }),
      ).toEqual([]);
    },
  );

  it.each([
    { start: "invalid", end: 20 },
    { start: 8, end: "invalid" },
    { start: 20, end: 8 },
    { start: 8, end: 8 },
  ])(
    "provides a safe canvas but no bookable hours for malformed fallback %j",
    (calendarHours) => {
      const invalidStudio = { calendarHours };
      expect(getCalendarDisplayHours(invalidStudio)).toEqual({
        start: 8,
        end: 20,
      });
      expect(getStudioOpeningWindow(invalidStudio, monday)).toEqual({
        isOpen: false,
        openMinutes: 0,
        closeMinutes: 0,
      });
      expect(slotFitsOpeningHours(invalidStudio, monday, 9 * 60, 10 * 60)).toBe(
        false,
      );
    },
  );

  it("positions events in studio wall time and keeps short events clickable", () => {
    expect(
      eventPosition(
        {
          start: "2026-07-20T07:00:00.000Z",
          end: "2026-07-20T08:30:00.000Z",
        },
        studio,
        2,
      ),
    ).toEqual({ top: 0, height: 180 });
    expect(
      eventPosition(
        {
          start: "2026-07-20T04:00:00.000Z",
          end: "2026-07-20T04:05:00.000Z",
        },
        studio,
        1,
      ),
    ).toEqual({ top: 0, height: 28 });
  });

  it("partitions transitive overlap groups while reusing free columns", () => {
    const layout = layoutOverlaps([
      {
        id: "a",
        start: "2026-07-20T08:00:00.000Z",
        end: "2026-07-20T09:00:00.000Z",
      },
      {
        id: "b",
        start: "2026-07-20T08:30:00.000Z",
        end: "2026-07-20T09:30:00.000Z",
      },
      {
        id: "c",
        start: "2026-07-20T09:00:00.000Z",
        end: "2026-07-20T10:00:00.000Z",
      },
      {
        id: "separate",
        start: "2026-07-20T11:00:00.000Z",
        end: "2026-07-20T12:00:00.000Z",
      },
      { id: "invalid", start: "invalid", end: "invalid" },
    ]);

    expect(layout.a).toMatchObject({ column: 0, columns: 2, width: 50 });
    expect(layout.b).toMatchObject({ column: 1, columns: 2, width: 50 });
    expect(layout.c).toMatchObject({ column: 0, columns: 2, width: 50 });
    expect(layout.separate).toMatchObject({
      column: 0,
      columns: 1,
      width: 100,
    });
    expect(layout.invalid).toBeUndefined();
  });
});

describe("calendar capacity and timezone behavior", () => {
  it("keeps canonical blocker kinds stable across repeated normalization", () => {
    const normalized = normalizeBookingToCalendarEvent({
      _id: "private-block",
      locationId: "location-1",
      kind: "privateStudio",
      start: "2026-07-20T08:00:00.000Z",
      end: "2026-07-20T09:00:00.000Z",
    });

    expect(normalized.kind).toBe("privateStudio");
    expect(normalizeBookingToCalendarEvent(normalized).kind).toBe(
      "privateStudio",
    );
  });

  it("counts only visible matching bookings that intersect the requested slot", () => {
    const bookings = [
      booking({ capacityUsed: 2 }),
      booking({
        _id: "booking-2",
        start: "2026-07-20T09:00:00.000Z",
        end: "2026-07-20T10:00:00.000Z",
        guests: 3,
      }),
      booking({ _id: "cancelled", status: "cancelled", guests: 4 }),
      booking({ _id: "other-activity", activityId: "kiln", guests: 4 }),
      booking({ _id: "other-location", locationId: "location-2", guests: 4 }),
      booking({
        _id: "suggested-preview",
        isSuggested: true,
        capacityUsed: 99,
      }),
    ];

    expect(
      capacityAt(
        bookings,
        studio,
        "wheel",
        "2026-07-20T08:30:00.000Z",
        "2026-07-20T09:30:00.000Z",
      ),
    ).toEqual({ used: 5, limit: 5, remaining: 0 });
    expect(bookingUnits({ guests: 0 })).toBe(1);
    expect(getCapacityTone({ used: 5, limit: 5 })).toBe("full");
    expect(getCapacityTone({ used: 4, limit: 5 })).toBe("limited");
    expect(getCapacityTone({ used: 2, limit: 5 })).toBe("available");
  });

  it("suggests a real future slot without creating a booking", () => {
    const suggestion = pickSuggestedCalendarSlot({
      studio: {
        ...studio,
        availabilityMode: "capacity",
        slotStepMinutes: 30,
        minBookingMinutes: 60,
      },
      bookings: [],
      now: new Date("2026-07-20T06:00:00.000Z"),
      random: () => 0,
    });

    expect(suggestion).toMatchObject({
      activityId: "wheel",
      startMinute: 9 * 60,
      endMinute: 10 * 60,
    });
    expect(suggestion.start.toISOString()).toBe("2026-07-20T07:00:00.000Z");
    expect(suggestion.end.toISOString()).toBe("2026-07-20T08:00:00.000Z");
  });

  it("does not suggest a closed or globally blocked slot", () => {
    expect(
      pickSuggestedCalendarSlot({
        studio: {
          ...studio,
          availabilityMode: "lanes",
          publicLaneCount: 2,
          slotStepMinutes: 30,
          minBookingMinutes: 60,
        },
        bookings: [
          booking({
            kind: "privateStudio",
            start: "2026-07-20T07:00:00.000Z",
            end: "2026-07-20T15:00:00.000Z",
          }),
        ],
        now: new Date("2026-07-20T06:00:00.000Z"),
        daysToSearch: 2,
        random: () => 0,
      }),
    ).toBeNull();
  });

  it("respects lane saturation without treating the preview as a booking", () => {
    const laneStudio = {
      ...studio,
      availabilityMode: "lanes",
      allowPublicSoloOverlap: true,
      publicLaneCount: 2,
      slotStepMinutes: 30,
      minBookingMinutes: 60,
    };
    const occupyingBooking = booking({
      kind: "public",
      start: "2026-07-20T07:00:00.000Z",
      end: "2026-07-20T15:00:00.000Z",
    });

    expect(
      pickSuggestedCalendarSlot({
        studio: laneStudio,
        bookings: [occupyingBooking],
        selectedActivityId: "wheel",
        now: new Date("2026-07-20T06:00:00.000Z"),
        daysToSearch: 1,
        random: () => Number.NaN,
      }),
    ).toMatchObject({
      activityId: "wheel",
      startMinute: 9 * 60,
      endMinute: 10 * 60,
    });

    expect(
      pickSuggestedCalendarSlot({
        studio: { ...laneStudio, publicLaneCount: 1 },
        bookings: [occupyingBooking],
        now: new Date("2026-07-20T06:00:00.000Z"),
        daysToSearch: 1,
        random: () => 0,
      }),
    ).toBeNull();
  });

  it("filters capacity suggestions by activity and fails safely for bad input", () => {
    const capacityStudio = {
      ...studio,
      availabilityMode: "capacity",
      slotStepMinutes: undefined,
      minBookingMinutes: undefined,
      resources: [
        { id: "wheel", capacity: 1 },
        { id: "kiln", capacity: 1 },
      ],
    };

    expect(pickSuggestedCalendarSlot()).toBeNull();
    expect(
      pickSuggestedCalendarSlot({
        studio: capacityStudio,
        now: "invalid",
      }),
    ).toBeNull();
    expect(
      pickSuggestedCalendarSlot({
        studio: capacityStudio,
        selectedActivityId: "kiln",
        now: new Date("2026-07-20T06:00:00.000Z"),
        daysToSearch: 1,
        random: () => -1,
      }),
    ).toMatchObject({ activityId: "kiln", startMinute: 9 * 60 });
    expect(
      pickSuggestedCalendarSlot({
        studio: capacityStudio,
        selectedActivityId: "missing",
        now: new Date("2026-07-20T06:00:00.000Z"),
        daysToSearch: 1,
        random: () => 2,
      }),
    ).toBeNull();
  });

  it("groups bookings by the studio wall-clock date across UTC midnight", () => {
    const bookings = [
      booking({
        _id: "same-local-day",
        start: "2026-07-19T22:30:00.000Z",
      }),
      booking({
        _id: "previous-local-day",
        start: "2026-07-19T21:30:00.000Z",
      }),
      booking({
        _id: "cancelled",
        start: "2026-07-19T22:30:00.000Z",
        status: "canceled",
      }),
    ];

    expect(
      bookingsForDay(bookings, monday, studio).map(({ _id }) => _id),
    ).toEqual(["same-local-day"]);
    expect(dateKey("2026-07-19T22:30:00.000Z", "Europe/Prague")).toBe(
      "2026-07-20",
    );
    expect(wallTimeMinutes("2026-07-20T08:30:00.000Z", "Europe/Prague")).toBe(
      10 * 60 + 30,
    );
  });

  it("converts winter and summer wall times with their correct DST offsets", () => {
    const winter = zonedDateTimeToUtc("2026-01-15", "09:00", "Europe/Prague");
    const summer = zonedDateTimeToUtc("2026-07-15", "09:00", "Europe/Prague");

    expect(winter.toISOString()).toBe("2026-01-15T08:00:00.000Z");
    expect(summer.toISOString()).toBe("2026-07-15T07:00:00.000Z");
    expect(formatWallDate(summer, "Europe/Prague")).toBe("2026-07-15");
    expect(formatWallTime(summer, "Europe/Prague")).toBe("09:00");
    expect(formatZonedDate(summer, "Europe/Prague", "en-GB")).toBe(
      "15 Jul 2026",
    );
    expect(formatZonedDate("invalid", "Europe/Prague", "en-GB")).toBe("");
  });

  it("measures elapsed duration correctly across the spring DST jump", () => {
    const start = zonedDateTimeToUtc("2026-03-29", "01:30", "Europe/Prague");
    const end = zonedDateTimeToUtc("2026-03-29", "03:30", "Europe/Prague");

    expect(start.toISOString()).toBe("2026-03-29T00:30:00.000Z");
    expect(end.toISOString()).toBe("2026-03-29T01:30:00.000Z");
    expect(durationInMinutes(start, end)).toBe(60);
    expect(durationMinutes(start, end)).toBe(60);
  });

  it("creates studio-zone slot instants, including the 24:00 boundary", () => {
    expect(makeSlotDate(monday, 9 * 60, "Europe/Prague").toISOString()).toBe(
      "2026-07-20T07:00:00.000Z",
    );
    expect(makeSlotDate(monday, 24 * 60, "Europe/Prague").toISOString()).toBe(
      "2026-07-20T22:00:00.000Z",
    );
  });

  it("builds product-led customer events for every availability mode", () => {
    const translate = (key, values) =>
      values ? `${key}:${JSON.stringify(values)}` : key;
    const source = [
      booking({
        _id: "mine",
        isMine: true,
        kind: "private",
        productName: "Private wheel session",
      }),
      booking({ _id: "blocked", kind: "block" }),
      booking({
        _id: "course-1",
        kind: "course",
        capacity: 6,
        capacityUsed: 6,
        guests: 2,
        publicTitle: "Wheel basics",
      }),
      booking({
        _id: "course-2",
        kind: "course",
        capacity: 6,
        capacityUsed: 6,
        guests: 1,
        publicTitle: "Wheel basics",
      }),
      booking({
        _id: "capacity-1",
        kind: "public",
        capacityUsed: 2,
      }),
      booking({
        _id: "capacity-2",
        kind: "public",
        capacityUsed: 1,
      }),
      booking({ _id: "cancelled", status: "cancelled", kind: "public" }),
    ];

    const events = buildCustomerEvents(
      source,
      { ...studio, availabilityMode: "capacity", groupBookingBlocksAll: false },
      translate,
    );
    const own = events.find(({ id, _id }) => id === "mine" || _id === "mine");
    const blocked = events.find(({ kind }) => kind === "block");
    const course = events.find(({ kind }) => kind === "course");
    const capacity = events.find(({ kind }) => kind === "public");

    expect(own).toMatchObject({ title: "Private wheel session", isMine: true });
    expect(blocked).toMatchObject({
      title: "events.unavailable",
      privacySafe: true,
    });
    expect(course).toMatchObject({
      title: "Wheel basics",
      capacity: 6,
      capacityUsed: 6,
      used: 2,
      privacySafe: true,
    });
    expect(capacity).toMatchObject({
      capacity: 5,
      capacityUsed: 3,
      used: 15,
      privacySafe: true,
    });
    expect(capacity.title).not.toContain("events.availability");
    expect(events.some(({ _id }) => _id === "cancelled")).toBe(false);

    const laneEvents = buildCustomerEvents(
      source.filter(({ kind }) => kind === "public"),
      {
        ...studio,
        resources: [],
        availabilityMode: "lanes",
        allowPublicSoloOverlap: true,
        publicLaneCount: 4,
      },
      translate,
    );
    expect(laneEvents[0]).toMatchObject({
      capacity: 4,
      capacityUsed: 3,
      used: 2,
      privacySafe: true,
    });
    expect(laneEvents[0].title).not.toContain("events.spotsAvailable");
  });

  it("converts minute offsets to dates and clamps negative durations", () => {
    expect(localDateKey(minutesToDate(monday, 9 * 60 + 30))).toBe("2026-07-20");
    expect(minutesToDate(monday, 9 * 60 + 30).getHours()).toBe(9);
    expect(
      durationMinutes("2026-07-20T10:00:00.000Z", "2026-07-20T09:00:00.000Z"),
    ).toBe(0);
    expect(bookingIsVisible({ status: "CONFIRMED" })).toBe(true);
    expect(bookingIsVisible({ status: "CANCELED" })).toBe(false);
  });
});

describe("customer calendar authoritative availability", () => {
  const availabilityStudio = {
    ...studio,
    availabilityMode: "capacity",
    bookingEnabled: true,
    allowPublicSoloOverlap: true,
    publicLaneCount: 3,
    globalCapacity: 6,
    slotStepMinutes: 30,
    minBookingMinutes: 60,
    resources: [
      { id: "wheel", name: "Wheels", capacity: 4 },
      { id: "table", name: "Tables", capacity: 6 },
    ],
  };
  const earlyNow = new Date("2026-07-20T05:00:00.000Z");

  it("resolves populated location and resource references without counting another studio", () => {
    const result = getCalendarSlotAvailability({
      studio: {
        ...availabilityStudio,
        resources: [{ activity: { _id: "wheel" }, capacity: 2 }],
      },
      bookings: [
        booking({
          locationId: undefined,
          location: { _id: "location-1" },
          capacityUsed: 2,
        }),
        booking({
          _id: "elsewhere",
          locationId: undefined,
          location: { id: "another-location" },
          capacityUsed: 100,
        }),
      ],
      day: monday,
      startMinute: 10 * 60,
      endMinute: 11 * 60,
      activityId: "wheel",
      now: earlyNow,
    });
    expect(result).toMatchObject({
      state: "full",
      isBookable: false,
      capacity: 2,
      used: 2,
      remaining: 0,
    });
  });

  it.each([
    [
      "legacy unclassified workshop",
      { bookingType: undefined, bookingMode: undefined },
    ],
    ["explicit exclusive flag", { isExclusive: true }],
    ["private booking mode", { bookingMode: "private" }],
    ["legacy private-session tag", { tag: "private-session" }],
  ])(
    "blocks a shared slot for a %s even before event-kind normalization",
    (_name, overrides) => {
      const privateBooking = booking({
        kind: "public",
        locationId: undefined,
        location: { _id: "location-1" },
        ...overrides,
      });
      const request = {
        studio: availabilityStudio,
        day: monday,
        startMinute: 10 * 60,
        endMinute: 11 * 60,
        activityId: "wheel",
        now: earlyNow,
      };
      expect(
        getCalendarSlotAvailability({ ...request, bookings: [privateBooking] }),
      ).toMatchObject({
        state: "blocked",
        isBookable: false,
        remaining: 0,
      });
      expect(
        getCalendarSlotAvailability({
          ...request,
          bookings: [{ ...privateBooking, location: { _id: "other-studio" } }],
        }),
      ).toMatchObject({ state: "available", isBookable: true });
    },
  );

  it.each([
    {
      name: "a raw private booking with half-hour slots",
      studio: {
        id: "location-1",
        timeZone: "UTC",
        calendarHours: { start: 23, end: 25 },
        minBookingMinutes: 60,
        slotStepMinutes: 30,
      },
      bookingOverrides: { bookingMode: "private" },
      expectedCounts: {},
    },
    {
      name: "a block with legacy fallback hours and hourly slots",
      studio: {
        ...availabilityStudio,
        timeZone: "UTC",
        openingHours: {},
        calendarHours: { start: 23, end: 25 },
        minBookingMinutes: 60,
        slotStepMinutes: 60,
      },
      bookingOverrides: { kind: "block" },
      activityId: "wheel",
      expectedCounts: { totalSlots: 1, fullSlots: 0 },
    },
  ])(
    "does not offer after-midnight overflow for $name",
    ({ studio: lateStudio, bookingOverrides, activityId, expectedCounts }) => {
      const request = {
        studio: lateStudio,
        day: monday,
        now: earlyNow,
        activityId,
        bookings: [
          booking({
            ...bookingOverrides,
            start: "2026-07-20T23:00:00Z",
            end: "2026-07-21T00:00:00Z",
          }),
        ],
      };
      expect(getCalendarDayAvailability(request)).toMatchObject({
        state: "blocked",
        isBookable: false,
        blockedSlots: 1,
        bookableSlots: [],
        nextAvailable: null,
        ...expectedCounts,
      });
      expect(getBookableSlotsForDay(request)).toEqual([]);
    },
  );

  it("marks a two-person public session full and scopes its limit to its active interval", () => {
    const request = {
      studio: availabilityStudio,
      day: monday,
      startMinute: 10 * 60,
      endMinute: 11 * 60,
      activityId: "wheel",
      guests: 1,
      now: earlyNow,
    };
    expect(
      getCalendarSlotAvailability({
        ...request,
        bookings: [booking({ capacityUsed: 2, publicCapacityLimit: 2 })],
      }),
    ).toMatchObject({
      state: "full",
      isBookable: false,
      capacity: 2,
      remaining: 0,
    });
    expect(
      getCalendarSlotAvailability({
        ...request,
        bookings: [
          booking({
            _id: "first",
            start: "2026-07-20T08:00:00Z",
            end: "2026-07-20T08:30:00Z",
            capacityUsed: 1,
            publicCapacityLimit: 2,
          }),
          booking({
            _id: "second",
            start: "2026-07-20T08:30:00Z",
            end: "2026-07-20T09:00:00Z",
            capacityUsed: 2,
            publicCapacityLimit: 3,
          }),
        ],
      }),
    ).toMatchObject({ isBookable: true, remaining: 1 });
  });

  it("checks peak overlap across the full duration instead of summing adjacent bookings", () => {
    const adjacentInsideRequest = [
      booking({
        _id: "first-half",
        capacityUsed: 2,
        start: "2026-07-20T08:00:00.000Z",
        end: "2026-07-20T08:30:00.000Z",
      }),
      booking({
        _id: "second-half",
        capacityUsed: 2,
        start: "2026-07-20T08:30:00.000Z",
        end: "2026-07-20T09:00:00.000Z",
      }),
    ];

    expect(
      getCalendarSlotAvailability({
        studio: availabilityStudio,
        bookings: adjacentInsideRequest,
        day: monday,
        startMinute: 10 * 60,
        endMinute: 11 * 60,
        activityId: "wheel",
        guests: 2,
        now: earlyNow,
      }),
    ).toMatchObject({
      state: "available",
      isBookable: true,
      activityId: "wheel",
      capacity: 4,
      used: 2,
      remaining: 2,
    });
  });

  it("enforces activity and global guest capacity, including the requested party size", () => {
    const activityFull = getCalendarSlotAvailability({
      studio: availabilityStudio,
      bookings: [booking({ capacityUsed: 3 })],
      day: monday,
      startMinute: 10 * 60,
      endMinute: 11 * 60,
      activityId: "wheel",
      guests: 2,
      now: earlyNow,
    });
    expect(activityFull).toMatchObject({
      state: "full",
      isBookable: false,
      capacity: 4,
      remaining: 1,
    });
    expect(activityFull.constraints).toContainEqual(
      expect.objectContaining({ type: "activity", used: 3, required: 2 }),
    );

    const globalFull = getCalendarSlotAvailability({
      studio: availabilityStudio,
      bookings: [
        booking({
          _id: "other-activity-party",
          activityId: "table",
          plannedActivity: "table",
          capacityUsed: 5,
        }),
      ],
      day: monday,
      startMinute: 10 * 60,
      endMinute: 11 * 60,
      activityId: "wheel",
      guests: 2,
      now: earlyNow,
    });
    expect(globalFull).toMatchObject({
      state: "full",
      isBookable: false,
      capacity: 6,
      used: 5,
      remaining: 1,
    });
  });

  it("honors disabled overlap even when activity capacity has free places", () => {
    const sharedCapacityStudio = {
      ...availabilityStudio,
      resources: [{ id: "wheel", capacity: 3 }],
      globalCapacity: 0,
      // People capacity does not override the location's overlap policy.
      publicLaneCount: 1,
      allowPublicSoloOverlap: false,
    };

    expect(
      getCalendarSlotAvailability({
        studio: sharedCapacityStudio,
        bookings: [booking({ capacityUsed: 1 })],
        day: monday,
        startMinute: 10 * 60,
        endMinute: 11 * 60,
        activityId: "wheel",
        guests: 1,
        now: earlyNow,
      }),
    ).toMatchObject({
      state: "full",
      isBookable: false,
      capacity: 1,
      used: 1,
      remaining: 0,
    });
  });

  it("fails closed when capacity mode has no configured resources", () => {
    expect(
      getCalendarSlotAvailability({
        studio: { ...availabilityStudio, resources: [] },
        bookings: [],
        day: monday,
        startMinute: 10 * 60,
        endMinute: 11 * 60,
        now: earlyNow,
      }),
    ).toMatchObject({
      state: "full",
      isBookable: false,
      capacity: 0,
      remaining: 0,
    });
  });

  it("supports shared lane overlap but rejects peak lane saturation", () => {
    const laneStudio = {
      ...availabilityStudio,
      availabilityMode: "lanes",
      resources: [],
      globalCapacity: 0,
      publicLaneCount: 2,
    };
    const firstHalf = booking({
      _id: "lane-first",
      start: "2026-07-20T08:00:00.000Z",
      end: "2026-07-20T08:30:00.000Z",
    });
    const secondHalf = booking({
      _id: "lane-second",
      start: "2026-07-20T08:30:00.000Z",
      end: "2026-07-20T09:00:00.000Z",
    });
    const request = {
      studio: laneStudio,
      day: monday,
      startMinute: 10 * 60,
      endMinute: 11 * 60,
      now: earlyNow,
    };

    expect(
      getCalendarSlotAvailability({
        ...request,
        bookings: [firstHalf, secondHalf],
      }),
    ).toMatchObject({ isBookable: true, capacity: 2, used: 1, remaining: 1 });
    expect(
      getCalendarSlotAvailability({
        ...request,
        bookings: [
          firstHalf,
          booking({
            _id: "lane-concurrent",
            start: "2026-07-20T08:00:00.000Z",
            end: "2026-07-20T08:30:00.000Z",
          }),
        ],
      }),
    ).toMatchObject({ state: "full", isBookable: false, used: 2 });
  });

  it("counts customer-safe grouped events as lanes and ignores previews", () => {
    const laneStudio = {
      ...availabilityStudio,
      availabilityMode: "lanes",
      resources: [],
      globalCapacity: 0,
      publicLaneCount: 2,
    };
    const grouped = booking({
      _id: "safe-group",
      grouped: [
        booking({ _id: "grouped-one" }),
        booking({ _id: "grouped-two" }),
      ],
    });
    const request = {
      studio: laneStudio,
      day: monday,
      startMinute: 10 * 60,
      endMinute: 11 * 60,
      now: earlyNow,
    };

    expect(
      getCalendarSlotAvailability({ ...request, bookings: [grouped] }),
    ).toMatchObject({ state: "full", isBookable: false, used: 2 });
    expect(
      getCalendarSlotAvailability({
        ...request,
        bookings: [
          {
            ...grouped,
            grouped: [
              booking({ _id: "real" }),
              booking({ _id: "preview", isSuggested: true }),
            ],
          },
        ],
      }),
    ).toMatchObject({ state: "available", isBookable: true, used: 1 });
  });

  it("distinguishes global blockers, elapsed slots, closed time and open time", () => {
    const request = {
      studio: availabilityStudio,
      day: monday,
      startMinute: 10 * 60,
      endMinute: 11 * 60,
      activityId: "wheel",
      now: earlyNow,
    };
    expect(
      getCalendarSlotAvailability({
        ...request,
        bookings: [booking({ kind: "exclusiveOpenStudio" })],
      }),
    ).toMatchObject({ state: "blocked", isBookable: false });
    expect(
      getCalendarSlotAvailability({
        ...request,
        bookings: [],
        now: new Date("2026-07-20T08:00:00.000Z"),
      }),
    ).toMatchObject({ state: "past", isBookable: false });
    expect(
      getCalendarSlotAvailability({
        ...request,
        bookings: [],
        startMinute: 8 * 60,
        endMinute: 9 * 60,
      }),
    ).toMatchObject({ state: "closed", isBookable: false });
    expect(
      getCalendarSlotAvailability({
        ...request,
        studio: { ...availabilityStudio, bookingEnabled: false },
        bookings: [],
      }),
    ).toMatchObject({ state: "closed", isBookable: false });
    expect(
      getCalendarSlotAvailability({ ...request, bookings: [] }),
    ).toMatchObject({ state: "available", isBookable: true });
  });

  it("returns capacity-aware minimum-duration slots and a month summary", () => {
    const shortDayStudio = {
      ...availabilityStudio,
      openingHours: {
        ...availabilityStudio.openingHours,
        monday: { isOpen: true, openTime: "09:00", closeTime: "11:30" },
      },
    };
    const blockedFirstHour = booking({
      _id: "morning-block",
      kind: "privateStudio",
      start: "2026-07-20T07:00:00.000Z",
      end: "2026-07-20T08:00:00.000Z",
    });
    const slots = getBookableSlotsForDay({
      studio: shortDayStudio,
      bookings: [blockedFirstHour],
      day: monday,
      activityId: "wheel",
      now: earlyNow,
      limit: 2,
    });

    expect(slots).toHaveLength(2);
    expect(slots.map(({ startMinute }) => startMinute)).toEqual([
      10 * 60,
      10 * 60 + 30,
    ]);
    expect(slots.every(({ isBookable }) => isBookable)).toBe(true);

    const fullDayStudio = {
      ...shortDayStudio,
      openingHours: {
        ...shortDayStudio.openingHours,
        monday: { isOpen: true, openTime: "09:00", closeTime: "10:00" },
      },
    };
    const summary = getCalendarDayAvailability({
      studio: fullDayStudio,
      bookings: [
        booking({
          capacityUsed: 4,
          start: "2026-07-20T07:00:00.000Z",
          end: "2026-07-20T08:00:00.000Z",
        }),
      ],
      day: monday,
      activityId: "wheel",
      now: earlyNow,
    });
    expect(summary).toMatchObject({
      state: "full",
      isBookable: false,
      totalSlots: 1,
      fullSlots: 1,
      nextAvailable: null,
    });
  });

  it("derives Day and Week ranges from the selected studio opening hours", () => {
    const normalized = normalizeLocationToCalendarStudio({
      _id: "variable-hours-studio",
      actualCalendarHours: { start: 5, end: 23 },
      calendarHours: { start: 5, end: 23 },
      openingHours: {
        monday: { isOpen: true, openTime: "06:30", closeTime: "20:15" },
        tuesday: { isOpen: true, openTime: "08:00", closeTime: "18:00" },
        wednesday: { isOpen: false, openTime: "08:00", closeTime: "18:00" },
        thursday: { isOpen: true, openTime: "22:00", closeTime: "06:00" },
      },
      booking: {
        timezone: "Europe/Prague",
        minBookingMinutes: 60,
      },
    });
    const tuesday = new Date("2026-07-21T12:00:00.000Z");
    const wednesday = new Date("2026-07-22T12:00:00.000Z");
    const thursday = new Date("2026-07-23T12:00:00.000Z");

    expect(normalized.calendarHours).toEqual({ start: 0, end: 24 });
    expect(normalized.actualCalendarHours).toEqual({ start: 0, end: 24 });
    expect(getCalendarDisplayHours(normalized, [monday])).toEqual({
      start: 6,
      end: 21,
    });
    expect(getCalendarDisplayHours(normalized, [tuesday])).toEqual({
      start: 8,
      end: 18,
    });
    expect(getCalendarDisplayHours(normalized, getWeekDays(monday))).toEqual({
      start: 0,
      end: 24,
    });
    expect(getCalendarDisplayHours(normalized, [wednesday])).toEqual({
      start: 0,
      end: 24,
    });
    expect(getStudioOpeningWindow(normalized, thursday)).toEqual({
      isOpen: true,
      openMinutes: 22 * 60,
      closeMinutes: 30 * 60,
    });
    expect(
      getCalendarSlotAvailability({
        studio: normalized,
        day: monday,
        startMinute: 6 * 60,
        endMinute: 6.5 * 60,
        now: earlyNow,
      }).state,
    ).toBe("closed");
  });

  it("supports a full-day 00:00–24:00 calendar range", () => {
    const sunday = new Date("2026-07-26T12:00:00.000Z");
    const normalized = normalizeLocationToCalendarStudio({
      _id: "full-day-studio",
      openingHours: {
        sunday: { isOpen: true, openTime: "00:00", closeTime: "24:00" },
      },
      booking: { timezone: "Europe/Prague", minBookingMinutes: 60 },
    });
    const displayHours = getCalendarDisplayHours(normalized, [sunday]);
    const displayStudio = {
      ...normalized,
      displayCalendarHours: displayHours,
    };
    const slots = getTimeSlots(displayStudio, 60);

    expect(displayHours).toEqual({ start: 0, end: 24 });
    expect(getStudioOpeningWindow(normalized, sunday)).toEqual({
      isOpen: true,
      openMinutes: 0,
      closeMinutes: 24 * 60,
    });
    expect(slots[0].minute).toBe(0);
    expect(slots.at(-1).minute).toBe(24 * 60);

    const position = eventPosition(
      {
        start: makeSlotDate(sunday, 23 * 60, normalized.timeZone),
        end: makeSlotDate(sunday, 24 * 60, normalized.timeZone),
      },
      displayStudio,
      1,
    );
    expect(position.height).toBe(60);
  });

  it("keeps available slots on an almost-white tenant tint", () => {
    expect(getCustomerCalendarSlotSurface("available")).toBe(
      "var(--tenant-calendar-available-surface, color-mix(in srgb, var(--tenant-accent) 1%, #FFFFFF))",
    );
    expect(getCustomerCalendarSlotSurface("available")).not.toContain(
      "var(--tenant-surface)",
    );
    expect(getCustomerCalendarSlotSurface("limited")).toContain(
      "var(--tenant-surface)",
    );
    expect(getCustomerCalendarSlotSurface("past")).not.toContain("#FFFFFF");
  });
});

describe("location booking options and availability preflight", () => {
  it("normalizes location identity, timezone, and display address", () => {
    expect(getEntityId(location)).toBe("location-1");
    expect(getEntityId({ id: 42 })).toBe("42");
    expect(getEntityId(null)).toBe("");
    expect(getBookingLocationId({ location })).toBe("location-1");
    expect(getLocationTimeZone(location)).toBe("Europe/Prague");
    expect(getLocationTimeZone({ timezone: "Europe/London" })).toBe(
      "Europe/London",
    );
    expect(formatLocationAddress(location)).toBe(
      "Clay Street 1, Studio B, 110 00 Prague, CZ",
    );
    expect(formatLocationAddress(location, { includeCountry: false })).toBe(
      "Clay Street 1, Studio B, 110 00 Prague",
    );
    expect(formatLocationAddress({ address: " Main square " })).toBe(
      "Main square",
    );
  });

  it("builds only start times and durations that fit opening hours", () => {
    expect(getOpeningWindow(location, "2026-07-20")).toEqual({
      isOpen: true,
      openMinutes: 540,
      closeMinutes: 1020,
    });
    expect(buildStartTimeOptions(location, "2026-07-20")).toEqual([
      "09:00",
      "09:30",
      "10:00",
      "10:30",
      "11:00",
      "11:30",
      "12:00",
      "12:30",
      "13:00",
      "13:30",
      "14:00",
      "14:30",
      "15:00",
      "15:30",
      "16:00",
    ]);
    expect(buildDurationOptions(location, "2026-07-20", "15:00")).toEqual([
      60, 90, 120,
    ]);
    expect(buildDurationOptions(location, "2026-07-20", "16:00")).toEqual([60]);
    expect(buildDurationOptions(location, "2026-07-20", "16:30")).toEqual([]);
    expect(buildStartTimeOptions(location, "2026-07-21")).toEqual([]);
    expect(buildDurationOptions(location, "2026-07-21", "09:00")).toEqual([]);
    expect(buildDurationOptions(location, "2026-07-20", "")).toEqual([]);
    expect(formatDuration(90)).toBe("1 hr 30 min");
    expect(formatDuration(120, "CZ")).toBe("2 h");
    expect(formatDuration(45)).toBe("45 min");
  });

  it("does not block a booking that starts exactly when another one ends", () => {
    expect(
      checkLocationAvailability({
        location,
        bookings: [booking()],
        start: "2026-07-20T09:00:00.000Z",
        end: "2026-07-20T10:00:00.000Z",
        guests: 1,
        bookingType: "public",
        activity: "WHEEL",
      }),
    ).toEqual({ available: true, reason: null });
  });

  it("enforces public-overlap, global, and per-activity capacity", () => {
    const existing = [
      booking(),
      booking({
        _id: "booking-2",
        start: "2026-07-20T08:15:00.000Z",
        end: "2026-07-20T09:15:00.000Z",
      }),
    ];

    expect(
      checkLocationAvailability({
        location,
        bookings: existing,
        start: "2026-07-20T08:30:00.000Z",
        end: "2026-07-20T09:30:00.000Z",
        guests: 1,
        bookingType: "public",
        activity: "WHEEL",
      }),
    ).toEqual({
      available: false,
      reason: "LOCATION_ACTIVITY_CAPACITY_EXCEEDED",
    });

    expect(
      checkLocationAvailability({
        location: {
          ...location,
          booking: {
            ...location.booking,
            activityCapacities: [],
            globalCapacity: 2,
          },
        },
        bookings: existing,
        start: "2026-07-20T08:30:00.000Z",
        end: "2026-07-20T09:30:00.000Z",
        guests: 1,
        bookingType: "public",
      }),
    ).toEqual({
      available: false,
      reason: "LOCATION_CAPACITY_EXCEEDED",
    });
  });

  it("enforces public overlap policy and private-booking exclusivity", () => {
    const existing = [booking()];
    const request = {
      bookings: existing,
      start: "2026-07-20T08:30:00.000Z",
      end: "2026-07-20T09:30:00.000Z",
      guests: 1,
      bookingType: "public",
    };

    expect(
      checkLocationAvailability({
        ...request,
        location: {
          ...location,
          booking: {
            ...location.booking,
            allowPublicSoloOverlap: false,
          },
        },
      }),
    ).toEqual({
      available: false,
      reason: "LOCATION_OVERLAP_NOT_ALLOWED",
    });
    expect(
      checkLocationAvailability({
        ...request,
        location: {
          ...location,
          booking: {
            ...location.booking,
            maxPublicSoloOverlaps: 1,
          },
        },
      }),
    ).toEqual({
      available: false,
      reason: "LOCATION_CAPACITY_EXCEEDED",
    });
    expect(
      checkLocationAvailability({
        ...request,
        location,
        bookingType: "private",
      }),
    ).toEqual({
      available: false,
      reason: "LOCATION_OVERLAP_NOT_ALLOWED",
    });
  });

  it("blocks private sessions and rejects unavailable locations", () => {
    expect(
      checkLocationAvailability({
        location,
        bookings: [booking({ tag: "private-session" })],
        start: "2026-07-20T08:30:00.000Z",
        end: "2026-07-20T09:30:00.000Z",
      }),
    ).toEqual({
      available: false,
      reason: "LOCATION_OVERLAP_NOT_ALLOWED",
    });
    expect(
      checkLocationAvailability({
        location: { ...location, booking: { enabled: false } },
        start: "2026-07-20T08:30:00.000Z",
        end: "2026-07-20T09:30:00.000Z",
      }),
    ).toEqual({
      available: false,
      reason: "LOCATION_NOT_AVAILABLE",
    });
    expect(durationInMinutes("invalid", "also-invalid")).toBe(0);
    expect(
      durationInMinutes("2026-07-20T10:00:00.000Z", "2026-07-20T09:00:00.000Z"),
    ).toBe(0);
  });
});
