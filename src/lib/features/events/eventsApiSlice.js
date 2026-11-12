import { apiSlice } from "../api/apiSlice";

export const eventsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getEvents: builder.query({
      query: (params = {}) => ({
        url: "/events",
        params,
      }),
      providesTags: ["Events"],
    }),

    getEvent: builder.query({
      query: (id) => `/events/${id}`,
      providesTags: ["Events"],
    }),

    createEvent: builder.mutation({
      query: (body) => ({
        url: "/events",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Events"],
    }),

    updateEvent: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/events/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Events"],
    }),

    deleteEvent: builder.mutation({
      query: (id) => ({
        url: `/events/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Events"],
    }),
  }),
});

export const {
  useGetEventsQuery,
  useGetEventQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
} = eventsApiSlice;
