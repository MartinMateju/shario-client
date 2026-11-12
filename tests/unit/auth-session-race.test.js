import { configureStore } from "@reduxjs/toolkit";
import { Mutex } from "async-mutex";
import { describe, expect, it, vi } from "vitest";

import {
  createBaseQueryWithReauth,
  shouldSerializeAuthSessionMutation,
} from "@/lib/features/api/apiSlice";
import { AUTH_CONTEXTS } from "@/lib/features/auth/authContext";
import authReducer, {
  beginAuthContextTransition,
  claimAuthRequest,
  logOut,
} from "@/lib/features/auth/authSlice";
import {
  AUTH_REQUEST_RESULTS,
  completeAuthRequest,
  createAuthRequestSnapshot,
  restoreAuthSession,
} from "@/lib/features/auth/authSession";

const encodeTokenSegment = (value) =>
  globalThis
    .btoa(JSON.stringify(value))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");

const buildAccessToken = (userInfo) =>
  [
    encodeTokenSegment({ alg: "none", typ: "JWT" }),
    encodeTokenSegment({ UserInfo: userInfo }),
    "test-signature",
  ].join(".");

const buildSession = (authContext, userId, tokenVersion = "v1") => {
  const isCustomer = authContext === AUTH_CONTEXTS.CUSTOMER;

  return {
    accessToken: buildAccessToken({
      id: userId,
      authContext,
      platformRole: "none",
      tenantRole: isCustomer ? "customer" : "owner",
      tenantId: "tenant-1",
      tokenVersion,
    }),
    authContext,
    tenant: { id: "tenant-1", slug: "studio-olivie" },
    user: { id: userId, email: `${userId}@example.test` },
    workspaceAccess: isCustomer
      ? null
      : { role: "owner", status: "active", permissions: [] },
  };
};

const createDeferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, reject, resolve };
};

const createAuthStore = () =>
  configureStore({
    reducer: { auth: authReducer },
  });

const startRestore = (store, authContext, deferred, getCurrentAuthContext) => {
  store.dispatch(beginAuthContextTransition(authContext));
  const snapshot = createAuthRequestSnapshot(store.getState(), authContext);

  return restoreAuthSession({
    authContext,
    dispatch: store.dispatch,
    getCurrentAuthContext,
    getState: store.getState,
    request: () => deferred.promise,
    snapshot,
  });
};

const completeExplicitLogin = (store, session) => {
  store.dispatch(claimAuthRequest(session.authContext));
  const snapshot = createAuthRequestSnapshot(
    store.getState(),
    session.authContext,
  );

  return completeAuthRequest({
    authContext: session.authContext,
    data: session,
    dispatch: store.dispatch,
    getState: store.getState,
    snapshot,
  });
};

describe("auth request epoch isolation", () => {
  it("serializes every request that can mutate the refresh-session boundary", () => {
    for (const [url, method] of [
      ["/auth", "POST"],
      ["/auth/customer", "POST"],
      ["/auth/customer/login", "POST"],
      ["/auth/refresh", "POST"],
      ["/auth/customer/refresh", "POST"],
      ["/auth/logout", "POST"],
      ["/auth/customer/logout", "POST"],
      ["/auth/register", "POST"],
      ["/auth/tenant/register", "POST"],
      ["/account/password", "PATCH"],
      ["/password-reset/reset", "POST"],
      ["/users/pass", "PATCH"],
    ]) {
      expect(shouldSerializeAuthSessionMutation({ url, method })).toBe(true);
    }

    expect(
      shouldSerializeAuthSessionMutation({
        url: "/auth/customer/social/providers",
        method: "GET",
      }),
    ).toBe(false);
    expect(
      shouldSerializeAuthSessionMutation({ url: "/bookings", method: "POST" }),
    ).toBe(false);
  });

  it("finishes an initial restore before sending a later login so the new cookie wins", async () => {
    const store = createAuthStore();
    const authMutex = new Mutex();
    const restoreResponse = createDeferred();
    const restoreStarted = createDeferred();
    const restoreSession = buildSession(AUTH_CONTEXTS.CUSTOMER, "customer-a");
    const loginSession = buildSession(AUTH_CONTEXTS.CUSTOMER, "customer-b");
    let cookieOwner = "customer-a";
    const executeBaseQuery = vi.fn(async (args) => {
      if (args.url === "/auth/customer/refresh") {
        restoreStarted.resolve();
        const result = await restoreResponse.promise;
        cookieOwner = result.data.user.id;
        return result;
      }

      if (args.url === "/auth/customer") {
        cookieOwner = loginSession.user.id;
        return { data: loginSession };
      }

      throw new Error(`Unexpected request: ${args.url}`);
    });
    const guardedBaseQuery = createBaseQueryWithReauth({
      executeBaseQuery,
      authMutex,
      getCurrentAuthContext: () => AUTH_CONTEXTS.CUSTOMER,
    });
    const api = { dispatch: store.dispatch, getState: store.getState };
    store.dispatch(beginAuthContextTransition(AUTH_CONTEXTS.CUSTOMER));
    const restoreSnapshot = createAuthRequestSnapshot(
      store.getState(),
      AUTH_CONTEXTS.CUSTOMER,
    );
    const pendingRestore = restoreAuthSession({
      authContext: AUTH_CONTEXTS.CUSTOMER,
      dispatch: store.dispatch,
      getCurrentAuthContext: () => AUTH_CONTEXTS.CUSTOMER,
      getState: store.getState,
      request: async () => {
        const result = await guardedBaseQuery(
          { url: "/auth/customer/refresh", method: "POST" },
          api,
          {},
        );

        return result.data;
      },
      snapshot: restoreSnapshot,
    });
    await restoreStarted.promise;

    store.dispatch(claimAuthRequest(AUTH_CONTEXTS.CUSTOMER));
    const loginSnapshot = createAuthRequestSnapshot(
      store.getState(),
      AUTH_CONTEXTS.CUSTOMER,
    );
    const pendingLogin = guardedBaseQuery(
      { url: "/auth/customer", method: "POST" },
      api,
      {},
    );

    await Promise.resolve();
    expect(executeBaseQuery).toHaveBeenCalledTimes(1);

    restoreResponse.resolve({ data: restoreSession });
    await expect(pendingRestore).resolves.toBe(AUTH_REQUEST_RESULTS.STALE);
    const loginResult = await pendingLogin;
    expect(loginResult).toEqual({ data: loginSession });
    expect(
      completeAuthRequest({
        authContext: AUTH_CONTEXTS.CUSTOMER,
        data: loginResult.data,
        dispatch: store.dispatch,
        getState: store.getState,
        snapshot: loginSnapshot,
      }),
    ).toBe(AUTH_REQUEST_RESULTS.ACCEPTED);

    expect(executeBaseQuery.mock.calls.map(([args]) => args.url)).toEqual([
      "/auth/customer/refresh",
      "/auth/customer",
    ]);
    expect(cookieOwner).toBe("customer-b");
    expect(store.getState().auth).toMatchObject({
      authContext: AUTH_CONTEXTS.CUSTOMER,
      sessionReady: true,
      token: loginSession.accessToken,
    });
  });

  it("does not let a deferred initial restore overwrite a newer same-context login", async () => {
    const store = createAuthStore();
    const deferred = createDeferred();
    const initialSession = buildSession(AUTH_CONTEXTS.CUSTOMER, "customer-a");
    const loginSession = buildSession(AUTH_CONTEXTS.CUSTOMER, "customer-b");
    const pendingRestore = startRestore(
      store,
      AUTH_CONTEXTS.CUSTOMER,
      deferred,
      () => AUTH_CONTEXTS.CUSTOMER,
    );

    expect(completeExplicitLogin(store, loginSession)).toBe(
      AUTH_REQUEST_RESULTS.ACCEPTED,
    );
    deferred.resolve(initialSession);

    await expect(pendingRestore).resolves.toBe(AUTH_REQUEST_RESULTS.STALE);
    expect(store.getState().auth).toMatchObject({
      token: loginSession.accessToken,
      authContext: AUTH_CONTEXTS.CUSTOMER,
      sessionReady: true,
    });
  });

  it("does not let a deferred initial restore failure log out a newer login", async () => {
    const store = createAuthStore();
    const deferred = createDeferred();
    const loginSession = buildSession(AUTH_CONTEXTS.CUSTOMER, "customer-b");
    const pendingRestore = startRestore(
      store,
      AUTH_CONTEXTS.CUSTOMER,
      deferred,
      () => AUTH_CONTEXTS.CUSTOMER,
    );

    completeExplicitLogin(store, loginSession);
    deferred.reject(new Error("rotated refresh cookie"));

    await expect(pendingRestore).resolves.toBe(AUTH_REQUEST_RESULTS.STALE);
    expect(store.getState().auth.token).toBe(loginSession.accessToken);
  });

  it.each([
    [AUTH_CONTEXTS.WORKSPACE, AUTH_CONTEXTS.CUSTOMER],
    [AUTH_CONTEXTS.CUSTOMER, AUTH_CONTEXTS.WORKSPACE],
  ])(
    "ignores a deferred %s restore after switching to the %s surface",
    async (fromContext, toContext) => {
      const store = createAuthStore();
      const deferred = createDeferred();
      const pendingRestore = startRestore(
        store,
        fromContext,
        deferred,
        () => toContext,
      );

      store.dispatch(beginAuthContextTransition(toContext));
      deferred.resolve(buildSession(fromContext, `${fromContext}-user`));

      await expect(pendingRestore).resolves.toBe(AUTH_REQUEST_RESULTS.STALE);
      expect(store.getState().auth).toMatchObject({
        token: null,
        authContext: toContext,
        sessionReady: false,
      });
    },
  );

  it("checks the live browser audience before a route effect advances the epoch", async () => {
    const store = createAuthStore();
    const deferred = createDeferred();
    let currentContext = AUTH_CONTEXTS.WORKSPACE;
    const pendingRestore = startRestore(
      store,
      AUTH_CONTEXTS.WORKSPACE,
      deferred,
      () => currentContext,
    );

    currentContext = AUTH_CONTEXTS.CUSTOMER;
    deferred.resolve(buildSession(AUTH_CONTEXTS.WORKSPACE, "owner-1"));

    await expect(pendingRestore).resolves.toBe(AUTH_REQUEST_RESULTS.STALE);
    expect(store.getState().auth.token).toBeNull();
  });

  it("does not refresh or replay a delayed customer A mutation as customer B", async () => {
    const store = createAuthStore();
    const firstResponse = createDeferred();
    const firstRequestStarted = createDeferred();
    const customerA = buildSession(AUTH_CONTEXTS.CUSTOMER, "customer-a");
    const customerB = buildSession(AUTH_CONTEXTS.CUSTOMER, "customer-b");
    const executeBaseQuery = vi.fn((args) => {
      if (executeBaseQuery.mock.calls.length === 1) {
        firstRequestStarted.resolve();
        return firstResponse.promise;
      }

      return Promise.resolve({ data: customerA });
    });
    const guardedBaseQuery = createBaseQueryWithReauth({
      executeBaseQuery,
      authMutex: new Mutex(),
      getCurrentAuthContext: () => AUTH_CONTEXTS.CUSTOMER,
    });

    completeExplicitLogin(store, customerA);

    const pendingMutation = guardedBaseQuery(
      {
        url: "/bookings",
        method: "POST",
        body: { productId: "product-a" },
      },
      { dispatch: store.dispatch, getState: store.getState },
      {},
    );

    await firstRequestStarted.promise;
    store.dispatch(logOut({ authContext: AUTH_CONTEXTS.CUSTOMER }));
    completeExplicitLogin(store, customerB);
    firstResponse.resolve({ error: { status: 401 } });

    await expect(pendingMutation).resolves.toEqual({ error: { status: 401 } });
    expect(executeBaseQuery).toHaveBeenCalledOnce();
    expect(store.getState().auth).toMatchObject({
      token: customerB.accessToken,
      authContext: AUTH_CONTEXTS.CUSTOMER,
      sessionReady: true,
    });
  });

  it("coalesces concurrent same-principal 401s and retries both requests", async () => {
    const store = createAuthStore();
    const authMutex = new Mutex();
    const customerA = buildSession(AUTH_CONTEXTS.CUSTOMER, "customer-a");
    const refreshedCustomerA = buildSession(
      AUTH_CONTEXTS.CUSTOMER,
      "customer-a",
      "v2",
    );
    const originalAttempts = new Map();
    const executeBaseQuery = vi.fn(async (args) => {
      if (args.url === "/auth/customer/refresh") {
        return { data: refreshedCustomerA };
      }

      const attempts = (originalAttempts.get(args.url) || 0) + 1;
      originalAttempts.set(args.url, attempts);

      return attempts === 1
        ? { error: { status: 401 } }
        : { data: { ok: true, url: args.url } };
    });
    const guardedBaseQuery = createBaseQueryWithReauth({
      executeBaseQuery,
      authMutex,
      getCurrentAuthContext: () => AUTH_CONTEXTS.CUSTOMER,
    });

    completeExplicitLogin(store, customerA);
    const boundaryEpoch = store.getState().auth.sessionBoundaryEpoch;
    const api = { dispatch: store.dispatch, getState: store.getState };

    const results = await Promise.all([
      guardedBaseQuery({ url: "/bookings/one" }, api, {}),
      guardedBaseQuery({ url: "/bookings/two" }, api, {}),
    ]);

    expect(results).toEqual([
      { data: { ok: true, url: "/bookings/one" } },
      { data: { ok: true, url: "/bookings/two" } },
    ]);
    expect(
      executeBaseQuery.mock.calls.filter(
        ([args]) => args.url === "/auth/customer/refresh",
      ),
    ).toHaveLength(1);
    expect(originalAttempts).toEqual(
      new Map([
        ["/bookings/one", 2],
        ["/bookings/two", 2],
      ]),
    );
    expect(store.getState().auth).toMatchObject({
      token: refreshedCustomerA.accessToken,
      sessionBoundaryEpoch: boundaryEpoch,
    });
  });

  it("retries a staggered same-principal 401 after a peer already refreshed", async () => {
    const store = createAuthStore();
    const authMutex = new Mutex();
    const customerA = buildSession(AUTH_CONTEXTS.CUSTOMER, "customer-a");
    const refreshedCustomerA = buildSession(
      AUTH_CONTEXTS.CUSTOMER,
      "customer-a",
      "v2",
    );
    const firstResponses = new Map([
      ["/bookings/one", createDeferred()],
      ["/bookings/two", createDeferred()],
    ]);
    const bothOriginalsStarted = createDeferred();
    const originalAttempts = new Map();
    const executeBaseQuery = vi.fn((args) => {
      if (args.url === "/auth/customer/refresh") {
        return Promise.resolve({ data: refreshedCustomerA });
      }

      const attempts = (originalAttempts.get(args.url) || 0) + 1;
      originalAttempts.set(args.url, attempts);

      if (attempts === 1) {
        if ([...originalAttempts.values()].filter(Boolean).length === 2) {
          bothOriginalsStarted.resolve();
        }
        return firstResponses.get(args.url).promise;
      }

      return Promise.resolve({ data: { ok: true, url: args.url } });
    });
    const guardedBaseQuery = createBaseQueryWithReauth({
      executeBaseQuery,
      authMutex,
      getCurrentAuthContext: () => AUTH_CONTEXTS.CUSTOMER,
    });

    completeExplicitLogin(store, customerA);
    const api = { dispatch: store.dispatch, getState: store.getState };
    const firstRequest = guardedBaseQuery({ url: "/bookings/one" }, api, {});
    const secondRequest = guardedBaseQuery({ url: "/bookings/two" }, api, {});

    await bothOriginalsStarted.promise;
    firstResponses.get("/bookings/one").resolve({ error: { status: 401 } });
    await expect(firstRequest).resolves.toEqual({
      data: { ok: true, url: "/bookings/one" },
    });

    firstResponses.get("/bookings/two").resolve({ error: { status: 401 } });
    await expect(secondRequest).resolves.toEqual({
      data: { ok: true, url: "/bookings/two" },
    });

    expect(
      executeBaseQuery.mock.calls.filter(
        ([args]) => args.url === "/auth/customer/refresh",
      ),
    ).toHaveLength(1);
    expect(originalAttempts).toEqual(
      new Map([
        ["/bookings/one", 2],
        ["/bookings/two", 2],
      ]),
    );
    expect(store.getState().auth.token).toBe(refreshedCustomerA.accessToken);
  });

  it("does not send a customer A mutation as customer B after waiting on the refresh mutex", async () => {
    const store = createAuthStore();
    const authMutex = new Mutex();
    const releaseMutex = await authMutex.acquire();
    const customerA = buildSession(AUTH_CONTEXTS.CUSTOMER, "customer-a");
    const customerB = buildSession(AUTH_CONTEXTS.CUSTOMER, "customer-b");
    const executeBaseQuery = vi.fn();
    const guardedBaseQuery = createBaseQueryWithReauth({
      executeBaseQuery,
      authMutex,
      getCurrentAuthContext: () => AUTH_CONTEXTS.CUSTOMER,
    });

    completeExplicitLogin(store, customerA);

    const pendingMutation = guardedBaseQuery(
      {
        url: "/bookings",
        method: "POST",
        body: { productId: "product-a" },
      },
      { dispatch: store.dispatch, getState: store.getState },
      {},
    );

    store.dispatch(logOut({ authContext: AUTH_CONTEXTS.CUSTOMER }));
    completeExplicitLogin(store, customerB);
    releaseMutex();

    await expect(pendingMutation).resolves.toEqual({
      error: {
        status: "CUSTOM_ERROR",
        error: "Authentication session changed before the request was sent.",
        data: { code: "AUTH_SESSION_CHANGED" },
      },
    });
    expect(executeBaseQuery).not.toHaveBeenCalled();
    expect(store.getState().auth.token).toBe(customerB.accessToken);
  });

  it("does not send a queued mutation after logout and same-account login", async () => {
    const store = createAuthStore();
    const authMutex = new Mutex();
    const releaseMutex = await authMutex.acquire();
    const firstSession = buildSession(
      AUTH_CONTEXTS.CUSTOMER,
      "customer-a",
      "v1",
    );
    const replacementSession = buildSession(
      AUTH_CONTEXTS.CUSTOMER,
      "customer-a",
      "relogin",
    );
    const executeBaseQuery = vi.fn();
    const guardedBaseQuery = createBaseQueryWithReauth({
      executeBaseQuery,
      authMutex,
      getCurrentAuthContext: () => AUTH_CONTEXTS.CUSTOMER,
    });

    completeExplicitLogin(store, firstSession);

    const pendingMutation = guardedBaseQuery(
      { url: "/bookings", method: "POST" },
      { dispatch: store.dispatch, getState: store.getState },
      {},
    );

    store.dispatch(logOut({ authContext: AUTH_CONTEXTS.CUSTOMER }));
    completeExplicitLogin(store, replacementSession);
    releaseMutex();

    await expect(pendingMutation).resolves.toMatchObject({
      error: {
        status: "CUSTOM_ERROR",
        data: { code: "AUTH_SESSION_CHANGED" },
      },
    });
    expect(executeBaseQuery).not.toHaveBeenCalled();
    expect(store.getState().auth.token).toBe(replacementSession.accessToken);
  });

  it("sends an anonymous request that started before an anonymous audience transition", async () => {
    const store = createAuthStore();
    const executeBaseQuery = vi.fn(() =>
      Promise.resolve({ data: { resources: [] } }),
    );
    const guardedBaseQuery = createBaseQueryWithReauth({
      executeBaseQuery,
      authMutex: new Mutex(),
      getCurrentAuthContext: () => AUTH_CONTEXTS.CUSTOMER,
    });

    const pendingRequest = guardedBaseQuery(
      "/public/tenants/studio-olivie/knowledge",
      { dispatch: store.dispatch, getState: store.getState },
      {},
    );

    // The initial session restore starts in the same flush as page queries.
    store.dispatch(beginAuthContextTransition(AUTH_CONTEXTS.CUSTOMER));

    await expect(pendingRequest).resolves.toEqual({
      data: { resources: [] },
    });
    expect(executeBaseQuery).toHaveBeenCalledOnce();
  });

  it("does not send an anonymous request after someone signed in while it waited", async () => {
    const store = createAuthStore();
    const authMutex = new Mutex();
    const releaseMutex = await authMutex.acquire();
    const executeBaseQuery = vi.fn();
    const guardedBaseQuery = createBaseQueryWithReauth({
      executeBaseQuery,
      authMutex,
      getCurrentAuthContext: () => AUTH_CONTEXTS.CUSTOMER,
    });

    const pendingRequest = guardedBaseQuery(
      "/public/tenants/studio-olivie/knowledge",
      { dispatch: store.dispatch, getState: store.getState },
      {},
    );

    store.dispatch(beginAuthContextTransition(AUTH_CONTEXTS.CUSTOMER));
    completeExplicitLogin(
      store,
      buildSession(AUTH_CONTEXTS.CUSTOMER, "customer-a"),
    );
    releaseMutex();

    await expect(pendingRequest).resolves.toMatchObject({
      error: {
        status: "CUSTOM_ERROR",
        data: { code: "AUTH_SESSION_CHANGED" },
      },
    });
    expect(executeBaseQuery).not.toHaveBeenCalled();
  });

  it("sends an anonymous request queued behind a session restore that failed", async () => {
    const store = createAuthStore();
    const authMutex = new Mutex();
    const releaseMutex = await authMutex.acquire();
    const executeBaseQuery = vi.fn(() =>
      Promise.resolve({ data: { resources: [] } }),
    );
    const guardedBaseQuery = createBaseQueryWithReauth({
      executeBaseQuery,
      authMutex,
      getCurrentAuthContext: () => AUTH_CONTEXTS.CUSTOMER,
    });

    store.dispatch(beginAuthContextTransition(AUTH_CONTEXTS.CUSTOMER));

    const pendingRequest = guardedBaseQuery(
      "/public/tenants/studio-olivie/knowledge",
      { dispatch: store.dispatch, getState: store.getState },
      {},
    );

    store.dispatch(logOut({ authContext: AUTH_CONTEXTS.CUSTOMER }));
    releaseMutex();

    await expect(pendingRequest).resolves.toEqual({
      data: { resources: [] },
    });
    expect(executeBaseQuery).toHaveBeenCalledOnce();
  });
});
