import { apiSlice } from "../api/apiSlice";

const tags = ["CustomOrders"];
export const customOrdersApiSlice = apiSlice
  .enhanceEndpoints({ addTagTypes: tags })
  .injectEndpoints({
    endpoints: (builder) => ({
      getCustomOrders: builder.query({
        query: (params) => ({ url: "/custom-orders", params }),
        providesTags: tags,
      }),
      getCustomOrder: builder.query({
        query: (id) => `/custom-orders/${encodeURIComponent(id)}`,
        providesTags: tags,
      }),
      getCustomOrderHistory: builder.query({
        query: ({ id, ...params }) => ({
          url: `/custom-orders/${encodeURIComponent(id)}/history`,
          params,
        }),
        providesTags: tags,
      }),
      getCustomOrderOptions: builder.query({
        query: (locationId) => ({
          url: "/custom-orders/options",
          params: locationId ? { locationId } : undefined,
        }),
      }),
      findCustomOrderCustomer: builder.query({
        query: (params) => ({ url: "/custom-orders/customers", params }),
        keepUnusedDataFor: 0,
      }),
      createCustomOrder: builder.mutation({
        query: (body) => ({ url: "/custom-orders", method: "POST", body }),
        invalidatesTags: tags,
      }),
      updateCustomOrder: builder.mutation({
        query: ({ id, ...body }) => ({
          url: `/custom-orders/${encodeURIComponent(id)}`,
          method: "PATCH",
          body,
        }),
        invalidatesTags: tags,
      }),
      commentCustomOrder: builder.mutation({
        query: ({ id, ...body }) => ({
          url: `/custom-orders/${encodeURIComponent(id)}/comments`,
          method: "POST",
          body,
        }),
        invalidatesTags: tags,
      }),
      closeCustomOrder: builder.mutation({
        query: ({ id, ...body }) => ({
          url: `/custom-orders/${encodeURIComponent(id)}/close`,
          method: "POST",
          body,
        }),
        invalidatesTags: [...tags, "Notifications"],
      }),
      reopenCustomOrder: builder.mutation({
        query: ({ id, ...body }) => ({
          url: `/custom-orders/${encodeURIComponent(id)}/reopen`,
          method: "POST",
          body,
        }),
        invalidatesTags: [...tags, "Notifications"],
      }),
      uploadCustomOrderAttachments: builder.mutation({
        query: ({ id, body }) => ({
          url: `/custom-orders/${encodeURIComponent(id)}/attachments`,
          method: "POST",
          body,
        }),
        invalidatesTags: tags,
      }),
      removeCustomOrderAttachment: builder.mutation({
        query: ({ id, attachmentId, ...body }) => ({
          url: `/custom-orders/${encodeURIComponent(id)}/attachments/${encodeURIComponent(attachmentId)}/remove`,
          method: "POST",
          body,
        }),
        invalidatesTags: tags,
      }),
    }),
  });

export const {
  useGetCustomOrdersQuery,
  useGetCustomOrderQuery,
  useLazyGetCustomOrderHistoryQuery,
  useGetCustomOrderOptionsQuery,
  useLazyFindCustomOrderCustomerQuery,
  useCreateCustomOrderMutation,
  useUpdateCustomOrderMutation,
  useCommentCustomOrderMutation,
  useCloseCustomOrderMutation,
  useReopenCustomOrderMutation,
  useUploadCustomOrderAttachmentsMutation,
  useRemoveCustomOrderAttachmentMutation,
} = customOrdersApiSlice;
