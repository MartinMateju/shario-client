import { apiSlice } from "../api/apiSlice";

export const reportsApiRoutes = Object.freeze({
  overview: "/reports/overview",
  exportCsv: "/reports/export.csv",
  aiBriefing: "/ai/reports/briefing",
});

const hasOwn = (value, key) =>
  Boolean(value && Object.prototype.hasOwnProperty.call(value, key));

/**
 * Report endpoints use the standard API envelope in production. Keeping this
 * normalizer tolerant also supports direct payloads in tests and older
 * deployments without hiding valid null values.
 */
export const unwrapReportsEnvelope = (response) => {
  if (hasOwn(response, "data")) {
    return response.data;
  }

  if (hasOwn(response, "report")) {
    return response.report;
  }

  return response ?? null;
};

export const normalizeReportFilters = ({
  from,
  to,
  locationId,
  locale,
  compare = true,
  granularity = "auto",
} = {}) => ({
  from,
  to,
  ...(locationId ? { locationId } : {}),
  ...(locale ? { locale } : {}),
  compare: Boolean(compare),
  granularity,
});

const parseDownloadFilename = (headerValue) => {
  if (!headerValue) return "shario-report.csv";

  const encoded = headerValue.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded);
    } catch {
      return encoded;
    }
  }

  return (
    headerValue.match(/filename="?([^";]+)"?/i)?.[1] || "shario-report.csv"
  );
};

export const reportsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getReportsOverview: builder.query({
      query: (filters = {}) => ({
        url: reportsApiRoutes.overview,
        params: normalizeReportFilters(filters),
      }),
      transformResponse: unwrapReportsEnvelope,
      providesTags: ["Reports"],
    }),

    exportReportsCsv: builder.mutation({
      query: (filters = {}) => ({
        url: reportsApiRoutes.exportCsv,
        method: "GET",
        params: normalizeReportFilters(filters),
        responseHandler: "text",
      }),
      transformResponse: (csv, meta) => ({
        csv: typeof csv === "string" ? csv : "",
        contentType:
          meta?.response?.headers?.get("content-type") ||
          "text/csv;charset=utf-8",
        filename: parseDownloadFilename(
          meta?.response?.headers?.get("content-disposition"),
        ),
      }),
    }),

    generateReportsBriefing: builder.mutation({
      query: ({ locale, ...filters } = {}) => ({
        url: reportsApiRoutes.aiBriefing,
        method: "POST",
        body: {
          ...normalizeReportFilters(filters),
          ...(locale ? { locale } : {}),
        },
      }),
      transformResponse: unwrapReportsEnvelope,
      invalidatesTags: ["AiUsage"],
    }),
  }),
});

export const {
  useGetReportsOverviewQuery,
  useExportReportsCsvMutation,
  useGenerateReportsBriefingMutation,
} = reportsApiSlice;
