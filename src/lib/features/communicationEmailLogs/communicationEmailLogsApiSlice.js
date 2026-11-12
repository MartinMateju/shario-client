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
  }),
});
export const { useGetCommunicationEmailLogsQuery } =
  communicationEmailLogsApiSlice;
