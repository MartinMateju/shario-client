import { configureStore } from "@reduxjs/toolkit";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { NextIntlClientProvider } from "next-intl";
import { StrictMode } from "react";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://invitation-api.test");
});
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("token=fixture-invitation"),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, ...props }) => <a {...props}>{children}</a>,
}));

import TeamInvitationPage from "@/components/auth/TeamInvitationPage";
import { apiSlice } from "@/lib/features/api/apiSlice";
import { authCacheIsolationMiddleware } from "@/lib/features/auth/authCacheIsolationMiddleware";
import authReducer, {
  getAuthCacheIdentity,
  logOut,
  selectIsSessionReady,
  setCredentials,
} from "@/lib/features/auth/authSlice";
import cartReducer from "@/lib/features/cart/cartSlice";
import messages from "@/messages/en.json";
import { server } from "@/test/mocks/server";

const invitation = {
  tenantName: "Studio Alpha",
  tenantSlug: "studio-alpha",
  email: "invitee@example.test",
  roleKey: "viewer",
  roleName: "Viewer",
  mode: "join",
  accountExists: false,
  requiresPasswordReset: false,
  locationAccess: { mode: "all" },
  locations: [],
};
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
const ownerCredentials = () => {
  const encode = (value) =>
    btoa(JSON.stringify(value))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replace(/=+$/, "");
  return {
    accessToken: `${encode({ alg: "none", typ: "JWT" })}.${encode({ UserInfo: { id: "owner-1", authContext: "workspace", tenantId: "tenant-1", tenantRole: "owner", workspaceRole: "owner", membershipId: "member-1", permissions: ["workspace.view"], isOwner: true } })}.fixture-signature`,
    authContext: "workspace",
    user: { id: "owner-1" },
    tenant: { id: "tenant-1", slug: "studio-alpha" },
    workspaceAccess: {
      role: "owner",
      status: "active",
      permissions: ["workspace.view"],
    },
  };
};
const renderPage = ({ strict = false } = {}) => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      cart: cartReducer,
      [apiSlice.reducerPath]: apiSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(
        authCacheIsolationMiddleware,
        apiSlice.middleware,
      ),
  });
  const page = (
    <Provider store={store}>
      <NextIntlClientProvider locale="en" messages={messages}>
        <TeamInvitationPage />
      </NextIntlClientProvider>
    </Provider>
  );
  const view = render(strict ? <StrictMode>{page}</StrictMode> : page);
  return { store, ...view };
};

describe("invitation preview through authenticated session restoration", () => {
  it.each(["before preview completes", "after preview completes"])(
    "keeps the invitation usable when the owner session restores %s",
    async (timing) => {
      const response = deferred();
      const received = vi.fn();
      server.use(
        http.post(
          "http://invitation-api.test/auth/team-invitations/preview",
          async ({ request }) => {
            received(await request.json());
            expect(request.headers.get("authorization")).toBeNull();
            expect(request.credentials).toBe("omit");
            await response.promise;
            return HttpResponse.json({ invitation });
          },
        ),
      );
      const { store } = renderPage();
      await waitFor(() =>
        expect(received).toHaveBeenCalledWith({ token: "fixture-invitation" }),
      );
      const [pendingPreview] = store.dispatch(
        apiSlice.util.getRunningMutationsThunk(),
      );
      expect(getAuthCacheIdentity(store.getState())).toBeNull();
      if (timing === "after preview completes") {
        response.resolve();
        await screen.findByRole("heading", { name: "Join the team" });
        fireEvent.change(screen.getByLabelText("First name"), {
          target: { value: "Ada" },
        });
      }
      await act(async () => store.dispatch(setCredentials(ownerCredentials())));
      expect(getAuthCacheIdentity(store.getState())).toBeTruthy();
      // Keep the security boundary: restoring a different principal still clears
      // the shared API cache; the public invitation page must survive that reset.
      expect(
        store.getState().api.mutations[pendingPreview.requestId],
      ).toBeUndefined();
      if (timing === "before preview completes") {
        await expect(pendingPreview.unwrap()).rejects.toMatchObject({
          name: "AbortError",
        });
        await waitFor(() => expect(received).toHaveBeenCalledTimes(2));
      }
      response.resolve();
      await screen.findByRole("heading", { name: "Join the team" });
      expect(screen.queryByText("Loading invitation…")).not.toBeInTheDocument();
      expect(screen.getByLabelText("New password")).toBeEnabled();
      if (timing === "after preview completes")
        expect(screen.getByLabelText("First name")).toHaveValue("Ada");
      expect(received).toHaveBeenCalledTimes(
        timing === "before preview completes" ? 2 : 1,
      );
    },
  );

  it("retains a failed preview through session restore and retries only when requested", async () => {
    let requests = 0;
    server.use(
      http.post(
        "http://invitation-api.test/auth/team-invitations/preview",
        () => {
          requests += 1;
          return requests === 1
            ? HttpResponse.json(
                { code: "TEMPORARILY_UNAVAILABLE" },
                { status: 503 },
              )
            : HttpResponse.json({ invitation });
        },
      ),
    );
    const { store } = renderPage();
    await screen.findByRole("heading", { name: "Invitation unavailable" });
    await act(async () => store.dispatch(setCredentials(ownerCredentials())));
    expect(store.getState().api.mutations).toEqual({});
    expect(
      screen.getByRole("heading", { name: "Invitation unavailable" }),
    ).toBeVisible();
    expect(requests).toBe(1);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByRole("heading", { name: "Join the team" });
    expect(requests).toBe(2);
  });

  it("ignores an older preview after effect cleanup and a newer successful attempt", async () => {
    const responses = [deferred(), deferred()];
    let requests = 0;
    server.use(
      http.post(
        "http://invitation-api.test/auth/team-invitations/preview",
        async () => {
          const index = requests++;
          await responses[index].promise;
          return index === 0
            ? HttpResponse.json({ code: "OLD_ATTEMPT_FAILED" }, { status: 503 })
            : HttpResponse.json({
                invitation: { ...invitation, tenantName: "Latest studio" },
              });
        },
      ),
    );
    const { store } = renderPage({ strict: true });
    await waitFor(() => expect(requests).toBe(2));
    responses[1].resolve();
    await screen.findByText(
      "Invitation to Latest studio for invitee@example.test.",
    );
    const pending = store.dispatch(apiSlice.util.getRunningMutationsThunk());
    await act(async () => {
      responses[0].resolve();
      await Promise.all(pending);
    });
    // Wait for both actual RTK requests to settle, including the stale error.
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Join the team" }),
      ).toBeVisible(),
    );
    expect(
      screen.getByText("Invitation to Latest studio for invitee@example.test."),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Invitation unavailable" }),
    ).not.toBeInTheDocument();
  });

  it("bounds automatic preview recovery to one abort and then offers a manual retry", async () => {
    const held = deferred();
    let requests = 0;
    server.use(
      http.post(
        "http://invitation-api.test/auth/team-invitations/preview",
        async () => {
          requests += 1;
          if (requests <= 2) await held.promise;
          return HttpResponse.json({ invitation });
        },
      ),
    );
    const { store } = renderPage();
    await waitFor(() => expect(requests).toBe(1));
    await act(async () => store.dispatch(setCredentials(ownerCredentials())));
    await waitFor(() => expect(requests).toBe(2));
    await act(async () => store.dispatch(apiSlice.util.resetApiState()));
    await screen.findByRole("heading", { name: "Invitation unavailable" });
    expect(requests).toBe(2);
    held.resolve();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByRole("heading", { name: "Join the team" });
    expect(requests).toBe(3);
  });

  it("does not duplicate or automatically replay acceptance when an auth reset aborts it", async () => {
    const held = deferred();
    let acceptRequests = 0;
    let loginRequests = 0;
    server.use(
      http.post(
        "http://invitation-api.test/auth/team-invitations/preview",
        () => HttpResponse.json({ invitation }),
      ),
      http.post(
        "http://invitation-api.test/auth/team-invitations/accept",
        async () => {
          acceptRequests += 1;
          await held.promise;
          return HttpResponse.json({
            accepted: true,
            tenantSlug: "studio-alpha",
            email: invitation.email,
            membershipId: "new-member",
          });
        },
      ),
      http.post("http://invitation-api.test/auth", () => {
        loginRequests += 1;
        return HttpResponse.json({}, { status: 500 });
      }),
    );
    const { store, container } = renderPage();
    await act(async () => store.dispatch(logOut({ authContext: "workspace" })));
    await screen.findByRole("heading", { name: "Join the team" });
    for (const [label, value] of [
      ["First name", "Ada"],
      ["Last name", "Maker"],
      ["New password", "StudioPass1"],
      ["Confirm new password", "StudioPass1"],
    ]) {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    }
    const form = container.querySelector("[data-team-invitation-form]");
    fireEvent.submit(form);
    fireEvent.submit(form);
    await waitFor(() => expect(acceptRequests).toBe(1));
    expect(screen.getByRole("button", { name: "Please wait…" })).toBeDisabled();
    await act(async () => store.dispatch(setCredentials(ownerCredentials())));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      messages.TeamInvitation.acceptError,
    );
    expect(
      screen.getByRole("heading", { name: "Join the team" }),
    ).toBeVisible();
    expect(screen.getByLabelText("First name")).toHaveValue("Ada");
    held.resolve();
    expect(acceptRequests).toBe(1);
    expect(loginRequests).toBe(0);
  });

  it.each(["authenticated", "anonymous"])(
    "waits for %s session restoration before submitting acceptance",
    async (audience) => {
      const accept = vi.fn();
      server.use(
        http.post(
          "http://invitation-api.test/auth/team-invitations/preview",
          () => HttpResponse.json({ invitation }),
        ),
        http.post(
          "http://invitation-api.test/auth/team-invitations/accept",
          () => {
            accept();
            return HttpResponse.json(
              { code: "TEST_ACCEPT_REJECTED" },
              { status: 400 },
            );
          },
        ),
      );
      const { store, container } = renderPage();
      await screen.findByRole("heading", { name: "Join the team" });
      for (const [label, value] of [
        ["First name", "Ada"],
        ["Last name", "Maker"],
        ["New password", "StudioPass1"],
        ["Confirm new password", "StudioPass1"],
      ]) {
        fireEvent.change(screen.getByLabelText(label), { target: { value } });
      }
      expect(selectIsSessionReady(store.getState())).toBe(false);
      expect(
        screen.getByRole("button", { name: "Please wait…" }),
      ).toBeDisabled();
      const form = container.querySelector("[data-team-invitation-form]");
      fireEvent.submit(form);
      expect(accept).not.toHaveBeenCalled();
      await act(async () =>
        store.dispatch(
          audience === "authenticated"
            ? setCredentials(ownerCredentials())
            : logOut({ authContext: "workspace" }),
        ),
      );
      expect(selectIsSessionReady(store.getState())).toBe(true);
      expect(screen.getByLabelText("First name")).toHaveValue("Ada");
      expect(
        screen.getByRole("button", { name: "Accept invitation" }),
      ).toBeEnabled();
      fireEvent.submit(form);
      fireEvent.submit(form);
      await screen.findByRole("alert");
      expect(accept).toHaveBeenCalledTimes(1);
    },
  );
});
