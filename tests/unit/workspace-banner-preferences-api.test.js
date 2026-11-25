import { beforeEach, describe, expect, it, vi } from "vitest";

import { workspaceAccessApiSlice } from "@/lib/features/workspace-access/workspaceAccessApiSlice";

vi.mock("@/lib/features/api/apiSlice", () => ({
  apiSlice: {
    injectEndpoints: ({ endpoints }) => ({
      endpoints: endpoints({
        query: (definition) => definition,
        mutation: (definition) => definition,
      }),
    }),
  },
}));

const mutation = workspaceAccessApiSlice.endpoints.updateWorkspacePreferences;
const createState = (overrides = {}) => ({
  auth: {
    authContext: "workspace",
    token: "workspace-token",
    sessionEpoch: 3,
    sessionBoundaryEpoch: 2,
    userInfo: { id: "user-one", membershipId: "membership-one" },
    tenant: { id: "studio-one", slug: "clay-studio" },
    ...overrides,
  },
});

const access = {
  tenantId: "studio-one",
  userId: "user-one",
  membershipId: "membership-one",
  preferences: { emailReadyBannerDismissed: true },
};

describe("workspace banner preference API", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(["emailReadyBannerDismissed", "overviewAttentionDismissed"])(
    "saves %s through the current member preference endpoint",
    (preference) => {
      expect(mutation.query({ [preference]: true })).toEqual({
        url: "/tenants/current/access/me/preferences",
        method: "PATCH",
        body: { [preference]: true },
      });
    },
  );

  it("applies a successful dismissal response to the current workspace access", async () => {
    const dispatch = vi.fn();
    await mutation.onQueryStarted(
      { emailReadyBannerDismissed: true },
      {
        dispatch,
        getState: () => createState(),
        queryFulfilled: Promise.resolve({ data: { workspaceAccess: access } }),
      },
    );
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({
      type: "auth/setWorkspaceAccess",
      payload: access,
    });
  });

  it.each([
    ["logout", { token: null, userInfo: null, sessionBoundaryEpoch: 3 }],
    ["another user", { userInfo: { id: "user-two" } }],
    ["another tenant", { tenant: { id: "studio-two" } }],
    [
      "another membership",
      { userInfo: { id: "user-one", membershipId: "membership-two" } },
    ],
    ["customer audience", { authContext: "customer" }],
    ["a new session for the same user", { sessionBoundaryEpoch: 4 }],
  ])(
    "ignores a late dismissal success after %s",
    async (_scenario, nextAuth) => {
      for (const data of [{ workspaceAccess: access }, {}]) {
        let state = createState();
        let resolveRequest;
        const dispatch = vi.fn();
        const finished = mutation.onQueryStarted(
          { emailReadyBannerDismissed: true },
          {
            dispatch,
            getState: () => state,
            queryFulfilled: new Promise((resolve) => {
              resolveRequest = resolve;
            }),
          },
        );
        state = createState(nextAuth);
        resolveRequest({ data });
        await finished;
        expect(dispatch).not.toHaveBeenCalled();
      }
    },
  );

  it("accepts token rotation for the same signed-in member", async () => {
    let state = createState();
    let resolveRequest;
    const dispatch = vi.fn();
    const finished = mutation.onQueryStarted(
      { emailReadyBannerDismissed: true },
      {
        dispatch,
        getState: () => state,
        queryFulfilled: new Promise((resolve) => {
          resolveRequest = resolve;
        }),
      },
    );
    state = createState({ token: "rotated-token", sessionEpoch: 4 });
    resolveRequest({ data: { workspaceAccess: access } });
    await finished;
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({
      type: "auth/setWorkspaceAccess",
      payload: access,
    });
  });

  it("does not update workspace access when persistence fails", async () => {
    const dispatch = vi.fn();
    await mutation.onQueryStarted(
      { overviewAttentionDismissed: true },
      {
        dispatch,
        getState: () => createState(),
        queryFulfilled: Promise.reject(new Error("Offline")),
      },
    );
    expect(dispatch).not.toHaveBeenCalled();
  });
});
