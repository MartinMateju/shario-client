import { normalizePublicTenant } from "@/components/public-tenant/publicTenant.config";
import { isCustomerPortalNavigationVisible } from "./customerPortalVisibility";

export const CUSTOMER_SHELL_SURFACES = Object.freeze({
  PUBLIC: "public",
  AUTH: "auth",
  PORTAL: "portal",
  TRANSACTION: "transaction",
});

const CUSTOMER_SHELL_SURFACE_VALUES = new Set(
  Object.values(CUSTOMER_SHELL_SURFACES),
);

const TRANSACTION_PATHS = Object.freeze([
  /^\/memberships\/checkout(?:\/|$)/,
  /^\/checkout(?:\/|$)/,
  /^\/portal\/(?:success|cancel|overlap|kapacita)(?:\/|$)/,
  /^\/portal\/credits\/(?:success|cancel|purchase-success)(?:\/|$)/,
]);

const PORTAL_NAVIGATION = Object.freeze([
  Object.freeze({
    key: "bookSession",
    href: "/portal?tab=studio-calendar",
    modules: ["bookings", "courses"],
  }),
  Object.freeze({
    key: "courses",
    href: "/portal/courses",
    module: "courses",
  }),
  Object.freeze({
    key: "memberships",
    href: "/portal/membership",
    module: "memberships",
  }),
  Object.freeze({
    key: "giftVouchers",
    href: "/portal/vouchers",
    module: "vouchers",
  }),
  Object.freeze({ key: "studioGuide", href: "/portal/knowledge" }),
]);

const asObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

const asString = (value) => String(value ?? "").trim();

const hasEnabledModule = (modules, moduleNames) => {
  const names = (
    Array.isArray(moduleNames) ? moduleNames : [moduleNames]
  ).filter(Boolean);

  if (!names.length) return true;
  return names.some((name) => modules[name] !== false);
};

export const normalizeCustomerShellSurface = (value) => {
  const surface = asString(value).toLowerCase();

  return CUSTOMER_SHELL_SURFACE_VALUES.has(surface)
    ? surface
    : CUSTOMER_SHELL_SURFACES.PUBLIC;
};

export const getCustomerShellSurface = (configuredSurface, pathname = "") => {
  const normalizedSurface = normalizeCustomerShellSurface(configuredSurface);
  const normalizedPathname = asString(pathname).split("?")[0] || "/";

  if (TRANSACTION_PATHS.some((pattern) => pattern.test(normalizedPathname))) {
    return CUSTOMER_SHELL_SURFACES.TRANSACTION;
  }

  return normalizedSurface;
};

// Payment results inside the portal keep the quieter transaction navigation,
// while retaining the customer's portal colours. Public checkout and auth
// pages continue to use their own appearance.
export const getCustomerShellAppearanceSurface = (surface, pathname = "") => {
  const normalizedSurface = normalizeCustomerShellSurface(surface);
  const normalizedPathname = asString(pathname).split("?")[0];
  return normalizedSurface === CUSTOMER_SHELL_SURFACES.TRANSACTION &&
    /^\/portal(?:\/|$)/.test(normalizedPathname)
    ? CUSTOMER_SHELL_SURFACES.PORTAL
    : normalizedSurface;
};

export const getCustomerPortalNavigation = (modules = {}, tenant) => {
  if (modules === null || modules === undefined) {
    return PORTAL_NAVIGATION.slice(0, 1)
      .filter(({ key }) => isCustomerPortalNavigationVisible(tenant, key))
      .map(({ key, href }) => ({
        key,
        href,
      }));
  }

  const normalizedModules = asObject(modules);

  return PORTAL_NAVIGATION.filter(
    (item) =>
      isCustomerPortalNavigationVisible(tenant, item.key) &&
      hasEnabledModule(
        normalizedModules,
        item.modules || (item.module ? [item.module] : []),
      ),
  ).map(({ key, href }) => ({ key, href }));
};

export const getCustomerPortalNavigationForLocation = (
  navigation = [],
  location,
) => {
  const bookingEnabled = location?.booking?.enabled;

  return (Array.isArray(navigation) ? navigation : []).filter((item) => {
    if (item?.key === "bookSession") return bookingEnabled !== false;

    return true;
  });
};

export const isCustomerCartSurface = (surface, pathname = "") => {
  if (
    normalizeCustomerShellSurface(surface) !== CUSTOMER_SHELL_SURFACES.PORTAL
  ) {
    return false;
  }

  const normalizedPathname = asString(pathname).split("?")[0];

  return (
    normalizedPathname === "/portal" ||
    normalizedPathname === "/portal/bookings" ||
    normalizedPathname === "/portal/courses" ||
    normalizedPathname.startsWith("/portal/courses/")
  );
};

export const createCustomerShellTenantFallback = ({
  tenantSlug = "",
  locale = "en",
  studioName,
} = {}) =>
  normalizePublicTenant(
    {
      slug: tenantSlug,
      name: studioName || (locale === "cs" ? "Vaše studio" : "Your studio"),
      publicCapabilities: {
        bookStudio: false,
        courses: false,
        memberships: false,
        help: false,
        guestCourseCheckout: false,
        registration: false,
      },
      publicSite: {
        branding: {
          displayName:
            studioName || (locale === "cs" ? "Vaše studio" : "Your studio"),
        },
      },
    },
    tenantSlug,
  );

export const resolveCustomerShellTenant = ({
  publicTenant,
  authenticatedTenant,
  degraded = false,
  surface = CUSTOMER_SHELL_SURFACES.PUBLIC,
}) => {
  const normalizedPublicTenant = normalizePublicTenant(
    publicTenant,
    publicTenant?.slug,
  );
  const normalizedSurface = normalizeCustomerShellSurface(surface);
  const supportsAuthenticatedBranding =
    normalizedSurface === CUSTOMER_SHELL_SURFACES.PORTAL ||
    normalizedSurface === CUSTOMER_SHELL_SURFACES.TRANSACTION;

  if (!degraded || !supportsAuthenticatedBranding) {
    return normalizedPublicTenant;
  }

  const sessionTenant = asObject(authenticatedTenant);
  const sessionBranding = asObject(
    asObject(sessionTenant.publicSite).branding ?? sessionTenant.branding,
  );
  const sessionSettings = asObject(sessionTenant.settings);
  const name =
    asString(sessionBranding.displayName) ||
    asString(sessionTenant.name) ||
    normalizedPublicTenant.name;
  const slug =
    asString(sessionTenant.slug).toLowerCase() || normalizedPublicTenant.slug;

  if (
    normalizedPublicTenant.slug &&
    slug &&
    normalizedPublicTenant.slug !== slug
  ) {
    return normalizedPublicTenant;
  }

  return normalizePublicTenant(
    {
      ...normalizedPublicTenant,
      name,
      slug,
      customerCapabilities:
        sessionTenant.customerCapabilities ||
        normalizedPublicTenant.customerCapabilities,
      settings: {
        ...normalizedPublicTenant.settings,
        ...sessionSettings,
      },
      publicSite: {
        ...normalizedPublicTenant.publicSite,
        // Session snapshots carry the published portal controls when the public
        // configuration endpoint is temporarily unavailable.
        customerPortal:
          sessionTenant.publicSite?.customerPortal ||
          normalizedPublicTenant.publicSite.customerPortal,
        branding: {
          ...normalizedPublicTenant.publicSite.branding,
          ...sessionBranding,
          displayName: name,
        },
      },
    },
    slug,
  );
};
