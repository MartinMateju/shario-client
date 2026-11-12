import { apiSlice } from "../api/apiSlice";
import { buildTenantPaymentOnboardingBody } from "./tenantPaymentOnboarding";

const TENANT_PAYMENT_CONNECT_URL = "/tenant-payments/connect";

export const tenantPaymentsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getTenantPaymentConnect: builder.query({
      query: () => TENANT_PAYMENT_CONNECT_URL,
      providesTags: ["TenantPaymentConnect"],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(apiSlice.util.invalidateTags(["SetupCenter"]));
        } catch {
          // The payment screen owns its request error. Keep setup data cached.
        }
      },
    }),

    startTenantPaymentConnectOnboarding: builder.mutation({
      query: (request = {}) => ({
        url: `${TENANT_PAYMENT_CONNECT_URL}/onboarding`,
        method: "POST",
        body: buildTenantPaymentOnboardingBody(request),
      }),
      invalidatesTags: ["TenantPaymentConnect", "SetupCenter"],
    }),

    openTenantPaymentConnectDashboard: builder.mutation({
      query: () => ({
        url: `${TENANT_PAYMENT_CONNECT_URL}/dashboard`,
        method: "POST",
        body: {},
      }),
    }),
  }),
});

export const {
  useGetTenantPaymentConnectQuery,
  useStartTenantPaymentConnectOnboardingMutation,
  useOpenTenantPaymentConnectDashboardMutation,
} = tenantPaymentsApiSlice;
