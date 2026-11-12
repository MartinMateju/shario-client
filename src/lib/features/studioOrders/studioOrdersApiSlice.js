import { apiSlice } from "../api/apiSlice";

export const studioOrdersApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getStudioOrders: builder.query({
      query: (params = {}) => ({
        url: "/supply-orders/orders",
        params,
      }),
      providesTags: ["StudioOrders"],
    }),

    createStudioOrder: builder.mutation({
      query: (body) => ({
        url: "/supply-orders/orders",
        method: "POST",
        body,
      }),
      invalidatesTags: ["StudioOrders"],
    }),

    updateStudioOrder: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/supply-orders/orders/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["StudioOrders"],
    }),

    deleteStudioOrder: builder.mutation({
      query: (id) => ({
        url: `/supply-orders/orders/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["StudioOrders"],
    }),
  }),
});

export const {
  useGetStudioOrdersQuery,
  useCreateStudioOrderMutation,
  useUpdateStudioOrderMutation,
  useDeleteStudioOrderMutation,
} = studioOrdersApiSlice;
