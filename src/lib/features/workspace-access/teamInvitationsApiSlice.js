import { apiSlice } from "@/lib/features/api/apiSlice";

const INVITATIONS_URL = "/tenants/current/access/invitations";
const invitationsTag = { type: "WorkspaceTeam", id: "INVITATIONS" };
const invitationId = (id) => encodeURIComponent(String(id));

export const teamInvitationsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getWorkspaceInvitations: builder.query({
      query: () => INVITATIONS_URL,
      providesTags: [invitationsTag],
    }),
    createWorkspaceInvitation: builder.mutation({
      query: (body) => ({ url: INVITATIONS_URL, method: "POST", body }),
      invalidatesTags: [invitationsTag, "SetupCenter"],
    }),
    resendWorkspaceInvitation: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `${INVITATIONS_URL}/${invitationId(id)}/resend`,
        method: "POST",
        body,
      }),
      invalidatesTags: [invitationsTag],
    }),
    revokeWorkspaceInvitation: builder.mutation({
      query: (id) => ({
        url: `${INVITATIONS_URL}/${invitationId(id)}`,
        method: "DELETE",
      }),
      invalidatesTags: [invitationsTag],
    }),
    sendWorkspaceSignInInvitation: builder.mutation({
      query: ({ membershipId, ...body }) => ({
        url: `/tenants/current/access/team/${invitationId(membershipId)}/invitation`,
        method: "POST",
        body,
      }),
      invalidatesTags: [invitationsTag],
    }),
    previewTeamInvitation: builder.mutation({
      query: (token) => ({
        url: "/auth/team-invitations/preview",
        method: "POST",
        body: { token },
        credentials: "omit",
        cache: "no-store",
      }),
    }),
    acceptTeamInvitation: builder.mutation({
      query: (body) => ({
        url: "/auth/team-invitations/accept",
        method: "POST",
        body,
        credentials: "omit",
        cache: "no-store",
      }),
      invalidatesTags: [{ type: "WorkspaceTeam", id: "LIST" }, invitationsTag],
    }),
  }),
});

export const {
  useGetWorkspaceInvitationsQuery,
  useCreateWorkspaceInvitationMutation,
  useResendWorkspaceInvitationMutation,
  useRevokeWorkspaceInvitationMutation,
  useSendWorkspaceSignInInvitationMutation,
  usePreviewTeamInvitationMutation,
  useAcceptTeamInvitationMutation,
} = teamInvitationsApiSlice;
