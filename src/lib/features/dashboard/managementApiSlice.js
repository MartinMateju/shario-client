import { apiSlice } from "../api/apiSlice";
import {
  normalizeDashboardScope,
  unwrapDashboardEnvelope,
} from "./dashboardApiSlice";

export const normalizeStudioReportInput = ({ locale, ...scope } = {}) => ({
  ...normalizeDashboardScope(scope),
  ...(locale ? { locale } : {}),
});

export const handleStudioReportPdf = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return response.json();
  if (!response.ok) return { message: await response.text() };
  if (!contentType.includes("application/pdf")) {
    throw new Error("The report response was not a PDF.");
  }
  const blob = await response.blob();
  const suggestedName = response.headers
    .get("content-disposition")
    ?.match(/filename="?([^";]+)"?/i)?.[1];
  return {
    downloadUrl: URL.createObjectURL(blob),
    filename: suggestedName?.replaceAll(/[\\/]/g, "-") || "studio-report.pdf",
  };
};

export const managementApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardManagement: builder.query({
      query: (params = {}) => ({
        url: "/dashboard/management",
        params: normalizeDashboardScope(params),
      }),
      transformResponse: unwrapDashboardEnvelope,
      providesTags: [
        "DashboardOverview",
        "Reports",
        { type: "Booking", id: "LIST" },
        { type: "Order", id: "LIST" },
        { type: "CouponOrder", id: "LIST" },
        { type: "Membership", id: "LIST" },
        { type: "MembershipInvoice", id: "LIST" },
        "Events",
      ],
    }),
    generateStudioReport: builder.mutation({
      query: (params = {}) => ({
        url: "/dashboard/reports",
        method: "POST",
        body: normalizeStudioReportInput(params),
      }),
      transformResponse: unwrapDashboardEnvelope,
    }),
    downloadStudioReportPdf: builder.mutation({
      query: (id) => ({
        url: `/dashboard/reports/${encodeURIComponent(id)}/pdf`,
        responseHandler: handleStudioReportPdf,
        cache: "no-store",
      }),
    }),
  }),
});

export const {
  useGetDashboardManagementQuery,
  useGenerateStudioReportMutation,
  useDownloadStudioReportPdfMutation,
} = managementApiSlice;
