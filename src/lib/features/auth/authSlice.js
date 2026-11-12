import { createSlice } from "@reduxjs/toolkit";
import {
  getWorkspaceAccessPermissions,
  hasPermission,
  normalizeWorkspaceAccess,
} from "@/config/permissions";
import {
  AUTH_CONTEXTS,
  getSignedUserInfo,
  normalizeAuthContext,
} from "@/lib/features/auth/authContext";

const initialState = {
  token: null,
  userInfo: null,
  tenant: null,
  workspaceAccess: null,
  workspaceAccessResolved: false,
  authContext: null,
  sessionReady: false,
  sessionEpoch: 0,
  sessionBoundaryEpoch: 0,
};

const normalizeIdentityValue = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const normalizePermissions = (workspaceAccess) => {
  const permissions =
    workspaceAccess?.permissions ??
    workspaceAccess?.effectivePermissions ??
    workspaceAccess?.membership?.permissions ??
    [];

  return Array.isArray(permissions)
    ? [
        ...new Set(permissions.map(normalizeIdentityValue).filter(Boolean)),
      ].sort()
    : [];
};

const normalizeIdentityList = (values) => {
  const source = Array.isArray(values) ? values : values ? [values] : [];

  return [
    ...new Set(source.map(normalizeIdentityValue).filter(Boolean)),
  ].sort();
};

/**
 * Stable authorization-principal fingerprint used for request and cache
 * isolation. Access-token timestamps are intentionally excluded so an
 * ordinary token rotation for the same principal is not a session boundary.
 */
export const getAuthCacheIdentity = (state) => {
  const auth = state?.auth;
  const user = auth?.userInfo;

  if (!auth?.token || !user) {
    return null;
  }

  const workspaceAccess = auth.workspaceAccess;

  return JSON.stringify({
    authContext: normalizeAuthContext(auth.authContext ?? user.authContext),
    userId: normalizeIdentityValue(user.id ?? user._id ?? user.userId),
    tenantId: normalizeIdentityValue(
      auth.tenant?.id ??
        auth.tenant?._id ??
        auth.tenant?.slug ??
        user.tenantId ??
        user.tenant,
    ),
    platformRole: normalizeIdentityValue(user.platformRole),
    tenantRole: normalizeIdentityValue(
      user.tenantRole ?? workspaceAccess?.roleKey ?? workspaceAccess?.role,
    ),
    workspaceRole: normalizeIdentityValue(user.workspaceRole),
    membershipId: normalizeIdentityValue(user.membershipId),
    workspaceStatus: normalizeIdentityValue(
      workspaceAccess?.status ?? workspaceAccess?.membership?.status,
    ),
    accessVersion:
      user.authorizationVersion ??
      user.accessVersion ??
      workspaceAccess?.authorizationVersion ??
      workspaceAccess?.accessVersion ??
      null,
    signedRole: normalizeIdentityValue(user.role),
    signedRoles: normalizeIdentityList(user.roles),
    signedPermissions: normalizeIdentityList(user.permissions),
    privilegeFlags: {
      isAdmin: user.isAdmin === true,
      isModerator: user.isModerator === true,
      isOwner: user.isOwner === true,
      isStaff: user.isStaff === true,
      isTenantUser: user.isTenantUser === true,
    },
    permissions: normalizePermissions(workspaceAccess),
  });
};

const SIGNED_AUTHORIZATION_FIELDS = Object.freeze([
  "authContext",
  "platformRole",
  "tenantRole",
  "workspaceRole",
  "membershipId",
  "authorizationVersion",
  "accessVersion",
  "role",
  "roles",
  "permissions",
  "tenant",
  "tenantId",
  "tenant_role",
  "tenantRoles",
  "userRole",
  "accessLevel",
  "isAdmin",
  "isModerator",
  "isOwner",
  "isStaff",
  "isTenantUser",
  "workspaceAccess",
  "tenantMembership",
  "membership",
]);

const mergeUserInfo = (tokenUser, user) => {
  const merged = user
    ? {
        ...tokenUser,
        ...user,
      }
    : { ...tokenUser };

  for (const field of SIGNED_AUTHORIZATION_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(tokenUser, field)) {
      merged[field] = tokenUser[field];
    } else if (user && Object.prototype.hasOwnProperty.call(user, field)) {
      delete merged[field];
    }
  }

  return merged;
};

const clearAuthState = (state) => {
  state.token = null;
  state.userInfo = null;
  state.tenant = null;
  state.workspaceAccess = null;
  state.workspaceAccessResolved = false;
  state.authContext = null;
};

const advanceSessionEpoch = (state) => {
  state.sessionEpoch += 1;
};

const advanceSessionBoundaryEpoch = (state) => {
  state.sessionBoundaryEpoch += 1;
};

const advanceBoundaryForIdentityReplacement = (state, previousIdentity) => {
  if (getAuthCacheIdentity({ auth: state }) !== previousIdentity) {
    advanceSessionBoundaryEpoch(state);
  }
};

const authSlice = createSlice({
  name: "auth",
  initialState,

  reducers: {
    setCredentials: (state, action) => {
      const previousIdentity = getAuthCacheIdentity({ auth: state });

      advanceSessionEpoch(state);

      const { accessToken, user, tenant, workspaceAccess, authContext } =
        action.payload ?? {};

      if (!accessToken) {
        clearAuthState(state);
        state.sessionReady = true;
        advanceBoundaryForIdentityReplacement(state, previousIdentity);
        return;
      }

      const tokenUser = getSignedUserInfo(accessToken);
      const signedAuthContext = normalizeAuthContext(tokenUser?.authContext);
      const requestedAuthContext = normalizeAuthContext(authContext);

      if (
        !tokenUser ||
        (signedAuthContext &&
          requestedAuthContext &&
          signedAuthContext !== requestedAuthContext)
      ) {
        clearAuthState(state);
        state.sessionReady = true;
        advanceBoundaryForIdentityReplacement(state, previousIdentity);
        return;
      }

      state.token = accessToken;
      state.authContext =
        signedAuthContext || requestedAuthContext || state.authContext;

      // Rich API profile fields may supplement the JWT, but authorization
      // fields always come from signed token claims.
      state.userInfo = mergeUserInfo(tokenUser, user);

      // Preserve the current tenant if an older refresh
      // response contains only a new access token.
      if (tenant !== undefined) {
        state.tenant = tenant;
      }

      // Older refresh responses may not include workspaceAccess. Preserve the
      // access context obtained during login in that case.
      if (workspaceAccess !== undefined) {
        state.workspaceAccess = normalizeWorkspaceAccess(workspaceAccess);
        state.workspaceAccessResolved = true;
      }

      state.sessionReady = true;
      advanceBoundaryForIdentityReplacement(state, previousIdentity);
    },

    setWorkspaceAccess: (state, action) => {
      const previousIdentity = getAuthCacheIdentity({ auth: state });

      state.workspaceAccess = normalizeWorkspaceAccess(action.payload);
      state.workspaceAccessResolved = true;
      advanceBoundaryForIdentityReplacement(state, previousIdentity);
    },

    updateWorkspaceAccess: (state, action) => {
      const update = action.payload;

      if (!update || typeof update !== "object") {
        return;
      }

      const previousIdentity = getAuthCacheIdentity({ auth: state });

      const currentAccess = state.workspaceAccess || {};
      const preferences = update.preferences
        ? {
            ...(currentAccess.preferences || {}),
            ...update.preferences,
            ...(update.preferences.notifications
              ? {
                  notifications: {
                    ...(currentAccess.preferences?.notifications || {}),
                    ...update.preferences.notifications,
                  },
                }
              : {}),
            ...(update.preferences.contextualGuides
              ? {
                  contextualGuides: {
                    ...(currentAccess.preferences?.contextualGuides || {}),
                    ...update.preferences.contextualGuides,
                  },
                }
              : {}),
          }
        : currentAccess.preferences;

      state.workspaceAccess = normalizeWorkspaceAccess({
        ...currentAccess,
        ...update,
        ...(preferences !== undefined ? { preferences } : {}),
      });
      state.workspaceAccessResolved = true;
      advanceBoundaryForIdentityReplacement(state, previousIdentity);
    },

    updateCurrentUser: (state, action) => {
      if (!action.payload || typeof action.payload !== "object") {
        return;
      }

      const previousIdentity = getAuthCacheIdentity({ auth: state });

      state.userInfo = {
        ...(state.userInfo || {}),
        ...action.payload,
      };
      advanceBoundaryForIdentityReplacement(state, previousIdentity);
    },

    updateCurrentTenant: (state, action) => {
      if (!action.payload || typeof action.payload !== "object") {
        return;
      }

      const previousIdentity = getAuthCacheIdentity({ auth: state });

      state.tenant = {
        ...(state.tenant || {}),
        ...action.payload,
        ...(action.payload.settings
          ? {
              settings: {
                ...(state.tenant?.settings || {}),
                ...action.payload.settings,
              },
            }
          : {}),
      };
      advanceBoundaryForIdentityReplacement(state, previousIdentity);
    },

    beginAuthContextTransition: (state, action) => {
      const authContext = normalizeAuthContext(action.payload);

      advanceSessionEpoch(state);
      advanceSessionBoundaryEpoch(state);
      clearAuthState(state);
      state.authContext = authContext;
      state.sessionReady = false;
    },

    claimAuthRequest: (state, action) => {
      const authContext = normalizeAuthContext(action.payload);

      advanceSessionEpoch(state);
      advanceSessionBoundaryEpoch(state);

      if (authContext) {
        state.authContext = authContext;
      }

      state.sessionReady = false;
    },

    logOut: (state, action) => {
      const authContext = normalizeAuthContext(
        action.payload?.authContext ?? action.payload,
      );

      advanceSessionEpoch(state);
      advanceSessionBoundaryEpoch(state);
      clearAuthState(state);
      state.authContext = authContext;
      state.sessionReady = true;
    },

    markSessionReady: (state, action) => {
      const authContext = normalizeAuthContext(action.payload);

      if (authContext) {
        state.authContext = authContext;
      }

      state.sessionReady = true;
    },

    markTenantOnboardingComplete: (state) => {
      if (!state.tenant) {
        return;
      }

      state.tenant.onboarding = {
        ...(state.tenant.onboarding || {}),
        completed: true,
      };
    },
  },
});

export const {
  setCredentials,
  setWorkspaceAccess,
  updateWorkspaceAccess,
  updateCurrentUser,
  updateCurrentTenant,
  beginAuthContextTransition,
  claimAuthRequest,
  logOut,
  markSessionReady,
  markTenantOnboardingComplete,
} = authSlice.actions;

export default authSlice.reducer;

export const selectCurrentToken = (state) => state.auth.token;

export const selectCurrentUser = (state) => state.auth.userInfo;

export const selectCurrentTenant = (state) => state.auth.tenant;

export const selectCurrentWorkspaceAccess = (state) =>
  state.auth.workspaceAccess;

export const selectCurrentAuthContext = (state) => {
  const explicitContext =
    normalizeAuthContext(state.auth.authContext) ||
    normalizeAuthContext(state.auth.userInfo?.authContext);

  if (explicitContext) {
    return explicitContext;
  }

  const platformRole = String(state.auth.userInfo?.platformRole || "")
    .trim()
    .toLowerCase();

  if (platformRole && platformRole !== "none") {
    return AUTH_CONTEXTS.WORKSPACE;
  }

  if (
    state.auth.workspaceAccess &&
    typeof state.auth.workspaceAccess === "object"
  ) {
    return AUTH_CONTEXTS.WORKSPACE;
  }

  if (
    state.auth.workspaceAccessResolved &&
    state.auth.workspaceAccess === null
  ) {
    return AUTH_CONTEXTS.CUSTOMER;
  }

  return null;
};

export const selectIsWorkspaceAccessResolved = (state) =>
  Boolean(state.auth.workspaceAccessResolved);

export const selectCurrentWorkspacePermissions = (state) =>
  getWorkspaceAccessPermissions(state.auth.workspaceAccess);

export const selectHasWorkspacePermission = (permission) => (state) =>
  hasPermission(state.auth.workspaceAccess, permission);

export const selectCurrentTenantId = (state) =>
  state.auth.tenant?.id ?? state.auth.userInfo?.tenant ?? null;

export const selectIsAuthenticated = (state) =>
  Boolean(state.auth.token && state.auth.userInfo);

export const selectIsCustomerAuthenticated = (state) => {
  const platformRole = String(state.auth.userInfo?.platformRole || "")
    .trim()
    .toLowerCase();

  return Boolean(
    selectIsAuthenticated(state) &&
    selectCurrentAuthContext(state) === AUTH_CONTEXTS.CUSTOMER &&
    state.auth.workspaceAccessResolved &&
    state.auth.workspaceAccess === null &&
    (!platformRole || platformRole === "none"),
  );
};

export const selectIsWorkspaceAuthenticated = (state) =>
  Boolean(
    selectIsAuthenticated(state) &&
    selectCurrentAuthContext(state) === AUTH_CONTEXTS.WORKSPACE,
  );

export const selectIsSessionReady = (state) => Boolean(state.auth.sessionReady);

export const selectAuthSessionEpoch = (state) =>
  Number.isSafeInteger(state.auth.sessionEpoch) ? state.auth.sessionEpoch : 0;

export const selectAuthSessionBoundaryEpoch = (state) =>
  Number.isSafeInteger(state.auth.sessionBoundaryEpoch)
    ? state.auth.sessionBoundaryEpoch
    : 0;

export const selectIsSessionReadyForContext = (authContext) => (state) =>
  Boolean(
    state.auth.sessionReady &&
    selectCurrentAuthContext(state) === normalizeAuthContext(authContext),
  );
