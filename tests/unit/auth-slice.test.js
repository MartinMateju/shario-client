import { describe, expect, it } from "vitest";

import { PERMISSIONS } from "@/config/permissions";
import authReducer, {
  beginAuthContextTransition,
  logOut,
  markSessionReady,
  markTenantOnboardingComplete,
  selectCurrentAuthContext,
  selectCurrentTenantId,
  selectCurrentToken,
  selectCurrentUser,
  selectCurrentWorkspacePermissions,
  selectHasWorkspacePermission,
  selectIsAuthenticated,
  selectIsCustomerAuthenticated,
  selectIsSessionReady,
  selectIsSessionReadyForContext,
  selectIsWorkspaceAuthenticated,
  selectIsWorkspaceAccessResolved,
  setCredentials,
  setWorkspaceAccess,
  updateCurrentTenant,
  updateCurrentUser,
  updateWorkspaceAccess,
} from "@/lib/features/auth/authSlice";

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

const asRootState = (auth) => ({ auth });

describe("authSlice credentials", () => {
  it("hydrates token claims, richer API data, tenant, and normalized access", () => {
    const accessToken = buildAccessToken({
      id: "user-1",
      email: "claim@example.test",
      tenant: "tenant-claim",
    });

    const state = authReducer(
      undefined,
      setCredentials({
        accessToken,
        user: {
          firstname: "Ada",
          email: "api@example.test",
        },
        tenant: {
          id: "tenant-1",
          slug: "clay-studio",
        },
        workspaceAccess: {
          membership: {
            role: "staff",
            status: "ACTIVE",
          },
          effectivePermissions: [
            PERMISSIONS.BOOKINGS_VIEW,
            PERMISSIONS.BOOKINGS_VIEW,
          ],
        },
      }),
    );
    const rootState = asRootState(state);

    expect(selectCurrentToken(rootState)).toBe(accessToken);
    expect(selectCurrentUser(rootState)).toMatchObject({
      id: "user-1",
      firstname: "Ada",
      email: "api@example.test",
      tenant: "tenant-claim",
    });
    expect(state.tenant).toEqual({
      id: "tenant-1",
      slug: "clay-studio",
    });
    expect(state.workspaceAccess).toMatchObject({
      roleKey: "staff",
      status: "active",
      permissions: [PERMISSIONS.BOOKINGS_VIEW],
    });
    expect(selectCurrentWorkspacePermissions(rootState)).toEqual([
      PERMISSIONS.BOOKINGS_VIEW,
    ]);
    expect(
      selectHasWorkspacePermission(PERMISSIONS.BOOKINGS_VIEW)(rootState),
    ).toBe(true);
    expect(selectCurrentTenantId(rootState)).toBe("tenant-1");
    expect(selectIsAuthenticated(rootState)).toBe(true);
    expect(selectIsWorkspaceAccessResolved(rootState)).toBe(true);
    expect(selectIsSessionReady(rootState)).toBe(true);
  });

  it("uses signed audience and role claims over an underlying owner profile", () => {
    const accessToken = buildAccessToken({
      id: "owner-1",
      email: "owner@example.test",
      tenant: "tenant-1",
      authContext: "customer",
      platformRole: "none",
      tenantRole: "customer",
    });

    const state = authReducer(
      undefined,
      setCredentials({
        accessToken,
        authContext: "customer",
        user: {
          id: "owner-1",
          email: "owner@example.test",
          platformRole: "none",
          tenantRole: "owner",
          isAdmin: true,
          isOwner: true,
          workspaceAccess: { role: "owner" },
        },
        tenant: {
          id: "tenant-1",
          slug: "clay-studio",
        },
        workspaceAccess: null,
      }),
    );
    const rootState = asRootState(state);

    expect(selectCurrentAuthContext(rootState)).toBe("customer");
    expect(selectCurrentUser(rootState)).toMatchObject({
      tenantRole: "customer",
      authContext: "customer",
    });
    expect(selectCurrentUser(rootState)).not.toHaveProperty("isAdmin");
    expect(selectCurrentUser(rootState)).not.toHaveProperty("isOwner");
    expect(selectCurrentUser(rootState)).not.toHaveProperty("workspaceAccess");
    expect(selectIsCustomerAuthenticated(rootState)).toBe(true);
    expect(selectIsWorkspaceAuthenticated(rootState)).toBe(false);
  });

  it("clears memory and marks the target audience unresolved during a surface switch", () => {
    const accessToken = buildAccessToken({
      id: "owner-1",
      authContext: "workspace",
      platformRole: "none",
      tenantRole: "owner",
    });
    const authenticated = authReducer(
      undefined,
      setCredentials({
        accessToken,
        authContext: "workspace",
        tenant: { id: "tenant-1", slug: "clay-studio" },
        workspaceAccess: { role: "owner" },
      }),
    );

    const switching = authReducer(
      authenticated,
      beginAuthContextTransition("customer"),
    );

    expect(switching).toMatchObject({
      token: null,
      userInfo: null,
      tenant: null,
      workspaceAccess: null,
      authContext: "customer",
      sessionReady: false,
    });
    expect(
      selectIsSessionReadyForContext("customer")(asRootState(switching)),
    ).toBe(false);

    const ready = authReducer(switching, markSessionReady("customer"));
    expect(selectIsSessionReadyForContext("customer")(asRootState(ready))).toBe(
      true,
    );
  });

  it("classifies only resolved legacy access states when authContext is absent", () => {
    const accessToken = buildAccessToken({
      id: "legacy-user",
      platformRole: "none",
    });
    const activeWorkspace = authReducer(
      undefined,
      setCredentials({
        accessToken,
        workspaceAccess: { role: "viewer", status: "active" },
      }),
    );
    const resolvedCustomer = authReducer(
      undefined,
      setCredentials({
        accessToken,
        workspaceAccess: null,
      }),
    );
    const unresolved = authReducer(
      undefined,
      setCredentials({
        accessToken,
      }),
    );

    expect(selectIsWorkspaceAuthenticated(asRootState(activeWorkspace))).toBe(
      true,
    );
    expect(selectIsCustomerAuthenticated(asRootState(activeWorkspace))).toBe(
      false,
    );
    expect(selectIsCustomerAuthenticated(asRootState(resolvedCustomer))).toBe(
      true,
    );
    expect(selectIsWorkspaceAuthenticated(asRootState(resolvedCustomer))).toBe(
      false,
    );
    expect(selectCurrentAuthContext(asRootState(unresolved))).toBeNull();
    expect(selectIsCustomerAuthenticated(asRootState(unresolved))).toBe(false);
    expect(selectIsWorkspaceAuthenticated(asRootState(unresolved))).toBe(false);
  });

  it("preserves tenant and access when an older refresh response omits them", () => {
    const firstToken = buildAccessToken({
      id: "user-1",
      email: "first@example.test",
      tenant: "tenant-1",
    });
    const nextToken = buildAccessToken({
      id: "user-1",
      email: "next@example.test",
      tenant: "tenant-1",
    });
    const initial = authReducer(
      undefined,
      setCredentials({
        accessToken: firstToken,
        tenant: { id: "tenant-1", slug: "clay-studio" },
        workspaceAccess: {
          role: "viewer",
          permissions: [PERMISSIONS.WORKSPACE_VIEW],
        },
      }),
    );

    const refreshed = authReducer(
      initial,
      setCredentials({
        accessToken: nextToken,
      }),
    );

    expect(refreshed.token).toBe(nextToken);
    expect(refreshed.userInfo.email).toBe("next@example.test");
    expect(refreshed.tenant).toEqual(initial.tenant);
    expect(refreshed.workspaceAccess).toEqual(initial.workspaceAccess);
    expect(refreshed.workspaceAccessResolved).toBe(true);
    expect(refreshed.sessionEpoch).toBe(initial.sessionEpoch + 1);
    expect(refreshed.sessionBoundaryEpoch).toBe(initial.sessionBoundaryEpoch);
  });

  it("advances the session boundary when signed workspace authorization changes", () => {
    const buildWorkspaceToken = (authorizationVersion) =>
      buildAccessToken({
        id: "owner-1",
        tenant: "tenant-1",
        authContext: "workspace",
        tenantRole: "owner",
        workspaceRole: "owner",
        membershipId: "membership-1",
        authorizationVersion,
        permissions: [PERMISSIONS.WORKSPACE_VIEW],
        isOwner: true,
      });
    const initial = authReducer(
      undefined,
      setCredentials({
        accessToken: buildWorkspaceToken(1),
        authContext: "workspace",
        tenant: { id: "tenant-1", slug: "clay-studio" },
        workspaceAccess: {
          role: "owner",
          permissions: [PERMISSIONS.WORKSPACE_VIEW],
        },
      }),
    );

    const updated = authReducer(
      initial,
      setCredentials({
        accessToken: buildWorkspaceToken(2),
        authContext: "workspace",
      }),
    );

    expect(updated.workspaceAccess).toEqual(initial.workspaceAccess);
    expect(updated.userInfo.authorizationVersion).toBe(2);
    expect(updated.sessionBoundaryEpoch).toBe(initial.sessionBoundaryEpoch + 1);
  });

  it.each([
    ["a missing token", undefined],
    ["a malformed token", "not-a-jwt"],
    ["a token without UserInfo", buildAccessToken(undefined)],
  ])("clears a previous session for %s", (_label, accessToken) => {
    const authenticated = authReducer(
      undefined,
      setCredentials({
        accessToken: buildAccessToken({
          id: "user-1",
          email: "user@example.test",
          tenant: "tenant-1",
        }),
        tenant: { id: "tenant-1" },
        workspaceAccess: { role: "owner" },
      }),
    );

    const cleared = authReducer(authenticated, setCredentials({ accessToken }));

    expect(cleared).toMatchObject({
      token: null,
      userInfo: null,
      tenant: null,
      workspaceAccess: null,
      workspaceAccessResolved: false,
      sessionReady: true,
    });
  });
});

describe("authSlice profile and workspace updates", () => {
  it("deep-merges access preferences and notification settings", () => {
    const withAccess = authReducer(
      undefined,
      setWorkspaceAccess({
        role: "staff",
        permissions: [PERMISSIONS.WORKSPACE_UPDATE],
        preferences: {
          defaultLocationId: "location-1",
          notifications: {
            email: true,
            sms: false,
          },
        },
      }),
    );

    const updated = authReducer(
      withAccess,
      updateWorkspaceAccess({
        accessVersion: 8,
        authorizationVersion: 8,
        preferences: {
          defaultLocation: "location-2",
          notifications: {
            sms: true,
          },
        },
      }),
    );

    expect(updated.workspaceAccess).toMatchObject({
      accessVersion: 8,
      authorizationVersion: 8,
      preferences: {
        defaultLocation: "location-2",
        defaultLocationId: "location-1",
        notifications: {
          email: true,
          sms: true,
        },
      },
    });
    expect(updated.workspaceAccessResolved).toBe(true);
  });

  it("merges user and tenant patches without discarding nested tenant settings", () => {
    const accessToken = buildAccessToken({
      id: "user-1",
      email: "user@example.test",
      tenant: "tenant-1",
    });
    let state = authReducer(
      undefined,
      setCredentials({
        accessToken,
        user: { firstname: "Ada" },
        tenant: {
          id: "tenant-1",
          settings: {
            currency: "CZK",
            timezone: "Europe/Prague",
          },
        },
      }),
    );

    state = authReducer(state, updateCurrentUser({ lastname: "Lovelace" }));
    state = authReducer(
      state,
      updateCurrentTenant({
        name: "Clay Studio",
        settings: { currency: "EUR" },
      }),
    );
    state = authReducer(state, markTenantOnboardingComplete());

    expect(state.userInfo).toMatchObject({
      firstname: "Ada",
      lastname: "Lovelace",
    });
    expect(state.tenant).toEqual({
      id: "tenant-1",
      name: "Clay Studio",
      settings: {
        currency: "EUR",
        timezone: "Europe/Prague",
      },
      onboarding: {
        completed: true,
      },
    });
  });

  it("ignores malformed patches and makes logout/session readiness idempotent", () => {
    const initial = authReducer(undefined, { type: "test/init" });
    const afterUserPatch = authReducer(initial, updateCurrentUser(null));
    const afterTenantPatch = authReducer(
      afterUserPatch,
      updateCurrentTenant("invalid"),
    );
    const afterAccessPatch = authReducer(
      afterTenantPatch,
      updateWorkspaceAccess(null),
    );
    const afterOnboarding = authReducer(
      afterAccessPatch,
      markTenantOnboardingComplete(),
    );
    const ready = authReducer(afterOnboarding, markSessionReady());
    const loggedOut = authReducer(ready, logOut());

    expect(afterOnboarding).toEqual(initial);
    expect(ready.sessionReady).toBe(true);
    expect(loggedOut).toMatchObject({
      token: null,
      userInfo: null,
      tenant: null,
      workspaceAccess: null,
      workspaceAccessResolved: false,
      sessionReady: true,
    });
    expect(selectIsSessionReady(asRootState(loggedOut))).toBe(true);
    expect(selectCurrentTenantId(asRootState(loggedOut))).toBeNull();
  });
});
