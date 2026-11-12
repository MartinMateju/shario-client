import { apiSlice } from "../api/apiSlice";
import { encodeTenantSlugPathSegment } from "@/utils/tenantRouting";

const getPublicTenantCheckoutUrl = (tenantSlug, suffix) =>
  `/public/tenants/${encodeTenantSlugPathSegment(tenantSlug)}/checkout/${suffix}`;

const encodeOrderIdPathSegment = (value) => {
  const orderId = String(value ?? "").trim();

  if (!orderId || orderId.length > 128 || !/^[a-zA-Z0-9_-]+$/.test(orderId)) {
    throw new TypeError("A valid order id is required.");
  }

  return encodeURIComponent(orderId);
};

export const checkoutApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCartCheckoutQuote: builder.query({
      // ownerScope participates in the RTK cache key, never in the request.
      query: ({ cart, locale }) => ({
        url: "/checkout/quote",
        method: "POST",
        cache: "no-store",
        body: { cart, locale },
      }),
      keepUnusedDataFor: 0,
      providesTags: ["Credits", { type: "Membership", id: "MINE" }],
    }),
    checkoutWithMembership: builder.mutation({
      query: ({ idempotencyKey, ...body }) => ({
        url: "/checkout/membership",
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body,
      }),
      invalidatesTags: (result, error) =>
        !error && result?.status === "confirmed" && result?.orderId
          ? [
              { type: "Booking", id: "MINE" },
              { type: "Booking", id: "LIST" },
              { type: "Booking", id: "MINE-AVAILABILITY" },
              { type: "Order", id: "LIST" },
              { type: "Membership", id: "MINE" },
              { type: "MembershipLedger", id: "MINE" },
            ]
          : [],
    }),
    // Checkout for logged-in users.
    checkout: builder.mutation({
      query: ({ idempotencyKey, ...checkoutData }) => ({
        url: "/checkout",
        method: "POST",
        ...(idempotencyKey
          ? { headers: { "Idempotency-Key": idempotencyKey } }
          : {}),
        body: { ...checkoutData },
      }),
      invalidatesTags: (result, error) =>
        !error && result?.status === "confirmed" && result?.orderId
          ? [
              { type: "Booking", id: "MINE" },
              { type: "Booking", id: "LIST" },
              { type: "Booking", id: "MINE-AVAILABILITY" },
              { type: "Order", id: "LIST" },
            ]
          : [],
    }),
    // Guest checkout supports vouchers and card payment for any remainder.
    guestCheckout: builder.mutation({
      query: ({ tenantSlug, idempotencyKey, ...checkoutData }) => ({
        url: getPublicTenantCheckoutUrl(tenantSlug, "guest"),
        method: "POST",
        credentials: "omit",
        referrerPolicy: "no-referrer",
        headers: { "Idempotency-Key": idempotencyKey },
        body: { ...checkoutData },
      }),
    }),
    quoteGuestCourseVoucher: builder.mutation({
      query: ({ tenantSlug, ...checkoutData }) => ({
        url: getPublicTenantCheckoutUrl(tenantSlug, "guest/voucher/quote"),
        method: "POST",
        credentials: "omit",
        referrerPolicy: "no-referrer",
        cache: "no-store",
        body: checkoutData,
      }),
    }),
    getGuestCheckoutOrderStatus: builder.query({
      query: ({ tenantSlug, orderId, accessToken }) => ({
        url: `${getPublicTenantCheckoutUrl(
          tenantSlug,
          "guest/orders",
        )}/${encodeOrderIdPathSegment(orderId)}/status`,
        // Old guest links have no proof and use the historical status route.
        // New orders are verified with their secret proof in a POST body.
        method: accessToken ? "POST" : "GET",
        ...(accessToken ? { body: { accessToken } } : {}),
        credentials: "omit",
        referrerPolicy: "no-referrer",
        cache: "no-store",
      }),
      keepUnusedDataFor: 0,
      providesTags: (_result, _error, { orderId }) => [
        { type: "Order", id: String(orderId) },
      ],
    }),
    getCheckoutOrderStatus: builder.query({
      query: ({ orderId }) => ({
        url: `/checkout/orders/${encodeOrderIdPathSegment(orderId)}/status`,
        method: "GET",
      }),
      providesTags: (_result, _error, { orderId }) => [
        { type: "Order", id: String(orderId) },
      ],
    }),
    getMyOrderConfirmation: builder.query({
      query: ({ orderId }) => ({
        url: `/orders/mine/${encodeOrderIdPathSegment(orderId)}/confirmation`,
        method: "GET",
      }),
      providesTags: (_result, _error, { orderId }) => [
        { type: "Order", id: String(orderId) },
        { type: "Booking", id: "MINE" },
      ],
    }),
  }),
});

export const {
  useGetCartCheckoutQuoteQuery,
  useCheckoutWithMembershipMutation,
  useCheckoutMutation,
  useGuestCheckoutMutation,
  useQuoteGuestCourseVoucherMutation,
  useGetGuestCheckoutOrderStatusQuery,
  useGetCheckoutOrderStatusQuery,
  useLazyGetCheckoutOrderStatusQuery,
  useGetMyOrderConfirmationQuery,
  useLazyGetMyOrderConfirmationQuery,
} = checkoutApiSlice;
