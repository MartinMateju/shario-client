import { apiSlice } from "../api/apiSlice";

const ONBOARDING_URL = "/tenants/current/onboarding";

export const tenantApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCurrentTenantOnboarding: builder.query({
      query: () => ONBOARDING_URL,
      providesTags: ["Tenant"],
    }),

    saveCurrentTenantOnboarding: builder.mutation({
      query: (body) => ({
        url: ONBOARDING_URL,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Tenant"],
    }),

    completeCurrentTenantOnboarding: builder.mutation({
      query: () => ({
        url: `${ONBOARDING_URL}/complete`,
        method: "POST",
      }),
      invalidatesTags: ["Tenant", { type: "Location", id: "LIST" }],
    }),
  }),
});

export const {
  useGetCurrentTenantOnboardingQuery,
  useSaveCurrentTenantOnboardingMutation,
  useCompleteCurrentTenantOnboardingMutation,
} = tenantApiSlice;
