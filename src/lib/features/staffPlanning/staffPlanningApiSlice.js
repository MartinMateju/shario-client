import { apiSlice } from "../api/apiSlice";

export const staffPlanningApiRoutes = Object.freeze({
  overview: "/staff-planning/overview",
  dailyUpdate: (date) => `/staff-planning/daily-updates/${date}`,
  weeklyPlan: (weekStart) => `/staff-planning/weekly-plans/${weekStart}`,
  monthlyPriorities: (month) => `/staff-planning/monthly-priorities/${month}`,
  settings: "/staff-planning/settings",
  memberSchedule: (memberId) => `/staff-planning/members/${memberId}/schedule`,
  attention: (updateId) =>
    `/staff-planning/daily-updates/${updateId}/attention`,
  aiDailyDraft: "/ai/staff-planning/daily-draft",
  aiBriefing: "/ai/staff-planning/briefing",
});

const hasOwn = (value, key) =>
  Boolean(value && Object.prototype.hasOwnProperty.call(value, key));

export const unwrapStaffPlanningEnvelope = (response) => {
  if (hasOwn(response, "data")) return response.data;
  if (hasOwn(response, "planning")) return response.planning;
  return response ?? null;
};

export const normalizePlanningScope = ({ date, locationId } = {}) => ({
  ...(date ? { date } : {}),
  ...(locationId ? { locationId } : {}),
});

export const staffPlanningApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getStaffPlanningOverview: builder.query({
      query: (params = {}) => ({
        url: staffPlanningApiRoutes.overview,
        params: normalizePlanningScope(params),
      }),
      transformResponse: unwrapStaffPlanningEnvelope,
      providesTags: ["StaffPlanning", "StaffPlanningSettings"],
    }),

    saveStaffDailyUpdate: builder.mutation({
      query: ({ date, ...body }) => ({
        url: staffPlanningApiRoutes.dailyUpdate(date),
        method: "PUT",
        body,
      }),
      transformResponse: unwrapStaffPlanningEnvelope,
      invalidatesTags: ["StaffPlanning"],
    }),

    saveStaffWeeklyPlan: builder.mutation({
      query: ({ weekStart, ...body }) => ({
        url: staffPlanningApiRoutes.weeklyPlan(weekStart),
        method: "PUT",
        body,
      }),
      transformResponse: unwrapStaffPlanningEnvelope,
      invalidatesTags: ["StaffPlanning"],
    }),

    saveStaffMonthlyPriorities: builder.mutation({
      query: ({ month, ...body }) => ({
        url: staffPlanningApiRoutes.monthlyPriorities(month),
        method: "PUT",
        body,
      }),
      transformResponse: unwrapStaffPlanningEnvelope,
      invalidatesTags: ["StaffPlanning"],
    }),

    updateStaffPlanningSettings: builder.mutation({
      query: (body) => ({
        url: staffPlanningApiRoutes.settings,
        method: "PUT",
        body,
      }),
      transformResponse: unwrapStaffPlanningEnvelope,
      invalidatesTags: ["StaffPlanning", "StaffPlanningSettings"],
    }),

    updateStaffPlanningMemberSchedule: builder.mutation({
      query: ({ memberId, ...body }) => ({
        url: staffPlanningApiRoutes.memberSchedule(memberId),
        method: "PUT",
        body,
      }),
      transformResponse: unwrapStaffPlanningEnvelope,
      invalidatesTags: ["StaffPlanning", "StaffPlanningSettings"],
    }),

    updateStaffPlanningAttention: builder.mutation({
      query: ({ updateId, ...body }) => ({
        url: staffPlanningApiRoutes.attention(updateId),
        method: "PATCH",
        body,
      }),
      transformResponse: unwrapStaffPlanningEnvelope,
      invalidatesTags: ["StaffPlanning"],
    }),

    generateStaffPlanningDailyDraft: builder.mutation({
      query: (body = {}) => ({
        url: staffPlanningApiRoutes.aiDailyDraft,
        method: "POST",
        body,
      }),
      transformResponse: unwrapStaffPlanningEnvelope,
      invalidatesTags: ["AiUsage"],
    }),

    generateStaffPlanningBriefing: builder.mutation({
      query: (body = {}) => ({
        url: staffPlanningApiRoutes.aiBriefing,
        method: "POST",
        body,
      }),
      transformResponse: unwrapStaffPlanningEnvelope,
      invalidatesTags: ["AiUsage"],
    }),
  }),
});

export const {
  useGetStaffPlanningOverviewQuery,
  useSaveStaffDailyUpdateMutation,
  useSaveStaffWeeklyPlanMutation,
  useSaveStaffMonthlyPrioritiesMutation,
  useUpdateStaffPlanningSettingsMutation,
  useUpdateStaffPlanningMemberScheduleMutation,
  useUpdateStaffPlanningAttentionMutation,
  useGenerateStaffPlanningDailyDraftMutation,
  useGenerateStaffPlanningBriefingMutation,
} = staffPlanningApiSlice;
