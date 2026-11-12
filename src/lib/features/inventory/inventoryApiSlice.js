import { apiSlice } from "../api/apiSlice";

export const inventoryApiRoutes = Object.freeze({
  items: "/inventory/items",
  item: (id) => `/inventory/items/${id}`,
  movements: "/inventory/movements",
  audits: "/inventory/audits",
  audit: (id) => `/inventory/audits/${id}`,
  completeAudit: (id) => `/inventory/audits/${id}/complete`,
  reorders: "/inventory/reorders",
  reorder: (id) => `/inventory/reorders/${id}`,
});

export const inventoryInvalidationTags = Object.freeze({
  createItem: Object.freeze([
    "InventoryItem",
    "InventoryMovement",
    "ReorderRequest",
    "SetupCenter",
  ]),
  updateItem: Object.freeze(["InventoryItem", "ReorderRequest", "SetupCenter"]),
  createMovement: Object.freeze([
    "InventoryItem",
    "InventoryMovement",
    "ReorderRequest",
  ]),
  completeAudit: Object.freeze([
    "InventoryAudit",
    "InventoryItem",
    "InventoryMovement",
    "ReorderRequest",
  ]),
});

export const inventoryApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getInventoryItems: builder.query({
      query: (params = {}) => ({
        url: inventoryApiRoutes.items,
        params,
      }),
      providesTags: ["InventoryItem"],
    }),

    getInventoryItem: builder.query({
      query: (id) => inventoryApiRoutes.item(id),
      providesTags: ["InventoryItem"],
    }),

    createInventoryItem: builder.mutation({
      query: (body) => ({
        url: inventoryApiRoutes.items,
        method: "POST",
        body,
      }),
      invalidatesTags: inventoryInvalidationTags.createItem,
    }),

    updateInventoryItem: builder.mutation({
      query: ({ id, ...body }) => ({
        url: inventoryApiRoutes.item(id),
        method: "PATCH",
        body,
      }),
      invalidatesTags: inventoryInvalidationTags.updateItem,
    }),

    getInventoryMovements: builder.query({
      query: (params = {}) => ({
        url: inventoryApiRoutes.movements,
        params,
      }),
      providesTags: ["InventoryMovement"],
    }),

    createInventoryMovement: builder.mutation({
      query: (body) => ({
        url: inventoryApiRoutes.movements,
        method: "POST",
        body,
      }),
      invalidatesTags: inventoryInvalidationTags.createMovement,
    }),

    getInventoryAudits: builder.query({
      query: (params = {}) => ({
        url: inventoryApiRoutes.audits,
        params,
      }),
      providesTags: ["InventoryAudit"],
    }),

    createInventoryAudit: builder.mutation({
      query: (body) => ({
        url: inventoryApiRoutes.audits,
        method: "POST",
        body,
      }),
      invalidatesTags: ["InventoryAudit"],
    }),

    updateInventoryAudit: builder.mutation({
      query: ({ id, ...body }) => ({
        url: inventoryApiRoutes.audit(id),
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["InventoryAudit"],
    }),

    completeInventoryAudit: builder.mutation({
      query: (id) => ({
        url: inventoryApiRoutes.completeAudit(id),
        method: "PATCH",
      }),
      invalidatesTags: inventoryInvalidationTags.completeAudit,
    }),

    getReorderRequests: builder.query({
      query: (params = {}) => ({
        url: inventoryApiRoutes.reorders,
        params,
      }),
      providesTags: ["ReorderRequest"],
    }),

    createReorderRequest: builder.mutation({
      query: (body) => ({
        url: inventoryApiRoutes.reorders,
        method: "POST",
        body,
      }),
      invalidatesTags: ["ReorderRequest"],
    }),

    updateReorderRequest: builder.mutation({
      query: ({ id, ...body }) => ({
        url: inventoryApiRoutes.reorder(id),
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["ReorderRequest", "InventoryItem", "InventoryMovement"],
    }),
  }),
});

export const {
  useGetInventoryItemsQuery,
  useLazyGetInventoryItemQuery,
  useCreateInventoryItemMutation,
  useUpdateInventoryItemMutation,
  useGetInventoryMovementsQuery,
  useCreateInventoryMovementMutation,
  useGetInventoryAuditsQuery,
  useCreateInventoryAuditMutation,
  useUpdateInventoryAuditMutation,
  useCompleteInventoryAuditMutation,
  useGetReorderRequestsQuery,
  useCreateReorderRequestMutation,
  useUpdateReorderRequestMutation,
} = inventoryApiSlice;
