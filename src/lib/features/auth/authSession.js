import {
  isAuthResponseForContext,
  normalizeAuthContext,
} from "@/lib/features/auth/authContext";
import {
  getAuthCacheIdentity,
  logOut,
  selectAuthSessionBoundaryEpoch,
  selectAuthSessionEpoch,
  selectCurrentAuthContext,
  setCredentials,
} from "@/lib/features/auth/authSlice";

export { getAuthCacheIdentity };

export const AUTH_REQUEST_RESULTS = Object.freeze({
  ACCEPTED: "accepted",
  INVALID: "invalid",
  STALE: "stale",
});

export const createAuthRequestSnapshot = (
  state,
  authContext,
  { allowUnresolvedAuthContext = false, dynamicAuthContext = false } = {},
) => ({
  sessionEpoch: selectAuthSessionEpoch(state),
  sessionBoundaryEpoch: selectAuthSessionBoundaryEpoch(state),
  authContext: normalizeAuthContext(authContext),
  allowUnresolvedAuthContext: Boolean(allowUnresolvedAuthContext),
  dynamicAuthContext: Boolean(dynamicAuthContext),
  cacheIdentity: getAuthCacheIdentity(state),
});

const isAuthRequestContextCurrent = (state, snapshot, currentAuthContext) => {
  if (snapshot.dynamicAuthContext) {
    return true;
  }

  const activeAuthContext = selectCurrentAuthContext(state);

  if (
    activeAuthContext !== snapshot.authContext &&
    !(snapshot.allowUnresolvedAuthContext && !activeAuthContext)
  ) {
    return false;
  }

  if (
    currentAuthContext !== undefined &&
    normalizeAuthContext(currentAuthContext) !== snapshot.authContext
  ) {
    return false;
  }

  return true;
};

export const isAuthRequestCurrent = (
  state,
  snapshot,
  { currentAuthContext } = {},
) =>
  Boolean(
    snapshot &&
    selectAuthSessionEpoch(state) === snapshot.sessionEpoch &&
    isAuthRequestContextCurrent(state, snapshot, currentAuthContext),
  );

export const isAuthRequestBoundaryCurrent = (
  state,
  snapshot,
  { currentAuthContext } = {},
) =>
  Boolean(
    snapshot &&
    selectAuthSessionBoundaryEpoch(state) === snapshot.sessionBoundaryEpoch &&
    isAuthRequestContextCurrent(state, snapshot, currentAuthContext),
  );

export const isSameAuthPrincipal = (state, snapshot) =>
  Boolean(
    snapshot?.cacheIdentity &&
    getAuthCacheIdentity(state) === snapshot.cacheIdentity,
  );

export const isAuthRequestForSamePrincipal = (
  state,
  snapshot,
  { currentAuthContext } = {},
) => {
  if (
    !snapshot ||
    snapshot.dynamicAuthContext ||
    selectCurrentAuthContext(state) !== snapshot.authContext ||
    !isSameAuthPrincipal(state, snapshot)
  ) {
    return false;
  }

  return (
    currentAuthContext === undefined ||
    normalizeAuthContext(currentAuthContext) === snapshot.authContext
  );
};

export const invalidateAuthRequestIfCurrent = ({
  authContext,
  currentAuthContext,
  dispatch,
  getState,
  snapshot,
}) => {
  if (
    snapshot &&
    !isAuthRequestCurrent(getState(), snapshot, { currentAuthContext })
  ) {
    return AUTH_REQUEST_RESULTS.STALE;
  }

  dispatch(logOut({ authContext }));
  return AUTH_REQUEST_RESULTS.INVALID;
};

export const completeAuthRequest = ({
  authContext,
  currentAuthContext,
  data,
  dispatch,
  getState,
  snapshot,
}) => {
  if (
    snapshot &&
    !isAuthRequestCurrent(getState(), snapshot, { currentAuthContext })
  ) {
    return AUTH_REQUEST_RESULTS.STALE;
  }

  if (!isAuthResponseForContext(data, authContext)) {
    dispatch(logOut({ authContext }));
    return AUTH_REQUEST_RESULTS.INVALID;
  }

  dispatch(
    setCredentials({
      accessToken: data.accessToken,
      user: data.user,
      tenant: data.tenant,
      workspaceAccess: data.workspaceAccess,
      authContext,
    }),
  );

  return AUTH_REQUEST_RESULTS.ACCEPTED;
};

/*
 * Session refresh responses carry access tokens and belong to the caller.
 * Remove the settled mutation from the API cache so a rejected or outdated
 * session never lingers there after the caller logs out.
 */
export const unwrapWithoutCaching = async (pendingMutation) => {
  try {
    return await pendingMutation.unwrap();
  } finally {
    pendingMutation.reset();
  }
};

export const restoreAuthSession = async ({
  authContext,
  dispatch,
  getCurrentAuthContext,
  getState,
  request,
  snapshot,
}) => {
  let data;

  try {
    data = await request();
  } catch {
    return invalidateAuthRequestIfCurrent({
      authContext,
      currentAuthContext: getCurrentAuthContext?.(),
      dispatch,
      getState,
      snapshot,
    });
  }

  return completeAuthRequest({
    authContext,
    currentAuthContext: getCurrentAuthContext?.(),
    data,
    dispatch,
    getState,
    snapshot,
  });
};
