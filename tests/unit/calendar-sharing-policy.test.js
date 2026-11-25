import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";

import {
  normalizeBookingToCalendarEvent,
  normalizeLocationToCalendarStudio,
} from "@/components/calendar/calendar.adapters";
import { getCalendarAvailabilityLabel } from "@/components/calendar/calendar.presentation";
import { getCalendarSlotAvailability } from "@/components/calendar/calendar.utils";
import { checkLocationAvailability } from "@/utils/locationBookingUtils";
import {
  isCustomerChoiceOpenStudio,
  resolveOpenStudioBookingMode,
} from "@/lib/features/products/products.contract.mjs";
import messages from "@/messages/en.json";

const WHEEL = "WORKSTATION";
const MODELLING = "SHARED_TABLE";
const day = new Date("2030-05-06T12:00:00Z");
const now = new Date("2030-05-01T00:00:00Z");
const start = "2030-05-06T09:00:00Z";
const end = "2030-05-06T10:00:00Z";
const location = {
  id: "studio",
  openingHours: {
    monday: { isOpen: true, openTime: "08:00", closeTime: "18:00" },
  },
  booking: {
    enabled: true,
    timezone: "UTC",
    globalCapacity: 14,
    allowPublicOverlap: true,
    maxConcurrentOpenStudioBookings: 14,
    activityCapacities: [
      { activity: WHEEL, capacity: 6 },
      { activity: MODELLING, capacity: 8 },
    ],
  },
};
const product = {
  kind: "open-studio",
  bookingMode: "public",
  maxNumberOfParticipants: 14,
};
const visit = (overrides = {}) => ({
  id: "visit",
  locationId: "studio",
  tag: "open-studio",
  bookingMode: "public",
  status: "confirmed",
  paymentStatus: "CONFIRMED",
  numberOfGuests: 1,
  plannedActivity: MODELLING,
  start,
  end,
  ...overrides,
});

describe("legacy public workshops where group bookings block the studio", () => {
  it.each([
    ["shared workshop", { tag: "workshop" }, "public", "available", 5],
    [
      "canonical shared booking",
      { tag: "open-studio" },
      "public",
      "available",
      5,
    ],
    [
      "full shared workshop",
      { tag: "workshop", numberOfGuests: 6 },
      "public",
      "full",
      0,
    ],
    [
      "exclusive workshop",
      { tag: "workshop", bookingMode: "private" },
      "public",
      "blocked",
      0,
    ],
    [
      "legacy workshop without privacy",
      { tag: "workshop", bookingMode: undefined, bookingType: undefined },
      "public",
      "blocked",
      0,
    ],
    ["public class", { tag: "class", capacityUsed: 1 }, "public", "blocked", 0],
    ["private studio block", { tag: "private-studio" }, "public", "blocked", 0],
    ["new exclusive booking", { tag: "workshop" }, "private", "blocked", 0],
    [
      "shared workshop without an activity",
      { tag: "workshop" },
      "public",
      "available",
      2,
      WHEEL,
    ],
    [
      "shared wheel booking",
      { tag: "workshop", plannedActivity: WHEEL },
      "public",
      "available",
      1,
      WHEEL,
    ],
  ])(
    "checks the 19:00–20:00 draft against a %s",
    (_label, overrides, mode, state, remaining, activity = MODELLING) => {
      const sharedLocation = {
        id: "studio",
        openingHours: {
          tuesday: { isOpen: true, openTime: "00:00", closeTime: "24:00" },
        },
        booking: {
          enabled: true,
          timezone: "Europe/Prague",
          globalCapacity: 6,
          allowPublicOverlap: true,
          maxConcurrentOpenStudioBookings: 6,
          groupBookingBlocksAll: true,
          activityCapacities: [
            { activity: WHEEL, capacity: 2 },
            { activity: MODELLING, capacity: 6 },
          ],
        },
      };
      // Existing session 17:00–20:00 and requested slot 19:00–20:00 in Prague.
      const booking = visit({
        id: "legacy-public-visit",
        locationId: "studio",
        bookingType: "public",
        status: "processed",
        plannedActivity: "UNDEFINED",
        publicCapacityLimit: null,
        start: "2026-11-24T16:00:00Z",
        end: "2026-11-24T19:00:00Z",
        ...overrides,
      });
      const studio = normalizeLocationToCalendarStudio(sharedLocation);
      const event = normalizeBookingToCalendarEvent(booking);
      const fixedNow = new Date("2026-11-13T12:00:00Z");
      const calendar = getCalendarSlotAvailability({
        studio,
        bookings: [event],
        day: new Date(2026, 10, 24, 12),
        startMinute: 19 * 60,
        endMinute: 20 * 60,
        activityId: activity,
        bookingMode: mode,
        now: fixedNow,
      });
      const drawer = checkLocationAvailability({
        location: sharedLocation,
        // A fixed shared product's party limit is not the location's capacity.
        product: { ...product, maxNumberOfParticipants: 1 },
        bookings: [booking],
        start: "2026-11-24T18:00:00Z",
        end: "2026-11-24T19:00:00Z",
        activity,
        guests: 1,
        bookingMode: mode,
        now: fixedNow,
      });
      expect(calendar).toMatchObject({
        state,
        remaining,
        isBookable: state === "available",
      });
      expect(calendar.isBookable).toBe(drawer.available);
    },
  );
});

function compareAvailability({
  policy = {},
  bookings = [visit({ isMine: true })],
  activity = MODELLING,
  guests = 1,
  bookingMode = "public",
} = {}) {
  const configuredLocation = {
    ...location,
    booking: { ...location.booking, ...policy },
  };
  const studio = normalizeLocationToCalendarStudio(configuredLocation);
  const calendar = getCalendarSlotAvailability({
    studio,
    bookings: bookings.map((booking) =>
      normalizeBookingToCalendarEvent(booking),
    ),
    day,
    startMinute: 9 * 60,
    endMinute: 10 * 60,
    activityId: activity,
    guests,
    bookingMode,
    now,
  });
  const drawer = checkLocationAvailability({
    location: configuredLocation,
    product,
    bookings,
    start,
    end,
    activity,
    guests,
    bookingMode,
    now,
  });
  expect(calendar.isBookable).toBe(drawer.available);
  return { calendar, drawer, studio };
}

describe("calendar and drawer shared-studio policy", () => {
  it("keeps fixed public studio products public even when a private mode is requested", () => {
    expect(isCustomerChoiceOpenStudio(product)).toBe(false);
    expect(resolveOpenStudioBookingMode(product, "private")).toBe("public");
  });

  it.each(["class", "course"])(
    "shares capacity with a %s when group blocking is disabled, including a legacy private mode",
    (tag) => {
      const bookings = [
        visit({
          tag,
          bookingMode: "private",
          plannedActivity: WHEEL,
          numberOfGuests: 3,
          maxNumberOfParticipants: 3,
        }),
      ];
      expect(
        compareAvailability({
          policy: { groupBookingBlocksAll: false },
          bookings,
          activity: WHEEL,
        }).calendar,
      ).toMatchObject({ isBookable: true, remaining: 3 });
      expect(
        compareAvailability({
          policy: { groupBookingBlocksAll: false },
          bookings,
          activity: MODELLING,
        }).calendar,
      ).toMatchObject({ isBookable: true, remaining: 8 });
    },
  );

  it.each(["public", "private"])(
    "keeps a %s course exclusive where group blocking is enabled",
    (bookingMode) => {
      expect(
        compareAvailability({
          policy: { groupBookingBlocksAll: true },
          bookings: [visit({ tag: "class", bookingMode, numberOfGuests: 3 })],
        }).calendar,
      ).toMatchObject({ state: "blocked", isBookable: false });
    },
  );

  it("reserves scheduled course places even before the class fills up", () => {
    const bookings = [
      visit({
        tag: "class",
        bookingMode: "private",
        plannedActivity: WHEEL,
        numberOfGuests: 1,
        maxNumberOfParticipants: 6,
        capacityUsed: 6,
      }),
    ];
    expect(
      compareAvailability({
        policy: { groupBookingBlocksAll: false },
        bookings,
        activity: WHEEL,
      }).calendar,
    ).toMatchObject({ state: "full", isBookable: false });
    expect(
      compareAvailability({
        policy: { groupBookingBlocksAll: false },
        bookings,
        activity: MODELLING,
      }).calendar,
    ).toMatchObject({ isBookable: true, remaining: 8 });
  });

  it("uses the server's aggregate course reservation without changing displayed attendance", () => {
    const course = visit({
      tag: "class",
      numberOfGuests: 1,
      maxNumberOfParticipants: 6,
      capacityUsed: 7,
      plannedActivity: WHEEL,
    });
    const normalized = normalizeBookingToCalendarEvent(course);
    expect(normalized).toMatchObject({
      guests: 1,
      capacity: 6,
      capacityUsed: 7,
    });
    expect(
      compareAvailability({
        policy: { groupBookingBlocksAll: false },
        bookings: [course],
        activity: MODELLING,
      }).calendar,
    ).toMatchObject({ isBookable: true, remaining: 7 });
    expect(
      compareAvailability({
        policy: { groupBookingBlocksAll: false },
        bookings: [course],
        activity: MODELLING,
        guests: 8,
      }).calendar.isBookable,
    ).toBe(false);
  });

  it.each([undefined, "UNDEFINED"])(
    "reserves every activity for a course without an assigned activity (%s)",
    (plannedActivity) => {
      const course = visit({
        tag: "course",
        bookingMode: "private",
        maxNumberOfParticipants: 6,
        capacityUsed: 6,
        plannedActivity,
      });
      expect(
        compareAvailability({
          policy: { groupBookingBlocksAll: false },
          bookings: [course],
          activity: WHEEL,
        }).calendar,
      ).toMatchObject({ isBookable: false, state: "full" });
      expect(
        compareAvailability({
          policy: { groupBookingBlocksAll: false },
          bookings: [course],
          activity: MODELLING,
        }).calendar,
      ).toMatchObject({ isBookable: true, remaining: 2 });
    },
  );

  it("does not count shared courses against the Open Studio concurrent-reservation limit", () => {
    const course = visit({
      tag: "class",
      bookingMode: "private",
      maxNumberOfParticipants: 3,
      plannedActivity: WHEEL,
    });
    const policy = {
      groupBookingBlocksAll: false,
      allowPublicOverlap: false,
      maxConcurrentOpenStudioBookings: 1,
    };
    expect(
      compareAvailability({ policy, bookings: [course] }).calendar.isBookable,
    ).toBe(true);
    expect(
      compareAvailability({
        policy,
        bookings: [course, visit({ id: "another-visit" })],
      }).calendar.isBookable,
    ).toBe(false);
  });

  it.each(["UNDEFINED", WHEEL])(
    "reserves global places without equipment for an explicitly no-equipment course (%s)",
    (plannedActivity) => {
      const course = visit({
        tag: "class",
        bookingMode: "private",
        numberOfGuests: 1,
        maxNumberOfParticipants: 5,
        capacityUsed: 5,
        courseEquipmentRequired: false,
        plannedActivity,
      });
      expect(normalizeBookingToCalendarEvent(course)).toMatchObject({
        courseEquipmentRequired: false,
        guests: 1,
        capacityUsed: 5,
      });
      const shared = {
        policy: { groupBookingBlocksAll: false },
        bookings: [course],
      };
      expect(
        compareAvailability({ ...shared, activity: WHEEL, guests: 6 }).calendar,
      ).toMatchObject({ isBookable: true, remaining: 6 });
      const { calendar } = compareAvailability({
        ...shared,
        activity: MODELLING,
        guests: 8,
      });
      expect(calendar.isBookable).toBe(true);
      expect(calendar.constraints).toContainEqual(
        expect.objectContaining({
          type: "global",
          capacity: 14,
          used: 5,
          remaining: 9,
        }),
      );
      expect(
        compareAvailability({
          ...shared,
          bookings: [
            course,
            visit({
              id: "wheel-visit",
              plannedActivity: WHEEL,
              numberOfGuests: 6,
            }),
          ],
          activity: MODELLING,
          guests: 4,
        }).calendar.isBookable,
      ).toBe(false);
    },
  );

  it("does not apply the no-equipment course override to Open Studio visits", () => {
    expect(
      compareAvailability({
        policy: { groupBookingBlocksAll: false },
        bookings: [
          visit({
            plannedActivity: WHEEL,
            numberOfGuests: 6,
            courseEquipmentRequired: false,
          }),
        ],
        activity: WHEEL,
      }).calendar,
    ).toMatchObject({ isBookable: false, state: "full" });
  });

  it("preserves blocking when the location has no explicit course-sharing policy", () => {
    expect(
      compareAvailability({
        bookings: [visit({ tag: "class", maxNumberOfParticipants: 3 })],
      }).calendar,
    ).toMatchObject({ isBookable: false, state: "blocked" });
  });

  it.each([
    {},
    { capacityUsed: 0, maxNumberOfParticipants: null },
    {
      capacityUsed: 6,
      maxNumberOfParticipants: 6,
      courseCapacityUnavailable: true,
    },
  ])(
    "keeps a course blocked when its reserved capacity cannot be established: %j",
    (capacityFields) => {
      expect(
        compareAvailability({
          policy: { groupBookingBlocksAll: false },
          bookings: [visit({ tag: "class", ...capacityFields })],
        }).calendar,
      ).toMatchObject({ isBookable: false, state: "blocked" });
    },
  );

  it("ignores cancelled shared courses", () => {
    expect(
      compareAvailability({
        policy: { groupBookingBlocksAll: false },
        bookings: [
          visit({
            tag: "class",
            status: "cancelled",
            maxNumberOfParticipants: 14,
          }),
        ],
      }).calendar,
    ).toMatchObject({ isBookable: true, remaining: 8 });
  });

  it.each([
    { tag: "block" },
    { tag: "private-studio" },
    { tag: "class", isClosure: true },
    { tag: "open-studio", bookingMode: "private" },
  ])(
    "keeps closures and existing exclusive reservations blocked with shared courses enabled: %j",
    (overrides) => {
      expect(
        compareAvailability({
          policy: { groupBookingBlocksAll: false },
          bookings: [visit({ courseEquipmentRequired: false, ...overrides })],
        }).calendar,
      ).toMatchObject({ state: "blocked", isBookable: false });
    },
  );

  it.each([
    [false, 1, false],
    [false, 14, false],
    [true, 1, false],
    [true, 14, true],
  ])(
    "uses overlap=%s and concurrent bookings=%i with spare activity places",
    (allow, limit, available) => {
      const { calendar } = compareAvailability({
        policy: {
          allowPublicOverlap: allow,
          maxConcurrentOpenStudioBookings: limit,
        },
      });
      expect(calendar.isBookable).toBe(available);
      expect(calendar.remaining).toBe(available ? 7 : 0);
    },
  );

  it("does not turn one free reservation into a one-person limit", () => {
    const { calendar } = compareAvailability({
      policy: { allowPublicOverlap: false, maxConcurrentOpenStudioBookings: 1 },
      bookings: [],
      guests: 8,
    });
    expect(calendar).toMatchObject({
      isBookable: true,
      capacity: 8,
      remaining: 8,
    });
  });

  it("supports legacy policy names while canonical false and count-one take precedence", () => {
    expect(
      compareAvailability({
        policy: {
          allowPublicOverlap: undefined,
          maxConcurrentOpenStudioBookings: undefined,
          allowPublicSoloOverlap: true,
          maxPublicSoloOverlaps: 14,
        },
      }).calendar.isBookable,
    ).toBe(true);
    expect(
      compareAvailability({
        policy: { allowPublicOverlap: false, allowPublicSoloOverlap: true },
      }).calendar.isBookable,
    ).toBe(false);
    expect(
      compareAvailability({
        policy: { maxConcurrentOpenStudioBookings: 1, maxPublicOverlaps: 14 },
      }).calendar.isBookable,
    ).toBe(false);
  });

  it.each([
    { bookingMode: "private" },
    { bookingMode: undefined, bookingType: "private" },
    { bookingMode: undefined, bookingType: undefined },
    { tag: "private-studio" },
  ])(
    "honors an existing exclusive or legacy booking snapshot %j",
    (overrides) => {
      const { calendar } = compareAvailability({
        bookings: [visit(overrides)],
      });
      expect(calendar).toMatchObject({ state: "blocked", isBookable: false });
    },
  );

  it("honors a requested exclusive booking even when the existing visit is shared", () => {
    expect(
      compareAvailability({ bookingMode: "private" }).calendar,
    ).toMatchObject({
      state: "blocked",
      isBookable: false,
    });
  });

  it("allows 6 wheel and 8 modelling visitors but rejects either activity's next person", () => {
    const bookings = [
      ...Array.from({ length: 5 }, (_, index) =>
        visit({ id: `wheel-${index}`, plannedActivity: WHEEL }),
      ),
      ...Array.from({ length: 8 }, (_, index) =>
        visit({ id: `model-${index}` }),
      ),
    ];
    expect(
      compareAvailability({ bookings, activity: WHEEL }).calendar,
    ).toMatchObject({
      isBookable: true,
      remaining: 1,
    });
    expect(
      compareAvailability({ bookings, activity: MODELLING }).calendar
        .isBookable,
    ).toBe(false);
    const full = [
      ...bookings,
      visit({ id: "wheel-last", plannedActivity: WHEEL }),
    ];
    expect(
      compareAvailability({ bookings: full, activity: WHEEL }).calendar
        .isBookable,
    ).toBe(false);
  });

  it("checks peak bookings rather than adding adjacent visits", () => {
    const { calendar } = compareAvailability({
      policy: { maxConcurrentOpenStudioBookings: 2 },
      bookings: [
        visit({ id: "first", end: "2030-05-06T09:30:00Z" }),
        visit({ id: "second", start: "2030-05-06T09:30:00Z" }),
      ],
      guests: 7,
    });
    expect(calendar).toMatchObject({ isBookable: true, remaining: 7 });
  });

  it("labels the preferred bookable activity's 8 places rather than advertising 14 for it", () => {
    const { studio } = compareAvailability({ bookings: [] });
    const availability = getCalendarSlotAvailability({
      studio,
      day,
      startMinute: 9 * 60,
      endMinute: 10 * 60,
      now,
    });
    expect(availability).toMatchObject({
      activityId: MODELLING,
      remaining: 8,
      capacity: 8,
    });
    const t = createTranslator({ locale: "en", messages: messages.Calendar });
    const label = getCalendarAvailabilityLabel(availability, t, studio);
    expect(label).toContain(t("activities.SHARED_TABLE"));
    expect(label).toContain("8");
    expect(label).not.toContain("14");
  });
});
