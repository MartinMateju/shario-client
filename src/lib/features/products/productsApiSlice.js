import { apiSlice } from "../api/apiSlice";
import { encodeTenantSlugPathSegment } from "@/utils/tenantRouting";

import {
  normalizeProductResponse,
  normalizeProductsResponse,
} from "./products.contract.mjs";
import { collectPaginatedQuery } from "../api/paginatedQuery";
import { collectPublicCourseProducts } from "./publicCourseProductsQuery";

const getPublicProductsUrl = (tenantSlug, suffix = "") => {
  const encodedSlug = encodeTenantSlugPathSegment(tenantSlug);
  const path = `/public/tenants/${encodedSlug}/products`;

  return suffix ? `${path}/${suffix}` : path;
};

const getProductTags = (products) => [
  { type: "Product", id: "LIST" },
  ...products
    .map((product) => product?.id)
    .filter(Boolean)
    .map((id) => ({ type: "Product", id })),
];

const normalizeClassCategories = (response) =>
  Array.isArray(response) ? response : response?.categories || [];

const normalizeClassCategory = (response) =>
  response?.category || response || null;

export const productsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getVoucherDesignDefaults: builder.query({
      query: () => "/products/voucher-design/defaults",
      providesTags: [{ type: "Product", id: "VOUCHER_DESIGN_DEFAULTS" }],
    }),

    uploadVoucherDesignAsset: builder.mutation({
      query: (body) => ({
        url: "/products/voucher-design/assets",
        method: "POST",
        body,
      }),
    }),

    previewVoucherDesign: builder.mutation({
      query: (body) => ({
        url: "/products/voucher-design/preview",
        method: "POST",
        body,
      }),
    }),

    downloadVoucherDesignPdf: builder.mutation({
      query: (body) => ({
        url: "/products/voucher-design/pdf",
        method: "POST",
        body,
        responseHandler: async (response) => {
          if (!response.ok) return response.json();
          const bytes = new Uint8Array(await response.arrayBuffer());
          let binary = "";
          for (let offset = 0; offset < bytes.length; offset += 8192) {
            binary += String.fromCharCode(
              ...bytes.subarray(offset, offset + 8192),
            );
          }
          // Keep Redux serializable; create the short-lived download URL in the UI.
          return { base64: btoa(binary) };
        },
      }),
    }),

    getVoucherAllowance: builder.query({
      query: () => "/products/voucher-allowance",
      providesTags: [{ type: "Product", id: "VOUCHER_ALLOWANCE" }],
    }),

    getProductDeletionPolicy: builder.query({
      query: (productId) =>
        `/products/${encodeURIComponent(productId)}/deletion-policy`,
      providesTags: (_result, _error, productId) => [
        { type: "Product", id: productId },
        { type: "Coupon", id: "LIST" },
      ],
    }),
    /**
     * AUTHENTICATED WORKSPACE CATALOG
     *
     * This endpoint is permission protected and must only be used by owner /
     * staff workspace screens.
     */
    getProducts: builder.query({
      query: (query = {}) => {
        const params =
          query && typeof query === "object" && !Array.isArray(query)
            ? query
            : {};

        return {
          url: "/products",
          params: {
            ...params,
            limit: params.limit ?? 100,
          },
        };
      },
      transformResponse: normalizeProductsResponse,
      providesTags: (result = []) => getProductTags(result),
    }),

    getAllProducts: builder.query({
      async queryFn(query = {}, _api, _extraOptions, baseQuery) {
        const params =
          query && typeof query === "object" && !Array.isArray(query)
            ? query
            : {};
        const { page: _page, limit: _limit, ...filters } = params;
        const result = await collectPaginatedQuery({
          baseQuery,
          buildRequest: (page) => ({
            url: "/products",
            params: { ...filters, page, limit: 100 },
          }),
          selectItems: normalizeProductsResponse,
          selectPageCount: (response) => response?.totalPages,
        });

        if (result.error) return { error: result.error };
        return { data: result.data.items };
      },
      providesTags: (result = []) => getProductTags(result),
    }),

    getCourseProducts: builder.query({
      query: () => "/products/courses",
      transformResponse: normalizeProductsResponse,
      providesTags: (result = []) => getProductTags(result),
    }),

    getProductClassCategories: builder.query({
      query: () => "/products/class-categories",
      transformResponse: normalizeClassCategories,
      providesTags: (result = []) => [
        { type: "ClassCategory", id: "LIST" },
        ...result.map((category) => ({
          type: "ClassCategory",
          id: category.id,
        })),
      ],
    }),

    createProductClassCategory: builder.mutation({
      query: (body) => ({
        url: "/products/class-categories",
        method: "POST",
        body,
      }),
      transformResponse: normalizeClassCategory,
      invalidatesTags: [{ type: "ClassCategory", id: "LIST" }],
    }),

    deleteProductClassCategory: builder.mutation({
      query: (categoryId) => ({
        url: `/products/class-categories/${encodeURIComponent(categoryId)}`,
        method: "DELETE",
      }),
      transformResponse: normalizeClassCategory,
      invalidatesTags: (_result, _error, categoryId) => [
        { type: "ClassCategory", id: "LIST" },
        { type: "ClassCategory", id: categoryId },
      ],
    }),

    /**
     * AUTHENTICATED CUSTOMER CATALOG
     *
     * This returns the same public-safe DTO as the anonymous storefront
     * endpoint, while resolving the tenant from the access token. Portal
     * screens must use it so a customer can book in a studio whose public site
     * is still a draft.
     */
    getCustomerCatalog: builder.query({
      query: (query = {}) => {
        const params =
          query && typeof query === "object" && !Array.isArray(query)
            ? query
            : {};

        return {
          url: "/products/customer-catalog",
          params: {
            ...params,
            limit: params.limit ?? 100,
          },
        };
      },
      transformResponse: normalizeProductsResponse,
      providesTags: [{ type: "Product", id: "CUSTOMER_CATALOG" }],
    }),

    /**
     * PUBLIC / CUSTOMER CATALOG
     *
     * Tenant context is resolved from the validated route slug, never from
     * mutable Redux state or an untrusted tenant id.
     */
    getPublicProducts: builder.query({
      query: ({ tenantSlug, ...params }) => ({
        url: getPublicProductsUrl(tenantSlug),
        credentials: "omit",
        params: {
          ...params,
          limit: params.limit ?? 100,
        },
      }),
      transformResponse: normalizeProductsResponse,
      providesTags: (_result, _error, { tenantSlug }) => [
        { type: "Product", id: `PUBLIC:${tenantSlug}` },
      ],
    }),

    getCustomerCourseProducts: builder.query({
      queryFn: ({ locationId }, _api, _extraOptions, baseQuery) =>
        collectPublicCourseProducts({
          baseQuery,
          buildRequest: (page, limit) => ({
            url: "/products/customer-catalog/courses",
            params: { locationId, page, limit },
          }),
        }),
      providesTags: (_result, _error, { locationId }) => [
        { type: "Product", id: `CUSTOMER_COURSES:${locationId}` },
        { type: "PublicBooking", id: "CUSTOMER_COURSES" },
      ],
    }),

    getPublicCourseProducts: builder.query({
      queryFn: ({ tenantSlug, locationId }, _api, _extraOptions, baseQuery) =>
        collectPublicCourseProducts({
          baseQuery,
          buildRequest: (page, limit) => ({
            url: getPublicProductsUrl(tenantSlug, "courses"),
            credentials: "omit",
            params: { page, limit, ...(locationId ? { locationId } : {}) },
          }),
        }),
      providesTags: (_result, _error, { tenantSlug }) => [
        { type: "Product", id: `PUBLIC_COURSES:${tenantSlug}` },
      ],
    }),

    getPublicProduct: builder.query({
      query: ({ tenantSlug, productId, locationId }) => ({
        url: getPublicProductsUrl(
          tenantSlug,
          encodeURIComponent(String(productId || "").trim()),
        ),
        credentials: "omit",
        params: locationId ? { locationId } : undefined,
      }),
      transformResponse: normalizeProductResponse,
      providesTags: (_result, _error, { tenantSlug, productId }) => [
        {
          type: "Product",
          id: `PUBLIC:${tenantSlug}:${String(productId)}`,
        },
      ],
    }),

    addNewProduct: builder.mutation({
      query: (payload) => {
        // If payload is FormData, pass it directly (do NOT spread, do NOT set Content-Type)
        const isFormData =
          typeof FormData !== "undefined" && payload instanceof FormData;

        return {
          url: "/products",
          method: "POST",
          body: isFormData ? payload : { ...payload },
        };
      },
      invalidatesTags: ["Product", "ClassCategory", "SetupCenter"],
    }),

    updateProduct: builder.mutation({
      query: (payload) => {
        const isFormData =
          typeof FormData !== "undefined" && payload instanceof FormData;

        return {
          url: "/products",
          method: "PATCH",
          body: isFormData ? payload : { ...payload },
        };
      },
      invalidatesTags: ["Product", "ClassCategory", "SetupCenter"],
    }),

    deleteProduct: builder.mutation({
      query: (initialData) => ({
        url: `/products`,
        method: "DELETE",
        body: { ...initialData },
      }),
      invalidatesTags: ["Product", "ClassCategory", "SetupCenter"],
    }),
  }),
});

export const {
  useGetVoucherDesignDefaultsQuery,
  useUploadVoucherDesignAssetMutation,
  usePreviewVoucherDesignMutation,
  useDownloadVoucherDesignPdfMutation,
  useGetVoucherAllowanceQuery,
  useGetProductDeletionPolicyQuery,
  useGetProductsQuery,
  useGetAllProductsQuery,
  useGetCourseProductsQuery,
  useGetProductClassCategoriesQuery,
  useGetCustomerCatalogQuery,
  useGetPublicProductsQuery,
  useGetPublicCourseProductsQuery,
  useGetCustomerCourseProductsQuery,
  useGetPublicProductQuery,
  useAddNewProductMutation,
  useCreateProductClassCategoryMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useDeleteProductClassCategoryMutation,
} = productsApiSlice;
