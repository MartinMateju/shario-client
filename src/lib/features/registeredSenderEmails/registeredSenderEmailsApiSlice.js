import { apiSlice } from "../api/apiSlice";

export const registeredSenderEmailsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getRegisteredSenderEmails: builder.query({
      query: () => ({
        url: "/registered-sender-emails",
        method: "GET",
      }),
      providesTags: ["RegisteredSenderEmails"],
    }),

    getRegisteredSenderEmailDetails: builder.query({
      query: (id) => ({
        url: `/registered-sender-emails/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [
        { type: "RegisteredSenderEmails", id },
      ],
    }),

    createRegisteredSenderEmail: builder.mutation({
      query: (data) => ({
        url: "/registered-sender-emails",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["RegisteredSenderEmails", "SetupCenter"],
    }),

    testRegisteredSenderEmail: builder.mutation({
      query: (id) => ({
        url: `/registered-sender-emails/${id}/test`,
        method: "PATCH",
      }),
      invalidatesTags: ["RegisteredSenderEmails", "SetupCenter"],
    }),

    deactivateRegisteredSenderEmail: builder.mutation({
      query: (id) => ({
        url: `/registered-sender-emails/${id}/deactivate`,
        method: "PATCH",
      }),
      invalidatesTags: ["RegisteredSenderEmails", "SetupCenter"],
    }),
  }),
});

export const {
  useGetRegisteredSenderEmailsQuery,
  useGetRegisteredSenderEmailDetailsQuery,
  useCreateRegisteredSenderEmailMutation,
  useTestRegisteredSenderEmailMutation,
  useDeactivateRegisteredSenderEmailMutation,
} = registeredSenderEmailsApiSlice;
