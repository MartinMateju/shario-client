import { apiSlice } from "../api/apiSlice";
export const communicationEmailLogsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCommunicationEmailLogs: builder.query({
      query: ({ status = "all", search = "", page = 1, limit = 50 } = {}) => ({
        url: "/communication-email-logs",
        method: "GET",
        params: {
          status,
          search,
          page,
          limit,
        },
      }),
      providesTags: ["CommunicationEmailLogs"],
    }),
    retryCommunicationEmailLog: builder.mutation({
      query: ({ id, expectedManualRetryCount }) => ({
        url: `/communication-email-logs/${id}/retry`,
        method: "POST",
        body: { expectedManualRetryCount },
      }),
      invalidatesTags: (result, error) =>
        result ||
        [
          "COMMUNICATION_EMAIL_RETRY_BLOCKED",
          "COMMUNICATION_EMAIL_RETRY_STALE",
        ].includes(error?.data?.code)
          ? ["CommunicationEmailLogs"]
          : [],
    }),
  }),
});

export const {
  useGetCommunicationEmailLogsQuery,
  useRetryCommunicationEmailLogMutation,
} = communicationEmailLogsApiSlice;
