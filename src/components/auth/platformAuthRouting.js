import { buildInternalAdminUrl, buildTenantUrl } from "@/utils/tenantRouting";
import { routing } from "@/i18n/routing";
import { resolveWorkspaceRouteLocale } from "@/components/views/settings/workspaceLocaleSettings";
import { resolvePublicTenantRouteLocale } from "@/components/public-tenant/publicTenant.config";
import { getUserAccess } from "@/utils/user-profile.utils";
import {
  AUTH_CONTEXTS,
  getTenantPostLoginPath,
  normalizeAuthContext,
} from "@/lib/features/auth/authContext";

export const getPostLoginPath = (
  user,
  tenant,
  workspaceAccess,
  authContext,
) => {
  const explicitAuthContext = normalizeAuthContext(
    authContext ?? user?.authContext,
  );
  const resolvedAuthContext =
    explicitAuthContext ||
    (workspaceAccess === null &&
    !getUserAccess(user, workspaceAccess).isTenantUser
      ? AUTH_CONTEXTS.CUSTOMER
      : AUTH_CONTEXTS.WORKSPACE);

  return getTenantPostLoginPath({
    authContext: resolvedAuthContext,
    tenant,
    workspaceAccess,
  });
};

export const getPostLoginUrl = ({
  user,
  tenant,
  workspaceAccess,
  authContext,
  locale,
  routeableLocaleCodes = routing.locales,
}) => {
  const platformRole = String(user?.platformRole || "")
    .trim()
    .toLowerCase();

  if (platformRole && platformRole !== "none") {
    return buildInternalAdminUrl({ locale, pathname: "/" });
  }

  if (!tenant?.slug) {
    throw new Error("The login response did not include a tenant slug.");
  }

  const pathname = getPostLoginPath(user, tenant, workspaceAccess, authContext);
  const routeLocale = pathname.startsWith("/app")
    ? resolveWorkspaceRouteLocale(tenant.settings, routeableLocaleCodes)
    : resolvePublicTenantRouteLocale(
        tenant.settings,
        user?.customerDefaultLanguage,
        routeableLocaleCodes,
      );

  return buildTenantUrl({
    slug: tenant.slug,
    locale: routeLocale,
    pathname,
  });
};
