import { createEntityAdapter } from "@reduxjs/toolkit";
import { apiSlice } from "../api/apiSlice";

const ordersAdapter = createEntityAdapter();
const initialState = ordersAdapter.getInitialState();

export const ordersApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getOrdersWithFilters: builder.mutation({
      query: (filters) => ({
        url: "/orders/filter",
        method: "POST",
        body: filters,
      }),
      providesTags: [{ type: "Order", id: "LIST" }],
    }),
  }),
});

export const { useGetOrdersWithFiltersMutation } = ordersApiSlice;
