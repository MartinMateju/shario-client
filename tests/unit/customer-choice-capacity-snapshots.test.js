import { describe, expect, it } from "vitest";
import { checkLocationAvailability } from "@/utils/locationBookingUtils";

const at = (hour) => `2030-05-06T${hour}:00:00.000Z`;
const location = {
  id: "studio",
  booking: {
    enabled: true,
    globalCapacity: 2,
    allowPublicOverlap: true,
    maxConcurrentOpenStudioBookings: 2,
    activityCapacities: [{ activity: "WORKSTATION", capacity: 2 }],
  },
};
const product = {
  kind: "open-studio",
  bookingMode: "customer-choice",
  maxNumberOfParticipants: 8,
  openStudioPolicy: {
    publicCapacityMode: "fixed",
    publicCapacityLimit: 2,
    privateBookingSurcharge: 50,
  },
};
const booking = (start, end, overrides = {}) => ({
  start: at(start),
  end: at(end),
  location: "studio",
  tag: "open-studio",
  bookingMode: "public",
  numberOfGuests: 1,
  plannedActivity: "WORKSTATION",
  publicCapacityLimit: 2,
  ...overrides,
});
const request = (overrides = {}) => ({
  location,
  product,
  start: at("09"),
  end: at("11"),
  guests: 1,
  bookingMode: "public",
  activity: "WORKSTATION",
  bookings: [booking("09", "10"), booking("10", "11")],
  ...overrides,
});

describe("customer-choice concurrent capacity snapshots", () => {
  it("allows one attendee across adjacent solo visits under a total limit of two", () => {
    expect(checkLocationAvailability(request())).toEqual({
      available: true,
      reason: null,
    });
  });

  it("rejects a party of two where even one existing attendee overlaps", () => {
    expect(checkLocationAvailability(request({ guests: 2 }))).toMatchObject({
      available: false,
      reason: "LOCATION_CAPACITY_EXCEEDED",
    });
  });

  it("checks later starts as well as occupancy at the requested start", () => {
    expect(
      checkLocationAvailability(
        request({
          bookings: [booking("10", "11", { numberOfGuests: 2 })],
        }),
      ),
    ).toMatchObject({ available: false, reason: "LOCATION_CAPACITY_EXCEEDED" });
  });

  it("honors each existing booking's limit without summing adjacent occupants", () => {
    const largerLocation = {
      ...location,
      booking: {
        ...location.booking,
        globalCapacity: 8,
        maxConcurrentOpenStudioBookings: 8,
        activityCapacities: [],
      },
    };
    const activityProduct = {
      ...product,
      openStudioPolicy: {
        ...product.openStudioPolicy,
        publicCapacityMode: "activity",
        publicCapacityLimit: null,
      },
    };
    expect(
      checkLocationAvailability(
        request({ location: largerLocation, product: activityProduct }),
      ),
    ).toEqual({ available: true, reason: null });
    expect(
      checkLocationAvailability(
        request({
          location: largerLocation,
          product: activityProduct,
          guests: 2,
        }),
      ),
    ).toMatchObject({ available: false });
  });

  it("checks activity capacity using concurrent visits", () => {
    const activityLocation = {
      ...location,
      booking: {
        ...location.booking,
        globalCapacity: 8,
        maxConcurrentOpenStudioBookings: 8,
      },
    };
    const activityProduct = {
      ...product,
      openStudioPolicy: {
        ...product.openStudioPolicy,
        publicCapacityMode: "activity",
        publicCapacityLimit: null,
      },
    };
    expect(
      checkLocationAvailability(
        request({
          location: activityLocation,
          product: activityProduct,
          bookings: [
            booking("09", "10", { publicCapacityLimit: null }),
            booking("10", "11", { publicCapacityLimit: null }),
          ],
        }),
      ).available,
    ).toBe(true);
  });

  it("keeps private reservations exclusive across every part of the range", () => {
    expect(
      checkLocationAvailability(
        request({
          bookingMode: "private",
          bookings: [booking("10", "11")],
        }),
      ),
    ).toMatchObject({
      available: false,
      reason: "LOCATION_OVERLAP_NOT_ALLOWED",
    });
  });

  it("ignores cancelled visits and bookings ending at the requested start", () => {
    expect(
      checkLocationAvailability(
        request({
          bookings: [
            booking("08", "09", { bookingMode: "private" }),
            booking("09", "11", {
              status: "cancelled",
              bookingMode: "private",
            }),
          ],
        }),
      ).available,
    ).toBe(true);
  });
});
