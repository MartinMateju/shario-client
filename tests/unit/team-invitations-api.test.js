import { describe, expect, it, vi } from "vitest";

const { definitions } = vi.hoisted(() => ({ definitions: {} }));
vi.mock("@/lib/features/api/apiSlice", () => ({
  apiSlice: {
    injectEndpoints: ({ endpoints }) => {
      Object.assign(
        definitions,
        endpoints({ query: (value) => value, mutation: (value) => value }),
      );
      return {};
    },
  },
}));
import "@/lib/features/workspace-access/teamInvitationsApiSlice";

describe("team invitation transport", () => {
  it("keeps token verification in uncached anonymous POST bodies", () => {
    expect(definitions.previewTeamInvitation.query("private-token")).toEqual({
      url: "/auth/team-invitations/preview",
      method: "POST",
      body: { token: "private-token" },
      credentials: "omit",
      cache: "no-store",
    });
    const body = { token: "private-token", password: "ExistingPass1" };
    expect(definitions.acceptTeamInvitation.query(body)).toEqual({
      url: "/auth/team-invitations/accept",
      method: "POST",
      body,
      credentials: "omit",
      cache: "no-store",
    });
  });

  it("uses the tenant-scoped invitation resources and refreshes pending invitations after each mutation", () => {
    expect(definitions.getWorkspaceInvitations.query()).toBe(
      "/tenants/current/access/invitations",
    );
    const invitation = {
      email: "ada@example.test",
      roleKey: "viewer",
      locationAccess: { mode: "selected", locationIds: ["alpha"] },
      locale: "cs",
    };
    expect(definitions.createWorkspaceInvitation.query(invitation)).toEqual({
      url: "/tenants/current/access/invitations",
      method: "POST",
      body: invitation,
    });
    expect(
      definitions.resendWorkspaceInvitation.query({
        id: "invite/id",
        locale: "cs",
      }),
    ).toEqual({
      url: "/tenants/current/access/invitations/invite%2Fid/resend",
      method: "POST",
      body: { locale: "cs" },
    });
    expect(definitions.revokeWorkspaceInvitation.query("invite/id")).toEqual({
      url: "/tenants/current/access/invitations/invite%2Fid",
      method: "DELETE",
    });
    expect(
      definitions.sendWorkspaceSignInInvitation.query({
        membershipId: "member/id",
        locale: "en",
      }),
    ).toEqual({
      url: "/tenants/current/access/team/member%2Fid/invitation",
      method: "POST",
      body: { locale: "en" },
    });
    for (const name of [
      "createWorkspaceInvitation",
      "resendWorkspaceInvitation",
      "revokeWorkspaceInvitation",
      "sendWorkspaceSignInInvitation",
    ]) {
      expect(definitions[name].invalidatesTags).toContainEqual({
        type: "WorkspaceTeam",
        id: "INVITATIONS",
      });
    }
  });
});
