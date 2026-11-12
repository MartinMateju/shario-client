import { apiSlice } from "../api/apiSlice";

export const unwrapDashboardEnvelope = (response) =>
  response?.data ?? response?.overview ?? response ?? null;

export const normalizeDashboardScope = ({ date, locationId } = {}) => ({
  ...(date ? { date } : {}),
  ...(locationId ? { locationId } : {}),
});

export const dashboardApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardOverview: builder.query({
      query: (params = {}) => ({
        url: "/dashboard/overview",
        params: normalizeDashboardScope(params),
      }),
      transformResponse: unwrapDashboardEnvelope,
      providesTags: ["DashboardOverview"],
    }),
  }),
});

export const { useGetDashboardOverviewQuery } = dashboardApiSlice;
