import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/features/api/apiSlice", () => ({
  apiSlice: {
    injectEndpoints: ({ endpoints }) => ({
      endpoints: endpoints({
        query: (definition) => ({ ...definition, select: () => () => ({}) }),
        mutation: (definition) => definition,
      }),
    }),
  },
}));

import { usersApiSlice } from "@/lib/features/users/usersApiSlice";

describe("customer directory metric refresh", () => {
  it("fetches an independent subscriber summary and refreshes after membership changes", () => {
    const endpoint = usersApiSlice.endpoints.getUsersSummary;
    expect(
      endpoint.query({ locationId: "ignored", page: 2, search: "ignored" }),
    ).toBe("/users/summary");
    expect(
      endpoint.transformResponse({ data: { activeMemberships: 42 } }),
    ).toEqual({ activeMemberships: 42 });
    expect(endpoint.transformResponse({ activeMemberships: null })).toEqual({
      activeMemberships: null,
    });
    expect(endpoint.providesTags).toContainEqual({
      type: "Membership",
      id: "LIST",
    });
  });
  const metricTags = [
    { type: "Booking", id: "LIST" },
    { type: "Order", id: "LIST" },
    { type: "CouponOrder", id: "LIST" },
    { type: "MembershipInvoice", id: "LIST" },
  ];

  it.each([[[{ id: "customer-1" }]], [{ users: [{ _id: "customer-1" }] }]])(
    "subscribes customer metrics to booking, order and voucher-order invalidation",
    (response) => {
      const tags = usersApiSlice.endpoints.getUsers.providesTags(
        response,
        undefined,
        { tenantRole: "customer" },
      );
      expect(tags).toEqual(
        expect.arrayContaining([
          { type: "User", id: "LIST" },
          { type: "User", id: "customer-1" },
          ...metricTags,
        ]),
      );
    },
  );

  it("does not add metric invalidation dependencies to unrelated user directories", () => {
    const tags = usersApiSlice.endpoints.getUsers.providesTags(
      [{ id: "staff-1" }],
      undefined,
      {},
    );
    expect(tags).toEqual([
      { type: "User", id: "LIST" },
      { type: "User", id: "staff-1" },
    ]);
  });
});
