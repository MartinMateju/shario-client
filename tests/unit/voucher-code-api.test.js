import { describe, expect, it, vi } from "vitest";

const captured = vi.hoisted(() => ({ endpoints: {} }));
vi.mock("@/lib/features/api/apiSlice", () => ({
  apiSlice: {
    injectEndpoints: ({ endpoints }) => {
      captured.endpoints = endpoints({
        query: (definition) => definition,
        mutation: (definition) => definition,
      });
      return {};
    },
  },
}));
await import("@/lib/features/coupons/couponsApiSlice");

describe("voucher code management transport", () => {
  it.each([
    ["archivePromoCode", "archive"],
    ["restorePromoCode", "restore"],
  ])(
    "keeps %s separate from revocation and forwards its retry identity",
    (endpoint, action) => {
      expect(
        captured.endpoints[endpoint].query({
          couponId: "code/1",
          operationId: "operation-1",
        }),
      ).toEqual({
        url: `/coupons/promo-codes/code%2F1/${action}`,
        method: "PATCH",
        body: { operationId: "operation-1" },
      });
      expect(captured.endpoints[endpoint].invalidatesTags).toContain("Coupon");
    },
  );
});
