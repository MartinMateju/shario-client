import { apiSlice } from "../api/apiSlice";
import { resolvePlatformBillingCurrency } from "@/config/currencies";

const SUBSCRIPTION_URL = "/tenants/current/subscription";

const normalizeBillingRequest = (body = {}) => ({
  ...body,
  ...(body.billingCurrency
    ? {
        billingCurrency: resolvePlatformBillingCurrency(body.billingCurrency),
      }
    : {}),
});

export const billingApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCurrentTenantSubscription: builder.query({
      query: () => SUBSCRIPTION_URL,
      providesTags: ["TenantSubscription"],
    }),

    startTenantSubscriptionCheckout: builder.mutation({
      query: (body) => ({
        url: `${SUBSCRIPTION_URL}/checkout`,
        method: "POST",
        body: normalizeBillingRequest(body),
      }),
      invalidatesTags: ["Tenant", "TenantSubscription"],
    }),

    previewTenantPlanChange: builder.mutation({
      query: (body) => ({
        url: `${SUBSCRIPTION_URL}/change-preview`,
        method: "POST",
        body: normalizeBillingRequest(body),
      }),
    }),

    changeTenantPlan: builder.mutation({
      query: (body) => ({
        url: `${SUBSCRIPTION_URL}/change-plan`,
        method: "POST",
        body: normalizeBillingRequest(body),
      }),
      invalidatesTags: ["Tenant", "TenantSubscription"],
    }),

    cancelTenantSubscription: builder.mutation({
      query: (body = {}) => ({
        url: `${SUBSCRIPTION_URL}/cancel`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Tenant", "TenantSubscription"],
    }),

    resumeTenantSubscription: builder.mutation({
      query: () => ({
        url: `${SUBSCRIPTION_URL}/resume`,
        method: "POST",
      }),
      invalidatesTags: ["Tenant", "TenantSubscription"],
    }),

    getTenantInvoices: builder.query({
      query: ({ limit = 20, startingAfter } = {}) => ({
        url: `${SUBSCRIPTION_URL}/invoices`,
        params: {
          limit,
          ...(startingAfter ? { startingAfter } : {}),
        },
      }),
      providesTags: ["TenantSubscription"],
    }),

    openTenantBillingPortal: builder.mutation({
      query: (body) => ({
        url: `${SUBSCRIPTION_URL}/portal`,
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useGetCurrentTenantSubscriptionQuery,
  useStartTenantSubscriptionCheckoutMutation,
  usePreviewTenantPlanChangeMutation,
  useChangeTenantPlanMutation,
  useCancelTenantSubscriptionMutation,
  useResumeTenantSubscriptionMutation,
  useGetTenantInvoicesQuery,
  useLazyGetTenantInvoicesQuery,
  useOpenTenantBillingPortalMutation,
} = billingApiSlice;
