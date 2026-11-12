import { describe, expect, it } from "vitest";

import { getCustomerCalendarBookingSelection } from "@/components/calendar/calendar.bookingSelection";
import { normalizeBookingToCalendarEvent } from "@/components/calendar/calendar.adapters";

const now = new Date("2030-05-01T00:00:00Z");
const studio = {
  id: "vaclavska",
  timeZone: "Europe/Prague",
  bookingEnabled: true,
  availabilityMode: "capacity",
  globalCapacity: 8,
  allowPublicOverlap: true,
  maxConcurrentOpenStudioBookings: 8,
  slotStepMinutes: 30,
  minBookingMinutes: 60,
  maxBookingMinutes: 360,
  resources: [
    { id: "WORKSTATION", capacity: 4 },
    { id: "SHARED_TABLE", capacity: 4 },
  ],
  openingHours: {
    monday: { isOpen: true, openTime: "08:00", closeTime: "18:00" },
  },
};
const event = {
  id: "safe-occupancy-summary",
  kind: "sharedOpenStudio",
  locationId: studio.id,
  productId: "studio-product",
  activityId: "WORKSTATION",
  bookingMode: "public",
  start: "2030-05-06T07:00:00Z",
  end: "2030-05-06T10:00:00Z",
  guests: 1,
  capacityUsed: 1,
};
const select = (overrides = {}) =>
  getCustomerCalendarBookingSelection({
    studio,
    event,
    bookings: [event],
    now,
    ...overrides,
  });

describe("customer calendar booking creation selection", () => {
  it("creates a minimum-duration booking on an existing shared session", () => {
    expect(select()).toMatchObject({
      state: "available",
      selection: {
        studio,
        activityId: "WORKSTATION",
        productId: "studio-product",
        start: new Date("2030-05-06T07:00:00Z"),
        end: new Date("2030-05-06T08:00:00Z"),
        quantity: 1,
      },
    });
  });

  it("creates rather than edits an owned booking without copying private fields", () => {
    const selection = select({
      event: {
        ...event,
        id: "own-booking",
        isMine: true,
        customerId: "private-customer",
        doorCode: "private-code",
        paymentStatus: "CONFIRMED",
      },
    }).selection;
    expect(Object.keys(selection).sort()).toEqual([
      "activityId",
      "end",
      "productId",
      "quantity",
      "start",
      "studio",
    ]);
    expect(selection).not.toHaveProperty("bookingId");
    expect(selection).not.toHaveProperty("courseSessionId");
  });

  it("checks the full minimum duration against a later private booking", () => {
    expect(
      select({
        bookings: [
          event,
          {
            ...event,
            id: "private",
            kind: "privateStudio",
            start: "2030-05-06T07:30:00Z",
            end: "2030-05-06T09:00:00Z",
          },
        ],
      }),
    ).toEqual({ selection: null, state: "blocked" });
  });

  it("counts other activities against shared studio capacity", () => {
    expect(
      select({
        studio: { ...studio, globalCapacity: 4 },
        bookings: [
          event,
          {
            ...event,
            id: "modelling",
            activityId: "SHARED_TABLE",
            guests: 3,
            capacityUsed: 3,
          },
        ],
      }),
    ).toEqual({ selection: null, state: "full" });
  });

  it("counts the customer's own booking toward capacity", () => {
    expect(
      select({
        bookings: [{ ...event, isMine: true, capacityUsed: 4 }],
      }),
    ).toEqual({ selection: null, state: "full" });
  });

  it.each([
    [{ kind: "privateStudio" }, "blocked"],
    [{ kind: "exclusiveOpenStudio" }, "blocked"],
    [{ isClosure: true }, "blocked"],
    [{ bookingMode: "private" }, "blocked"],
    [{ start: "2030-04-29T07:00:00Z" }, "past"],
    [{ start: "2030-05-01T00:00:00Z" }, "past"],
    [{ status: "cancelled" }, "closed"],
    [{ archive: true }, "closed"],
    [{ locationId: "grohova" }, "closed"],
    [{ start: "invalid" }, "closed"],
    [{ end: "2030-05-06T06:00:00Z" }, "closed"],
  ])("rejects unavailable event %j", (changes, state) => {
    expect(select({ event: { ...event, ...changes } })).toEqual({
      selection: null,
      state,
    });
  });

  it.each([
    { ...studio, bookingEnabled: false },
    { ...studio, booking: { enabled: false } },
    { ...studio, minBookingMinutes: 120, maxBookingMinutes: 60 },
    { ...studio, openingHours: { monday: { isOpen: false } } },
  ])(
    "honours disabled or impossible studio booking settings",
    (configuredStudio) => {
      expect(select({ studio: configuredStudio }).selection).toBeNull();
    },
  );

  it("requires enough time before closing", () => {
    expect(
      select({
        event: {
          ...event,
          start: "2030-05-06T15:30:00Z",
          end: "2030-05-06T16:00:00Z",
        },
      }),
    ).toEqual({ selection: null, state: "closed" });
  });

  it("preserves the studio's calendar date when its date differs from UTC", () => {
    const tokyo = {
      ...studio,
      timeZone: "Asia/Tokyo",
      openingHours: {
        monday: { isOpen: true, openTime: "00:00", closeTime: "06:00" },
      },
    };
    const earlyEvent = {
      ...event,
      start: "2030-05-05T16:00:00Z",
      end: "2030-05-05T18:00:00Z",
    };
    expect(
      select({ studio: tokyo, event: earlyEvent, bookings: [earlyEvent] })
        .selection,
    ).toMatchObject({
      start: new Date(earlyEvent.start),
      end: new Date("2030-05-05T17:00:00Z"),
    });
  });

  it("uses the selected activity when a shared card has no activity", () => {
    expect(
      select({
        event: { ...event, activityId: null, productId: undefined },
        selectedActivityId: "SHARED_TABLE",
      }).selection,
    ).toMatchObject({ activityId: "SHARED_TABLE" });
  });
});

describe("course calendar purchase intent", () => {
  const course = {
    ...event,
    id: "course-session",
    kind: "class",
    bookingMode: "private",
    productId: "course-product",
    capacity: 6,
    participantCount: 2,
    capacityUsed: 6,
  };

  it("preserves the exact course and session without treating it as open studio", () => {
    expect(select({ event: course, bookings: [course] }).selection).toEqual({
      studio,
      activityId: "WORKSTATION",
      start: new Date(course.start),
      end: new Date(course.end),
      productId: "course-product",
      courseSessionId: "course-session",
      quantity: 1,
    });
  });

  it("does not confuse a class's reserved studio capacity with sold seats", () => {
    const normalizedCourse = normalizeBookingToCalendarEvent(course);
    expect(normalizedCourse.capacityUsed).toBe(6);
    expect(select({ event: normalizedCourse }).selection).not.toBeNull();
  });

  it.each([
    { participantCount: 6 },
    { remainingCapacity: 0 },
    { available: false },
    { remainingCapacity: -1 },
  ])("rejects a known-full class %j", (changes) => {
    expect(select({ event: { ...course, ...changes } })).toEqual({
      selection: null,
      state: "full",
    });
  });

  it("respects current remaining seats when supplied by the course endpoint", () => {
    expect(select({ event: { ...course, remainingCapacity: 1 } }).state).toBe(
      "limited",
    );
  });

  it("leaves the final capacity refresh to the course page when capacity is missing", () => {
    expect(
      select({
        event: {
          ...course,
          capacity: undefined,
          participantCount: undefined,
          guests: undefined,
        },
      }).selection,
    ).toHaveProperty("courseSessionId", "course-session");
  });

  it.each([
    { id: "safe-group", courseSessionId: undefined },
    { id: undefined },
    { productId: undefined },
  ])("never uses missing or synthetic identity as a session %j", (changes) => {
    expect(select({ event: { ...course, ...changes } }).selection).toBeNull();
  });
});
