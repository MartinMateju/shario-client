import { apiSlice } from "../api/apiSlice";

export const emailNotificationsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query({
      query: (params = {}) => ({
        url: "/notifications/email-notifications",
        method: "GET",
        params,
      }),
      providesTags: ["Notifications"],
    }),

    getEmailNotificationById: builder.query({
      query: (id) => `/notifications/email-notifications/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Notifications", id }],
    }),

    createEmailNotification: builder.mutation({
      query: (body) => ({
        url: "/notifications/email-notifications",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Notifications"],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetEmailNotificationByIdQuery,
  useCreateEmailNotificationMutation,
} = emailNotificationsApiSlice;
