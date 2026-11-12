import { describe, expect, it } from "vitest";
import {
  getBookingPreviewAvailability,
  getBookingPreviewConfirmation,
  getCustomerCalendarBookingPreview,
} from "@/components/calendar/calendar.bookingSelection";

const studio = {
  id: "studio",
  timeZone: "Europe/Prague",
  slotStepMinutes: 30,
  minBookingMinutes: 60,
  maxBookingMinutes: 360,
  bookingEnabled: true,
};
const event = {
  id: "booking",
  locationId: "studio",
  kind: "sharedOpenStudio",
  start: "2030-05-06T07:00:00Z",
  end: "2030-05-06T09:00:00Z",
  activityId: "WORKSTATION",
  productId: "studio-product",
};
const now = new Date("2030-05-01T00:00:00Z");
const preview = (changes = {}) =>
  getCustomerCalendarBookingPreview({
    studio,
    event: { ...event, ...changes },
  });
const course = {
  ...event,
  kind: "class",
  id: "session",
  productId: "course-product",
  remainingCapacity: 2,
};
const courseDraft = () => {
  const { courseIntent, activityId, ...range } = preview(course);
  return { ...range, metadata: { courseIntent, activityId } };
};
const availability = { state: "blocked", isBookable: false };
const resolve = (selection, bookings = [course]) =>
  getBookingPreviewAvailability({
    selection,
    studio,
    bookings,
    availability,
    now,
  });

describe("booking-card draft geometry", () => {
  it("uses a clicked time band from the opening grid, including later in an ongoing booking", () => {
    const result = getCustomerCalendarBookingPreview({
      studio: {
        ...studio,
        minBookingMinutes: 45,
        openingHours: {
          monday: { isOpen: true, openTime: "08:15", closeTime: "20:15" },
        },
      },
      event,
      pointerMinute: 608,
    });
    expect(result).toMatchObject({ startMinute: 585, endMinute: 645 });
    expect(preview()).toMatchObject({ startMinute: 540, endMinute: 600 });
  });
  it.each([
    { kind: "privateStudio", bookingMode: "private" },
    { kind: "exclusiveOpenStudio" },
    { guests: 99 },
    { isClosure: true },
    { start: "2020-05-06T07:00:00Z", end: "2020-05-06T09:00:00Z" },
  ])(
    "creates an inspectable minimum-length draft for unavailable occupancy %j",
    (changes) => {
      expect(preview(changes)).toMatchObject({
        startMinute: 540,
        endMinute: 600,
        activityId: "WORKSTATION",
      });
    },
  );
  it("uses the studio calendar date across browser timezones", () => {
    const draft = preview({
      start: "2030-05-05T23:00:00Z",
      end: "2030-05-06T01:00:00Z",
    });
    expect([
      draft.day.getFullYear(),
      draft.day.getMonth(),
      draft.day.getDate(),
      draft.startMinute,
    ]).toEqual([2030, 4, 6, 60]);
  });
  it.each([
    { locationId: "other" },
    { start: null },
    { end: "invalid" },
    { end: event.start },
    { archive: true },
  ])("does not seed malformed or foreign occupancy %j", (changes) => {
    expect(preview(changes)).toBeNull();
  });
  it("shows a clipped late-day range as disabled until it meets minimum duration", () => {
    const draft = preview({
      start: "2030-05-06T21:30:00Z",
      end: "2030-05-06T22:00:00Z",
    });
    expect(draft).toMatchObject({ startMinute: 1410, endMinute: 1440 });
    expect(
      getBookingPreviewAvailability({
        selection: draft,
        studio,
        availability: { state: "available", isBookable: true },
      }),
    ).toMatchObject({ isBookable: false });
  });
  it("never copies ordinary booking or product identity into a new reservation", () => {
    const draft = preview({
      customerId: "private",
      bookingId: "original",
      doorCode: "secret",
    });
    expect(draft).not.toHaveProperty("productId");
    expect(draft).not.toHaveProperty("bookingId");
    expect(draft).not.toHaveProperty("customerId");
    expect(getBookingPreviewConfirmation(draft, { isBookable: true })).toEqual(
      {},
    );
  });
});

describe("course intent in an editable preview", () => {
  it("retains the exact course session instead of the clicked time band", () => {
    expect(
      getCustomerCalendarBookingPreview({
        event: course,
        studio,
        pointerMinute: 600,
      }),
    ).toMatchObject({ startMinute: 540, endMinute: 660 });
  });
  it("keeps a course outside studio booking hours disabled", () => {
    const draft = courseDraft();
    const current = getBookingPreviewAvailability({
      selection: draft,
      studio,
      bookings: [course],
      availability: { state: "closed", isBookable: false },
      now,
    });
    expect(current.isBookable).toBe(false);
    expect(getBookingPreviewConfirmation(draft, current)).toEqual({});
  });
  it("uses the current course seats and retains session identity only on explicit unchanged confirmation", () => {
    const draft = courseDraft();
    expect(draft).toMatchObject({ startMinute: 540, endMinute: 660 });
    const current = resolve(draft);
    expect(current).toMatchObject({ isBookable: true, state: "available" });
    expect(getBookingPreviewConfirmation(draft, current)).toEqual({
      productId: "course-product",
      courseSessionId: "session",
      quantity: 1,
    });
  });
  it.each(
    [
      [],
      [{ ...course, remainingCapacity: 0, available: false }],
      [{ ...course, productId: "changed" }],
      [{ ...course, start: "2030-05-06T08:00:00Z" }],
      [{ ...course, kind: "sharedOpenStudio" }],
    ].map((bookings) => ({ bookings })),
  )(
    "disables a stale, full, or missing exact course session",
    ({ bookings }) => {
      const draft = courseDraft();
      const current = resolve(draft, bookings);
      expect(current.isBookable).toBe(false);
      expect(getBookingPreviewConfirmation(draft, current)).toEqual({});
    },
  );
  it.each([{ startMinute: 600, endMinute: 720 }, { endMinute: 690 }])(
    "drops both course identifiers when the range changes %j",
    (changes) => {
      const draft = { ...courseDraft(), ...changes };
      const current = getBookingPreviewAvailability({
        selection: draft,
        studio,
        bookings: [course],
        availability: { state: "available", isBookable: true },
        now,
      });
      expect(current.isBookable).toBe(true);
      expect(getBookingPreviewConfirmation(draft, current)).toEqual({});
    },
  );
});
