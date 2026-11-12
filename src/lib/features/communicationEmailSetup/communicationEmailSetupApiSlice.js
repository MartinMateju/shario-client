import { apiSlice } from "../api/apiSlice";

import {
  buildEmailSetupCreateBody,
  buildEmailSetupUpdateBody,
  normalizeEmailSetup,
} from "@/components/communications/email/emailSetup";

const BASE_URL = "/registered-sender-emails";
const SETUP_TAG = "RegisteredSenderEmails";

export const communicationEmailSetupApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCommunicationEmailSetup: builder.query({
      query: () => ({ url: BASE_URL, method: "GET" }),
      transformResponse: normalizeEmailSetup,
      providesTags: [SETUP_TAG],
    }),

    createCommunicationEmailSetup: builder.mutation({
      query: (body) => ({
        url: BASE_URL,
        method: "POST",
        body: buildEmailSetupCreateBody(body),
      }),
      transformResponse: normalizeEmailSetup,
      invalidatesTags: [SETUP_TAG, "SetupCenter"],
    }),

    updateCommunicationEmailSetup: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `${BASE_URL}/${id}`,
        method: "PATCH",
        body: buildEmailSetupUpdateBody(body),
      }),
      transformResponse: normalizeEmailSetup,
      invalidatesTags: [SETUP_TAG, "SetupCenter"],
    }),

    retryCommunicationEmailSetup: builder.mutation({
      query: (id) => ({
        url: `${BASE_URL}/${id}`,
        method: "PATCH",
        body: {},
      }),
      transformResponse: normalizeEmailSetup,
      invalidatesTags: [SETUP_TAG, "SetupCenter"],
    }),

    requestCommunicationReplyToVerification: builder.mutation({
      query: (id) => ({
        url: `${BASE_URL}/${id}/reply-to-verification`,
        method: "POST",
      }),
      invalidatesTags: [SETUP_TAG, "SetupCenter"],
    }),

    confirmCommunicationReplyToVerification: builder.mutation({
      query: ({ id, code }) => ({
        url: `${BASE_URL}/${id}/reply-to-verification/confirm`,
        method: "POST",
        body: { code: String(code ?? "").trim() },
      }),
      invalidatesTags: [SETUP_TAG, "SetupCenter"],
    }),

    testCommunicationEmailSetup: builder.mutation({
      query: (id) => ({
        url: `${BASE_URL}/${id}/test`,
        method: "PATCH",
      }),
      invalidatesTags: [SETUP_TAG],
    }),
  }),
});

export const {
  useGetCommunicationEmailSetupQuery,
  useCreateCommunicationEmailSetupMutation,
  useUpdateCommunicationEmailSetupMutation,
  useRetryCommunicationEmailSetupMutation,
  useRequestCommunicationReplyToVerificationMutation,
  useConfirmCommunicationReplyToVerificationMutation,
  useTestCommunicationEmailSetupMutation,
} = communicationEmailSetupApiSlice;
