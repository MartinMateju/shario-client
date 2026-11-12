import { apiSlice } from "../api/apiSlice";

const conversationTags = (result) => {
  const source =
    result?.conversations ??
    result?.items ??
    result?.data?.conversations ??
    result?.data?.items ??
    result?.data ??
    result;
  const items = Array.isArray(source) ? source : [];

  return [
    { type: "CommunicationConversation", id: "LIST" },
    ...items
      .map((item) => item?._id ?? item?.id)
      .filter(Boolean)
      .map((id) => ({ type: "CommunicationConversation", id })),
  ];
};

export const communicationsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCommunicationsOverview: builder.query({
      query: (params = {}) => ({
        url: "/communications/overview",
        params,
      }),
      providesTags: ["CommunicationOverview"],
    }),

    getCommunicationConversations: builder.query({
      query: (params = {}) => ({
        url: "/communications/conversations",
        params,
      }),
      providesTags: conversationTags,
    }),

    getCommunicationConversation: builder.query({
      query: (id) => `/communications/conversations/${id}`,
      providesTags: (_result, _error, id) => [
        { type: "CommunicationConversation", id },
      ],
    }),

    getCommunicationMessages: builder.query({
      query: ({ conversationId, ...params }) => ({
        url: `/communications/conversations/${conversationId}/messages`,
        params,
      }),
      providesTags: (_result, _error, { conversationId }) => [
        { type: "CommunicationMessage", id: conversationId },
      ],
    }),

    createCommunicationConversation: builder.mutation({
      query: (body) => ({
        url: "/communications/conversations",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "CommunicationConversation", id: "LIST" },
        "CommunicationOverview",
      ],
    }),

    updateCommunicationConversation: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/communications/conversations/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "CommunicationConversation", id },
        { type: "CommunicationConversation", id: "LIST" },
        "CommunicationOverview",
      ],
    }),

    createCustomerFromCommunicationConversation: builder.mutation({
      query: (id) => ({
        url: `/communications/conversations/${id}/customer`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "CommunicationConversation", id },
        { type: "CommunicationConversation", id: "LIST" },
        "CommunicationOverview",
        "CommunicationAudit",
        "User",
      ],
    }),

    sendCommunicationReply: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/communications/conversations/${id}/reply`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "CommunicationConversation", id },
        { type: "CommunicationMessage", id },
        { type: "CommunicationConversation", id: "LIST" },
        "CommunicationOverview",
      ],
    }),

    addCommunicationNote: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/communications/conversations/${id}/notes`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "CommunicationConversation", id },
        { type: "CommunicationMessage", id },
      ],
    }),

    assignCommunicationConversation: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/communications/conversations/${id}/assign`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "CommunicationConversation", id },
        { type: "CommunicationConversation", id: "LIST" },
        "CommunicationOverview",
      ],
    }),

    resolveCommunicationConversation: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/communications/conversations/${id}/resolve`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "CommunicationConversation", id },
        { type: "CommunicationConversation", id: "LIST" },
        "CommunicationOverview",
        "CommunicationSatisfaction",
      ],
    }),

    createTaskFromConversation: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/communications/conversations/${id}/task`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "CommunicationConversation", id },
        "StaffTask",
        "CommunicationAudit",
      ],
    }),

    decideCommunicationAction: builder.mutation({
      query: ({ conversationId, actionId, ...body }) => ({
        url: `/communications/conversations/${conversationId}/actions/${actionId}`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { conversationId }) => [
        { type: "CommunicationConversation", id: conversationId },
        { type: "CommunicationMessage", id: conversationId },
        { type: "CommunicationConversation", id: "LIST" },
        "CommunicationAudit",
        "StaffTask",
      ],
    }),

    analyzeCommunicationConversation: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/communications/conversations/${id}/ai/analyze`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "CommunicationConversation", id },
        { type: "CommunicationConversation", id: "LIST" },
        "CommunicationOverview",
        "CommunicationAudit",
      ],
    }),

    draftCommunicationReply: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/communications/conversations/${id}/ai/draft`,
        method: "POST",
        body,
      }),
    }),

    translateCommunicationMessage: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/communications/messages/${id}/translate`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["CommunicationMessage", "CommunicationAudit"],
    }),

    transcribeCommunicationMessage: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/communications/messages/${id}/transcribe`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["CommunicationMessage", "CommunicationAudit"],
    }),

    getCommunicationKnowledge: builder.query({
      query: (params = {}) => ({
        url: "/communications/knowledge",
        params,
      }),
      providesTags: ["CommunicationKnowledge"],
    }),

    createCommunicationKnowledge: builder.mutation({
      query: (body) => ({
        url: "/communications/knowledge",
        method: "POST",
        body,
      }),
      invalidatesTags: ["CommunicationKnowledge", "CommunicationAudit"],
    }),

    updateCommunicationKnowledge: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/communications/knowledge/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["CommunicationKnowledge", "CommunicationAudit"],
    }),

    deleteCommunicationKnowledge: builder.mutation({
      query: (id) => ({
        url: `/communications/knowledge/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["CommunicationKnowledge", "CommunicationAudit"],
    }),

    getCommunicationRoutingRules: builder.query({
      query: (params = {}) => ({
        url: "/communications/routing-rules",
        params,
      }),
      providesTags: ["CommunicationRoutingRule"],
    }),

    createCommunicationRoutingRule: builder.mutation({
      query: (body) => ({
        url: "/communications/routing-rules",
        method: "POST",
        body,
      }),
      invalidatesTags: ["CommunicationRoutingRule", "CommunicationAudit"],
    }),

    updateCommunicationRoutingRule: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/communications/routing-rules/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["CommunicationRoutingRule", "CommunicationAudit"],
    }),

    deleteCommunicationRoutingRule: builder.mutation({
      query: (id) => ({
        url: `/communications/routing-rules/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["CommunicationRoutingRule", "CommunicationAudit"],
    }),

    getCommunicationSettings: builder.query({
      query: () => "/communications/settings",
      providesTags: ["CommunicationSettings"],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(apiSlice.util.invalidateTags(["SetupCenter"]));
        } catch {
          // The communications screen owns its request error.
        }
      },
    }),

    updateCommunicationSettings: builder.mutation({
      query: (body) => ({
        url: "/communications/settings",
        method: "PATCH",
        body,
      }),
      invalidatesTags: [
        "CommunicationSettings",
        "CommunicationOverview",
        "CommunicationAudit",
        "SetupCenter",
      ],
    }),

    getCommunicationAudit: builder.query({
      query: (params = {}) => ({
        url: "/communications/audit",
        params,
      }),
      providesTags: ["CommunicationAudit"],
    }),

    getCommunicationConsent: builder.query({
      query: (customerId) => `/communications/consents/${customerId}`,
      providesTags: (_result, _error, customerId) => [
        { type: "CommunicationConsent", id: customerId },
      ],
    }),

    updateCommunicationConsent: builder.mutation({
      query: ({ customerId, ...body }) => ({
        url: `/communications/consents/${customerId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, { customerId }) => [
        { type: "CommunicationConsent", id: customerId },
        { type: "CommunicationTimeline", id: customerId },
        "CommunicationAudit",
      ],
    }),

    retryCommunicationDelivery: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/communications/deliveries/${id}/retry`,
        method: "POST",
        body,
      }),
      invalidatesTags: [
        "CommunicationMessage",
        "CommunicationConversation",
        "CommunicationOverview",
        "CommunicationAudit",
      ],
    }),

    fallbackCommunicationDelivery: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/communications/deliveries/${id}/fallback`,
        method: "POST",
        body,
      }),
      invalidatesTags: [
        "CommunicationMessage",
        "CommunicationConversation",
        "CommunicationOverview",
        "CommunicationAudit",
      ],
    }),

    getCustomerCommunicationTimeline: builder.query({
      query: ({ customerId, ...params }) => ({
        url: `/communications/customers/${customerId}/timeline`,
        params,
      }),
      providesTags: (_result, _error, { customerId }) => [
        { type: "CommunicationTimeline", id: customerId },
      ],
    }),

    getCommunicationSatisfaction: builder.query({
      query: (params = {}) => ({
        url: "/communications/satisfaction",
        params,
      }),
      providesTags: ["CommunicationSatisfaction"],
    }),

    submitCommunicationSatisfaction: builder.mutation({
      query: ({ token, ...body }) => ({
        url: `/communications/satisfaction/${token}`,
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useGetCommunicationsOverviewQuery,
  useGetCommunicationConversationsQuery,
  useGetCommunicationConversationQuery,
  useGetCommunicationMessagesQuery,
  useCreateCommunicationConversationMutation,
  useUpdateCommunicationConversationMutation,
  useCreateCustomerFromCommunicationConversationMutation,
  useSendCommunicationReplyMutation,
  useAddCommunicationNoteMutation,
  useAssignCommunicationConversationMutation,
  useResolveCommunicationConversationMutation,
  useCreateTaskFromConversationMutation,
  useDecideCommunicationActionMutation,
  useAnalyzeCommunicationConversationMutation,
  useDraftCommunicationReplyMutation,
  useTranslateCommunicationMessageMutation,
  useTranscribeCommunicationMessageMutation,
  useGetCommunicationKnowledgeQuery,
  useCreateCommunicationKnowledgeMutation,
  useUpdateCommunicationKnowledgeMutation,
  useDeleteCommunicationKnowledgeMutation,
  useGetCommunicationRoutingRulesQuery,
  useCreateCommunicationRoutingRuleMutation,
  useUpdateCommunicationRoutingRuleMutation,
  useDeleteCommunicationRoutingRuleMutation,
  useGetCommunicationSettingsQuery,
  useUpdateCommunicationSettingsMutation,
  useGetCommunicationAuditQuery,
  useGetCommunicationConsentQuery,
  useUpdateCommunicationConsentMutation,
  useRetryCommunicationDeliveryMutation,
  useFallbackCommunicationDeliveryMutation,
  useGetCustomerCommunicationTimelineQuery,
  useGetCommunicationSatisfactionQuery,
  useSubmitCommunicationSatisfactionMutation,
} = communicationsApiSlice;
