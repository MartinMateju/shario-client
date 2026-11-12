// lib/features/communicationAutomations/communicationAutomationsApiSlice.js
import { apiSlice } from "../api/apiSlice";

export const communicationAutomationsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDoorAccessAutomation: builder.query({
      query: () => "/communication-automations/system/door-access",
      providesTags: ["CommunicationAutomations"],
    }),
    updateDoorAccessAutomation: builder.mutation({
      query: (body) => ({
        url: "/communication-automations/system/door-access",
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["CommunicationAutomations", "Location", "SetupCenter"],
    }),
    getCommunicationAutomations: builder.query({
      query: (params = {}) => ({
        url: "/communication-automations",
        params,
      }),
      transformResponse: (response) =>
        Array.isArray(response)
          ? response
          : Array.isArray(response?.automations)
            ? response.automations
            : [],
      providesTags: ["CommunicationAutomations"],
    }),

    createCommunicationAutomation: builder.mutation({
      query: (body) => ({
        url: "/communication-automations",
        method: "POST",
        body,
      }),
      invalidatesTags: ["CommunicationAutomations", "SetupCenter"],
    }),

    updateCommunicationAutomation: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/communication-automations/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["CommunicationAutomations", "SetupCenter"],
    }),

    toggleCommunicationAutomation: builder.mutation({
      query: ({ id, isActive }) => ({
        url: `/communication-automations/${id}`,
        method: "PATCH",
        body: {
          isActive,
          automationStatus: isActive ? "active" : "inactive",
        },
      }),
      async onQueryStarted({ id, isActive }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          communicationAutomationsApiSlice.util.updateQueryData(
            "getCommunicationAutomations",
            {},
            (draft) => {
              const automation = draft.find(
                (item) => (item?._id ?? item?.id) === id,
              );
              if (automation) {
                automation.isActive = isActive;
                automation.automationStatus = isActive ? "active" : "inactive";
              }
            },
          ),
        );

        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: ["CommunicationAutomations", "SetupCenter"],
    }),

    deleteCommunicationAutomation: builder.mutation({
      query: (id) => ({
        url: `/communication-automations/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["CommunicationAutomations", "SetupCenter"],
    }),

    lookupCommunicationRecipient: builder.query({
      query: (search) => `/users/lookup?search=${encodeURIComponent(search)}`,
    }),
  }),
});

export const {
  useGetDoorAccessAutomationQuery,
  useUpdateDoorAccessAutomationMutation,
  useGetCommunicationAutomationsQuery,
  useCreateCommunicationAutomationMutation,
  useUpdateCommunicationAutomationMutation,
  useToggleCommunicationAutomationMutation,
  useDeleteCommunicationAutomationMutation,
  useLazyLookupCommunicationRecipientQuery,
} = communicationAutomationsApiSlice;
