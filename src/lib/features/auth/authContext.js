import { jwtDecode } from "jwt-decode";

import { stripRolloutEligibleLocalePrefix } from "@/i18n/locales";
import { getConfiguredRootHostname } from "@/utils/tenantRouting";

export const AUTH_CONTEXTS = Object.freeze({
  CUSTOMER: "customer",
  WORKSPACE: "workspace",
});

const LOCAL_PLATFORM_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const PLATFORM_SUBDOMAINS = new Set(["admin", "app", "www"]);

export const normalizeAuthContext = (value) => {
  const context = String(value || "")
    .trim()
    .toLowerCase();

  return context === AUTH_CONTEXTS.CUSTOMER ||
    context === AUTH_CONTEXTS.WORKSPACE
    ? context
    : null;
};

const normalizeHostname = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");

export const isCustomerSocialCompletePath = (pathname) => {
  const normalizedPathname = stripRolloutEligibleLocalePrefix(pathname);

  return (
    normalizedPathname === "/login/complete" ||
    normalizedPathname.startsWith("/login/complete/")
  );
};

const isWorkspacePath = (pathname) => {
  const normalizedPathname = stripRolloutEligibleLocalePrefix(pathname);

  return (
    normalizedPathname === "/app" || normalizedPathname.startsWith("/app/")
  );
};

const getBrowserLocation = () => {
  if (typeof window === "undefined") {
    return {};
  }

  return {
    hostname: window.location.hostname,
    pathname: window.location.pathname,
  };
};

const isPlatformHostname = (hostname, rootHostname) => {
  if (!hostname || LOCAL_PLATFORM_HOSTS.has(hostname)) {
    return true;
  }

  if (!rootHostname) {
    return false;
  }

  if (hostname === rootHostname) {
    return true;
  }

  const suffix = `.${rootHostname}`;
  if (!hostname.endsWith(suffix)) {
    return false;
  }

  const subdomain = hostname.slice(0, -suffix.length);
  return PLATFORM_SUBDOMAINS.has(subdomain);
};

/**
 * Resolve which refresh-cookie audience owns the active browser surface.
 * The app path is always workspace-owned, including on a custom tenant domain.
 * Every non-app page on a tenant/custom domain is customer-owned.
 */
export const resolveAuthContextForLocation = ({
  hostname,
  pathname,
  rootHostname,
} = {}) => {
  const browserLocation = getBrowserLocation();
  const resolvedPathname = pathname ?? browserLocation.pathname ?? "/";

  if (isWorkspacePath(resolvedPathname)) {
    return AUTH_CONTEXTS.WORKSPACE;
  }

  const resolvedHostname = normalizeHostname(
    hostname ?? browserLocation.hostname,
  );
  const resolvedRootHostname = normalizeHostname(
    rootHostname ?? getConfiguredRootHostname(),
  );

  return isPlatformHostname(resolvedHostname, resolvedRootHostname)
    ? AUTH_CONTEXTS.WORKSPACE
    : AUTH_CONTEXTS.CUSTOMER;
};

export const getTenantPostLoginPath = ({
  authContext,
  tenant,
  workspaceAccess,
} = {}) => {
  if (
    normalizeAuthContext(authContext) === AUTH_CONTEXTS.CUSTOMER &&
    workspaceAccess === null
  ) {
    return "/portal";
  }

  if (tenant?.onboarding?.completed === false) {
    return "/app/onboarding";
  }

  const landingPage = workspaceAccess?.preferences?.defaultLandingPage;

  return typeof landingPage === "string" &&
    (landingPage === "/app" || landingPage.startsWith("/app/"))
    ? landingPage
    : "/app";
};

export const getRefreshEndpointForAuthContext = (authContext) =>
  normalizeAuthContext(authContext) === AUTH_CONTEXTS.CUSTOMER
    ? "/auth/customer/refresh"
    : "/auth/refresh";

export const getLogoutEndpointForAuthContext = (authContext) =>
  normalizeAuthContext(authContext) === AUTH_CONTEXTS.CUSTOMER
    ? "/auth/customer/logout"
    : "/auth/logout";

export const getSignedUserInfo = (accessToken) => {
  try {
    return jwtDecode(accessToken)?.UserInfo ?? null;
  } catch {
    return null;
  }
};

const hasPlatformRole = (user) => {
  const role = String(user?.platformRole || "")
    .trim()
    .toLowerCase();

  return Boolean(role && role !== "none");
};

const normalizeIdentifier = (value) => String(value ?? "").trim();

const hasWorkspaceAuthorizationClaims = (user) => {
  const nullableWorkspaceClaims = [
    user?.workspaceRole,
    user?.membershipId,
    user?.authorizationVersion,
    user?.workspaceAccess,
  ];
  const privilegedFlags = [
    user?.isAdmin,
    user?.isModerator,
    user?.isOwner,
    user?.isStaff,
  ];

  return (
    nullableWorkspaceClaims.some(
      (value) => value !== null && value !== undefined,
    ) || privilegedFlags.some((value) => value !== false && value !== undefined)
  );
};

/**
 * Authentication responses are accepted only when both the response contract
 * and the signed JWT audience agree. Rich response profile fields are never
 * allowed to change the signed audience.
 */
export const isAuthResponseForContext = (response, expectedContext) => {
  const context = normalizeAuthContext(expectedContext);
  const responseContext = normalizeAuthContext(response?.authContext);
  const signedUser = getSignedUserInfo(response?.accessToken);
  const signedContext = normalizeAuthContext(signedUser?.authContext);

  if (
    !context ||
    responseContext !== context ||
    signedContext !== context ||
    !response?.accessToken ||
    !response?.user ||
    !signedUser
  ) {
    return false;
  }

  if (context === AUTH_CONTEXTS.CUSTOMER) {
    const signedTenantId = normalizeIdentifier(
      signedUser.tenantId ?? signedUser.tenant,
    );
    const responseTenantId = normalizeIdentifier(
      response?.tenant?.id ?? response?.tenant?._id,
    );

    return (
      Boolean(response?.tenant?.slug) &&
      Boolean(signedTenantId) &&
      signedTenantId === responseTenantId &&
      response.workspaceAccess === null &&
      !hasPlatformRole(signedUser) &&
      normalizeIdentifier(signedUser.tenantRole).toLowerCase() ===
        AUTH_CONTEXTS.CUSTOMER &&
      !hasWorkspaceAuthorizationClaims(signedUser)
    );
  }

  if (hasPlatformRole(signedUser)) {
    return true;
  }

  return (
    Boolean(response?.tenant?.slug) &&
    Boolean(
      response?.workspaceAccess &&
      typeof response.workspaceAccess === "object" &&
      !Array.isArray(response.workspaceAccess),
    )
  );
};
