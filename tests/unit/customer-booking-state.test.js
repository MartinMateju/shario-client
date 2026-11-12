import { describe, expect, it } from "vitest";

import {
  getCustomerBookingState,
  isCustomerBookingNextVisit,
  isCustomerBookingUpcoming,
} from "@/lib/features/bookings/customerBookingState";

const now = new Date("2026-10-22T12:00:00Z");
const booking = {
  start: "2026-10-30T06:00:00Z",
  end: "2026-10-30T07:00:00Z",
  status: "processed",
};

describe("customer reservation lifecycle", () => {
  it.each([
    ["confirmed", true, true],
    ["awaiting_payment", true, false],
    ["awaiting_confirmation", true, false],
    ["expired", false, false],
    ["failed", false, false],
    ["cancelled", false, false],
    ["completed", false, false],
  ])(
    "keeps %s distinct in upcoming bookings and next visit",
    (reservationState, upcoming, nextVisit) => {
      const value = {
        ...booking,
        reservationState,
        isActiveReservation: ["confirmed", "awaiting_payment"].includes(
          reservationState,
        ),
        paymentExpiresAt: "2026-10-22T12:10:00Z",
      };
      expect(getCustomerBookingState(value, now)).toBe(reservationState);
      expect(isCustomerBookingUpcoming(value, now)).toBe(upcoming);
      expect(isCustomerBookingNextVisit(value, now)).toBe(nextVisit);
    },
  );

  it.each(["2026-10-22T11:59:59Z", "2026-10-22T12:00:00Z"])(
    "expires a cached active hold at deadline %s",
    (paymentExpiresAt) => {
      const value = {
        ...booking,
        reservationState: "awaiting_payment",
        paymentStatus: "PENDING_PAYMENT",
        isActiveReservation: true,
        paymentExpiresAt,
      };
      expect(getCustomerBookingState(value, now)).toBe("expired");
      expect(isCustomerBookingUpcoming(value, now)).toBe(false);
      expect(isCustomerBookingNextVisit(value, now)).toBe(false);
    },
  );

  it("does not expire a paid reservation using an old checkout deadline", () => {
    const value = {
      ...booking,
      reservationState: "confirmed",
      isActiveReservation: true,
      paymentStatus: "CONFIRMED",
      paymentExpiresAt: "2026-10-01T12:00:00Z",
    };
    expect(getCustomerBookingState(value, now)).toBe("confirmed");
    expect(isCustomerBookingNextVisit(value, now)).toBe(true);
  });

  it.each(["cancelled", "canceled", "completed"])(
    "honors %s before confirmed payment or stale activity flags",
    (status) => {
      const value = {
        ...booking,
        status,
        reservationState: "confirmed",
        isActiveReservation: true,
        paymentStatus: "CONFIRMED",
      };
      expect(isCustomerBookingUpcoming(value, now)).toBe(false);
      expect(isCustomerBookingNextVisit(value, now)).toBe(false);
    },
  );

  it("keeps a legacy pending checkout without expiry discoverable without confirming a visit", () => {
    const value = {
      ...booking,
      status: "pending",
      paymentStatus: "PENDING_PAYMENT",
    };
    expect(getCustomerBookingState(value, now)).toBe("awaiting_payment");
    expect(isCustomerBookingUpcoming(value, now)).toBe(true);
    expect(isCustomerBookingNextVisit(value, now)).toBe(false);
  });

  it("keeps paid but unfulfilled legacy records discoverable", () => {
    const value = {
      ...booking,
      status: "pending",
      paymentStatus: "CONFIRMED",
      isActiveReservation: false,
    };
    expect(getCustomerBookingState(value, now)).toBe("awaiting_confirmation");
    expect(isCustomerBookingUpcoming(value, now)).toBe(true);
    expect(isCustomerBookingNextVisit(value, now)).toBe(false);
  });

  it.each([undefined, true])(
    "keeps a paid legacy pending booking active when the activity flag is %s",
    (isActiveReservation) => {
      const value = {
        ...booking,
        status: "pending",
        paymentStatus: "CONFIRMED",
        isActiveReservation,
      };
      expect(getCustomerBookingState(value, now)).toBe("confirmed");
      expect(isCustomerBookingNextVisit(value, now)).toBe(true);
    },
  );

  it("keeps a three-hour visit visible after access-code delivery until its end", () => {
    const value = {
      ...booking,
      status: "delivered",
      paymentStatus: "CONFIRMED",
      start: "2026-10-22T11:00:00Z",
      end: "2026-10-22T14:00:00Z",
    };
    expect(isCustomerBookingUpcoming(value, now)).toBe(true);
    expect(isCustomerBookingNextVisit(value, now)).toBe(true);
    expect(
      isCustomerBookingUpcoming(value, new Date("2026-10-22T14:01:00Z")),
    ).toBe(false);
    expect(
      isCustomerBookingNextVisit(value, new Date("2026-10-22T14:01:00Z")),
    ).toBe(false);
  });

  it("excludes explicit inactive reservations from next visit and preserves legacy bookings", () => {
    expect(isCustomerBookingNextVisit(booking, now)).toBe(true);
    expect(
      isCustomerBookingNextVisit(
        { ...booking, isActiveReservation: false },
        now,
      ),
    ).toBe(false);
    expect(isCustomerBookingUpcoming({ ...booking, end: "invalid" }, now)).toBe(
      false,
    );
    expect(
      isCustomerBookingUpcoming(
        { ...booking, end: "2026-10-20T07:00:00Z" },
        now,
      ),
    ).toBe(false);
  });
});
