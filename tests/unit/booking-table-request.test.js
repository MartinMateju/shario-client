import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { INITIAL_BOOKING_FILTERS } from "@/components/tables/bookings/booking-table.constants";
import { buildBookingRequest } from "@/components/tables/bookings/booking-table.utils";

const NOW = "2026-10-31T08:05:00.000Z"; // 09:05 in Prague.
const request = (filters = {}, view = "all") =>
  buildBookingRequest({
    filters: { ...INITIAL_BOOKING_FILTERS, ...filters },
    view,
    page: 2,
    limit: 10,
    sortOrder: "asc",
    isAdmin: true,
  });

describe("upcoming and ongoing booking requests", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(NOW));
  });
  afterEach(() => vi.useRealTimers());

  it("uses an exclusive end bound without excluding already-started bookings", () => {
    const result = request();
    expect(result).toMatchObject({ endAfter: NOW, page: 2, limit: 10 });
    expect(result.dateFrom).toBeUndefined();
    expect(result).not.toHaveProperty("futureOnly");
  });

  it("keeps Today's complete start-date range while excluding bookings that have ended", () => {
    expect(request({}, "today")).toMatchObject({
      dateFrom: "2026-10-31",
      dateTo: "2026-10-31",
      endAfter: NOW,
    });
  });

  it.each(["upcoming", "awaitingPayment", "cancelled"])(
    "preserves explicit start dates and the independent end bound in the %s view",
    (view) => {
      expect(request({ dateFrom: "2026-10-01" }, view)).toMatchObject({
        dateFrom: "2026-10-01",
        endAfter: NOW,
      });
    },
  );

  it("intersects the end bound with explicit dates and keeps the other filters", () => {
    expect(
      request({
        dateFrom: "2026-11-03",
        dateTo: "2026-11-09",
        locationId: "studio-1",
        status: "cancelled",
        paymentStatus: "CONFIRMED",
        search: "  pottery  ",
      }),
    ).toMatchObject({
      dateFrom: "2026-11-03",
      dateTo: "2026-11-09",
      endAfter: NOW,
      locationId: "studio-1",
      status: "cancelled",
      paymentStatus: "CONFIRMED",
      search: "pottery",
      sortBy: "start",
      sortOrder: "asc",
    });
    expect(request({ dateTo: "2026-10-01" })).toMatchObject({
      dateTo: "2026-10-01",
      endAfter: NOW,
    });
  });

  it("removes only the end bound when unchecked and preserves explicit dates", () => {
    expect(request({ futureOnly: false }).endAfter).toBeUndefined();
    expect(request({ futureOnly: false }).dateFrom).toBeUndefined();
    expect(
      request({
        futureOnly: false,
        dateFrom: "2024-01-01",
        dateTo: "2024-12-31",
      }),
    ).toMatchObject({ dateFrom: "2024-01-01", dateTo: "2024-12-31" });
    expect(request({ futureOnly: false }, "today")).toMatchObject({
      dateFrom: "2026-10-31",
      dateTo: "2026-10-31",
    });
    expect(request({ futureOnly: false }, "today").endAfter).toBeUndefined();
  });

  it("recomputes now for later page requests instead of freezing the mount time", () => {
    expect(request().endAfter).toBe(NOW);
    vi.setSystemTime(new Date("2026-10-31T11:00:00.000Z"));
    expect(request().endAfter).toBe("2026-10-31T11:00:00.000Z");
  });
});
