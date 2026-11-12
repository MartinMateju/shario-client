import { apiSlice } from "../api/apiSlice";
import { collectPaginatedQuery } from "../api/paginatedQuery";

const MEMBERSHIPS_URL = "/memberships";

const getId = (value) =>
  String(
    value?.id ??
      value?._id ??
      value?.membershipId ??
      value?.planId ??
      value ??
      "",
  ).trim();

const getPlan = (response) => response?.plan ?? response?.data ?? response;
const getMembership = (response) =>
  response?.membership ?? response?.data ?? response;

const getPlans = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.plans)) return response.plans;
  if (Array.isArray(response?.items)) return response.items;
  return [];
};

const getMemberships = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.memberships)) return response.memberships;
  if (Array.isArray(response?.items)) return response.items;
  return [];
};

const planListTags = (result) => [
  { type: "MembershipPlan", id: "LIST" },
  ...getPlans(result)
    .map(getId)
    .filter(Boolean)
    .map((id) => ({
      type: "MembershipPlan",
      id,
    })),
];

const membershipListTags = (result) => [
  { type: "Membership", id: "LIST" },
  ...getMemberships(result)
    .map(getId)
    .filter(Boolean)
    .map((id) => ({
      type: "Membership",
      id,
    })),
];

const planMutationTags = (result, _error, input) => {
  const ids = [getId(getPlan(result)), getId(input)].filter(Boolean);
  return [
    { type: "MembershipPlan", id: "LIST" },
    { type: "MembershipCatalog", id: "PUBLIC" },
    { type: "MembershipCatalog", id: "CUSTOMER" },
    "SetupCenter",
    ...[...new Set(ids)].map((id) => ({
      type: "MembershipPlan",
      id,
    })),
  ];
};

const membershipMutationTags = (result, _error, input) => {
  const ids = [getId(getMembership(result)), getId(input)].filter(Boolean);
  return [
    { type: "Membership", id: "LIST" },
    { type: "Membership", id: "MINE" },
    { type: "MembershipLedger", id: "MINE" },
    { type: "MembershipInvoice", id: "MINE" },
    { type: "User", id: "LIST" },
    ...[...new Set(ids)].map((id) => ({
      type: "Membership",
      id,
    })),
  ];
};

const publicApiUrl = (path) => {
  const baseUrl = String(process.env.NEXT_PUBLIC_API_URL || "").replace(
    /\/$/,
    "",
  );
  return `${baseUrl}${path}`;
};

const publicJsonRequest = async ({ path, signal }) => {
  try {
    const response = await fetch(publicApiUrl(path), {
      method: "GET",
      credentials: "omit",
      cache: "no-store",
      headers: { accept: "application/json" },
      signal,
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        error: {
          status: response.status,
          data: data ?? { message: response.statusText },
        },
      };
    }

    return { data };
  } catch (error) {
    return {
      error: {
        status: "FETCH_ERROR",
        error: error instanceof Error ? error.message : "Request failed",
      },
    };
  }
};

const handleMembershipInvoiceDownload = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return response.json();
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] || null;
  return {
    downloadUrl: URL.createObjectURL(blob),
    filename,
  };
};

export const membershipsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getMembershipPlans: builder.query({
      query: (params = {}) => ({ url: `${MEMBERSHIPS_URL}/plans`, params }),
      providesTags: planListTags,
    }),

    getAllMembershipPlans: builder.query({
      async queryFn(params = {}, _api, _extraOptions, baseQuery) {
        const safeParams =
          params && typeof params === "object" && !Array.isArray(params)
            ? params
            : {};
        const { page: _page, limit: _limit, ...filters } = safeParams;
        const result = await collectPaginatedQuery({
          baseQuery,
          buildRequest: (page) => ({
            url: `${MEMBERSHIPS_URL}/plans`,
            params: { ...filters, page, limit: 100 },
          }),
          selectItems: getPlans,
          selectPageCount: (response) => response?.pages,
        });

        if (result.error) return { error: result.error };

        return {
          data: {
            ...(result.data.firstResponse || {}),
            plans: result.data.items,
            total: result.data.items.length,
            page: 1,
            pages: result.data.items.length ? 1 : 0,
          },
        };
      },
      providesTags: planListTags,
    }),

    getMembershipPlan: builder.query({
      query: (id) => `${MEMBERSHIPS_URL}/plans/${id}`,
      transformResponse: (response) => ({
        ...(response && typeof response === "object" ? response : {}),
        plan: getPlan(response),
      }),
      providesTags: (_result, _error, id) => [
        { type: "MembershipPlan", id: String(id) },
      ],
    }),

    createMembershipPlan: builder.mutation({
      query: (body) => ({
        url: `${MEMBERSHIPS_URL}/plans`,
        method: "POST",
        body,
      }),
      invalidatesTags: planMutationTags,
    }),

    updateMembershipPlan: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `${MEMBERSHIPS_URL}/plans/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: planMutationTags,
    }),

    publishMembershipPlan: builder.mutation({
      query: (id) => ({
        url: `${MEMBERSHIPS_URL}/plans/${id}/publish`,
        method: "POST",
      }),
      invalidatesTags: planMutationTags,
    }),

    archiveMembershipPlan: builder.mutation({
      query: (id) => ({
        url: `${MEMBERSHIPS_URL}/plans/${id}/archive`,
        method: "POST",
      }),
      invalidatesTags: planMutationTags,
    }),

    duplicateMembershipPlan: builder.mutation({
      query: ({ id, name }) => ({
        url: `${MEMBERSHIPS_URL}/plans/${id}/duplicate`,
        method: "POST",
        body: name ? { name } : {},
      }),
      invalidatesTags: planMutationTags,
    }),

    // Kept for callers from the previous release. Archiving is the safe plan
    // lifecycle action; published plans are never hard-deleted.
    deleteMembershipPlan: builder.mutation({
      query: (id) => ({
        url: `${MEMBERSHIPS_URL}/plans/${id}/archive`,
        method: "POST",
      }),
      invalidatesTags: planMutationTags,
    }),

    getPublicMembershipCatalog: builder.query({
      async queryFn({ tenantSlug }, { signal }) {
        const safeSlug = encodeURIComponent(String(tenantSlug || "").trim());
        return publicJsonRequest({
          path: `/public/tenants/${safeSlug}/memberships`,
          signal,
        });
      },
      providesTags: [{ type: "MembershipCatalog", id: "PUBLIC" }],
    }),

    getCustomerMembershipCatalog: builder.query({
      // tenantId participates in the cache key; the server derives the tenant
      // from the authenticated customer session rather than a request parameter.
      query: ({ locationId } = {}) => ({
        url: `${MEMBERSHIPS_URL}/catalog`,
        params: locationId ? { locationId } : undefined,
      }),
      providesTags: [{ type: "MembershipCatalog", id: "CUSTOMER" }],
    }),

    getUserMemberships: builder.query({
      query: (params = {}) => ({
        url: `${MEMBERSHIPS_URL}/user-memberships`,
        params,
      }),
      providesTags: membershipListTags,
    }),

    getUserMembershipById: builder.query({
      query: (id) => `${MEMBERSHIPS_URL}/user-memberships/${id}`,
      transformResponse: (response) => ({
        ...(response && typeof response === "object" ? response : {}),
        membership: getMembership(response),
      }),
      providesTags: (_result, _error, id) => [
        { type: "Membership", id: String(id) },
      ],
    }),

    assignMembershipToUser: builder.mutation({
      query: (body) => ({
        url: `${MEMBERSHIPS_URL}/assign`,
        method: "POST",
        body,
      }),
      invalidatesTags: membershipMutationTags,
    }),

    adjustMembershipBenefit: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `${MEMBERSHIPS_URL}/user-memberships/${id}/adjustments`,
        method: "POST",
        body,
      }),
      invalidatesTags: membershipMutationTags,
    }),

    cancelManagedMembership: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `${MEMBERSHIPS_URL}/user-memberships/${id}/cancel`,
        method: "POST",
        body,
      }),
      invalidatesTags: membershipMutationTags,
    }),

    getMyMembership: builder.query({
      query: () => `${MEMBERSHIPS_URL}/mine`,
      providesTags: [{ type: "Membership", id: "MINE" }],
    }),

    getMyMembershipLedger: builder.query({
      query: (params = {}) => ({
        url: `${MEMBERSHIPS_URL}/mine/ledger`,
        params,
      }),
      providesTags: [{ type: "MembershipLedger", id: "MINE" }],
    }),

    getMyMembershipInvoices: builder.query({
      query: (params = {}) => ({
        url: `${MEMBERSHIPS_URL}/mine/invoices`,
        params,
      }),
      providesTags: [{ type: "MembershipInvoice", id: "MINE" }],
    }),

    getMyMembershipInvoice: builder.query({
      query: (id) => `${MEMBERSHIPS_URL}/mine/invoices/${id}`,
      providesTags: (_result, _error, id) => [
        { type: "MembershipInvoice", id: String(id) },
      ],
    }),

    downloadMyMembershipInvoice: builder.mutation({
      query: ({ id, url }) => ({
        url: url || `${MEMBERSHIPS_URL}/mine/invoices/${id}/document`,
        responseHandler: handleMembershipInvoiceDownload,
        cache: "no-store",
      }),
    }),

    createMembershipCheckout: builder.mutation({
      query: ({ idempotencyKey, ...body }) => ({
        url: `${MEMBERSHIPS_URL}/checkout`,
        method: "POST",
        headers: idempotencyKey
          ? { "Idempotency-Key": idempotencyKey }
          : undefined,
        body,
      }),
      invalidatesTags: membershipMutationTags,
    }),

    getMembershipCheckoutStatus: builder.query({
      query: (sessionId) =>
        `${MEMBERSHIPS_URL}/checkout/${encodeURIComponent(sessionId)}`,
      providesTags: (_result, _error, sessionId) => [
        { type: "MembershipCheckout", id: String(sessionId) },
      ],
    }),

    cancelMyMembership: builder.mutation({
      query: (body) => ({
        url: `${MEMBERSHIPS_URL}/mine/cancel`,
        method: "POST",
        body,
      }),
      invalidatesTags: membershipMutationTags,
    }),

    scheduleMyMembershipPlanChange: builder.mutation({
      query: ({ idempotencyKey, ...body }) => ({
        url: `${MEMBERSHIPS_URL}/mine/plan-change`,
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body,
      }),
      invalidatesTags: membershipMutationTags,
    }),

    cancelMyMembershipPlanChange: builder.mutation({
      query: () => ({
        url: `${MEMBERSHIPS_URL}/mine/plan-change`,
        method: "DELETE",
      }),
      invalidatesTags: membershipMutationTags,
    }),

    resumeMyMembership: builder.mutation({
      query: () => ({
        url: `${MEMBERSHIPS_URL}/mine/resume`,
        method: "POST",
        body: {},
      }),
      invalidatesTags: membershipMutationTags,
    }),

    createMembershipBillingPortal: builder.mutation({
      query: (body = {}) => ({
        url: `${MEMBERSHIPS_URL}/mine/billing-portal`,
        method: "POST",
        body,
      }),
    }),

    // Legacy user-scoped read alias.
    getUserMembership: builder.query({
      query: (userId) => `${MEMBERSHIPS_URL}/user/${userId}`,
      providesTags: [{ type: "Membership", id: "MINE" }],
    }),
  }),
});

export const {
  useGetMembershipPlansQuery,
  useGetAllMembershipPlansQuery,
  useGetMembershipPlanQuery,
  useCreateMembershipPlanMutation,
  useUpdateMembershipPlanMutation,
  usePublishMembershipPlanMutation,
  useArchiveMembershipPlanMutation,
  useDuplicateMembershipPlanMutation,
  useDeleteMembershipPlanMutation,
  useGetPublicMembershipCatalogQuery,
  useGetCustomerMembershipCatalogQuery,
  useGetUserMembershipsQuery,
  useGetUserMembershipByIdQuery,
  useAssignMembershipToUserMutation,
  useAdjustMembershipBenefitMutation,
  useCancelManagedMembershipMutation,
  useGetMyMembershipQuery,
  useGetMyMembershipLedgerQuery,
  useGetMyMembershipInvoicesQuery,
  useGetMyMembershipInvoiceQuery,
  useDownloadMyMembershipInvoiceMutation,
  useCreateMembershipCheckoutMutation,
  useGetMembershipCheckoutStatusQuery,
  useCancelMyMembershipMutation,
  useScheduleMyMembershipPlanChangeMutation,
  useCancelMyMembershipPlanChangeMutation,
  useResumeMyMembershipMutation,
  useCreateMembershipBillingPortalMutation,
  useGetUserMembershipQuery,
} = membershipsApiSlice;
