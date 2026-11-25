import { apiSlice } from "../api/apiSlice";

// Scope belongs to the cache key, never the request. The API resolves the
// tenant and permissions from the authenticated workspace identity.
const financialFields = [
  "spendMin",
  "spendMax",
  "spendFrom",
  "spendTo",
  "creditMin",
  "creditMax",
];
const periodContext = ({ spendFrom, spendTo, timeZone } = {}) => ({
  ...(spendFrom ? { spendFrom } : {}),
  ...(spendTo ? { spendTo } : {}),
  ...((spendFrom || spendTo) && timeZone ? { timeZone } : {}),
});
const filters = ({
  search = "",
  status = "",
  membership = "",
  ...args
} = {}) => ({
  search,
  status,
  membership,
  ...Object.fromEntries(
    financialFields
      .filter(
        (key) =>
          args[key] !== undefined && args[key] !== null && args[key] !== "",
      )
      .map((key) => [key, args[key]]),
  ),
  ...periodContext(args),
});

export const customerDirectoryApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCustomerDirectory: builder.query({
      query: ({ page = 1, limit = 10, ...args }) => ({
        url: "/users/directory",
        params: { page, limit, ...filters(args) },
      }),
      providesTags: (result) => [
        { type: "User", id: "LIST" },
        { type: "Booking", id: "LIST" },
        { type: "Order", id: "LIST" },
        { type: "CouponOrder", id: "LIST" },
        { type: "MembershipInvoice", id: "LIST" },
        "Credits",
        "Membership",
        "Tenant",
        ...(result?.data || []).map((customer) => ({
          type: "User",
          id: String(customer.id ?? customer._id),
        })),
      ],
    }),
    getCustomerDirectorySummary: builder.query({
      query: ({ timeZone }) => ({
        url: "/users/directory/summary",
        params: { timeZone },
      }),
      // Summary cards do not depend on booking or sales history. Keep their
      // inexpensive aggregate separate from visible-page financial metrics.
      providesTags: [
        { type: "User", id: "LIST" },
        "Credits",
        "Membership",
        "Tenant",
      ],
    }),
    exportCustomerDirectory: builder.mutation({
      query: (args) => ({
        url: "/users/directory/export",
        method: "POST",
        body: args.ids
          ? { ids: args.ids, ...periodContext(args) }
          : filters(args),
      }),
    }),
  }),
});

export const {
  useGetCustomerDirectoryQuery,
  useGetCustomerDirectorySummaryQuery,
  useExportCustomerDirectoryMutation,
} = customerDirectoryApiSlice;
