import fs from "node:fs";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  fetchAllCustomerBookingPages,
  getCustomerBookingPagination,
} from "@/lib/features/bookings/customerBookingPagination";
import {
  getCreditTransactionDescription,
  getCreditTransactionDetails,
  getCreditTransactionPagination,
} from "@/components/credits/creditTransactionHistory.utils";

const read = (...segments) =>
  fs.readFileSync(path.join(process.cwd(), ...segments), "utf8");

describe("customer portal pagination", () => {
  it("normalizes the customer booking pagination returned by the server", () => {
    expect(
      getCustomerBookingPagination({
        bookings: [{ id: "booking-1" }],
        totalCount: 43,
        currentPage: 2,
        pageSize: 20,
        totalPages: 3,
      }),
    ).toEqual({
      currentPage: 2,
      pageSize: 20,
      totalCount: 43,
      totalPages: 3,
    });
  });

  it("loads every booking page for the portal calendar and de-duplicates ids", async () => {
    const fetchPage = vi.fn(async ({ page }) => ({
      data:
        page === 1
          ? {
              bookings: [{ id: "booking-1" }, { id: "booking-2" }],
              totalCount: 3,
              currentPage: 1,
              pageSize: 2,
              totalPages: 2,
            }
          : {
              bookings: [{ id: "booking-2" }, { id: "booking-3" }],
              totalCount: 3,
              currentPage: 2,
              pageSize: 2,
              totalPages: 2,
            },
    }));

    const result = await fetchAllCustomerBookingPages({
      params: { scope: "upcoming", limit: 2 },
      fetchPage,
    });

    expect(fetchPage).toHaveBeenNthCalledWith(1, {
      scope: "upcoming",
      page: 1,
      limit: 2,
    });
    expect(fetchPage).toHaveBeenNthCalledWith(2, {
      scope: "upcoming",
      page: 2,
      limit: 2,
    });
    expect(result.data.bookings.map(({ id }) => id)).toEqual([
      "booking-1",
      "booking-2",
      "booking-3",
    ]);
    expect(result.data.allPagesLoaded).toBe(true);
    expect(result.data.aggregatedPageCount).toBe(2);
  });

  it("fails visibly instead of silently truncating an unsafe calendar", async () => {
    const result = await fetchAllCustomerBookingPages({
      params: { limit: 100 },
      maxPages: 1,
      fetchPage: vi.fn(async () => ({
        data: {
          bookings: Array.from({ length: 100 }, (_, index) => ({
            id: `booking-${index}`,
          })),
          totalPages: 2,
        },
      })),
    });

    expect(result.error?.status).toBe("CUSTOM_ERROR");
  });

  it("normalizes credit pagination and presents all supported transaction data", () => {
    expect(
      getCreditTransactionPagination({
        transactions: [{ id: "transaction-1" }],
        pagination: {
          page: 2,
          limit: 15,
          totalCount: 31,
          totalPages: 3,
        },
      }),
    ).toEqual({
      currentPage: 2,
      pageSize: 15,
      totalCount: 31,
      totalPages: 3,
    });

    expect(
      getCreditTransactionDescription({ type: "admin_granted" }, "EN"),
    ).toBe("Granted by studio");
    expect(getCreditTransactionDescription({ type: "purchased" }, "CZ")).toBe(
      "Zakoupené kredity",
    );
    expect(
      getCreditTransactionDetails({
        reason: "Service recovery",
        description: "Granted by Martin",
      }),
    ).toBe("Service recovery · Granted by Martin");
  });

  it("wires server pagination into the booking and credit screens", () => {
    const portal = read(
      "src",
      "app",
      "[locale]",
      "tenants",
      "[tenantSlug]",
      "portal",
      "page.js",
    );
    const bookings = read("src", "components", "tables", "MyBookingsTable.js");
    const creditsApi = read(
      "src",
      "lib",
      "features",
      "credits",
      "creditsApiSlice.js",
    );
    const creditHistory = read(
      "src",
      "components",
      "credits",
      "CreditTransactionHistory.js",
    );

    expect(portal).toContain("useGetCustomerBookingAvailabilityQuery");
    expect(portal).toContain("Array.isArray(bookingsData?.bookings)");
    expect(bookings).toContain("useGetUserBookingsQuery");
    expect(bookings).toMatch(
      /useGetUserBookingsQuery\(\s*\{\s*scope,\s*page,\s*limit: PAGE_SIZE,/,
    );
    expect(bookings).toContain(
      "...(activeLocationId ? { locationId: activeLocationId } : {})",
    );
    expect(bookings).toContain("isUserBookingsError");
    expect(creditsApi).toContain("params: { page, limit }");
    expect(creditHistory).not.toContain(".slice(0, 15)");
  });
});
