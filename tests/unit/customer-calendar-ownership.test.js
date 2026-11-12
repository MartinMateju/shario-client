import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/features/api/apiSlice", () => ({
  apiSlice: {
    injectEndpoints: ({ endpoints }) => ({
      endpoints: endpoints({
        query: (definition) => definition,
        mutation: (definition) => definition,
      }),
    }),
  },
}));

import { normalizeBookingsForCalendar } from "@/components/calendar/calendar.adapters";
import { buildCustomerEvents } from "@/components/calendar/calendar.utils";
import { markCustomerCalendarOwnership } from "@/components/menu/menuCalendarOwnership";
import { bookingsApiSlice } from "@/lib/features/bookings/bookingsApiSlice";

const availabilityBooking = (id, extra = {}) => ({
  _id: id,
  id,
  bookingProduct: "product-1",
  productId: "product-1",
  location: "location-a",
  locationId: "location-a",
  start: "2026-10-31T10:00:00.000Z",
  end: "2026-10-31T12:00:00.000Z",
  numberOfGuests: 2,
  bookingMode: "public",
  bookingType: "public",
  plannedActivity: "WORKSTATION",
  tag: "open-studio",
  status: "processed",
  paymentStatus: "CONFIRMED",
  ...extra,
});

describe("customer calendar ownership reconciliation", () => {
  it("matches stable booking IDs without needing identities in availability", () => {
    const bookings = [availabilityBooking("own"), availabilityBooking("other")];
    const result = markCustomerCalendarOwnership(bookings, {
      bookings: [{ id: "own", location: { id: "location-a" } }],
    });
    expect(result[0]).toEqual({ ...bookings[0], isMine: true });
    expect(result[1]).toBe(bookings[1]);
    expect(bookings[0]).not.toHaveProperty("isMine");
  });

  it("marks course enrollment without replacing aggregate class occupancy with party size", () => {
    const course = availabilityBooking("class-1", {
      tag: "class",
      numberOfGuests: 12,
      maxNumberOfParticipants: 16,
      capacityUsed: 16,
      courseCapacityUnavailable: false,
    });
    const ownedCourse = {
      id: "class-1",
      participantCount: 1,
      product: { id: "product-1" },
      location: { id: "location-a" },
    };
    const [result] = normalizeBookingsForCalendar(
      markCustomerCalendarOwnership([course], { bookings: [ownedCourse] }),
    );
    expect(result).toMatchObject({
      isMine: true,
      guests: 12,
      capacityUsed: 16,
      maxNumberOfParticipants: 16,
      courseCapacityUnavailable: false,
      kind: "class",
    });
    expect(result).not.toHaveProperty("participantCount");
  });

  it("preserves separate clickable own events when another customer books the same slot", () => {
    const marked = markCustomerCalendarOwnership(
      [availabilityBooking("own"), availabilityBooking("other")],
      { bookings: [{ id: "own" }] },
    );
    const events = buildCustomerEvents(
      normalizeBookingsForCalendar(marked),
      {
        id: "location-a",
        globalCapacity: 10,
        timeZone: "UTC",
      },
      (key) => key,
    );
    expect(events).toHaveLength(2);
    expect(events.find((event) => event.isMine)).toMatchObject({
      id: "own",
      guests: 2,
    });
    expect(events.find((event) => !event.isMine).id).toMatch(/^safe-/);
  });

  it("does not infer ownership from customer display references or staff privileges", () => {
    const booking = availabilityBooking("other", {
      customerId: "123",
      customerIds: ["123"],
      isAdmin: true,
    });
    const [result] = markCustomerCalendarOwnership([booking], {
      bookings: [{ id: "123" }],
    });
    expect(result).not.toHaveProperty("isMine");
  });

  it("preserves explicit ownership and legacy creator evidence", () => {
    const bookings = [
      availabilityBooking("explicit", { isMine: true }),
      availabilityBooking("legacy", { createdBy: { _id: "customer-1" } }),
    ];
    const normalized = normalizeBookingsForCalendar(
      markCustomerCalendarOwnership(bookings, undefined),
      { currentUserId: "customer-1" },
    );
    expect(normalized.map((booking) => booking.isMine)).toEqual([true, true]);
  });

  it("loads ownership beyond the first hundred bookings and keeps cache scope off the backend request", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      id: `booking-${index}`,
    }));
    const secondPage = [{ id: "last-booking" }];
    const baseQuery = vi.fn(async ({ params }) => ({
      data: {
        bookings: params.page === 1 ? firstPage : secondPage,
        totalCount: 101,
        currentPage: params.page,
        pageSize: 100,
        totalPages: 2,
      },
    }));
    const result = await bookingsApiSlice.endpoints.getAllUserBookings.queryFn(
      {
        scope: "all",
        locationId: "location-a",
        customerScope: "tenant/customer/session",
      },
      {},
      {},
      baseQuery,
    );
    expect(baseQuery).toHaveBeenNthCalledWith(1, {
      url: "/bookings/mine",
      params: { scope: "all", locationId: "location-a", page: 1, limit: 100 },
    });
    expect(baseQuery).toHaveBeenNthCalledWith(2, {
      url: "/bookings/mine",
      params: { scope: "all", locationId: "location-a", page: 2, limit: 100 },
    });
    expect(result.data.allPagesLoaded).toBe(true);
    const [event] = markCustomerCalendarOwnership(
      [availabilityBooking("last-booking")],
      result.data,
    );
    expect(event.isMine).toBe(true);
  });
});
