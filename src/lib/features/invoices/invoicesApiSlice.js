import { apiSlice } from "@/lib/features/api/apiSlice";

const INVOICES_URL = "/invoices";

const getId = (value) =>
  String(value?.id ?? value?._id ?? value?.invoiceId ?? "").trim();

const getInvoice = (response) =>
  response?.invoice ?? response?.document ?? response?.data ?? response;

const getInvoices = (response) => {
  if (Array.isArray(response)) return response;

  for (const key of ["invoices", "documents", "items", "data"]) {
    if (Array.isArray(response?.[key])) return response[key];
  }

  return [];
};

const normalizeInvoiceResponse = (response) => ({
  ...(response && typeof response === "object" && !Array.isArray(response)
    ? response
    : {}),
  invoice: getInvoice(response),
});

const normalizeInvoiceListResponse = (response) => ({
  ...(response && typeof response === "object" && !Array.isArray(response)
    ? response
    : {}),
  invoices: getInvoices(response),
});

const invoiceListTags = (result) => [
  { type: "Invoice", id: "LIST" },
  ...(result?.invoices ?? [])
    .map(getId)
    .filter(Boolean)
    .map((id) => ({ type: "Invoice", id })),
];

const invoiceMutationTags = (result, _error, input) => {
  const invoice = getInvoice(result);
  const resultId = getId(invoice);
  const inputId = String(input?.id ?? input?.invoiceId ?? "");
  const ids = [...new Set([resultId, inputId].filter(Boolean))];

  return [
    { type: "Invoice", id: "LIST" },
    ...ids.map((id) => ({ type: "Invoice", id })),
    { type: "Order", id: "LIST" },
  ];
};

const parseFilename = (headerValue) => {
  if (!headerValue) return null;

  const encoded = headerValue.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded.replaceAll('"', ""));
    } catch {
      return encoded.replaceAll('"', "");
    }
  }

  return headerValue.match(/filename="?([^";]+)"?/i)?.[1] ?? null;
};

const handleDownloadResponse = async (response) => {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const blob = await response.blob();

  return {
    downloadUrl: URL.createObjectURL(blob),
    filename: parseFilename(response.headers.get("content-disposition")),
    contentType: blob.type,
  };
};

export const invoicesApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getInvoices: builder.query({
      query: (params = {}) => ({
        url: INVOICES_URL,
        params,
      }),
      transformResponse: normalizeInvoiceListResponse,
      providesTags: invoiceListTags,
    }),

    getInvoice: builder.query({
      query: (id) => `${INVOICES_URL}/${id}`,
      transformResponse: normalizeInvoiceResponse,
      providesTags: (_result, _error, id) => [{ type: "Invoice", id }],
    }),

    createInvoice: builder.mutation({
      query: (body) => ({
        url: INVOICES_URL,
        method: "POST",
        body,
      }),
      transformResponse: normalizeInvoiceResponse,
      invalidatesTags: invoiceMutationTags,
    }),

    createInvoiceFromOrder: builder.mutation({
      query: ({ orderId, ...body }) => ({
        url: `${INVOICES_URL}/from-order/${orderId}`,
        method: "POST",
        body,
      }),
      transformResponse: normalizeInvoiceResponse,
      invalidatesTags: invoiceMutationTags,
    }),

    updateInvoice: builder.mutation({
      query: ({ id, invoiceId, ...body }) => ({
        url: `${INVOICES_URL}/${id ?? invoiceId}`,
        method: "PATCH",
        body,
      }),
      transformResponse: normalizeInvoiceResponse,
      invalidatesTags: invoiceMutationTags,
    }),

    finalizeInvoice: builder.mutation({
      query: ({ id, invoiceId, ...body }) => ({
        url: `${INVOICES_URL}/${id ?? invoiceId}/finalize`,
        method: "POST",
        body,
      }),
      transformResponse: normalizeInvoiceResponse,
      invalidatesTags: invoiceMutationTags,
    }),

    sendInvoice: builder.mutation({
      query: ({ id, invoiceId, ...body }) => ({
        url: `${INVOICES_URL}/${id ?? invoiceId}/send`,
        method: "POST",
        body,
      }),
      transformResponse: normalizeInvoiceResponse,
      invalidatesTags: invoiceMutationTags,
    }),

    createCreditNote: builder.mutation({
      query: ({ id, invoiceId, ...body }) => ({
        url: `${INVOICES_URL}/${id ?? invoiceId}/credit-notes`,
        method: "POST",
        body,
      }),
      transformResponse: normalizeInvoiceResponse,
      invalidatesTags: invoiceMutationTags,
    }),

    recordInvoicePayment: builder.mutation({
      query: ({ id, invoiceId, idempotencyKey, ...body }) => ({
        url: `${INVOICES_URL}/${id ?? invoiceId}/payments`,
        method: "POST",
        headers: {
          "Idempotency-Key": idempotencyKey,
        },
        body: {
          ...body,
          idempotencyKey,
        },
      }),
      transformResponse: normalizeInvoiceResponse,
      invalidatesTags: invoiceMutationTags,
    }),

    reverseInvoicePayment: builder.mutation({
      query: ({ id, invoiceId, paymentId, idempotencyKey, ...body }) => ({
        url: `${INVOICES_URL}/${id ?? invoiceId}/payments/${paymentId}/reverse`,
        method: "POST",
        headers: {
          "Idempotency-Key": idempotencyKey,
        },
        body: {
          ...body,
          idempotencyKey,
        },
      }),
      transformResponse: normalizeInvoiceResponse,
      invalidatesTags: invoiceMutationTags,
    }),

    downloadInvoicePdf: builder.mutation({
      query: (id) => ({
        url: `${INVOICES_URL}/${id}/pdf`,
        responseHandler: handleDownloadResponse,
        cache: "no-store",
      }),
    }),

    getInvoiceSettings: builder.query({
      query: () => `${INVOICES_URL}/settings`,
      transformResponse: (response) => {
        const nestedSettings =
          response?.settings ?? response?.invoiceSettings ?? response?.data;
        const directSettings =
          response &&
          typeof response === "object" &&
          !Array.isArray(response) &&
          ("defaultDueDays" in response || "defaultTaxRateBps" in response)
            ? response
            : null;

        return {
          ...(response && typeof response === "object" ? response : {}),
          settings:
            nestedSettings && typeof nestedSettings === "object"
              ? nestedSettings
              : directSettings,
        };
      },
      providesTags: [{ type: "InvoiceSettings", id: "CURRENT" }],
    }),

    updateInvoiceSettings: builder.mutation({
      query: (body) => ({
        url: `${INVOICES_URL}/settings`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: [{ type: "InvoiceSettings", id: "CURRENT" }],
    }),

    getMyInvoices: builder.query({
      query: (params = {}) => ({
        url: `${INVOICES_URL}/mine`,
        params,
      }),
      transformResponse: normalizeInvoiceListResponse,
      providesTags: invoiceListTags,
    }),

    getMyInvoice: builder.query({
      query: (id) => `${INVOICES_URL}/mine/${id}`,
      transformResponse: normalizeInvoiceResponse,
      providesTags: (_result, _error, id) => [{ type: "Invoice", id }],
    }),

    downloadMyInvoicePdf: builder.mutation({
      query: (id) => ({
        url: `${INVOICES_URL}/mine/${id}/pdf`,
        responseHandler: handleDownloadResponse,
        cache: "no-store",
      }),
    }),
  }),
});

export const {
  useGetInvoicesQuery,
  useGetInvoiceQuery,
  useLazyGetInvoiceQuery,
  useCreateInvoiceMutation,
  useCreateInvoiceFromOrderMutation,
  useUpdateInvoiceMutation,
  useFinalizeInvoiceMutation,
  useSendInvoiceMutation,
  useCreateCreditNoteMutation,
  useRecordInvoicePaymentMutation,
  useReverseInvoicePaymentMutation,
  useDownloadInvoicePdfMutation,
  useGetInvoiceSettingsQuery,
  useUpdateInvoiceSettingsMutation,
  useGetMyInvoicesQuery,
  useGetMyInvoiceQuery,
  useLazyGetMyInvoiceQuery,
  useDownloadMyInvoicePdfMutation,
} = invoicesApiSlice;
