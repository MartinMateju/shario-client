import { apiSlice } from "@/lib/features/api/apiSlice";
import {
  beginAuthContextTransition,
  logOut,
  markSessionReady,
  setCredentials,
  setWorkspaceAccess,
  updateCurrentTenant,
  updateCurrentUser,
  updateWorkspaceAccess,
} from "@/lib/features/auth/authSlice";
import { getAuthCacheIdentity } from "@/lib/features/auth/authSession";
import { bindCartOwner, clearCart } from "@/lib/features/cart/cartSlice";
import { REHYDRATE } from "redux-persist";

/**
 * RTK Query cache keys do not include the active auth principal. Keep the
 * cache isolated whenever memory auth is invalidated, changes audience, or
 * is replaced by a different user/tenant/authorization principal.
 */
export const authCacheIsolationMiddleware =
  ({ dispatch, getState }) =>
  (next) =>
  (action) => {
    const isTransition = beginAuthContextTransition.match(action);
    const isLogout = logOut.match(action);
    const isCredentialsUpdate = setCredentials.match(action);
    const isSessionReady = markSessionReady.match(action);
    const isCartRestore =
      action.type === REHYDRATE && action.key === "shario-root";
    const isIdentityUpdate =
      isCredentialsUpdate ||
      setWorkspaceAccess.match(action) ||
      updateWorkspaceAccess.match(action) ||
      updateCurrentUser.match(action) ||
      updateCurrentTenant.match(action);

    if (
      !isTransition &&
      !isLogout &&
      !isIdentityUpdate &&
      !isSessionReady &&
      !isCartRestore
    ) {
      return next(action);
    }

    const previousState = getState();
    const previousIdentity = getAuthCacheIdentity(previousState);
    const hadPrincipal = Boolean(previousState?.auth?.token);
    const result = next(action);
    const nextState = getState();
    const nextIdentity = getAuthCacheIdentity(nextState);
    const credentialsInvalidated = isCredentialsUpdate && !nextIdentity;
    const identityReplaced =
      isIdentityUpdate && previousIdentity !== nextIdentity;
    /*
     * Without a principal the cache only holds anonymous reads. Resetting it
     * on the initial session restore would abort the public queries that
     * mounted components have just started, and RTK Query hooks that never
     * rendered their pending state do not request them again.
     */
    const principalLeft = (isTransition || isLogout) && hadPrincipal;

    if (principalLeft || credentialsInvalidated || identityReplaced) {
      dispatch(apiSlice.util.resetApiState());
      // Keep an anonymous shopping basket when the customer first signs in.
      // A previous authenticated principal must never leave a cart for another.
      if (
        principalLeft ||
        credentialsInvalidated ||
        (identityReplaced && previousIdentity)
      ) {
        dispatch(clearCart());
      }
    }

    // Auth is memory-only while the basket survives reloads. Wait for session
    // resolution before treating a persisted basket as anonymous, and handle
    // either ordering of session restoration and Redux rehydration.
    if (
      nextIdentity ||
      principalLeft ||
      credentialsInvalidated ||
      isLogout ||
      isSessionReady ||
      (isCartRestore && nextState.auth?.sessionReady)
    ) {
      dispatch(bindCartOwner(nextIdentity));
    }

    return result;
  };
