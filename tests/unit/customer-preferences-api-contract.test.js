import { beforeEach, describe, expect, it, vi } from "vitest";

import { workspaceAccessApiSlice } from "@/lib/features/workspace-access/workspaceAccessApiSlice";

const mocks = vi.hoisted(() => ({
  updateQueryData: vi.fn((endpoint, scope, update) => ({
    type: "test/updateQueryData",
    endpoint,
    scope,
    update,
  })),
}));

vi.mock("@/lib/features/api/apiSlice", () => ({
  apiSlice: {
    util: { updateQueryData: mocks.updateQueryData },
    injectEndpoints: ({ endpoints }) => ({
      endpoints: endpoints({
        query: (definition) => definition,
        mutation: (definition) => definition,
      }),
    }),
  },
}));

const mutation = workspaceAccessApiSlice.endpoints.updateCustomerPreferences;

const createState = (overrides = {}) => ({
  auth: {
    authContext: "customer",
    token: "customer-token",
    sessionEpoch: 3,
    sessionBoundaryEpoch: 2,
    userInfo: { id: "customer-1" },
    tenant: { id: "studio-1", slug: "clay-studio" },
    ...overrides,
  },
});

describe("customer account preference API contract", () => {
  beforeEach(() => vi.clearAllMocks());
  it("saves appearance without clearing the independently saved language", () => {
    const portalAppearance = { backgroundColor: "#111827", textColor: "" };
    expect(mutation.query({ portalAppearance, role: "admin" })).toEqual({
      url: "/account/customer-preferences",
      method: "PATCH",
      body: { portalAppearance },
    });
  });

  it.each(["cs", "en", null])(
    "sends %s only to the customer preference endpoint",
    (defaultLanguage) => {
      expect(
        mutation.query({
          defaultLanguage,
          language: "nl",
          defaultLocation: "workspace-location",
        }),
      ).toEqual({
        url: "/account/customer-preferences",
        method: "PATCH",
        body: { defaultLanguage },
      });
    },
  );

  it("retains the saved account preference and refreshes account and user caches", () => {
    const account = { id: "customer-1", customerDefaultLanguage: "cs" };
    expect(mutation.transformResponse({ account })).toEqual({ account });
    expect(mutation.invalidatesTags).toEqual([
      { type: "Account", id: "CURRENT" },
      { type: "User", id: "CURRENT" },
    ]);
  });

  it("updates the current user only after a successful response", async () => {
    const account = { id: "customer-1", customerDefaultLanguage: null };
    const dispatch = vi.fn();
    await mutation.onQueryStarted(
      { defaultLanguage: null },
      {
        dispatch,
        getState: () => createState(),
        queryFulfilled: Promise.resolve({ data: { account } }),
      },
    );
    expect(dispatch).toHaveBeenNthCalledWith(2, {
      type: "auth/updateCurrentUser",
      payload: account,
    });
  });

  it("updates the current account cache immediately from a saved colour reset", async () => {
    const portalAppearance = { backgroundColor: "", textColor: "" };
    const account = { id: "customer-1", portalAppearance };
    const dispatch = vi.fn();
    await mutation.onQueryStarted(
      { portalAppearance },
      {
        dispatch,
        getState: () => createState(),
        queryFulfilled: Promise.resolve({ data: { account } }),
      },
    );
    expect(mocks.updateQueryData).toHaveBeenCalledExactlyOnceWith(
      "getAccount",
      { customerId: "customer-1", tenantId: "studio-1" },
      expect.any(Function),
    );
    const update = mocks.updateQueryData.mock.lastCall[2];
    const cached = {
      account: {
        id: "customer-1",
        firstname: "Customer",
        portalAppearance: { backgroundColor: "#000000" },
      },
    };
    update(cached);
    expect(cached.account).toEqual({
      id: "customer-1",
      firstname: "Customer",
      portalAppearance,
    });
    const wrongAccount = {
      account: {
        id: "customer-2",
        portalAppearance: { backgroundColor: "#FF0000" },
      },
    };
    update(wrongAccount);
    expect(wrongAccount.account.portalAppearance.backgroundColor).toBe(
      "#FF0000",
    );
    expect(dispatch.mock.calls[0][0].type).toBe("test/updateQueryData");
  });

  it("ignores a response for another account even within the current session", async () => {
    const dispatch = vi.fn();
    await mutation.onQueryStarted(
      { portalAppearance: {} },
      {
        dispatch,
        getState: () => createState(),
        queryFulfilled: Promise.resolve({
          data: { account: { id: "customer-2" } },
        }),
      },
    );
    expect(dispatch).not.toHaveBeenCalled();
    expect(mocks.updateQueryData).not.toHaveBeenCalled();
  });

  it("does not modify the current user when saving fails", async () => {
    const dispatch = vi.fn();
    await mutation.onQueryStarted(
      { defaultLanguage: "en" },
      {
        dispatch,
        getState: () => createState(),
        queryFulfilled: Promise.reject(new Error("Request failed")),
      },
    );
    expect(dispatch).not.toHaveBeenCalled();
  });

  it.each([
    ["logout", { token: null, userInfo: null, sessionBoundaryEpoch: 3 }],
    ["another customer", { userInfo: { id: "customer-2" } }],
    ["another tenant", { tenant: { id: "studio-2", slug: "other-studio" } }],
    ["workspace audience", { authContext: "workspace" }],
    ["logout and login as the same customer", { sessionBoundaryEpoch: 4 }],
  ])("ignores a late success after %s", async (_scenario, nextAuth) => {
    let state = createState();
    let resolveRequest;
    const dispatch = vi.fn();
    const finished = mutation.onQueryStarted(
      { defaultLanguage: "en" },
      {
        dispatch,
        getState: () => state,
        queryFulfilled: new Promise((resolve) => {
          resolveRequest = resolve;
        }),
      },
    );
    state = createState(nextAuth);
    resolveRequest({
      data: { account: { id: "customer-1", customerDefaultLanguage: "en" } },
    });
    await finished;
    expect(dispatch).not.toHaveBeenCalled();
    expect(mocks.updateQueryData).not.toHaveBeenCalled();
  });

  it("accepts a response after token rotation for the same session principal", async () => {
    let state = createState();
    let resolveRequest;
    const dispatch = vi.fn();
    const account = { id: "customer-1", customerDefaultLanguage: "en" };
    const finished = mutation.onQueryStarted(
      { defaultLanguage: "en" },
      {
        dispatch,
        getState: () => state,
        queryFulfilled: new Promise((resolve) => {
          resolveRequest = resolve;
        }),
      },
    );
    state = createState({ token: "rotated-token", sessionEpoch: 4 });
    resolveRequest({ data: { account } });
    await finished;
    expect(dispatch).toHaveBeenNthCalledWith(2, {
      type: "auth/updateCurrentUser",
      payload: account,
    });
  });
});
