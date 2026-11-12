import { apiSlice } from "../api/apiSlice";
import {
  AI_ACTION_CONFIRM_DOMAIN_TAGS,
  aiActionMutationTags,
  aiAdvisorCacheId,
  aiBriefingCacheId,
  buildKnowledgeCoverageRequest,
  buildPublicConciergeMessageRequest,
  knowledgeCoverageTags,
  normalizeKnowledgeCoverageResponse,
} from "./aiApi.utils";

const unwrapEnvelope = (response) => response?.data ?? response ?? null;

const getId = (value) => value?._id ?? value?.id ?? value ?? null;

const withoutClientCacheScope = (value = {}) => {
  const { cacheScope: _cacheScope, ...requestValue } = value;
  return requestValue;
};

const briefingTag = (params) => ({
  type: "AiBriefing",
  id: aiBriefingCacheId(params),
});

const advisorTag = (params) => ({
  type: "AiAdvisor",
  id: aiAdvisorCacheId(params),
});

const conversationTags = (result) => {
  const source = unwrapEnvelope(result);
  const conversations = Array.isArray(source)
    ? source
    : (source?.conversations ?? source?.items ?? []);

  return [
    { type: "AiConversation", id: "LIST" },
    ...conversations
      .map(getId)
      .filter(Boolean)
      .map((id) => ({ type: "AiConversation", id: String(id) })),
  ];
};

const actionTags = (result) => {
  const source = unwrapEnvelope(result);
  const actions = source?.items ?? source?.actions ?? [];
  return [
    { type: "AiAction", id: "LIST" },
    ...(Array.isArray(actions) ? actions : [])
      .map(getId)
      .filter(Boolean)
      .map((id) => ({ type: "AiAction", id: String(id) })),
  ];
};

export const aiApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAiCapabilities: builder.query({
      query: () => "/ai/capabilities",
      transformResponse: unwrapEnvelope,
      providesTags: ["AiCapabilities"],
    }),

    getAiUsage: builder.query({
      query: () => "/ai/usage",
      transformResponse: unwrapEnvelope,
      providesTags: ["AiUsage"],
    }),

    getAiAssistantConversations: builder.query({
      query: (params = {}) => ({
        url: "/ai/assistant/conversations",
        params: withoutClientCacheScope(params),
      }),
      transformResponse: unwrapEnvelope,
      providesTags: conversationTags,
    }),

    createAiAssistantConversation: builder.mutation({
      query: (body = {}) => ({
        url: "/ai/assistant/conversations",
        method: "POST",
        body,
      }),
      transformResponse: unwrapEnvelope,
      invalidatesTags: [
        { type: "AiConversation", id: "LIST" },
        "AiUsage",
        "AiCapabilities",
      ],
    }),

    getAiAssistantConversation: builder.query({
      query: (input) => {
        const id = typeof input === "object" ? input?.conversationId : input;
        return `/ai/assistant/conversations/${id}`;
      },
      transformResponse: unwrapEnvelope,
      providesTags: (_result, _error, input) => {
        const id = typeof input === "object" ? input?.conversationId : input;
        return [{ type: "AiConversation", id: String(id) }];
      },
    }),

    sendAiAssistantMessage: builder.mutation({
      query: ({ conversationId, ...body }) => ({
        url: `/ai/assistant/conversations/${conversationId}/messages`,
        method: "POST",
        body,
      }),
      transformResponse: unwrapEnvelope,
      invalidatesTags: (_result, _error, { conversationId, actionId }) => [
        ...(conversationId
          ? [{ type: "AiConversation", id: String(conversationId) }]
          : []),
        { type: "AiConversation", id: "LIST" },
        "AiUsage",
        "AiCapabilities",
        { type: "AiAction", id: "LIST" },
      ],
    }),

    getAiActions: builder.query({
      query: (params = {}) => ({ url: "/ai/actions", params }),
      transformResponse: unwrapEnvelope,
      providesTags: actionTags,
    }),

    getAiAction: builder.query({
      query: ({ actionId, ...params }) => ({
        url: `/ai/actions/${actionId}`,
        params,
      }),
      transformResponse: unwrapEnvelope,
      providesTags: (_result, _error, { actionId }) => [
        { type: "AiAction", id: String(actionId) },
      ],
    }),

    confirmAiAssistantAction: builder.mutation({
      query: ({ actionId }) => ({
        url: `/ai/actions/${actionId}/confirm`,
        method: "POST",
      }),
      transformResponse: unwrapEnvelope,
      invalidatesTags: (_result, _error, args) =>
        aiActionMutationTags(args, AI_ACTION_CONFIRM_DOMAIN_TAGS),
    }),

    dismissAiAssistantAction: builder.mutation({
      query: ({ actionId }) => ({
        url: `/ai/actions/${actionId}/dismiss`,
        method: "POST",
      }),
      transformResponse: unwrapEnvelope,
      invalidatesTags: (_result, _error, args) => aiActionMutationTags(args),
    }),

    getLatestAiBriefing: builder.query({
      query: (params = {}) => ({
        url: "/ai/briefings/latest",
        params: withoutClientCacheScope(params),
      }),
      transformResponse: unwrapEnvelope,
      providesTags: (_result, _error, params) => [briefingTag(params)],
    }),

    generateAiBriefing: builder.mutation({
      query: (body = {}) => ({
        url: "/ai/briefings/generate",
        method: "POST",
        body: withoutClientCacheScope(body),
      }),
      transformResponse: unwrapEnvelope,
      invalidatesTags: (_result, _error, body) => [
        briefingTag(body),
        "AiUsage",
        "AiCapabilities",
      ],
    }),

    getAiAdvisorRecommendations: builder.query({
      query: (params = {}) => ({
        url: "/ai/advisor/recommendations",
        params: withoutClientCacheScope(params),
      }),
      transformResponse: unwrapEnvelope,
      providesTags: (_result, _error, params) => [advisorTag(params)],
    }),

    generateAiAdvisorRecommendations: builder.mutation({
      query: (body = {}) => ({
        url: "/ai/advisor/generate",
        method: "POST",
        body: withoutClientCacheScope(body),
      }),
      transformResponse: unwrapEnvelope,
      invalidatesTags: (_result, _error, body) => [
        advisorTag(body),
        "AiUsage",
        "AiCapabilities",
      ],
    }),

    getAiSettings: builder.query({
      query: () => "/ai/settings",
      transformResponse: unwrapEnvelope,
      providesTags: ["AiSettings"],
    }),

    updateAiSettings: builder.mutation({
      query: (body) => ({
        url: "/ai/settings",
        method: "PATCH",
        body,
      }),
      transformResponse: unwrapEnvelope,
      invalidatesTags: ["AiSettings", "AiCapabilities"],
    }),

    submitAiFeedback: builder.mutation({
      query: (body) => ({
        url: "/ai/feedback",
        method: "POST",
        body,
      }),
      transformResponse: unwrapEnvelope,
      invalidatesTags: ["AiFeedback"],
    }),

    getAiKnowledgeCoverage: builder.query({
      query: buildKnowledgeCoverageRequest,
      transformResponse: normalizeKnowledgeCoverageResponse,
      providesTags: knowledgeCoverageTags,
    }),

    getPublicConciergeConfig: builder.query({
      query: (tenantSlug) =>
        `/public/tenants/${tenantSlug}/ai/concierge/config`,
      transformResponse: unwrapEnvelope,
    }),

    sendPublicConciergeMessage: builder.mutation({
      query: buildPublicConciergeMessageRequest,
      transformResponse: unwrapEnvelope,
    }),

    getCustomerConciergeConfig: builder.query({
      query: () => "/ai/customer/concierge/config",
      transformResponse: unwrapEnvelope,
    }),

    sendCustomerConciergeMessage: builder.mutation({
      query: (body) => ({
        url: "/ai/customer/concierge",
        method: "POST",
        body,
      }),
      transformResponse: unwrapEnvelope,
      invalidatesTags: ["AiUsage", "AiCapabilities"],
    }),
  }),
});

export const {
  useGetAiCapabilitiesQuery,
  useGetAiUsageQuery,
  useGetAiAssistantConversationsQuery,
  useCreateAiAssistantConversationMutation,
  useGetAiAssistantConversationQuery,
  useSendAiAssistantMessageMutation,
  useGetAiActionsQuery,
  useGetAiActionQuery,
  useConfirmAiAssistantActionMutation,
  useDismissAiAssistantActionMutation,
  useGetLatestAiBriefingQuery,
  useGenerateAiBriefingMutation,
  useGetAiAdvisorRecommendationsQuery,
  useGenerateAiAdvisorRecommendationsMutation,
  useGetAiSettingsQuery,
  useUpdateAiSettingsMutation,
  useSubmitAiFeedbackMutation,
  useGetAiKnowledgeCoverageQuery,
  useGetPublicConciergeConfigQuery,
  useSendPublicConciergeMessageMutation,
  useGetCustomerConciergeConfigQuery,
  useSendCustomerConciergeMessageMutation,
} = aiApiSlice;
