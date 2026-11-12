import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeamInvitationPage from "@/components/auth/TeamInvitationPage";
import messages from "@/messages/en.json";

const mocks = vi.hoisted(() => ({
  preview: vi.fn(),
  accept: vi.fn(),
  login: vi.fn(),
  redirect: vi.fn(),
  invitation: {},
  token: "opaque-invitation-token",
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams({ token: mocks.token }),
}));
vi.mock("react-redux", () => ({ useSelector: () => true }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, ...props }) => <a {...props}>{children}</a>,
}));
vi.mock("@/components/auth/platformAuthRouting", () => ({
  getPostLoginUrl: (...args) => mocks.redirect(...args),
}));
vi.mock("@/lib/features/workspace-access/teamInvitationsApiSlice", async () => {
  const { useCallback, useState } = await import("react");
  return {
    usePreviewTeamInvitationMutation: () => {
      const preview = useCallback((token) => {
        mocks.preview(token);
        return {
          unwrap: async () => {
            if (!mocks.invitation) throw { status: 400 };
            return { invitation: mocks.invitation };
          },
        };
      }, []);
      return [preview, {}];
    },
    useAcceptTeamInvitationMutation: () => {
      const [isLoading, setLoading] = useState(false);
      return [
        (body) => {
          setLoading(true);
          return {
            unwrap: () => mocks.accept(body).finally(() => setLoading(false)),
          };
        },
        { isLoading },
      ];
    },
  };
});
vi.mock("@/lib/features/auth/authApiSlice", () => ({
  useLoginMutation: () => [
    (body) => ({ unwrap: () => mocks.login(body) }),
    { isLoading: false },
  ],
}));

const renderPage = () =>
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <TeamInvitationPage />
    </NextIntlClientProvider>,
  );
const change = (label, value) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const newAccountForm = async () => {
  await screen.findByRole("heading", { name: "Join the team" });
  change("First name", " Ada ");
  change("Last name", " Maker ");
  change("New password", "StudioPass1");
  change("Confirm new password", "StudioPass1");
};

beforeEach(() => {
  mocks.token = "opaque-invitation-token";
  window.history.replaceState(
    null,
    "",
    "/en/team-invitation?token=opaque-invitation-token",
  );
  mocks.invitation = {
    tenantName: "Studio Alpha",
    tenantSlug: "preview-studio",
    email: "ada@example.test",
    roleKey: "viewer",
    roleName: "Viewer",
    mode: "join",
    accountExists: false,
    requiresPasswordReset: false,
    locationAccess: { mode: "selected" },
    locations: [{ id: "alpha", name: "Alpha studio" }],
  };
  mocks.preview.mockReset();
  mocks.accept.mockReset().mockResolvedValue({
    accepted: true,
    tenantSlug: "server-studio",
    email: "canonical@example.test",
    membershipId: "member-1",
  });
  mocks.login.mockReset().mockResolvedValue({
    tenant: { slug: "server-studio" },
    authContext: "workspace",
    workspaceAccess: { roleKey: "viewer" },
  });
  mocks.redirect.mockReset().mockReturnValue("#workspace");
});

describe("team invitation acceptance", () => {
  it("creates only after explicit valid submission, then uses normal login and the accepted identity", async () => {
    renderPage();
    await newAccountForm();
    expect(mocks.accept).not.toHaveBeenCalled();
    expect(screen.getByText("Alpha studio")).toBeVisible();
    expect(screen.getByLabelText("First name")).toHaveAttribute(
      "maxlength",
      "80",
    );
    expect(screen.getByLabelText("New password")).toHaveAttribute(
      "maxlength",
      "128",
    );
    change("Confirm new password", "different1");
    fireEvent.click(screen.getByRole("button", { name: "Accept invitation" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      messages.PlatformAuth.register.validation.passwordMismatch,
    );
    expect(mocks.accept).not.toHaveBeenCalled();
    change("Confirm new password", "StudioPass1");
    fireEvent.click(screen.getByRole("button", { name: "Accept invitation" }));
    await waitFor(() =>
      expect(mocks.login).toHaveBeenCalledWith({
        tenantSlug: "server-studio",
        email: "canonical@example.test",
        password: "StudioPass1",
      }),
    );
    expect(mocks.accept).toHaveBeenCalledWith({
      token: mocks.token,
      password: "StudioPass1",
      firstname: "Ada",
      lastname: "Maker",
    });
    expect(mocks.redirect).toHaveBeenCalledWith(
      expect.objectContaining({ authContext: "workspace", locale: "en" }),
    );
    expect(window.location.search).not.toContain("token");
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it("requires the existing password and never submits replacement names or a new password", async () => {
    mocks.invitation.accountExists = true;
    mocks.accept.mockRejectedValueOnce({ status: 401 });
    renderPage();
    await screen.findByLabelText("Current password");
    expect(screen.queryByLabelText("First name")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
    change("Current password", "wrong");
    fireEvent.click(screen.getByRole("button", { name: "Accept invitation" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      messages.PlatformAuth.login.errors.incorrectCredentials,
    );
    expect(mocks.login).not.toHaveBeenCalled();
    expect(window.location.search).toContain("token=");
    change("Current password", "ExistingPass1");
    fireEvent.click(screen.getByRole("button", { name: "Accept invitation" }));
    await waitFor(() => expect(mocks.login).toHaveBeenCalledTimes(1));
    expect(mocks.accept).toHaveBeenLastCalledWith({
      token: mocks.token,
      password: "ExistingPass1",
    });
  });

  it("retries only normal login after acceptance has consumed the token", async () => {
    mocks.login.mockRejectedValueOnce({ status: 503 });
    renderPage();
    await newAccountForm();
    fireEvent.click(screen.getByRole("button", { name: "Accept invitation" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      messages.TeamInvitation.loginRetry,
    );
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(mocks.login).toHaveBeenCalledTimes(2));
    expect(mocks.accept).toHaveBeenCalledTimes(1);
    expect(mocks.login).toHaveBeenLastCalledWith({
      tenantSlug: "server-studio",
      email: "canonical@example.test",
      password: "StudioPass1",
    });
  });

  it("re-previews after password recovery so the existing account can continue safely", async () => {
    mocks.invitation.accountExists = true;
    mocks.invitation.requiresPasswordReset = true;
    renderPage();
    const reset = await screen.findByRole("link", {
      name: "Reset password (opens a new tab)",
    });
    expect(reset).toHaveAttribute("target", "_blank");
    expect(reset).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.queryByLabelText("Current password")).not.toBeInTheDocument();
    mocks.invitation = { ...mocks.invitation, requiresPasswordReset: false };
    fireEvent.click(
      screen.getByRole("button", { name: "I have set my password" }),
    );
    await screen.findByLabelText("Current password");
    expect(mocks.preview).toHaveBeenCalledTimes(2);
    expect(mocks.accept).not.toHaveBeenCalled();
  });

  it("keeps a pending acceptance disabled and never logs in before it succeeds", async () => {
    let resolve;
    mocks.accept.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    renderPage();
    await newAccountForm();
    fireEvent.click(screen.getByRole("button", { name: "Accept invitation" }));
    expect(
      await screen.findByRole("button", { name: "Please wait…" }),
    ).toBeDisabled();
    expect(screen.getByLabelText("New password")).toBeDisabled();
    expect(mocks.login).not.toHaveBeenCalled();
    await act(async () =>
      resolve({
        accepted: true,
        tenantSlug: "alpha",
        email: "ada@example.test",
      }),
    );
    await waitFor(() => expect(mocks.login).toHaveBeenCalledTimes(1));
  });

  it("shows invalid links without an acceptance form or an automatic sign-in", async () => {
    mocks.invitation = null;
    renderPage();
    await screen.findByRole("heading", { name: "Invitation unavailable" });
    expect(
      screen.queryByRole("button", { name: "Accept invitation" }),
    ).not.toBeInTheDocument();
    expect(mocks.accept).not.toHaveBeenCalled();
    expect(mocks.login).not.toHaveBeenCalled();
  });
});
