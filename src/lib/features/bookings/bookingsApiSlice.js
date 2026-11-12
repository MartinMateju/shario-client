import { apiSlice } from "../api/apiSlice";
import {
  fetchAllCustomerBookingPages,
  getCustomerBookings,
} from "./customerBookingPagination";

const getQueryParams = (params) => {
  if (!params || typeof params !== "object" || Array.isArray(params)) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => {
      return value !== undefined && value !== null && value !== "";
    }),
  );
};

export const bookingsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getBookings: builder.query({
      query: (params) => ({
        url: "/bookings",
        params: getQueryParams(params),
      }),
      providesTags: [{ type: "Booking", id: "LIST" }],
    }),
    getCustomerBookingAvailability: builder.query({
      query: (params) => ({
        url: "/bookings/mine/availability",
        params: getQueryParams(params),
      }),
      providesTags: [{ type: "Booking", id: "MINE-AVAILABILITY" }],
    }),
    getUserBookings: builder.query({
      query: (params) => ({
        url: "/bookings/mine",
        params: getQueryParams(params),
      }),
      providesTags: (result) => [
        { type: "Booking", id: "MINE" },
        ...(Array.isArray(result?.bookings)
          ? result.bookings
              .map((booking) => booking?.id ?? booking?._id)
              .filter(Boolean)
              .map((id) => ({ type: "Booking", id: String(id) }))
          : []),
      ],
    }),
    getAllUserBookings: builder.query({
      async queryFn(params, _api, _extraOptions, baseQuery) {
        // Keep customer/session identity in the RTK cache key without sending
        // client-only parameters to the strict customer booking endpoint.
        const { customerScope: _customerScope, ...requestParams } =
          params || {};
        return fetchAllCustomerBookingPages({
          params: requestParams,
          fetchPage: (pageParams) =>
            baseQuery({
              url: "/bookings/mine",
              params: getQueryParams(pageParams),
            }),
        });
      },
      providesTags: (result) => [
        { type: "Booking", id: "MINE" },
        ...getCustomerBookings(result)
          .map((booking) => booking?.id ?? booking?._id)
          .filter(Boolean)
          .map((id) => ({ type: "Booking", id: String(id) })),
      ],
    }),
    getMyBooking: builder.query({
      query: ({ bookingId }) => ({
        url: `/bookings/mine/${encodeURIComponent(String(bookingId))}`,
      }),
      providesTags: (_result, _error, { bookingId }) => [
        { type: "Booking", id: String(bookingId) },
      ],
    }),
    getBookingsHistory: builder.query({
      query: (params) => ({
        url: "/bookings/history",
        params: getQueryParams(params),
      }),
      providesTags: [{ type: "Booking", id: "LIST" }],
    }),
    getCustomerBookingHistory: builder.query({
      query: ({ customerId, scope = "all", page = 1, limit = 10 }) => ({
        url: `/users/${encodeURIComponent(String(customerId))}/bookings`,
        params: { scope, page, limit },
      }),
      providesTags: (result, _error, { customerId }) => [
        { type: "Booking", id: `CUSTOMER-${customerId}` },
        ...(Array.isArray(result?.bookings)
          ? result.bookings
              .map((booking) => booking?.id ?? booking?._id)
              .filter(Boolean)
              .map((id) => ({ type: "Booking", id: String(id) }))
          : []),
      ],
    }),
    getCourseBookings: builder.query({
      query: (params) => ({
        url: "/courses/bookings",
        params: getQueryParams(params),
      }),
      providesTags: [{ type: "Booking", id: "LIST" }],
    }),
    getBookingsByProductId: builder.query({
      query: (productId) => ({
        url: `bookings/${productId}`,
        params: {
          productId,
        },
      }),
      providesTags: [{ type: "Booking", id: "LIST" }],
    }),
    getBookingsByUserId: builder.mutation({
      query: (userId) => ({
        url: `bookings/user`,
        method: "PATCH",
        body: {
          userId,
        },
      }),
      providesTags: [{ type: "Booking", id: "LIST" }],
    }),
    getBookingsWithFilters: builder.mutation({
      query: (filters) => ({
        url: "/bookings/filter",
        method: "POST",
        body: filters,
      }),
      providesTags: [{ type: "Booking", id: "LIST" }],
    }),
    addNewBooking: builder.mutation({
      query: (initialData) => ({
        url: "/bookings",
        method: "POST",
        body: {
          ...initialData,
        },
      }),
      invalidatesTags: [{ type: "Booking", id: "LIST" }, "SetupCenter"],
    }),
    updateBooking: builder.mutation({
      query: (initialData) => ({
        url: "/bookings",
        method: "PATCH",
        body: {
          ...initialData,
        },
      }),
      invalidatesTags: [{ type: "Booking", id: "LIST" }, "SetupCenter"],
    }),
    getBookingEditor: builder.query({
      query: (id) => `/bookings/${encodeURIComponent(String(id))}/editor`,
      providesTags: (_result, _error, id) => [
        { type: "Booking", id: String(id) },
      ],
    }),
    getBookingEditorCustomer: builder.query({
      query: ({ id, identifier }) => ({
        url: `/bookings/${encodeURIComponent(String(id))}/editor/customer`,
        params: { identifier },
      }),
    }),
    saveBookingEditor: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/bookings/${encodeURIComponent(String(id))}/editor`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) =>
        error
          ? []
          : [
              { type: "Booking", id: String(id) },
              { type: "Booking", id: "LIST" },
              { type: "Booking", id: "MINE" },
              { type: "Booking", id: "MINE-AVAILABILITY" },
              "SetupCenter",
            ],
    }),
    deleteBooking: builder.mutation({
      query: (initialData) => ({
        url: `/bookings`,
        method: "DELETE",
        body: { ...initialData },
      }),
      invalidatesTags: [{ type: "Booking", id: "LIST" }, "SetupCenter"],
    }),
    cancelBooking: builder.mutation({
      query: ({ id }) => ({
        url: `/bookings/mine/${encodeURIComponent(String(id))}/cancel`,
        method: "PATCH",
      }),
      invalidatesTags: (_result, error) => [
        { type: "Booking", id: "MINE" },
        "Credits",
        "SetupCenter",
        ...(!error
          ? [
              { type: "Membership", id: "MINE" },
              { type: "MembershipLedger", id: "MINE" },
            ]
          : []),
      ],
    }),
    rescheduleBooking: builder.mutation({
      query: ({ id, start }) => ({
        url: `/bookings/mine/${encodeURIComponent(String(id))}/reschedule`,
        method: "PATCH",
        body: { start },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Booking", id: "MINE" },
        { type: "Booking", id: String(id) },
        { type: "Booking", id: "LIST" },
      ],
    }),
    getMyBookingRescheduleAvailability: builder.query({
      query: ({ id, date }) => ({
        url: `/bookings/mine/${encodeURIComponent(
          String(id),
        )}/reschedule/availability`,
        params: { date },
      }),
      providesTags: (_result, _error, { id }) => [
        { type: "Booking", id: String(id) },
      ],
    }),
    getMyBookingExtensionOptions: builder.query({
      query: ({ id }) => ({
        url: `/bookings/mine/${encodeURIComponent(String(id))}/extension/options`,
      }),
      providesTags: (_result, _error, { id }) => [
        { type: "Booking", id: String(id) },
      ],
    }),
    cancelMyBookingExtensionPayment: builder.mutation({
      query: ({ id, orderId }) => ({
        url: `/bookings/mine/${encodeURIComponent(String(id))}/extension/pending`,
        method: "DELETE",
        body: { orderId },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Booking", id: "MINE" },
        { type: "Booking", id: String(id) },
        { type: "Booking", id: "MINE-AVAILABILITY" },
      ],
    }),
    extendMyBooking: builder.mutation({
      query: ({ id, idempotencyKey, ...body }) => ({
        url: `/bookings/mine/${encodeURIComponent(String(id))}/extension`,
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Booking", id: "MINE" },
        { type: "Booking", id: String(id) },
        { type: "Booking", id: "MINE-AVAILABILITY" },
        { type: "Booking", id: "LIST" },
        "Credits",
        "CreditTransactions",
      ],
    }),
    increaseBookingParticipants: builder.mutation({
      query: ({ bookingId, additionalParticipants, userId }) => ({
        url: "/bookings/increase-participants",
        method: "PUT",
        body: { bookingId, additionalParticipants, userId },
      }),
      invalidatesTags: [{ type: "Booking", id: "LIST" }],
    }),
  }),
});

export const {
  useGetBookingsQuery,
  useGetCustomerBookingAvailabilityQuery,
  useGetUserBookingsQuery,
  useGetAllUserBookingsQuery,
  useGetMyBookingQuery,
  useGetBookingsHistoryQuery,
  useGetCustomerBookingHistoryQuery,
  useGetCourseBookingsQuery,
  useLazyGetBookingsByProductIdQuery,
  useGetBookingsByUserIdMutation,
  useGetBookingsWithFiltersMutation,
  useAddNewBookingMutation,
  useUpdateBookingMutation,
  useGetBookingEditorQuery,
  useLazyGetBookingEditorCustomerQuery,
  useSaveBookingEditorMutation,
  useDeleteBookingMutation,
  useCancelBookingMutation,
  useRescheduleBookingMutation,
  useGetMyBookingRescheduleAvailabilityQuery,
  useGetMyBookingExtensionOptionsQuery,
  useExtendMyBookingMutation,
  useCancelMyBookingExtensionPaymentMutation,
  useIncreaseBookingParticipantsMutation,
} = bookingsApiSlice;
