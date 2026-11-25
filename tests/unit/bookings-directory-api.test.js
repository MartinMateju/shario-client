import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/features/api/apiSlice", () => ({
  apiSlice: {
    injectEndpoints: ({ endpoints }) => ({
      endpoints: endpoints({ query: (definition) => definition }),
    }),
  },
}));
import { bookingDirectoryApiSlice } from "@/lib/features/bookings/bookingDirectoryApiSlice";
const endpoint = bookingDirectoryApiSlice.endpoints.getBookingDirectory;

describe("booking directory query contract", () => {
  it("preserves applied filters/page/sort but never sends cache identity or arbitrary tenant overrides", () => {
    const body = {
      search: "Ada",
      dateScope: "today",
      dateFrom: "2026-01-01",
      dateTo: "2026-12-31",
      endAfter: "2026-01-01T10:00:00.000Z",
      lecturerName: "Teacher (exact)",
      lecturerId: "teacher",
      productId: "product",
      authorId: "creator",
      locationId: "studio",
      paymentStatus: "CONFIRMED",
      status: "cancelled",
      isAdmin: true,
      page: 3,
      limit: 20,
      sortBy: "start",
      sortOrder: "asc",
    };
    expect(
      endpoint.query({
        ...body,
        cacheScope: "tenant-a:owner",
        tenantId: "tenant-b",
        allCustomers: true,
      }),
    ).toEqual({ url: "/bookings/filter", method: "POST", body });
  });
  it("loads booking-owned historical filter options without sending auth scope or full staff/product requests", () => {
    expect(
      bookingDirectoryApiSlice.endpoints.getBookingFilterOptions.query({
        cacheScope: "tenant-a:owner",
        locationId: "studio",
      }),
    ).toEqual({
      url: "/bookings/filter-options",
      params: { locationId: "studio" },
    });
  });
  it("is invalidated by cancellation, editing and embedded customer/product changes and tags only visible booking IDs", () => {
    const tags = endpoint.providesTags({
      bookings: [{ _id: "one" }, { id: "two" }],
    });
    expect(tags).toContainEqual({ type: "Booking", id: "LIST" });
    expect(tags).toContainEqual({ type: "Booking", id: "one" });
    expect(tags).toContainEqual({ type: "Booking", id: "two" });
    expect(tags).toContainEqual({ type: "User", id: "LIST" });
    expect(tags).toContainEqual({ type: "Product", id: "LIST" });
  });
});
