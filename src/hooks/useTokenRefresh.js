import { useEffect, useRef } from "react";
import { useDispatch, useSelector, useStore } from "react-redux";

import { stripRolloutEligibleLocalePrefix } from "@/i18n/locales";
import { usePathname } from "@/i18n/navigation";
import {
  useCustomerRefreshMutation,
  useRefreshMutation,
} from "@/lib/features/auth/authApiSlice";
import {
  AUTH_CONTEXTS,
  isCustomerSocialCompletePath,
  resolveAuthContextForLocation,
} from "@/lib/features/auth/authContext";
import {
  beginAuthContextTransition,
  selectCurrentAuthContext,
} from "@/lib/features/auth/authSlice";
import {
  createAuthRequestSnapshot,
  restoreAuthSession,
  unwrapWithoutCaching,
} from "@/lib/features/auth/authSession";

const isPlatformAuthHandoff = (target) => {
  if (typeof window === "undefined") {
    return false;
  }

  const pathname = stripRolloutEligibleLocalePrefix(window.location.pathname);
  return pathname === `/${target}` || pathname === `/${target}/`;
};

const isPlatformLogoutHandoff = () => isPlatformAuthHandoff("logout");

const isContextualLoginHandoff = () => isPlatformAuthHandoff("login");

export const useTokenRefresh = () => {
  const pathname = usePathname();
  const [workspaceRefresh] = useRefreshMutation();
  const [customerRefresh] = useCustomerRefreshMutation();
  const dispatch = useDispatch();
  const store = useStore();
  const activeAuthContext = useSelector(selectCurrentAuthContext);
  const attemptedContext = useRef(null);
  const expectedContext = resolveAuthContextForLocation({
    pathname,
    hostname:
      typeof window === "undefined" ? undefined : window.location.hostname,
  });

  useEffect(() => {
    const isCustomerLoginHandoff =
      attemptedContext.current === expectedContext &&
      expectedContext === AUTH_CONTEXTS.WORKSPACE &&
      activeAuthContext === AUTH_CONTEXTS.CUSTOMER &&
      isContextualLoginHandoff();

    if (
      isCustomerLoginHandoff ||
      (attemptedContext.current === expectedContext &&
        (!activeAuthContext || activeAuthContext === expectedContext))
    ) {
      return;
    }

    attemptedContext.current = expectedContext;

    /*
     * The central logout page owns workspace revocation. Do not race it with
     * an automatic refresh request that could restore the session being
     * removed.
     */
    if (isPlatformLogoutHandoff()) {
      return;
    }

    /*
     * The social callback is the sole consumer of its rotated customer
     * refresh cookie. The callback component performs the refresh after it
     * validates the provider result and tenant route.
     */
    if (
      expectedContext === AUTH_CONTEXTS.CUSTOMER &&
      isCustomerSocialCompletePath(pathname)
    ) {
      return;
    }

    dispatch(beginAuthContextTransition(expectedContext));
    const snapshot = createAuthRequestSnapshot(
      store.getState(),
      expectedContext,
    );

    const refresh =
      expectedContext === AUTH_CONTEXTS.CUSTOMER
        ? customerRefresh
        : workspaceRefresh;

    void restoreAuthSession({
      authContext: expectedContext,
      dispatch,
      getCurrentAuthContext: () => resolveAuthContextForLocation(),
      getState: store.getState,
      request: () => unwrapWithoutCaching(refresh()),
      snapshot,
    });
  }, [
    activeAuthContext,
    customerRefresh,
    dispatch,
    expectedContext,
    pathname,
    store,
    workspaceRefresh,
  ]);

  return {};
};
