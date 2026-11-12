import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TeamMemberDialog } from "@/components/views/team/TeamSettingsPage";
import TeamInvitationsPanel, {
  canManageInvitation,
} from "@/components/views/team/TeamInvitationsPanel";
import messages from "@/messages/en.json";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  resend: vi.fn(),
  revoke: vi.fn(),
  invitations: [],
  close: vi.fn(),
  saved: vi.fn(),
  delivery: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/components/setup-center/useGuidedSetupStep", () => ({
  default: () => ({ guided: false }),
}));
vi.mock("@/lib/features/locations/locationApiSlice", () => ({
  useGetLocationsQuery: () => ({}),
}));
vi.mock("@/lib/features/workspace-access/workspaceAccessApiSlice", () => ({
  useDeleteWorkspaceTeamMemberMutation: () => [vi.fn(), {}],
  useGetWorkspaceRolesQuery: () => ({}),
  useGetWorkspaceTeamQuery: () => ({}),
  useUpdateWorkspaceTeamMemberMutation: () => [
    (body) => ({ unwrap: () => mocks.update(body) }),
    { isLoading: false },
  ],
}));
vi.mock("@/lib/features/workspace-access/teamInvitationsApiSlice", async () => {
  const { useState } = await import("react");
  return {
    useCreateWorkspaceInvitationMutation: () => {
      const [isLoading, setLoading] = useState(false);
      return [
        (body) => {
          setLoading(true);
          return {
            unwrap: () => mocks.create(body).finally(() => setLoading(false)),
          };
        },
        { isLoading },
      ];
    },
    useSendWorkspaceSignInInvitationMutation: () => [vi.fn(), {}],
    useGetWorkspaceInvitationsQuery: () => ({
      data: { invitations: mocks.invitations },
    }),
    useResendWorkspaceInvitationMutation: () => [
      (body) => ({ unwrap: () => mocks.resend(body) }),
      {},
    ],
    useRevokeWorkspaceInvitationMutation: () => [
      (id) => ({ unwrap: () => mocks.revoke(id) }),
      {},
    ],
  };
});
const wrap = (children) =>
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {children}
    </NextIntlClientProvider>,
  );
const dialog = (props = {}) =>
  wrap(
    <TeamMemberDialog
      open
      locations={[
        { id: "64a000000000000000000001", name: "Alpha studio" },
        { id: "64a000000000000000000002", name: "Beta studio" },
      ]}
      roles={[
        { key: "owner", name: "Owner", isBuiltIn: true },
        { key: "viewer", name: "Viewer", isBuiltIn: true },
      ]}
      canManageOwners
      canGrantAllLocations
      onClose={mocks.close}
      onSaved={mocks.saved}
      {...props}
    />,
  );
const invitation = {
  id: "invite-1",
  email: "ada@example.test",
  status: "pending",
  roleKey: "viewer",
  roleName: "Viewer",
  deliveryStatus: "failed",
  expiresAt: "2030-01-01T12:00:00Z",
  locationAccess: {
    mode: "selected",
    locationIds: ["64a000000000000000000001"],
  },
};
beforeEach(() => {
  mocks.create.mockReset().mockResolvedValue({ invitation });
  mocks.update.mockReset().mockResolvedValue({});
  mocks.resend.mockReset().mockResolvedValue({
    invitation: { ...invitation, deliveryStatus: "sent" },
  });
  mocks.revoke.mockReset().mockResolvedValue({ revoked: true });
  mocks.close.mockReset();
  mocks.saved.mockReset();
  mocks.delivery.mockReset();
  mocks.invitations = [invitation];
});

describe("team invitation editor", () => {
  it("invites by email with the chosen role/location and reports actual delivery outcome", async () => {
    dialog();
    const email = screen.getByRole("textbox", { name: "Email address" });
    expect(email).toHaveAccessibleDescription(
      messages.TeamSettings.editor.existingUserHint,
    );
    fireEvent.change(email, { target: { value: "Ada@Example.TEST" } });
    const role = screen.getByRole("combobox", {
      name: messages.TeamSettings.editor.role,
    });
    expect(
      within(role).queryByRole("option", { name: "Owner" }),
    ).not.toBeInTheDocument();
    fireEvent.change(role, { target: { value: "viewer" } });
    fireEvent.click(
      screen.getByRole("radio", {
        name: messages.TeamSettings.editor.locationModes.selected,
      }),
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Alpha studio" }));
    fireEvent.click(screen.getByRole("button", { name: "Send invitation" }));
    await waitFor(() =>
      expect(mocks.saved).toHaveBeenCalledWith({ invitation }),
    );
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "ada@example.test",
        roleKey: "viewer",
        locale: "en",
        locationAccess: {
          mode: "selected",
          locationIds: ["64a000000000000000000001"],
        },
      }),
    );
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.close).toHaveBeenCalledTimes(1);
  });

  it("keeps actions outside the scrolling fields and locks dismissal during submission", async () => {
    let reject;
    mocks.create.mockImplementationOnce(
      () =>
        new Promise((_resolve, fail) => {
          reject = fail;
        }),
    );
    dialog();
    const form = screen.getByTestId("team-member-form");
    const body = form.querySelector("[data-team-editor-body]");
    const actions = form.querySelector("[data-team-editor-actions]");
    expect(body).not.toContainElement(actions);
    fireEvent.change(screen.getByRole("textbox", { name: "Email address" }), {
      target: { value: "ada@example.test" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send invitation" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Send invitation" }),
      ).toBeDisabled(),
    );
    expect(
      screen.getByRole("button", { name: messages.TeamSettings.editor.close }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", {
        name: messages.TeamSettings.actions.cancel,
      }),
    ).toBeDisabled();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(mocks.saved).not.toHaveBeenCalled();
    expect(mocks.close).not.toHaveBeenCalled();
    await act(async () =>
      reject({ data: { error: { code: "RATE_LIMITED" } } }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      messages.TeamSettings.editor.errors.request,
    );
    expect(screen.getByRole("textbox", { name: "Email address" })).toHaveValue(
      "ada@example.test",
    );
    expect(
      screen.getByRole("button", { name: "Send invitation" }),
    ).toBeEnabled();
  });

  it("does not allow an empty selected-location grant", async () => {
    dialog();
    fireEvent.change(screen.getByRole("textbox", { name: "Email address" }), {
      target: { value: "ada@example.test" },
    });
    fireEvent.click(
      screen.getByRole("radio", {
        name: messages.TeamSettings.editor.locationModes.selected,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Send invitation" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      messages.TeamSettings.editor.errors.locationRequired,
    );
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("keeps existing membership editing on the update endpoint", async () => {
    dialog({
      membership: {
        id: "member-1",
        roleKey: "viewer",
        user: { email: "ada@example.test" },
        status: "active",
        locationAccess: {
          mode: "selected",
          locationIds: ["64a000000000000000000001"],
        },
      },
    });
    expect(
      screen.queryByRole("textbox", { name: "Email address" }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: messages.TeamSettings.actions.save }),
    );
    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledWith(
        expect.objectContaining({
          membershipId: "member-1",
          roleKey: "viewer",
          status: "active",
          locationAccess: {
            mode: "selected",
            locationIds: ["64a000000000000000000001"],
          },
        }),
      ),
    );
    expect(mocks.create).not.toHaveBeenCalled();
  });
});

describe("pending invitations", () => {
  const panel = () =>
    wrap(
      <TeamInvitationsPanel
        access={{ locationAccess: { mode: "all" } }}
        canManageOwners
        onDelivery={mocks.delivery}
      />,
    );
  it("shows failed delivery honestly and permits a real resend", async () => {
    panel();
    expect(screen.getByText(/Email failed/)).toBeVisible();
    expect(screen.queryByText(/Email sent/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Resend" }));
    await waitFor(() =>
      expect(mocks.delivery).toHaveBeenCalledWith(
        expect.objectContaining({ deliveryStatus: "sent" }),
      ),
    );
    expect(mocks.resend).toHaveBeenCalledWith({ id: "invite-1", locale: "en" });
  });
  it("revokes only after confirmation and never presents accepted invitations as pending", async () => {
    mocks.invitations.push({
      ...invitation,
      id: "accepted",
      status: "accepted",
      email: "accepted@example.test",
    });
    const confirm = vi
      .spyOn(window, "confirm")
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    panel();
    expect(screen.queryByText("accepted@example.test")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Revoke" }));
    expect(mocks.revoke).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Revoke" }));
    await screen.findByText("Invitation revoked.");
    expect(confirm).toHaveBeenCalledWith(
      "Revoke the invitation for ada@example.test?",
    );
    expect(mocks.revoke).toHaveBeenCalledWith("invite-1");
  });
  it.each([
    ["TEAM_INVITATION_RESEND_TOO_SOON", "resendTooSoon"],
    ["TEAM_INVITATION_RATE_LIMITED", "rateLimited"],
  ])(
    "explains the waiting period for %s without claiming delivery",
    async (code, copy) => {
      mocks.resend.mockRejectedValueOnce({ status: 429, data: { code } });
      panel();
      fireEvent.click(screen.getByRole("button", { name: "Resend" }));
      expect(await screen.findByRole("alert")).toHaveTextContent(
        messages.TeamSettings.invitations.errors[copy],
      );
      expect(mocks.delivery).not.toHaveBeenCalled();
    },
  );
  it("never presents management actions outside the actor's location or owner scope", () => {
    const access = {
      locationAccess: {
        mode: "selected",
        locationIds: ["64a000000000000000000001"],
      },
    };
    expect(canManageInvitation(invitation, access, false)).toBe(true);
    expect(
      canManageInvitation(
        { ...invitation, locationAccess: { mode: "all" } },
        access,
        false,
      ),
    ).toBe(false);
    expect(
      canManageInvitation(
        {
          ...invitation,
          locationAccess: {
            mode: "selected",
            locationIds: ["64a000000000000000000002"],
          },
        },
        access,
        false,
      ),
    ).toBe(false);
    expect(
      canManageInvitation({ ...invitation, roleKey: "owner" }, access, false),
    ).toBe(false);
  });
});
