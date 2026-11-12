import {
  getRefreshEndpointForAuthContext,
  normalizeAuthContext,
  resolveAuthContextForLocation,
} from "@/lib/features/auth/authContext";
import {
  DEFAULT_LOCALE,
  getRolloutEligibleLocaleFromPathname,
} from "@/i18n/locales";
import {
  AUTH_REQUEST_RESULTS,
  completeAuthRequest,
  createAuthRequestSnapshot,
  invalidateAuthRequestIfCurrent,
  isAuthRequestCurrent,
  isAuthRequestBoundaryCurrent,
  isAuthRequestForSamePrincipal,
} from "@/lib/features/auth/authSession";
import { PERMISSIONS, hasPermission } from "@/config/permissions";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { Mutex } from "async-mutex";

const mutex = new Mutex();

const ANONYMOUS_API_ENDPOINTS = new Set([
  "previewTeamInvitation",
  "acceptTeamInvitation",
  "getPublicProducts",
  "getPublicCourseProducts",
  "getPublicProduct",
  "getPublicBookingLocations",
  "getPublicBookingOccupancyLocations",
  "getPublicBookingAvailability",
  "getPublicBookingOccupancy",
  "getPublicCourseSessions",
  "getPublicCourseLocations",
  "guestCheckout",
  "quoteGuestCourseVoucher",
  "getGuestCheckoutOrderStatus",
  "requestGuestWaitlistVerification",
  "verifyGuestWaitlist",
  "manageGuestWaitlist",
  "withdrawGuestWaitlist",
  "inspectWaitlistOffer",
  "checkoutGuestWaitlistOffer",
  "getPublicConciergeConfig",
  "sendPublicConciergeMessage",
]);

export const prepareApiHeaders = (headers, { getState, endpoint }) => {
  if (ANONYMOUS_API_ENDPOINTS.has(endpoint)) {
    headers.delete("authorization");
    return headers;
  }

  const token = getState()?.auth?.token;

  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }

  return headers;
};

/*
|--------------------------------------------------------------------------
| Base query
|--------------------------------------------------------------------------
*/

const baseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_URL,

  /*
   * Required so that the browser stores and sends
   * the HTTP-only refresh-token cookie.
   */
  credentials: "include",

  prepareHeaders: prepareApiHeaders,
});

/*
|--------------------------------------------------------------------------
| Request helpers
|--------------------------------------------------------------------------
*/

const getRequestUrl = (args) => {
  if (typeof args === "string") {
    return args;
  }

  return args?.url ?? "";
};

const getRequestPathname = (args) => {
  const url = getRequestUrl(args);

  /*
   * RTK Query normally receives relative URLs here.
   * Removing the query string ensures that something such as
   * /auth?redirect=/app is still recognised as an auth route.
   */
  return url.split("?")[0];
};

const AUTH_SESSION_MUTATION_PATHS = new Set([
  "/auth",
  "/auth/customer",
  "/auth/customer/login",
  "/auth/logout",
  "/auth/customer/logout",
  "/auth/refresh",
  "/auth/customer/refresh",
  "/auth/register",
  "/auth/tenant/register",
  "/account/password",
  "/password-reset/reset",
  "/users/pass",
]);

export const shouldSerializeAuthSessionMutation = (args) => {
  const method = String(args?.method || "GET")
    .trim()
    .toUpperCase();

  return (
    ["POST", "PUT", "PATCH", "DELETE"].includes(method) &&
    AUTH_SESSION_MUTATION_PATHS.has(getRequestPathname(args))
  );
};

const shouldSkipAutomaticReauth = (args) => {
  const pathname = getRequestPathname(args);

  /*
   * Do not automatically call /auth/refresh after:
   *
   * - failed login
   * - failed registration
   * - failed password reset
   * - failed logout
   * - failed refresh
   */
  return (
    pathname === "/auth" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/password-reset/")
  );
};

const createAuthSessionChangedResult = () => ({
  error: {
    status: "CUSTOM_ERROR",
    error: "Authentication session changed before the request was sent.",
    data: { code: "AUTH_SESSION_CHANGED" },
  },
});

export const getSubscriptionBillingPathForPathname = (pathname) => {
  const locale =
    getRolloutEligibleLocaleFromPathname(pathname) || DEFAULT_LOCALE;

  return `/${locale}/app/settings/billing`;
};

const redirectRestrictedBillingViewer = (result, api) => {
  const error = result?.error;

  if (
    error?.status !== 403 ||
    error?.data?.code !== "TENANT_SUBSCRIPTION_REQUIRED" ||
    typeof window === "undefined"
  ) {
    return;
  }

  const workspaceAccess = api.getState()?.auth?.workspaceAccess;

  if (!hasPermission(workspaceAccess, PERMISSIONS.SUBSCRIPTION_VIEW)) {
    return;
  }

  const billingPath = getSubscriptionBillingPathForPathname(
    window.location.pathname,
  );

  if (!window.location.pathname.startsWith(billingPath)) {
    window.location.replace(`${billingPath}?reason=subscription`);
  }
};

/*
|--------------------------------------------------------------------------
| Automatic access-token refresh
|--------------------------------------------------------------------------
*/

export const createBaseQueryWithReauth =
  ({
    executeBaseQuery = baseQuery,
    authMutex = mutex,
    getCurrentAuthContext = resolveAuthContextForLocation,
  } = {}) =>
  async (args, api, extraOptions) => {
    /*
     * Public tenant reads are intentionally independent of whatever signed-in
     * browser session happens to exist. Their request definitions omit
     * cookies, prepareApiHeaders removes bearer tokens, and this branch also
     * prevents an anonymous 401 from initiating an authenticated refresh or a
     * workspace billing redirect.
     */
    if (ANONYMOUS_API_ENDPOINTS.has(api.endpoint)) {
      return executeBaseQuery(args, api, extraOptions);
    }

    /*
     * Authentication requests that can issue, rotate, revoke, or invalidate a
     * refresh cookie share the same mutex as automatic 401 recovery. In
     * particular, an initial session restore must finish before a later login
     * request is sent, otherwise the restore response could arrive last and
     * replace the newly authenticated browser cookie even though its Redux
     * completion is correctly rejected as stale.
     *
     * Automatic 401 recovery calls executeBaseQuery directly while holding
     * this mutex, so it does not recurse through this branch or deadlock.
     */
    if (shouldSerializeAuthSessionMutation(args)) {
      const release = await authMutex.acquire();

      try {
        const result = await executeBaseQuery(args, api, extraOptions);
        redirectRestrictedBillingViewer(result, api);
        return result;
      } finally {
        release();
      }
    }

    const activeAuthContext = normalizeAuthContext(
      api.getState()?.auth?.authContext,
    );
    const authContext = activeAuthContext || getCurrentAuthContext();
    const snapshot = createAuthRequestSnapshot(api.getState(), authContext, {
      allowUnresolvedAuthContext: !activeAuthContext,
    });
    const requestStartedAuthenticated = Boolean(snapshot.cacheIdentity);
    const requestStartedAnonymous = !api.getState()?.auth?.token;
    /*
     * A request that started without a principal is still sent without a
     * token while nobody has signed in, so an audience transition does not
     * make it stale. Public pages start such requests in the same flush as
     * the initial session restore.
     */
    const isStillAnonymous = () =>
      requestStartedAnonymous && !api.getState()?.auth?.token;
    const getLiveAuthContext = () => getCurrentAuthContext();
    const isOriginalRequestCurrent = () => {
      const currentAuthContext = getLiveAuthContext();

      return (
        isAuthRequestBoundaryCurrent(api.getState(), snapshot, {
          currentAuthContext,
        }) &&
        (!requestStartedAuthenticated ||
          isAuthRequestForSamePrincipal(api.getState(), snapshot, {
            currentAuthContext,
          }))
      );
    };
    const isOriginalTokenEpochCurrent = () =>
      isAuthRequestCurrent(api.getState(), snapshot, {
        currentAuthContext: getLiveAuthContext(),
      });

    await authMutex.waitForUnlock();

    if (
      !shouldSkipAutomaticReauth(args) &&
      !isOriginalRequestCurrent() &&
      !isStillAnonymous()
    ) {
      return createAuthSessionChangedResult();
    }

    let result = await executeBaseQuery(args, api, extraOptions);

    const shouldRefresh =
      result?.error?.status === 401 && !shouldSkipAutomaticReauth(args);

    if (!shouldRefresh) {
      redirectRestrictedBillingViewer(result, api);
      return result;
    }

    // The 401 belongs to the identity and browser audience that initiated the
    // original request. Never refresh or replay it after logout, login, or a
    // surface transition has advanced the session generation.
    if (!isOriginalRequestCurrent()) {
      return result;
    }

    if (!authMutex.isLocked()) {
      const release = await authMutex.acquire();

      try {
        if (!isOriginalRequestCurrent()) {
          return result;
        }

        if (!isOriginalTokenEpochCurrent()) {
          result = await executeBaseQuery(args, api, extraOptions);
          redirectRestrictedBillingViewer(result, api);
          return result;
        }

        const refreshResult = await executeBaseQuery(
          {
            url: getRefreshEndpointForAuthContext(authContext),
            method: "POST",
          },
          api,
          extraOptions,
        );

        const refreshData = refreshResult?.data;
        const completion = completeAuthRequest({
          authContext,
          currentAuthContext: getLiveAuthContext(),
          data: refreshData,
          dispatch: api.dispatch,
          getState: api.getState,
          snapshot,
        });

        if (completion !== AUTH_REQUEST_RESULTS.ACCEPTED) {
          return result;
        }

        /*
         * Repeat the original request using the new
         * access token.
         */
        if (isOriginalRequestCurrent()) {
          result = await executeBaseQuery(args, api, extraOptions);
        }
      } catch {
        invalidateAuthRequestIfCurrent({
          authContext,
          currentAuthContext: getLiveAuthContext(),
          dispatch: api.dispatch,
          getState: api.getState,
          snapshot,
        });
      } finally {
        release();
      }
    } else {
      /*
       * Another request is already refreshing the token.
       * Wait for it instead of issuing another refresh.
       */
      await authMutex.waitForUnlock();

      if (isOriginalRequestCurrent()) {
        result = await executeBaseQuery(args, api, extraOptions);
      }
    }

    redirectRestrictedBillingViewer(result, api);
    return result;
  };

const baseQueryWithReauth = createBaseQueryWithReauth();

/*
|--------------------------------------------------------------------------
| API
|--------------------------------------------------------------------------
*/

export const apiSlice = createApi({
  reducerPath: "api",

  baseQuery: baseQueryWithReauth,

  tagTypes: [
    "User",
    "Tenant",
    "TenantSubscription",
    "TenantPaymentConnect",
    "SetupCenter",
    "WorkspaceAccess",
    "WorkspaceTeam",
    "WorkspaceRole",
    "WorkspaceSettings",
    "PublicSite",
    "Account",
    "Product",
    "ClassCategory",
    "Booking",
    "Lecturer",
    "Credits",
    "RedeemedCoupons",
    "CreditTransactions",
    "Notifications",
    "Order",
    "Invoice",
    "InvoiceSettings",
    "CouponOrder",
    "CommunicationAutomations",
    "RegisteredSenderEmails",
    "EmailTemplates",
    "Location",
    "AccessCodePool",
    "AccessCode",
    "AccessCodeAudit",
    "CommunicationEmailLogs",
    "Coupon",
    "Events",
    "InventoryAudit",
    "InventoryItem",
    "InventoryMovement",
    "Membership",
    "MembershipPlan",
    "MembershipCatalog",
    "MembershipLedger",
    "MembershipInvoice",
    "MembershipCheckout",
    "ReorderRequest",
    "StaffTask",
    "StaffPlanning",
    "StaffPlanningSettings",
    "StudioOrders",
    "Supplier",
    "CommunicationOverview",
    "CommunicationConversation",
    "CommunicationMessage",
    "CommunicationKnowledge",
    "CommunicationRoutingRule",
    "CommunicationSettings",
    "CommunicationAudit",
    "CommunicationConsent",
    "CommunicationTimeline",
    "CommunicationSatisfaction",
    "Knowledge",
    "PublicBooking",
    "BookingIntent",
    "Waitlist",
    "AiCapabilities",
    "AiUsage",
    "AiConversation",
    "AiAction",
    "AiBriefing",
    "AiAdvisor",
    "AiSettings",
    "AiFeedback",
    "Reports",
    "DashboardOverview",
    "DataImport",
  ],

  endpoints: () => ({}),
});
