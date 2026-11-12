import { apiSlice } from "../api/apiSlice";

const WORKSPACE_NOTIFICATIONS_URL = "/tenants/current/notifications";
const CUSTOMER_NOTIFICATIONS_URL = "/notifications/mine";

const getNotificationId = (notification) =>
  notification?.id ?? notification?._id ?? null;

const provideNotificationListTags = (
  result,
  listId,
  notificationIdPrefix = "",
) => {
  const notifications =
    result?.notifications ??
    result?.items ??
    result?.data?.notifications ??
    result?.data?.items ??
    [];

  return [
    { type: "Notifications", id: listId },
    ...(Array.isArray(notifications) ? notifications : [])
      .map(getNotificationId)
      .filter(Boolean)
      .map((id) => ({
        type: "Notifications",
        id: `${notificationIdPrefix}${String(id)}`,
      })),
  ];
};

const customerNotificationTag = (notificationId) => ({
  type: "Notifications",
  id: `CUSTOMER-${String(notificationId)}`,
});

export const notificationsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getWorkspaceNotifications: builder.query({
      query: (params = {}) => ({
        url: WORKSPACE_NOTIFICATIONS_URL,
        params,
      }),
      providesTags: (result) =>
        provideNotificationListTags(result, "WORKSPACE-LIST"),
    }),

    getWorkspaceNotificationSummary: builder.query({
      query: (params = {}) => ({
        url: `${WORKSPACE_NOTIFICATIONS_URL}/summary`,
        params,
      }),
      providesTags: (result) =>
        provideNotificationListTags(result, "WORKSPACE-SUMMARY"),
    }),

    markWorkspaceNotificationRead: builder.mutation({
      query: (notificationId) => ({
        url: `${WORKSPACE_NOTIFICATIONS_URL}/${encodeURIComponent(
          String(notificationId),
        )}/read`,
        method: "PATCH",
      }),
      invalidatesTags: (_result, _error, notificationId) => [
        { type: "Notifications", id: String(notificationId) },
        { type: "Notifications", id: "WORKSPACE-LIST" },
        { type: "Notifications", id: "WORKSPACE-SUMMARY" },
      ],
    }),

    markAllWorkspaceNotificationsRead: builder.mutation({
      query: (body = {}) => ({
        url: `${WORKSPACE_NOTIFICATIONS_URL}/read-all`,
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "Notifications", id: "WORKSPACE-LIST" },
        { type: "Notifications", id: "WORKSPACE-SUMMARY" },
      ],
    }),

    getCustomerNotifications: builder.query({
      query: (params = {}) => ({
        url: CUSTOMER_NOTIFICATIONS_URL,
        params,
      }),
      providesTags: (result) =>
        provideNotificationListTags(result, "CUSTOMER-LIST", "CUSTOMER-"),
    }),

    getCustomerNotificationSummary: builder.query({
      query: () => ({
        url: `${CUSTOMER_NOTIFICATIONS_URL}/summary`,
      }),
      providesTags: [{ type: "Notifications", id: "CUSTOMER-SUMMARY" }],
    }),

    markCustomerNotificationRead: builder.mutation({
      query: (notificationId) => ({
        url: `${CUSTOMER_NOTIFICATIONS_URL}/${encodeURIComponent(
          String(notificationId),
        )}/read`,
        method: "PATCH",
      }),
      invalidatesTags: (_result, _error, notificationId) => [
        customerNotificationTag(notificationId),
        { type: "Notifications", id: "CUSTOMER-LIST" },
        { type: "Notifications", id: "CUSTOMER-SUMMARY" },
      ],
    }),

    markAllCustomerNotificationsRead: builder.mutation({
      query: (body = {}) => ({
        url: `${CUSTOMER_NOTIFICATIONS_URL}/read-all`,
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "Notifications", id: "CUSTOMER-LIST" },
        { type: "Notifications", id: "CUSTOMER-SUMMARY" },
      ],
    }),
  }),
});

export const {
  useGetWorkspaceNotificationsQuery,
  useGetWorkspaceNotificationSummaryQuery,
  useMarkWorkspaceNotificationReadMutation,
  useMarkAllWorkspaceNotificationsReadMutation,
  useGetCustomerNotificationsQuery,
  useGetCustomerNotificationSummaryQuery,
  useMarkCustomerNotificationReadMutation,
  useMarkAllCustomerNotificationsReadMutation,
} = notificationsApiSlice;
