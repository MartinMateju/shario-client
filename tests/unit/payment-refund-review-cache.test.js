import { configureStore } from "@reduxjs/toolkit";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { server } from "@/test/mocks/server";

vi.mock("@/lib/features/api/apiSlice", async () => {
  const { createApi, fetchBaseQuery } =
    await import("@reduxjs/toolkit/query/react");
  return {
    apiSlice: createApi({
      reducerPath: "refundReviewTestApi",
      baseQuery: fetchBaseQuery({ baseUrl: "https://api.shario.test" }),
      tagTypes: [
        "TenantPaymentConnect",
        "SetupCenter",
        "Order",
        "StudioOrders",
        "MembershipInvoice",
      ],
      endpoints: () => ({}),
    }),
  };
});
import { tenantPaymentsApiSlice as api } from "@/lib/features/tenant-payments/tenantPaymentsApiSlice";
const stores = [];
afterEach(() => {
  for (const store of stores.splice(0))
    store.dispatch(api.util.resetApiState());
});

describe("refund review RTK cache", () => {
  it.each([false, true])(
    "refreshes all review pages and related payment summaries only after success (failure=%s)",
    async (fails) => {
      const counts = { first: 0, next: 0, order: 0, invoice: 0 };
      let resolved = false;
      let submitted;
      server.use(
        http.get(
          "https://api.shario.test/tenant-payments/connect/refund-reviews",
          ({ request }) => {
            const next = new URL(request.url).searchParams.get("cursor");
            counts[next ? "next" : "first"]++;
            return HttpResponse.json({
              reviews: resolved ? [] : [{ id: "review-1" }],
              nextCursor: next ? null : "cursor-2",
            });
          },
        ),
        http.post(
          "https://api.shario.test/tenant-payments/connect/refund-reviews/review-1/resolve",
          async ({ request }) => {
            submitted = await request.json();
            if (fails)
              return HttpResponse.json(
                { code: "REFUND_REVIEW_CHANGED" },
                { status: 409 },
              );
            resolved = true;
            return HttpResponse.json({
              review: { id: "review-1", reviewRequired: false },
            });
          },
        ),
        http.get("https://api.shario.test/refund-test/order", () => {
          counts.order++;
          return HttpResponse.json({ reviewRequired: !resolved });
        }),
        http.get("https://api.shario.test/refund-test/invoice", () => {
          counts.invoice++;
          return HttpResponse.json({ reviewRequired: !resolved });
        }),
      );
      api.injectEndpoints({
        overrideExisting: true,
        endpoints: (builder) => ({
          reviewTestOrder: builder.query({
            query: () => "/refund-test/order",
            providesTags: ["Order"],
          }),
          reviewTestInvoice: builder.query({
            query: () => "/refund-test/invoice",
            providesTags: ["MembershipInvoice"],
          }),
        }),
      });
      const store = configureStore({
        reducer: { [api.reducerPath]: api.reducer },
        middleware: (getDefault) => getDefault().concat(api.middleware),
      });
      stores.push(store);
      const subscriptions = [
        store.dispatch(api.endpoints.getPaymentRefundReviews.initiate(null)),
        store.dispatch(
          api.endpoints.getPaymentRefundReviews.initiate("cursor-2"),
        ),
        store.dispatch(api.endpoints.reviewTestOrder.initiate()),
        store.dispatch(api.endpoints.reviewTestInvoice.initiate()),
      ];
      await Promise.all(subscriptions);
      const result = await store.dispatch(
        api.endpoints.resolvePaymentRefundReview.initiate({
          id: "review-1",
          snapshotVersion: "a".repeat(64),
          note: "Reviewed benefits",
          evidence: "Support case 123",
          ignored: "never send",
        }),
      );
      expect(submitted).toEqual({
        snapshotVersion: "a".repeat(64),
        note: "Reviewed benefits",
        evidence: "Support case 123",
      });
      if (fails) {
        expect(result.error.status).toBe(409);
        expect(counts).toEqual({ first: 1, next: 1, order: 1, invoice: 1 });
        expect(
          api.endpoints.getPaymentRefundReviews.select(null)(store.getState())
            .data.reviews,
        ).toHaveLength(1);
      } else {
        await vi.waitFor(() =>
          expect(counts).toEqual({ first: 2, next: 2, order: 2, invoice: 2 }),
        );
        await vi.waitFor(() =>
          expect(
            api.endpoints.getPaymentRefundReviews.select(null)(store.getState())
              .data.reviews,
          ).toEqual([]),
        );
        expect(
          api.endpoints.reviewTestOrder.select()(store.getState()).data
            .reviewRequired,
        ).toBe(false);
      }
      subscriptions.forEach((subscription) => subscription.unsubscribe());
    },
  );
});
