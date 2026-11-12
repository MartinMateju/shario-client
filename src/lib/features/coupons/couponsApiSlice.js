import { apiSlice } from "../api/apiSlice";
import { encodeTenantSlugPathSegment } from "@/utils/tenantRouting";

const getPublicCouponPath = (tenantSlug, suffix) =>
  `/public/tenants/${encodeTenantSlugPathSegment(tenantSlug)}/vouchers/${suffix}`;

const getPublicApiUrl = (path) => {
  const baseUrl = String(process.env.NEXT_PUBLIC_API_URL || "").replace(
    /\/$/,
    "",
  );
  return `${baseUrl}${path}`;
};

const publicJsonRequest = async ({ path, method = "GET", body, signal }) => {
  try {
    const response = await fetch(getPublicApiUrl(path), {
      method,
      credentials: "omit",
      cache: "no-store",
      headers: {
        accept: "application/json",
        ...(body ? { "content-type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal,
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        error: {
          status: response.status,
          data: data ?? { message: response.statusText },
        },
      };
    }

    return { data };
  } catch (error) {
    return {
      error: {
        status: "FETCH_ERROR",
        error: error instanceof Error ? error.message : "Request failed",
      },
    };
  }
};

export const couponsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    archivePromoCode: builder.mutation({
      query: ({ couponId, operationId }) => ({
        url: `/coupons/promo-codes/${encodeURIComponent(couponId)}/archive`,
        method: "PATCH",
        body: { operationId },
      }),
      invalidatesTags: ["Coupon"],
    }),
    restorePromoCode: builder.mutation({
      query: ({ couponId, operationId }) => ({
        url: `/coupons/promo-codes/${encodeURIComponent(couponId)}/restore`,
        method: "PATCH",
        body: { operationId },
      }),
      invalidatesTags: ["Coupon"],
    }),
    revokePromoCode: builder.mutation({
      query: ({ couponId, reason, operationId }) => ({
        url: `/coupons/promo-codes/${encodeURIComponent(couponId)}/revoke`,
        method: "PATCH",
        body: { reason, operationId },
      }),
      invalidatesTags: ["Coupon", "CouponOrder", "RedeemedCoupons"],
    }),
    /** PUBLIC: list published voucher products without customer credentials. */
    getCoupons: builder.query({
      async queryFn({ tenantSlug }, { signal }) {
        return publicJsonRequest({
          path: getPublicCouponPath(tenantSlug, "products"),
          signal,
        });
      },
    }),

    /** PUBLIC: create a guest voucher checkout without customer credentials. */
    createCouponOrder: builder.mutation({
      async queryFn({ tenantSlug, ...body }, { signal }) {
        return publicJsonRequest({
          path: getPublicCouponPath(tenantSlug, "checkout"),
          method: "POST",
          body,
          signal,
        });
      },
    }),

    redeemPromoCode: builder.mutation({
      query: ({ promoCode }) => ({
        url: "/coupons/redeem",
        method: "POST",
        body: { promoCode },
      }),
      invalidatesTags: ["RedeemedCoupons", "Credits", "User"],
    }),

    getUserRedeemedCoupons: builder.query({
      query: () => ({
        url: "/coupons/redeem",
        method: "GET",
        validateStatus: (response, result) =>
          response.status === 200 && !result?.isError,
      }),
      transformResponse: (responseData) => responseData,
      providesTags: ["RedeemedCoupons"],
    }),

    getPromoCodesWithFilters: builder.mutation({
      query: (filters) => ({
        url: "/coupons/promo-codes/filter",
        method: "POST",
        body: filters,
      }),
      providesTags: [{ type: "Coupon", id: "LIST" }],
    }),

    createManualPromoCode: builder.mutation({
      query: (data) => ({
        url: "/coupons/promo-codes",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "Coupon", id: "LIST" }],
    }),

    getCouponOrders: builder.query({
      query: () => ({
        url: "/coupons/orders",
        method: "GET",
        validateStatus: (response, result) =>
          response.status === 200 && !result?.isError,
      }),
      transformResponse: (responseData) => responseData,
      providesTags: [{ type: "CouponOrder", id: "LIST" }],
    }),

    getCouponOrder: builder.query({
      query: (orderId) => `/coupons/orders/${encodeURIComponent(orderId)}`,
      providesTags: (_result, _error, orderId) => [
        { type: "CouponOrder", id: orderId },
      ],
      keepUnusedDataFor: 0,
    }),

    dispatchCouponOrder: builder.mutation({
      query: ({ orderId, operationId }) => ({
        url: `/coupons/orders/${encodeURIComponent(orderId)}/dispatch`,
        method: "POST",
        body: { operationId },
      }),
      invalidatesTags: (_result, _error, { orderId }) => [
        { type: "CouponOrder", id: orderId },
        { type: "CouponOrder", id: "LIST" },
      ],
    }),

    downloadCouponOrderPdf: builder.mutation({
      query: ({ orderId, index }) => ({
        url: `/coupons/orders/${encodeURIComponent(orderId)}/download`,
        method: "POST",
        body: { index },
        responseHandler: async (response) => {
          if (!response.ok) return response.json();
          if (
            !response.headers.get("content-type")?.includes("application/pdf")
          ) {
            throw new Error("Expected a voucher PDF.");
          }
          // Keep binary files out of the Redux store.
          const bytes = new Uint8Array(await response.arrayBuffer());
          let binary = "";
          for (let offset = 0; offset < bytes.length; offset += 8192) {
            binary += String.fromCharCode(
              ...bytes.subarray(offset, offset + 8192),
            );
          }
          return { base64: btoa(binary) };
        },
      }),
    }),

    getCouponOrdersWithFilters: builder.mutation({
      query: (filters) => ({
        url: "/coupons/orders/filter",
        method: "POST",
        body: filters,
      }),
      providesTags: [{ type: "CouponOrder", id: "LIST" }],
    }),

    updateCouponOrderStatus: builder.mutation({
      query: (data) => ({
        url: "/coupons/orders/status",
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: [{ type: "CouponOrder", id: "LIST" }],
    }),
  }),
});

export const {
  useArchivePromoCodeMutation,
  useRestorePromoCodeMutation,
  useRevokePromoCodeMutation,
  useGetCouponsQuery,
  useCreateCouponOrderMutation,
  useRedeemPromoCodeMutation,
  useGetUserRedeemedCouponsQuery,
  useGetCouponOrdersQuery,
  useGetCouponOrderQuery,
  useDispatchCouponOrderMutation,
  useDownloadCouponOrderPdfMutation,
  useGetCouponOrdersWithFiltersMutation,
  useUpdateCouponOrderStatusMutation,
  useGetPromoCodesWithFiltersMutation,
  useCreateManualPromoCodeMutation,
} = couponsApiSlice;
