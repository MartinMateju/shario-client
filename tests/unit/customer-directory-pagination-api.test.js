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
import { customerDirectoryApiSlice } from "@/lib/features/users/customerDirectoryApiSlice";
import { getCompleteCustomerExport } from "@/components/tables/people/customer-directory.utils";
const {
  getCustomerDirectory,
  getCustomerDirectorySummary,
  exportCustomerDirectory,
} = customerDirectoryApiSlice.endpoints;

describe("paginated customer directory contract", () => {
  it("sends spending/date/credit filters to both directory and filtered exports, preserving zero", () => {
    const args = {
      spendMin: 0,
      spendMax: "2500.5",
      spendFrom: "2026-10-01",
      spendTo: "2026-10-31",
      creditMin: "-10",
      creditMax: 0,
      timeZone: "Europe/Prague",
    };
    expect(
      getCustomerDirectory.query({
        ...args,
        page: 2,
        limit: 20,
        tenantId: "spoofed",
      }).params,
    ).toEqual({
      page: 2,
      limit: 20,
      search: "",
      status: "",
      membership: "",
      ...args,
    });
    expect(
      exportCustomerDirectory.query({ ...args, page: 2, limit: 20 }).body,
    ).toEqual({ search: "", status: "", membership: "", ...args });
  });
  it("keeps only date display context with an explicit selected-customer export", () => {
    expect(
      exportCustomerDirectory.query({
        ids: ["one"],
        spendFrom: "2026-10-01",
        timeZone: "Europe/Prague",
        spendMin: "10",
        creditMax: "100",
        status: "active",
      }).body,
    ).toEqual({
      ids: ["one"],
      spendFrom: "2026-10-01",
      timeZone: "Europe/Prague",
    });
  });
  it("sends page and all filters but keeps tenant/principal scope and arbitrary fields off the wire", () => {
    expect(
      getCustomerDirectory.query({
        cacheScope: "tenant-a:owner",
        tenantId: "spoofed",
        locationId: "spoofed",
        page: 3,
        limit: 20,
        search: "Ada",
        membership: "clay_club",
        status: "inactive",
        allowAll: true,
      }),
    ).toEqual({
      url: "/users/directory",
      params: {
        page: 3,
        limit: 20,
        search: "Ada",
        membership: "clay_club",
        status: "inactive",
      },
    });
  });
  it("requests summary/facets separately, without table filters", () => {
    expect(
      getCustomerDirectorySummary.query({
        cacheScope: "tenant-a:owner",
        timeZone: "Europe/Prague",
        search: "Ada",
        page: 9,
      }),
    ).toEqual({
      url: "/users/directory/summary",
      params: { timeZone: "Europe/Prague" },
    });
    expect(getCustomerDirectorySummary.providesTags).toContainEqual({
      type: "User",
      id: "LIST",
    });
    expect(getCustomerDirectorySummary.providesTags).toContain("Credits");
    expect(getCustomerDirectorySummary.providesTags).toContain("Membership");
    expect(getCustomerDirectorySummary.providesTags).toContain("Tenant");
    expect(getCustomerDirectorySummary.providesTags).not.toContainEqual({
      type: "Order",
      id: "LIST",
    });
  });
  it("exports filters without pagination, or selected IDs without filters", () => {
    expect(
      exportCustomerDirectory.query({
        cacheScope: "tenant-a:owner",
        search: "Ada",
        status: "active",
        membership: "club",
        page: 4,
        limit: 10,
      }),
    ).toEqual({
      url: "/users/directory/export",
      method: "POST",
      body: { search: "Ada", status: "active", membership: "club" },
    });
    expect(
      exportCustomerDirectory.query({
        cacheScope: "tenant-a:owner",
        ids: ["one", "two"],
        search: "must-not-filter-selection",
        page: 4,
      }),
    ).toEqual({
      url: "/users/directory/export",
      method: "POST",
      body: { ids: ["one", "two"] },
    });
  });
  it("refreshes visible metrics after booking/payment/credit changes and tags only returned customers", () => {
    const tags = getCustomerDirectory.providesTags({
      data: [{ id: "visible" }, { _id: "second" }],
    });
    for (const type of [
      "User",
      "Booking",
      "Order",
      "CouponOrder",
      "MembershipInvoice",
    ])
      expect(tags).toContainEqual({ type, id: "LIST" });
    expect(tags).toContainEqual({ type: "User", id: "visible" });
    expect(tags).toContainEqual({ type: "User", id: "second" });
    expect(tags).toContain("Credits");
    expect(tags).toContain("Membership");
    expect(tags).toContain("Tenant");
  });
  it("accepts a complete selected export regardless of server ordering", () => {
    const data = [{ id: "second" }, { _id: "first" }];
    expect(
      getCompleteCustomerExport({ data, totalCount: 2, complete: true }, [
        "first",
        "second",
      ]),
    ).toEqual(data);
  });
  it.each([
    { data: [{ id: "one" }], totalCount: 2, complete: true },
    { data: [{ id: "one" }], totalCount: 1 },
    { data: [{ id: "one" }, { id: "one" }], totalCount: 2, complete: true },
    { data: [{}], totalCount: 1, complete: true },
  ])("rejects an incomplete or malformed export: %j", (response) => {
    expect(() => getCompleteCustomerExport(response)).toThrow();
  });
});
