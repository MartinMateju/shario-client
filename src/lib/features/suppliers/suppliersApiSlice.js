import { apiSlice } from "../api/apiSlice";

export const supplierApiRoutes = Object.freeze({
  collection: "/supply-orders/suppliers",
  supplier: (id) => `/supply-orders/suppliers/${id}`,
});

export const suppliersApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSuppliers: builder.query({
      query: (params = {}) => ({
        url: supplierApiRoutes.collection,
        params,
      }),
      providesTags: ["Supplier"],
    }),

    createSupplier: builder.mutation({
      query: (body) => ({
        url: supplierApiRoutes.collection,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Supplier", "InventoryItem"],
    }),

    updateSupplier: builder.mutation({
      query: ({ id, ...body }) => ({
        url: supplierApiRoutes.supplier(id),
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Supplier", "InventoryItem"],
    }),

    deleteSupplier: builder.mutation({
      query: (id) => ({
        url: supplierApiRoutes.supplier(id),
        method: "DELETE",
      }),
      invalidatesTags: ["Supplier", "InventoryItem"],
    }),
  }),
});

export const {
  useGetSuppliersQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
} = suppliersApiSlice;
