import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  buildPublicTenantLocaleRedirectPath,
  getPublicTenantLocaleCodes,
  resolvePublicTenantRouteLocale,
} from "@/components/public-tenant/publicTenant.config";
import { routing } from "@/i18n/routing";
import { getCustomerLocaleCookieName } from "@/i18n/customerLocalePreference";
import { normalizeLocaleCode } from "@/i18n/locales";

const PUBLIC_PATHNAME_HEADER = "x-shario-public-pathname";
const PUBLIC_SEARCH_HEADER = "x-shario-public-search";

export const enforcePublicTenantRouteLocale = async ({
  tenant,
  locale,
  fallbackPathname = `/${locale}`,
}) => {
  const requestHeaders = await headers();
  const publicPathname = requestHeaders.get(PUBLIC_PATHNAME_HEADER);
  const publicSearch = requestHeaders.get(PUBLIC_SEARCH_HEADER);
  const implicitLocale =
    Boolean(publicPathname) &&
    !normalizeLocaleCode(publicPathname.split("/")[1]);
  let requestedLocale = locale;

  if (implicitLocale) {
    const cookieStore = await cookies();
    const allowed = getPublicTenantLocaleCodes(
      tenant?.settings,
      routing.locales,
    );
    const preferences = ["current", "default"].map((kind) => {
      const cookieName = getCustomerLocaleCookieName(kind, tenant?.slug);
      return cookieName
        ? normalizeLocaleCode(cookieStore.get(cookieName)?.value)
        : null;
    });
    requestedLocale =
      preferences.find((value) => allowed.includes(value)) || null;
  }

  const routeLocale = resolvePublicTenantRouteLocale(
    tenant?.settings,
    requestedLocale,
    routing.locales,
  );

  if (routeLocale === locale && !implicitLocale) {
    return;
  }

  redirect(
    buildPublicTenantLocaleRedirectPath(
      implicitLocale
        ? `/${locale}${publicPathname === "/" ? "" : publicPathname}`
        : publicPathname || fallbackPathname,
      routeLocale,
      publicSearch,
    ),
  );
};
