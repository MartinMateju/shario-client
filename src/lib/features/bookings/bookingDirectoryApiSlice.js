import { apiSlice } from "../api/apiSlice";

const fields = [
  "search",
  "dateScope",
  "dateFrom",
  "dateTo",
  "endAfter",
  "lecturerName",
  "lecturerId",
  "productId",
  "authorId",
  "locationId",
  "paymentStatus",
  "status",
  "isAdmin",
  "page",
  "limit",
  "sortBy",
  "sortOrder",
];
export const bookingDirectoryApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getBookingFilterOptions: builder.query({
      query: ({ locationId }) => ({
        url: "/bookings/filter-options",
        params: locationId ? { locationId } : undefined,
      }),
      providesTags: [
        { type: "Booking", id: "LIST" },
        { type: "Product", id: "LIST" },
      ],
    }),
    getBookingDirectory: builder.query({
      query: (args) => ({
        url: "/bookings/filter",
        method: "POST",
        body: Object.fromEntries(
          fields
            .filter((key) => args[key] !== undefined)
            .map((key) => [key, args[key]]),
        ),
      }),
      providesTags: (result) => [
        { type: "Booking", id: "LIST" },
        { type: "User", id: "LIST" },
        { type: "Product", id: "LIST" },
        ...(result?.bookings || []).map((booking) => ({
          type: "Booking",
          id: String(booking.id ?? booking._id),
        })),
      ],
    }),
  }),
});
export const { useGetBookingDirectoryQuery, useGetBookingFilterOptionsQuery } =
  bookingDirectoryApiSlice;
