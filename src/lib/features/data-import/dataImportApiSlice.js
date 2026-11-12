import { apiSlice } from "@/lib/features/api/apiSlice";
import { dataImportApiRoutes } from "@/lib/features/data-import/dataImportApiRoutes";

export { dataImportApiRoutes } from "@/lib/features/data-import/dataImportApiRoutes";

const csvResponseHandler = async (response) => {
  const text = await response.text();

  if (!response.ok) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  return text;
};

export const dataImportApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDataImportHistory: builder.query({
      query: ({
        entity = "customers",
        limit = 20,
        page,
        status,
        rollbackStatus,
        search,
        createdFrom,
        createdTo,
      } = {}) => ({
        url: dataImportApiRoutes.collection,
        params: {
          ...(entity ? { entityType: entity } : {}),
          limit,
          ...(page ? { page } : {}),
          ...(status ? { status } : {}),
          ...(rollbackStatus ? { rollbackStatus } : {}),
          ...(search?.trim() ? { search: search.trim() } : {}),
          ...(createdFrom ? { createdFrom } : {}),
          ...(createdTo ? { createdTo } : {}),
        },
      }),
      providesTags: (result) => {
        const imports =
          result?.data?.items ??
          result?.imports ??
          result?.sessions ??
          result?.items ??
          [];

        return [
          { type: "DataImport", id: "LIST" },
          ...(Array.isArray(imports) ? imports : [])
            .map((item) => String(item?.id ?? item?._id ?? "").trim())
            .filter(Boolean)
            .map((id) => ({ type: "DataImport", id })),
        ];
      },
    }),
    getDataImportSession: builder.query({
      query: (id) => dataImportApiRoutes.session(id),
      providesTags: (_result, _error, id) => [
        { type: "DataImport", id: String(id) },
      ],
    }),
    getDataImportRows: builder.query({
      query: ({ id, page = 1, limit = 50 }) => ({
        url: dataImportApiRoutes.rows(id),
        params: { page, limit },
      }),
      providesTags: (_result, _error, { id }) => [
        { type: "DataImport", id: String(id) },
      ],
    }),
    uploadDataImport: builder.mutation({
      query: ({ entity, file }) => {
        const body = new FormData();
        body.append("file", file);

        return {
          url: dataImportApiRoutes.upload(entity),
          method: "POST",
          body,
        };
      },
      invalidatesTags: [{ type: "DataImport", id: "LIST" }],
    }),
    validateDataImport: builder.mutation({
      query: ({
        id,
        mapping,
        duplicateStrategy,
        confirmPasswordHashImport = false,
        preserveImportedMemberNumbers,
      }) => ({
        url: dataImportApiRoutes.validate(id),
        method: "POST",
        body: {
          mapping,
          duplicateStrategy,
          ...(typeof preserveImportedMemberNumbers === "boolean"
            ? { preserveImportedMemberNumbers }
            : {}),
          ...(confirmPasswordHashImport
            ? { confirmPasswordHashImport: true }
            : {}),
        },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "DataImport", id: String(id) },
        { type: "DataImport", id: "LIST" },
      ],
    }),
    executeDataImport: builder.mutation({
      query: ({ id, validationRevision }) => ({
        url: dataImportApiRoutes.execute(id),
        method: "POST",
        body: { validationRevision },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "DataImport", id: String(id) },
        { type: "DataImport", id: "LIST" },
      ],
    }),
    downloadDataImportTemplate: builder.query({
      query: ({ entity }) => ({
        url: dataImportApiRoutes.template(entity),
        responseHandler: csvResponseHandler,
        cache: "no-store",
      }),
      keepUnusedDataFor: 0,
    }),
    downloadDataImportReport: builder.query({
      query: ({ id }) => ({
        url: dataImportApiRoutes.report(id),
        responseHandler: csvResponseHandler,
        cache: "no-store",
      }),
      keepUnusedDataFor: 0,
    }),
    getDataImportRollbackPreview: builder.query({
      query: ({ id }) => dataImportApiRoutes.rollbackPreview(id),
      keepUnusedDataFor: 0,
    }),
    rollbackDataImport: builder.mutation({
      query: ({ id, revision, previewToken, idempotencyKey }) => ({
        url: dataImportApiRoutes.rollback(id),
        method: "POST",
        body: { revision, previewToken },
        ...(idempotencyKey
          ? { headers: { "Idempotency-Key": idempotencyKey } }
          : {}),
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "DataImport", id: String(id) },
        { type: "DataImport", id: "LIST" },
      ],
    }),
    downloadDataImportRollbackReport: builder.query({
      query: ({ id }) => ({
        url: dataImportApiRoutes.rollbackReport(id),
        responseHandler: csvResponseHandler,
        cache: "no-store",
      }),
      keepUnusedDataFor: 0,
    }),
    uploadCustomerImport: builder.mutation({
      query: (file) => {
        const body = new FormData();
        body.append("file", file);

        return {
          url: dataImportApiRoutes.customersUpload,
          method: "POST",
          body,
        };
      },
      invalidatesTags: [{ type: "DataImport", id: "LIST" }],
    }),
    validateCustomerImport: builder.mutation({
      query: ({
        id,
        mapping,
        duplicateStrategy,
        confirmPasswordHashImport = false,
        preserveImportedMemberNumbers = false,
      }) => ({
        url: dataImportApiRoutes.validate(id),
        method: "POST",
        body: {
          mapping,
          duplicateStrategy,
          preserveImportedMemberNumbers: Boolean(preserveImportedMemberNumbers),
          ...(confirmPasswordHashImport
            ? { confirmPasswordHashImport: true }
            : {}),
        },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "DataImport", id: String(id) },
        { type: "DataImport", id: "LIST" },
      ],
    }),
    executeCustomerImport: builder.mutation({
      query: ({ id, validationRevision }) => ({
        url: dataImportApiRoutes.execute(id),
        method: "POST",
        body: { validationRevision },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "DataImport", id: String(id) },
        { type: "DataImport", id: "LIST" },
      ],
    }),
    downloadCustomerImportTemplate: builder.query({
      query: () => ({
        url: dataImportApiRoutes.customerTemplate,
        responseHandler: csvResponseHandler,
        cache: "no-store",
      }),
      keepUnusedDataFor: 0,
    }),
    downloadCustomerImportReport: builder.query({
      query: (id) => ({
        url: dataImportApiRoutes.report(id),
        responseHandler: csvResponseHandler,
        cache: "no-store",
      }),
      keepUnusedDataFor: 0,
    }),
  }),
});

export const {
  useGetDataImportHistoryQuery,
  useGetDataImportSessionQuery,
  useGetDataImportRowsQuery,
  useUploadDataImportMutation,
  useValidateDataImportMutation,
  useExecuteDataImportMutation,
  useLazyDownloadDataImportTemplateQuery,
  useLazyDownloadDataImportReportQuery,
  useLazyGetDataImportRollbackPreviewQuery,
  useRollbackDataImportMutation,
  useLazyDownloadDataImportRollbackReportQuery,
  useUploadCustomerImportMutation,
  useValidateCustomerImportMutation,
  useExecuteCustomerImportMutation,
  useLazyDownloadCustomerImportTemplateQuery,
  useLazyDownloadCustomerImportReportQuery,
} = dataImportApiSlice;
