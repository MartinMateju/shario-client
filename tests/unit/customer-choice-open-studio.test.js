import { describe, expect, it } from "vitest";
import {
  getOpenStudioGuestLimit,
  resolveOpenStudioBookingMode,
} from "@/lib/features/products/products.contract.mjs";
import {
  getBookingPriceBreakdown,
  getOpenStudioBookingFields,
} from "@/components/sidebars/openStudioBooking.utils";
import {
  getCartItemHourlyPriceMajor,
  getCartItemTotalMajor,
} from "@/components/modals/cartModal.utils";
import { checkLocationAvailability } from "@/utils/locationBookingUtils";

const product = {
  kind: "open-studio",
  bookingMode: "customer-choice",
  price: 125,
  currency: "CZK",
  maxNumberOfParticipants: 8,
  openStudioPolicy: {
    publicCapacityMode: "fixed",
    publicCapacityLimit: 2,
    privateBookingSurcharge: 300,
  },
};
const location = {
  id: "studio",
  booking: {
    enabled: true,
    globalCapacity: 8,
    allowPublicOverlap: true,
    maxConcurrentOpenStudioBookings: 8,
    activityCapacities: [{ activity: "WORKSTATION", capacity: 4 }],
  },
};
const existing = {
  locationId: "studio",
  start: "2026-11-10T10:00:00Z",
  end: "2026-11-10T12:00:00Z",
  bookingMode: "public",
  tag: "open-studio",
  status: "processed",
  paymentStatus: "CONFIRMED",
  numberOfGuests: 1,
  publicCapacityLimit: 2,
};
const request = {
  product,
  location,
  bookingMode: "public",
  activity: "WORKSTATION",
  start: existing.start,
  end: existing.end,
  guests: 1,
};

describe("customer choice Open Studio", () => {
  it("resolves a concrete mode without changing existing fixed products", () => {
    expect(getOpenStudioBookingFields(product, "private")).toEqual({
      bookingMode: "private",
      bookingType: "private",
    });
    expect(resolveOpenStudioBookingMode(product, "customer-choice")).toBe(
      "public",
    );
    expect(
      resolveOpenStudioBookingMode(
        { ...product, bookingMode: "private" },
        "public",
      ),
    ).toBe("private");
  });

  it("counts the initial customer inside the fixed total of two", () => {
    expect(getOpenStudioGuestLimit(request)).toBe(2);
    expect(
      checkLocationAvailability({ ...request, bookings: [existing] }).available,
    ).toBe(true);
    expect(
      checkLocationAvailability({ ...request, bookings: [existing], guests: 2 })
        .available,
    ).toBe(false);
    expect(checkLocationAvailability({ ...request, guests: 2 }).available).toBe(
      true,
    );
    expect(checkLocationAvailability({ ...request, guests: 3 }).available).toBe(
      false,
    );
    expect(
      getOpenStudioGuestLimit({
        ...request,
        product: { ...product, maxNumberOfParticipants: 1 },
      }),
    ).toBe(2);
  });

  it("honors another public booking's persisted limit, even with a different product", () => {
    expect(
      checkLocationAvailability({
        ...request,
        product: { ...product, bookingMode: "public" },
        bookings: [existing],
        guests: 2,
      }).available,
    ).toBe(false);
  });

  it("uses activity capacity in public mode and full studio capacity in private mode", () => {
    const activityProduct = {
      ...product,
      openStudioPolicy: {
        ...product.openStudioPolicy,
        publicCapacityMode: "activity",
        publicCapacityLimit: null,
      },
    };
    expect(
      getOpenStudioGuestLimit({ ...request, product: activityProduct }),
    ).toBe(4);
    expect(
      getOpenStudioGuestLimit({ ...request, bookingMode: "private" }),
    ).toBe(8);
    expect(
      checkLocationAvailability({
        ...request,
        bookingMode: "private",
        guests: 8,
      }).available,
    ).toBe(true);
    expect(
      checkLocationAvailability({
        ...request,
        bookingMode: "private",
        guests: 9,
      }).available,
    ).toBe(false);
    expect(
      checkLocationAvailability({
        ...request,
        bookingMode: "private",
        bookings: [existing],
      }).available,
    ).toBe(false);
  });

  it.each([
    [1, 2, 550],
    [4, 6, 3300],
  ])(
    "adds the surcharge once for %i guests and %i half-hour blocks",
    (numberOfGuests, quantity, total) => {
      const item = {
        product,
        bookingMode: "private",
        numberOfGuests,
        quantity,
        bookingExtraCharge: 999,
      };
      expect(getCartItemTotalMajor(item)).toBe(total);
      expect(getCartItemHourlyPriceMajor(item)).toBe(250);
      expect(
        getBookingPriceBreakdown({
          unitPrice: 125,
          privateBookingSurcharge: 300,
          guests: numberOfGuests,
          durationMinutes: quantity * 30,
        }).total,
      ).toBe(total);
      expect(getCartItemTotalMajor({ ...item, bookingMode: "public" })).toBe(
        total - 300,
      );
    },
  );

  it("charges a configured private surcharge when the base price is zero", () => {
    expect(
      getCartItemTotalMajor({
        product: { ...product, price: 0 },
        bookingMode: "private",
        numberOfGuests: 3,
        quantity: 4,
      }),
    ).toBe(300);
  });
});
