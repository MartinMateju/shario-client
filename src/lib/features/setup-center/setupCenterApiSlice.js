import { apiSlice } from "../api/apiSlice";

const unwrap = (response) => response?.data ?? response ?? null;

export const setupCenterApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSetupCenter: builder.query({
      query: () => "/tenants/current/setup-center",
      transformResponse: unwrap,
      providesTags: ["SetupCenter"],
    }),
    requestSetupAssistant: builder.mutation({
      query: (body) => ({
        url: "/tenants/current/setup-center/assistant",
        method: "POST",
        body,
      }),
      transformResponse: unwrap,
    }),
    startSetupPractice: builder.mutation({
      query: (idempotencyKey) => ({
        url: "/tenants/current/setup-center/practice",
        method: "POST",
        body: { idempotencyKey },
      }),
      transformResponse: unwrap,
      invalidatesTags: ["SetupCenter"],
    }),
    advanceSetupPractice: builder.mutation({
      query: ({ runId, action }) => ({
        url: `/tenants/current/setup-center/practice/actions/${action}`,
        method: "POST",
        body: { runId },
      }),
      transformResponse: unwrap,
      invalidatesTags: ["SetupCenter"],
    }),
    abandonSetupPractice: builder.mutation({
      query: () => ({
        url: "/tenants/current/setup-center/practice",
        method: "DELETE",
      }),
      transformResponse: unwrap,
      invalidatesTags: ["SetupCenter"],
    }),
    confirmSetupPractice: builder.mutation({
      query: (expectedReadinessFingerprint) => ({
        url: "/tenants/current/setup-center/practice/confirmation",
        method: "POST",
        body: { confirmed: true, expectedReadinessFingerprint },
      }),
      transformResponse: unwrap,
      invalidatesTags: ["SetupCenter"],
    }),
    removeSetupPracticeConfirmation: builder.mutation({
      query: () => ({
        url: "/tenants/current/setup-center/practice/confirmation",
        method: "DELETE",
      }),
      transformResponse: unwrap,
      invalidatesTags: ["SetupCenter"],
    }),
    publishStudio: builder.mutation({
      query: (expectedDefinitionVersion) => ({
        url: "/tenants/current/setup-center/publish",
        method: "POST",
        body: { expectedDefinitionVersion },
      }),
      transformResponse: unwrap,
      invalidatesTags: ["SetupCenter"],
    }),
    unpublishStudio: builder.mutation({
      query: () => ({
        url: "/tenants/current/setup-center/unpublish",
        method: "POST",
      }),
      transformResponse: unwrap,
      invalidatesTags: ["SetupCenter"],
    }),
    trackSetupEvent: builder.mutation({
      query: (body) => ({
        url: "/tenants/current/setup-center/events",
        method: "POST",
        body,
      }),
      transformResponse: unwrap,
    }),
  }),
});

export const {
  useGetSetupCenterQuery,
  useRequestSetupAssistantMutation,
  useStartSetupPracticeMutation,
  useAdvanceSetupPracticeMutation,
  useAbandonSetupPracticeMutation,
  useConfirmSetupPracticeMutation,
  useRemoveSetupPracticeConfirmationMutation,
  usePublishStudioMutation,
  useUnpublishStudioMutation,
  useTrackSetupEventMutation,
} = setupCenterApiSlice;
