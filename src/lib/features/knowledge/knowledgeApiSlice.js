import { apiSlice } from "../api/apiSlice";

export const knowledgeApiRoutes = Object.freeze({
  collection: "/knowledge",
  resource: (id) => `/knowledge/${encodeURIComponent(String(id))}`,
  customer: "/knowledge/customer",
  publicCollection: (tenantSlug) =>
    `/public/tenants/${encodeURIComponent(String(tenantSlug))}/knowledge`,
  publicResource: (tenantSlug, resourceId) =>
    `/public/tenants/${encodeURIComponent(
      String(tenantSlug),
    )}/knowledge/${encodeURIComponent(String(resourceId))}`,
});

const asArray = (value) => (Array.isArray(value) ? value : []);

const normalizeStringArray = (value) => {
  if (Array.isArray(value)) {
    return [
      ...new Set(
        value.map((item) => String(item || "").trim()).filter(Boolean),
      ),
    ];
  }

  if (typeof value === "string") {
    return [
      ...new Set(
        value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    ];
  }

  return [];
};

const normalizeQuestions = (value) =>
  asArray(value)
    .map((item) => {
      if (typeof item === "string") {
        return { question: item.trim(), answer: "" };
      }

      if (!item || typeof item !== "object") return null;

      const question = String(item.question ?? item.title ?? "").trim();
      const answer = String(item.answer ?? item.content ?? "").trim();

      return question || answer ? { question, answer } : null;
    })
    .filter(Boolean);

export const normalizeKnowledgeResource = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const id = String(value.id ?? value._id ?? "").trim();
  const type = String(
    value.type ?? value.resourceType ?? value.contentType ?? "guide",
  )
    .trim()
    .toLowerCase();
  const audience = String(
    value.audience ??
      (Array.isArray(value.audiences) ? value.audiences[0] : "") ??
      "customer",
  )
    .trim()
    .toLowerCase();

  return {
    ...value,
    ...(id ? { id, _id: id } : {}),
    type,
    audience,
    title: String(value.title ?? value.name ?? "").trim(),
    summary: String(value.summary ?? value.description ?? "").trim(),
    content: String(value.content ?? value.body ?? "").trim(),
    transcript: String(value.transcript ?? "").trim(),
    sourceUrl: String(value.sourceUrl ?? value.url ?? "").trim(),
    videoUrl: String(value.videoUrl ?? value.video?.url ?? "").trim(),
    fileUrl: String(value.fileUrl ?? value.file?.url ?? "").trim(),
    tags: normalizeStringArray(value.tags),
    locationIds: normalizeStringArray(
      value.locationIds ??
        value.locations?.map?.((item) => item?.id ?? item?._id ?? item),
    ),
    targetMembershipIds: normalizeStringArray(
      value.targetMembershipIds ?? value.membershipPlanIds,
    ),
    targetCourseIds: normalizeStringArray(
      value.targetCourseIds ?? value.courseIds,
    ),
    customQuestions: normalizeQuestions(
      value.customQuestions ?? value.questions ?? value.faq,
    ),
    featured: value.featured === true,
    aiEnabled: value.aiEnabled === true || value.aiApproved === true,
  };
};

export const unwrapKnowledgeCollection = (response) => {
  if (Array.isArray(response)) return response;

  const data = response?.data;
  const candidates = [
    response?.resources,
    response?.knowledge,
    response?.items,
    data,
    data?.resources,
    data?.knowledge,
    data?.items,
  ];

  return candidates.find(Array.isArray) ?? [];
};

export const normalizeKnowledgeCollection = (response) =>
  unwrapKnowledgeCollection(response)
    .map(normalizeKnowledgeResource)
    .filter(Boolean);

const provideKnowledgeTags = (result = []) => [
  { type: "Knowledge", id: "LIST" },
  ...result
    .map((resource) => resource?.id)
    .filter(Boolean)
    .map((id) => ({ type: "Knowledge", id })),
];

const mutationTags = (_result, _error, input) => [
  { type: "Knowledge", id: "LIST" },
  { type: "Knowledge", id: "CUSTOMER" },
  ...(input?.id ? [{ type: "Knowledge", id: String(input.id) }] : []),
  "CommunicationKnowledge",
  "AiUsage",
];

export const knowledgeApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getKnowledgeResources: builder.query({
      query: (params = {}) => ({
        url: knowledgeApiRoutes.collection,
        params,
      }),
      transformResponse: normalizeKnowledgeCollection,
      providesTags: provideKnowledgeTags,
    }),

    getKnowledgeResource: builder.query({
      query: (id) => knowledgeApiRoutes.resource(id),
      transformResponse: (response) =>
        normalizeKnowledgeResource(
          response?.resource ?? response?.data ?? response,
        ),
      providesTags: (_result, _error, id) => [
        { type: "Knowledge", id: String(id) },
      ],
    }),

    getCustomerKnowledge: builder.query({
      query: (params = {}) => ({
        url: knowledgeApiRoutes.customer,
        params,
      }),
      transformResponse: normalizeKnowledgeCollection,
      providesTags: [{ type: "Knowledge", id: "CUSTOMER" }],
    }),

    getPublicKnowledge: builder.query({
      query: ({ tenantSlug, ...params }) => ({
        url: knowledgeApiRoutes.publicCollection(tenantSlug),
        params,
      }),
      transformResponse: normalizeKnowledgeCollection,
      providesTags: (_result, _error, { tenantSlug }) => [
        { type: "Knowledge", id: `PUBLIC:${tenantSlug}` },
      ],
    }),

    getPublicKnowledgeResource: builder.query({
      query: ({ tenantSlug, resourceId }) =>
        knowledgeApiRoutes.publicResource(tenantSlug, resourceId),
      transformResponse: (response) =>
        normalizeKnowledgeResource(
          response?.resource ??
            response?.data?.resource ??
            response?.data ??
            response,
        ),
      providesTags: (_result, _error, { tenantSlug, resourceId }) => [
        {
          type: "Knowledge",
          id: `PUBLIC:${tenantSlug}:${String(resourceId)}`,
        },
      ],
    }),

    createKnowledgeResource: builder.mutation({
      query: (body) => ({
        url: knowledgeApiRoutes.collection,
        method: "POST",
        body,
      }),
      transformResponse: (response) =>
        normalizeKnowledgeResource(
          response?.resource ?? response?.data ?? response,
        ),
      invalidatesTags: mutationTags,
    }),

    updateKnowledgeResource: builder.mutation({
      query: ({ id, ...body }) => ({
        url: knowledgeApiRoutes.resource(id),
        method: "PATCH",
        body,
      }),
      transformResponse: (response) =>
        normalizeKnowledgeResource(
          response?.resource ?? response?.data ?? response,
        ),
      invalidatesTags: mutationTags,
    }),

    deleteKnowledgeResource: builder.mutation({
      query: (id) => ({
        url: knowledgeApiRoutes.resource(id),
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) =>
        mutationTags(_result, _error, { id }),
    }),
  }),
});

export const {
  useGetKnowledgeResourcesQuery,
  useGetKnowledgeResourceQuery,
  useGetCustomerKnowledgeQuery,
  useGetPublicKnowledgeQuery,
  useGetPublicKnowledgeResourceQuery,
  useCreateKnowledgeResourceMutation,
  useUpdateKnowledgeResourceMutation,
  useDeleteKnowledgeResourceMutation,
} = knowledgeApiSlice;
