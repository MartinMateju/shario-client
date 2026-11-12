import { configureStore } from "@reduxjs/toolkit";
import { render, screen } from "@testing-library/react";
import { Mutex } from "async-mutex";
import { useEffect } from "react";
import { Provider, useDispatch } from "react-redux";
import { describe, expect, it } from "vitest";
import {
  apiSlice,
  createBaseQueryWithReauth,
} from "@/lib/features/api/apiSlice";
import { authCacheIsolationMiddleware } from "@/lib/features/auth/authCacheIsolationMiddleware";
import authReducer, {
  beginAuthContextTransition,
  logOut,
  setCredentials,
  updateCurrentUser,
  getAuthCacheIdentity,
} from "@/lib/features/auth/authSlice";
import cartReducer, { addToCart } from "@/lib/features/cart/cartSlice";

// Public reads outside ANONYMOUS_API_ENDPOINTS still pass the session checks.
const guardedPublicBaseQuery = createBaseQueryWithReauth({
  executeBaseQuery: () =>
    Promise.resolve({
      data: "studio help articles",
    }),
  authMutex: new Mutex(),
  getCurrentAuthContext: () => "customer",
});
const cacheProbeApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    authCacheProbe: builder.query({
      query: () => "/__auth-cache-probe",
    }),
    publicCacheProbe: builder.query({
      async queryFn() {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return {
          data: "public studio data",
        };
      },
    }),
    guardedPublicCacheProbe: builder.query({
      queryFn: (_arg, api, extraOptions) =>
        guardedPublicBaseQuery(
          "/public/tenants/studio-olivie/knowledge",
          api,
          extraOptions,
        ),
    }),
  }),
});
const encodeTokenSegment = (value) =>
  globalThis
    .btoa(JSON.stringify(value))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
const buildAccessToken = (userId) =>
  [
    encodeTokenSegment({
      alg: "none",
      typ: "JWT",
    }),
    encodeTokenSegment({
      UserInfo: {
        id: userId,
        authContext: "customer",
        platformRole: "none",
        tenantRole: "customer",
        tenantId: "tenant-1",
      },
    }),
    "test-signature",
  ].join(".");
const credentialsFor = (userId, accessToken = buildAccessToken(userId)) => ({
  accessToken,
  authContext: "customer",
  tenant: {
    id: "tenant-1",
    slug: "studio-olivie",
  },
  user: {
    id: userId,
  },
  workspaceAccess: null,
});
const buildWorkspaceAccessToken = ({ isModerator }) =>
  [
    encodeTokenSegment({
      alg: "none",
      typ: "JWT",
    }),
    encodeTokenSegment({
      UserInfo: {
        id: "owner-1",
        authContext: "workspace",
        tenantId: "tenant-1",
        tenantRole: "owner",
        workspaceRole: "owner",
        membershipId: "membership-1",
        authorizationVersion: 1,
        permissions: ["workspace.view"],
        isOwner: true,
        isModerator,
      },
    }),
    "test-signature",
  ].join(".");
const workspaceCredentials = (isModerator) => ({
  accessToken: buildWorkspaceAccessToken({
    isModerator,
  }),
  authContext: "workspace",
  tenant: {
    id: "tenant-1",
    slug: "studio-olivie",
  },
  user: {
    id: "owner-1",
  },
  workspaceAccess: {
    role: "owner",
    status: "active",
    permissions: ["workspace.view"],
  },
});
const createStore = (preloadedState) =>
  configureStore({
    preloadedState,
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
const seedCustomerCache = async (store, customerId) => {
  await store.dispatch(
    cacheProbeApi.util.upsertQueryData("authCacheProbe", "mine", {
      customerId,
    }),
  );
};
describe("authentication cache isolation", () => {
  it("preserves the anonymous basket on first sign-in and same-user token rotation", () => {
    const store = createStore();
    store.dispatch(
      addToCart({ cartItem: { id: "visit", product: { _id: "room-a" } } }),
    );
    store.dispatch(setCredentials(credentialsFor("customer-a")));
    store.dispatch(setCredentials(credentialsFor("customer-a")));
    expect(store.getState().cart.cart.map((item) => item.id)).toEqual([
      "visit",
    ]);
  });
  it("clears another authenticated customer's basket on identity replacement and logout", () => {
    const store = createStore();
    store.dispatch(setCredentials(credentialsFor("customer-a")));
    store.dispatch(
      addToCart({ cartItem: { id: "visit-a", product: { _id: "room-a" } } }),
    );
    store.dispatch(setCredentials(credentialsFor("customer-b")));
    expect(store.getState().cart.cart).toEqual([]);
    store.dispatch(
      addToCart({ cartItem: { id: "visit-b", product: { _id: "room-b" } } }),
    );
    store.dispatch(logOut({ authContext: "customer" }));
    expect(store.getState().cart.cart).toEqual([]);
  });

  it.each([
    ["customer-a", ["visit-a"]],
    ["customer-b", []],
  ])(
    "restores a persisted basket only for its owner (%s)",
    (restoredCustomer, expectedItems) => {
      const previousSession = createStore();
      previousSession.dispatch(setCredentials(credentialsFor("customer-a")));
      previousSession.dispatch(
        addToCart({ cartItem: { id: "visit-a", product: { _id: "room-a" } } }),
      );
      // Persistence restores the basket, but access tokens remain memory-only.
      const store = createStore({
        cart: JSON.parse(JSON.stringify(previousSession.getState().cart)),
      });
      expect(store.getState().auth.token).toBeNull();
      store.dispatch(beginAuthContextTransition("customer"));
      store.dispatch(setCredentials(credentialsFor(restoredCustomer)));
      expect(store.getState().cart.cart.map((item) => item.id)).toEqual(
        expectedItems,
      );
      expect(store.getState().cart.ownerScope).toBe(
        getAuthCacheIdentity(store.getState()),
      );
    },
  );

  it("drops an owned persisted basket when session restoration fails", () => {
    const previousSession = createStore();
    previousSession.dispatch(setCredentials(credentialsFor("customer-a")));
    previousSession.dispatch(
      addToCart({ cartItem: { id: "visit-a", product: { _id: "room-a" } } }),
    );
    const store = createStore({ cart: previousSession.getState().cart });
    store.dispatch(beginAuthContextTransition("customer"));
    store.dispatch(logOut({ authContext: "customer" }));
    expect(store.getState().cart.cart).toEqual([]);
    expect(store.getState().cart.ownerScope).toBeNull();
  });

  it("clears customer A query data on involuntary logout before customer B logs in", async () => {
    const store = createStore();
    store.dispatch(setCredentials(credentialsFor("customer-a")));
    await seedCustomerCache(store, "customer-a");
    expect(Object.keys(store.getState().api.queries)).toHaveLength(1);
    store.dispatch(
      logOut({
        authContext: "customer",
      }),
    );
    expect(store.getState().api.queries).toEqual({});
    await seedCustomerCache(store, "stale-customer-a");
    store.dispatch(setCredentials(credentialsFor("customer-b")));
    expect(store.getState().api.queries).toEqual({});
  });
  it("clears cache on principal replacement but preserves it for a same-principal token rotation", async () => {
    const store = createStore();
    store.dispatch(setCredentials(credentialsFor("customer-a")));
    await seedCustomerCache(store, "customer-a");
    store.dispatch(
      setCredentials(
        credentialsFor("customer-a", buildAccessToken("customer-a")),
      ),
    );
    expect(Object.keys(store.getState().api.queries)).toHaveLength(1);
    store.dispatch(setCredentials(credentialsFor("customer-b")));
    expect(store.getState().api.queries).toEqual({});
  });
  it("clears cache for audience transitions and malformed credential invalidation", async () => {
    const store = createStore();
    store.dispatch(setCredentials(credentialsFor("customer-a")));
    await seedCustomerCache(store, "customer-a");
    store.dispatch(beginAuthContextTransition("workspace"));
    expect(store.getState().api.queries).toEqual({});
    await seedCustomerCache(store, "stale-customer-a");
    store.dispatch(
      setCredentials({
        accessToken: "not-a-jwt",
      }),
    );
    expect(store.getState().api.queries).toEqual({});
  });
  it("clears cache when a profile update replaces the active identity", async () => {
    const store = createStore();
    store.dispatch(setCredentials(credentialsFor("customer-a")));
    await seedCustomerCache(store, "customer-a");
    store.dispatch(
      updateCurrentUser({
        id: "customer-b",
      }),
    );
    expect(store.getState().api.queries).toEqual({});
  });
  it("advances the boundary and clears cache when a signed privilege changes", async () => {
    const store = createStore();
    store.dispatch(setCredentials(workspaceCredentials(false)));
    await seedCustomerCache(store, "workspace-owner");
    const boundaryEpoch = store.getState().auth.sessionBoundaryEpoch;
    store.dispatch(setCredentials(workspaceCredentials(true)));
    expect(store.getState().auth.sessionBoundaryEpoch).toBe(boundaryEpoch + 1);
    expect(store.getState().api.queries).toEqual({});
  });
  it("keeps anonymous cache entries when a session restore starts and fails without a principal", async () => {
    const store = createStore();
    await seedCustomerCache(store, "anonymous");
    store.dispatch(beginAuthContextTransition("customer"));
    expect(Object.keys(store.getState().api.queries)).toHaveLength(1);
    store.dispatch(
      logOut({
        authContext: "customer",
      }),
    );
    expect(Object.keys(store.getState().api.queries)).toHaveLength(1);
  });
  it("still clears the cache when a session restore starts while a principal is signed in", async () => {
    const store = createStore();
    store.dispatch(setCredentials(credentialsFor("customer-a")));
    await seedCustomerCache(store, "customer-a");
    store.dispatch(beginAuthContextTransition("customer"));
    expect(store.getState().api.queries).toEqual({});
  });
  it.each([
    ["usePublicCacheProbeQuery", "public studio data"],
    ["useGuardedPublicCacheProbeQuery", "studio help articles"],
  ])(
    "lets %s started by a mounted page finish when the initial session restore begins",
    async (hookName, expectedText) => {
      const store = createStore();
      const useProbeQuery = cacheProbeApi[hookName];
      function PublicSection() {
        const { data, isError } = useProbeQuery();
        return <p>{isError ? "error" : (data ?? "loading")}</p>;
      }

      // Mirrors useTokenRefresh: a parent effect starts the session restore
      // after child effects have already subscribed to their queries.
      function SessionRestoreParent({ children }) {
        const dispatch = useDispatch();
        useEffect(() => {
          dispatch(beginAuthContextTransition("customer"));
        }, [dispatch]);
        return children;
      }
      render(
        <Provider store={store}>
          <SessionRestoreParent>
            <PublicSection />
          </SessionRestoreParent>
        </Provider>,
      );
      expect(await screen.findByText(expectedText)).toBeInTheDocument();
    },
  );
});
