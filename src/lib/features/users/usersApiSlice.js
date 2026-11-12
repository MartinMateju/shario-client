import { createSelector, createEntityAdapter } from "@reduxjs/toolkit";
import { apiSlice } from "../api/apiSlice";

const usersAdapter = createEntityAdapter({});
const initialState = usersAdapter.getInitialState();

const getUsers = (response) => {
  if (Array.isArray(response)) return response;
  for (const key of ["users", "customers", "items", "data"]) {
    if (Array.isArray(response?.[key])) return response[key];
  }
  return [];
};

const getUserId = (user) => String(user?.id ?? user?._id ?? "").trim();

export const usersApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query({
      query: ({ tenantRole } = {}) => ({
        url: "/users",
        ...(tenantRole === "customer" ? { params: { tenantRole } } : {}),
        validateStatus: (response, result) => {
          return response.status === 200 && !result.isError;
        },
      }),
      providesTags: (result, _error, { tenantRole } = {}) => [
        { type: "User", id: "LIST" },
        ...(tenantRole === "customer"
          ? [
              { type: "Booking", id: "LIST" },
              { type: "Order", id: "LIST" },
              { type: "CouponOrder", id: "LIST" },
              { type: "MembershipInvoice", id: "LIST" },
            ]
          : []),
        ...getUsers(result)
          .map(getUserId)
          .filter(Boolean)
          .map((id) => ({ type: "User", id })),
      ],
    }),
    getCustomer: builder.query({
      query: (id) => `/users/${encodeURIComponent(String(id))}`,
      transformResponse: (response) =>
        response?.customer ?? response?.data ?? response,
      providesTags: (_result, _error, id) => [{ type: "User", id: String(id) }],
    }),
    getUsersByCustomId: builder.query({
      query: (initialUserData) => ({
        url: `users/${initialUserData.customId}/${initialUserData.userId}`,
        params: {
          ...initialUserData,
        },
      }),
    }),
    getUsersWithFilters: builder.mutation({
      query: (filters) => ({
        url: "/users/filter",
        method: "POST",
        body: filters,
      }),
      providesTags: [{ type: "User", id: "LIST" }],
    }),
    getInvoiceCustomers: builder.query({
      query: ({ search = "", limit = 50 } = {}) => ({
        url: "/users/filter",
        method: "POST",
        body: {
          search,
          tenantRole: "customer",
          page: 1,
          limit,
          sortBy: "lastname",
          sortOrder: "asc",
        },
      }),
      providesTags: [{ type: "User", id: "LIST" }],
    }),
    addNewUser: builder.mutation({
      query: (initialUserData) => ({
        url: "/users",
        method: "POST",
        body: {
          ...initialUserData,
        },
      }),
      invalidatesTags: [{ type: "User", id: "LIST" }],
    }),
    registerNewUser: builder.mutation({
      query: (initialUserData) => ({
        url: "/auth/register",
        method: "POST",
        body: {
          ...initialUserData,
        },
      }),
    }),
    updateUser: builder.mutation({
      query: (initialUserData) => ({
        url: "/users",
        method: "PATCH",
        body: {
          ...initialUserData,
        },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "User", id: arg.id },
        { type: "User", id: "LIST" },
      ],
    }),
    deleteUser: builder.mutation({
      query: ({ id }) => ({
        url: `/users`,
        method: "DELETE",
        body: { id },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "User", id: arg.id },
        { type: "User", id: "LIST" },
      ],
    }),
    updateUserPass: builder.mutation({
      query: (initialUserData) => ({
        url: "/users/pass",
        method: "PATCH",
        body: {
          ...initialUserData,
        },
      }),
      invalidatesTags: (result, error, arg) => [{ type: "User", id: arg.id }],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetCustomerQuery,
  useLazyGetUsersByCustomIdQuery,
  useGetUsersWithFiltersMutation,
  useGetInvoiceCustomersQuery,
  useAddNewUserMutation,
  useRegisterNewUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useUpdateUserPassMutation,
} = usersApiSlice;

// returns the query result object
export const selectUsersResult = usersApiSlice.endpoints.getUsers.select();

// creates memoized selector
const selectUsersData = createSelector(
  selectUsersResult,
  (usersResult) => usersResult.data, // normalized state object with ids & entities
);

//getSelectors creates these selectors and we rename them with aliases using destructuring
export const {
  selectAll: selectAllUsers,
  selectById: selectUserById,
  selectIds: selectUserIds,
  // Pass in a selector that returns the users slice of state
} = usersAdapter.getSelectors(
  (state) => selectUsersData(state) ?? initialState,
);
