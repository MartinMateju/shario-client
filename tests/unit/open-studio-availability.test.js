import { describe, expect, it } from "vitest";

import { checkLocationAvailability } from "../../src/utils/locationBookingUtils.js";

const location = (overrides = {}) => ({
  _id: "studio-1",
  booking: {
    enabled: true,
    allowPublicOverlap: true,
    maxConcurrentOpenStudioBookings: 3,
    globalCapacity: 6,
    activityCapacities: [],
    ...overrides,
  },
});

const booking = (overrides = {}) => ({
  _id: "booking-1",
  locationId: "studio-1",
  start: "2026-08-10T08:00:00.000Z",
  end: "2026-08-10T10:00:00.000Z",
  status: "processed",
  paymentStatus: "CONFIRMED",
  tag: "open-studio",
  bookingMode: "public",
  numberOfGuests: 1,
  ...overrides,
});

const request = (overrides = {}) => ({
  location: location(),
  bookings: [],
  start: "2026-08-10T09:00:00.000Z",
  end: "2026-08-10T11:00:00.000Z",
  guests: 1,
  bookingMode: "public",
  ...overrides,
});

describe("Open Studio availability contract", () => {
  it("keeps a multi-person public booking shared", () => {
    expect(
      checkLocationAvailability(
        request({
          bookings: [booking({ numberOfGuests: 1 })],
          guests: 3,
        }),
      ),
    ).toEqual({ available: true, reason: null });
  });

  it("enforces both concurrent-booking and people capacity", () => {
    const existing = [
      booking({ _id: "one", numberOfGuests: 1 }),
      booking({ _id: "two", numberOfGuests: 1 }),
    ];

    expect(
      checkLocationAvailability(
        request({
          location: location({ maxConcurrentOpenStudioBookings: 2 }),
          bookings: existing,
        }),
      ),
    ).toEqual({
      available: false,
      reason: "LOCATION_CAPACITY_EXCEEDED",
    });

    expect(
      checkLocationAvailability(
        request({
          location: location({ globalCapacity: 3 }),
          bookings: [booking({ numberOfGuests: 2 })],
          guests: 2,
        }),
      ),
    ).toEqual({
      available: false,
      reason: "LOCATION_CAPACITY_EXCEEDED",
    });
  });

  it("dual-reads the rollout overlap-limit aliases", () => {
    const existing = [booking({ _id: "one" }), booking({ _id: "two" })];

    expect(
      checkLocationAvailability(
        request({
          location: location({
            maxConcurrentOpenStudioBookings: undefined,
            maxPublicOverlaps: 2,
            maxPublicSoloOverlaps: 4,
          }),
          bookings: existing,
        }),
      ),
    ).toEqual({
      available: false,
      reason: "LOCATION_CAPACITY_EXCEEDED",
    });
  });

  it("makes exclusive Open Studio bookings block in both directions", () => {
    expect(
      checkLocationAvailability(
        request({
          bookings: [booking()],
          bookingMode: "private",
        }),
      ),
    ).toEqual({
      available: false,
      reason: "LOCATION_OVERLAP_NOT_ALLOWED",
    });

    expect(
      checkLocationAvailability(
        request({
          bookings: [booking({ bookingMode: "private" })],
        }),
      ),
    ).toEqual({
      available: false,
      reason: "LOCATION_OVERLAP_NOT_ALLOWED",
    });
  });

  it("keeps internal Private Studio distinct and always exclusive", () => {
    expect(
      checkLocationAvailability(
        request({
          location: location({ privateSessionBlocksAll: false }),
          bookings: [
            booking({
              tag: "private-studio",
              bookingMode: "public",
            }),
          ],
        }),
      ),
    ).toEqual({
      available: false,
      reason: "LOCATION_OVERLAP_NOT_ALLOWED",
    });
  });

  it("dual-reads legacy bookingType and tag values", () => {
    expect(
      checkLocationAvailability(
        request({
          bookings: [
            booking({
              tag: "workshop",
              bookingMode: undefined,
              bookingType: "private",
            }),
          ],
        }),
      ),
    ).toEqual({
      available: false,
      reason: "LOCATION_OVERLAP_NOT_ALLOWED",
    });
  });

  it("counts active payment holds and ignores expired ones", () => {
    const now = new Date("2026-08-01T10:00:00.000Z");
    const held = booking({
      paymentStatus: "PENDING_PAYMENT",
      paymentExpiresAt: "2026-08-01T10:10:00.000Z",
      bookingMode: "private",
    });

    expect(
      checkLocationAvailability(request({ bookings: [held], now })),
    ).toEqual({
      available: false,
      reason: "LOCATION_OVERLAP_NOT_ALLOWED",
    });
    expect(
      checkLocationAvailability(
        request({
          bookings: [{ ...held, paymentExpiresAt: "2026-08-01T09:59:59.000Z" }],
          now,
        }),
      ),
    ).toEqual({ available: true, reason: null });
  });
});
