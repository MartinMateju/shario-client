import { apiSlice } from "../api/apiSlice";

export const creditsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getMyCreditBalance: builder.query({
      query: () => ({
        url: "/credits/mine/balance",
        method: "GET",
      }),
      providesTags: ["Credits"],
    }),

    getMyCreditTransactions: builder.query({
      query: ({ page = 1, limit = 15 } = {}) => ({
        url: "/credits/mine/transactions",
        method: "GET",
        params: { page, limit },
      }),
      providesTags: ["CreditTransactions"],
    }),

    getCreditBalance: builder.query({
      query: (userId) => ({
        url: `/credits/balance/${userId}`,
        method: "GET",
      }),
      providesTags: ["Credits"],
    }),

    getCreditTransactions: builder.query({
      query: (request) => {
        const {
          userId,
          page = 1,
          limit = 15,
        } = typeof request === "string" ? { userId: request } : request || {};

        return {
          url: `/credits/transactions/${userId}`,
          method: "GET",
          params: { page, limit },
        };
      },
      providesTags: ["CreditTransactions"],
    }),

    addCredits: builder.mutation({
      query: (data) => ({
        url: "/credits/add",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Credits", "CreditTransactions"],
    }),

    useCredits: builder.mutation({
      query: (data) => ({
        url: "/credits/use",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Credits", "CreditTransactions"],
    }),

    refundCredits: builder.mutation({
      query: (data) => ({
        url: "/credits/refund",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Credits", "CreditTransactions"],
    }),

    purchaseCredits: builder.mutation({
      query: (data) => ({
        url: "/credits/purchase",
        method: "POST",
        body: data,
      }),
    }),

    checkCreditsForCart: builder.mutation({
      query: (data) => ({
        url: "/cart/check-credits",
        method: "POST",
        body: data,
      }),
    }),

    checkoutWithCredits: builder.mutation({
      query: ({ idempotencyKey, ...cartItems }) => ({
        url: "/checkout/credits",
        method: "POST",
        ...(idempotencyKey
          ? { headers: { "Idempotency-Key": idempotencyKey } }
          : {}),
        body: {
          ...cartItems,
        },
      }),
      invalidatesTags: ["Credits", "CreditTransactions"],
    }),

    adminGrantCredits: builder.mutation({
      query: ({ idempotencyKey, ...data }) => ({
        url: "/credits/admin/grant",
        method: "POST",
        ...(idempotencyKey
          ? { headers: { "Idempotency-Key": idempotencyKey } }
          : {}),
        body: {
          ...data,
        },
      }),
      invalidatesTags: [
        "Credits",
        "CreditTransactions",
        { type: "User", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetMyCreditBalanceQuery,
  useGetMyCreditTransactionsQuery,
  useGetCreditBalanceQuery,
  useGetCreditTransactionsQuery,
  useAddCreditsMutation,
  useUseCreditsMutation,
  useRefundCreditsMutation,
  usePurchaseCreditsMutation,
  useCheckCreditsForCartMutation,
  useCheckoutWithCreditsMutation,
  useAdminGrantCreditsMutation,
} = creditsApiSlice;
