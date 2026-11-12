import { apiSlice } from "../api/apiSlice";

const ACCESS_CODES_URL = "/access-codes";

const compactParams = (params) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );

const getEntityId = (value) => String(value?.id ?? value?._id ?? "").trim();

const getCollection = (response, keys) => {
  if (Array.isArray(response)) return response;

  for (const source of [response, response?.data]) {
    for (const key of keys) {
      if (Array.isArray(source?.[key])) return source[key];
    }
  }

  return [];
};

const listTags = (type, id, response, keys) => [
  { type, id },
  ...getCollection(response, keys)
    .map(getEntityId)
    .filter(Boolean)
    .map((entityId) => ({ type, id: entityId })),
];

export const accessCodeApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAccessCodePools: builder.query({
      query: ({ locationId, includeArchived } = {}) => ({
        url: `${ACCESS_CODES_URL}/pools`,
        params: compactParams({ locationId, includeArchived }),
      }),
      providesTags: (result) =>
        listTags("AccessCodePool", "LIST", result, [
          "pools",
          "accessCodePools",
          "items",
        ]),
    }),

    createAccessCodePool: builder.mutation({
      query: (body) => ({
        url: `${ACCESS_CODES_URL}/pools`,
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "AccessCodePool", id: "LIST" },
        { type: "AccessCode", id: "ALERTS" },
      ],
    }),

    updateAccessCodePool: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `${ACCESS_CODES_URL}/pools/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "AccessCodePool", id: String(id) },
        { type: "AccessCodePool", id: "LIST" },
        { type: "AccessCode", id: "ALERTS" },
      ],
    }),

    archiveAccessCodePool: builder.mutation({
      query: (id) => ({
        url: `${ACCESS_CODES_URL}/pools/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "AccessCodePool", id: "LIST" },
        { type: "AccessCode", id: "LIST" },
        { type: "AccessCode", id: "ALERTS" },
      ],
    }),

    getAccessCodes: builder.query({
      query: ({
        poolId,
        status,
        type,
        search,
        page = 1,
        limit = 100,
      } = {}) => ({
        url: ACCESS_CODES_URL,
        params: compactParams({ poolId, status, type, search, page, limit }),
      }),
      providesTags: (result) =>
        listTags("AccessCode", "LIST", result, [
          "codes",
          "accessCodes",
          "items",
        ]),
    }),

    createAccessCode: builder.mutation({
      query: (body) => ({
        url: ACCESS_CODES_URL,
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "AccessCode", id: "LIST" },
        { type: "AccessCodePool", id: "LIST" },
        { type: "AccessCodeAudit", id: "LIST" },
      ],
    }),

    updateAccessCode: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `${ACCESS_CODES_URL}/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "AccessCode", id: String(id) },
        { type: "AccessCode", id: "LIST" },
        { type: "AccessCodePool", id: "LIST" },
        { type: "AccessCodeAudit", id: "LIST" },
      ],
    }),

    retireAccessCode: builder.mutation({
      query: (id) => ({
        url: `${ACCESS_CODES_URL}/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "AccessCode", id: String(id) },
        { type: "AccessCode", id: "LIST" },
        { type: "AccessCodePool", id: "LIST" },
        { type: "AccessCodeAudit", id: "LIST" },
      ],
    }),

    revealAccessCode: builder.mutation({
      query: (id) => ({
        url: `${ACCESS_CODES_URL}/${id}/reveal`,
        method: "POST",
      }),
      invalidatesTags: [{ type: "AccessCodeAudit", id: "LIST" }],
    }),

    bulkCreateAccessCodes: builder.mutation({
      query: (body) => ({
        url: `${ACCESS_CODES_URL}/bulk`,
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "AccessCode", id: "LIST" },
        { type: "AccessCodePool", id: "LIST" },
        { type: "AccessCodeAudit", id: "LIST" },
      ],
    }),

    getAccessCodeAudit: builder.query({
      query: ({ poolId, page = 1, limit = 50 } = {}) => ({
        url: `${ACCESS_CODES_URL}/audit`,
        params: compactParams({ poolId, page, limit }),
      }),
      providesTags: (result) =>
        listTags("AccessCodeAudit", "LIST", result, [
          "events",
          "audit",
          "items",
        ]),
    }),
  }),
});

export const {
  useGetAccessCodePoolsQuery,
  useCreateAccessCodePoolMutation,
  useUpdateAccessCodePoolMutation,
  useArchiveAccessCodePoolMutation,
  useGetAccessCodesQuery,
  useCreateAccessCodeMutation,
  useUpdateAccessCodeMutation,
  useRetireAccessCodeMutation,
  useRevealAccessCodeMutation,
  useBulkCreateAccessCodesMutation,
  useGetAccessCodeAuditQuery,
} = accessCodeApiSlice;
