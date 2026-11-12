import {
  DEFAULT_LOCALE,
  normalizeRolloutEligibleLocaleCode,
} from "@/i18n/locales";

const DEFAULT_PLATFORM_URL = "https://shario.io";
const TENANT_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ROOT_HOSTNAME_REGEX =
  /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/;
const IPV4_HOSTNAME_REGEX = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const RESERVED_SUBDOMAINS = new Set([
  "admin",
  "api",
  "app",
  "cdn",
  "docs",
  "status",
  "www",
]);

const withProtocol = (value) =>
  /^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`;

const toUrl = (value, fallback = DEFAULT_PLATFORM_URL) => {
  try {
    return new URL(withProtocol(String(value || fallback).trim()));
  } catch {
    return new URL(fallback);
  }
};

const getBrowserUrl = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return new URL(window.location.href);
  } catch {
    return null;
  }
};

export const normalizeTenantSlug = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

export const isValidTenantSlug = (value) => {
  const slug = normalizeTenantSlug(value);

  return TENANT_SLUG_REGEX.test(slug) && !RESERVED_SUBDOMAINS.has(slug);
};

export const getTenantSlugParam = (params) => {
  const value = params?.tenantSlug ?? params?.["tenant-slug"];
  const slug = Array.isArray(value) ? value[0] : value;

  return normalizeTenantSlug(slug);
};

/**
 * Returns only a route-provided, syntactically valid tenant slug. Public API
 * callers must use this value instead of deriving tenant context from the
 * browser hostname, a tenant id, or mutable client state.
 */
export const getValidatedTenantSlugParam = (params) => {
  const slug = getTenantSlugParam(params);

  return isValidTenantSlug(slug) ? slug : "";
};

/**
 * Resolve the tenant slug carried by an authenticated workspace session.
 * Refresh responses are allowed to omit the rich tenant object, so routing
 * cannot rely on `tenant.slug` alone when handing off from the platform host.
 */
export const getAuthenticatedTenantSlug = ({
  tenant,
  user,
  workspaceAccess,
} = {}) => {
  const candidates = [
    tenant?.slug,
    user?.tenantSlug,
    user?.workspaceSlug,
    user?.tenant?.slug,
    workspaceAccess?.tenantSlug,
    workspaceAccess?.workspaceSlug,
    workspaceAccess?.tenant?.slug,
    workspaceAccess?.membership?.tenantSlug,
    workspaceAccess?.membership?.tenant?.slug,
  ];

  for (const candidate of candidates) {
    const slug = normalizeTenantSlug(candidate);

    if (isValidTenantSlug(slug)) {
      return slug;
    }
  }

  return "";
};

export const encodeTenantSlugPathSegment = (value) => {
  const slug = normalizeTenantSlug(Array.isArray(value) ? value[0] : value);

  if (!isValidTenantSlug(slug)) {
    throw new TypeError("A valid tenant slug is required.");
  }

  return encodeURIComponent(slug);
};

export const isLocalHostname = (hostname) => {
  const normalizedHostname = String(hostname || "")
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");

  return (
    normalizedHostname === "localhost" ||
    normalizedHostname.endsWith(".localhost") ||
    normalizedHostname === "127.0.0.1" ||
    normalizedHostname === "::1"
  );
};

const getConfiguredPlatformUrl = () =>
  toUrl(process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_PLATFORM_URL);

export const normalizeRootHostname = (value) => {
  const rawValue = String(value || "").trim();

  if (!rawValue) {
    return "";
  }

  try {
    const parsedUrl = new URL(withProtocol(rawValue));

    if (
      !["http:", "https:"].includes(parsedUrl.protocol) ||
      parsedUrl.username ||
      parsedUrl.password
    ) {
      return "";
    }

    const hostname = parsedUrl.hostname
      .trim()
      .toLowerCase()
      .replace(/^\[|\]$/g, "")
      .replace(/^www\./, "")
      .replace(/\.$/, "");

    if (
      !hostname ||
      hostname.includes(":") ||
      IPV4_HOSTNAME_REGEX.test(hostname) ||
      !ROOT_HOSTNAME_REGEX.test(hostname)
    ) {
      return "";
    }

    return hostname;
  } catch {
    return "";
  }
};

const getConfiguredUrlHostname = (value, prefixes = []) => {
  const rawValue = String(value || "").trim();

  if (!rawValue) {
    return "";
  }

  try {
    let hostname = new URL(withProtocol(rawValue)).hostname
      .trim()
      .toLowerCase()
      .replace(/\.$/, "");

    for (const prefix of prefixes) {
      if (hostname.startsWith(`${prefix}.`)) {
        hostname = hostname.slice(prefix.length + 1);
        break;
      }
    }

    return normalizeRootHostname(hostname);
  } catch {
    return "";
  }
};

/**
 * Resolve the browser-facing root domain from every public routing setting.
 *
 * NEXT_PUBLIC_ROOT_DOMAIN remains authoritative. The URL fallbacks make a
 * local setup resilient when an older .env only defines
 * NEXT_PUBLIC_SITE_URL/NEXT_PUBLIC_API_URL. In particular, they keep
 * `shario.localhost` intact instead of accidentally redirecting a newly
 * registered owner to the incompatible `tenant.localhost` site.
 */
export const getConfiguredRootHostname = () => {
  const explicitRoot = normalizeRootHostname(
    process.env.NEXT_PUBLIC_ROOT_DOMAIN,
  );

  if (explicitRoot) {
    return explicitRoot;
  }

  const siteRoot = getConfiguredUrlHostname(process.env.NEXT_PUBLIC_SITE_URL, [
    "www",
  ]);
  const apiRoot = getConfiguredUrlHostname(process.env.NEXT_PUBLIC_API_URL, [
    "api",
  ]);

  if (siteRoot && siteRoot !== "localhost") {
    return siteRoot;
  }

  // Prefer a same-site wildcard localhost API root over a legacy bare
  // localhost site URL when both are present.
  if (apiRoot && apiRoot !== "localhost" && apiRoot.endsWith(".localhost")) {
    return apiRoot;
  }

  return siteRoot || apiRoot;
};

const getBaseUrl = (baseUrl) => {
  if (baseUrl) {
    return toUrl(baseUrl);
  }

  const browserUrl = getBrowserUrl();

  // Keep the active protocol and port during local development.
  if (browserUrl && isLocalHostname(browserUrl.hostname)) {
    return browserUrl;
  }

  return getConfiguredPlatformUrl();
};

const getRootHostname = (baseUrl) => {
  const configuredRootHostname = getConfiguredRootHostname();

  // A nested localhost root (for example shario.localhost) lets the platform,
  // API and tenant hosts share one browser site during development.
  if (configuredRootHostname) {
    return configuredRootHostname;
  }

  if (isLocalHostname(baseUrl.hostname)) {
    const hostname = normalizeRootHostname(baseUrl.hostname);
    const labels = hostname.split(".").filter(Boolean);

    if (labels.at(-1) === "localhost" && labels.length > 2) {
      return labels.slice(1).join(".");
    }

    return hostname === "shario.localhost" ? hostname : "localhost";
  }

  return getConfiguredPlatformUrl()
    .hostname.toLowerCase()
    .replace(/^www\./, "");
};

const normalizeLocale = (locale) =>
  normalizeRolloutEligibleLocaleCode(locale) || DEFAULT_LOCALE;

const getRelativeUrl = (pathname) => {
  const normalizedPathname = String(pathname || "/").trim();
  const safePathname = `/${normalizedPathname.replace(/^\/+/, "")}`;

  return new URL(safePathname, "https://internal.invalid");
};

const buildLocalizedUrl = ({ baseUrl, hostname, locale, pathname }) => {
  const targetUrl = new URL(baseUrl.origin);
  const relativeUrl = getRelativeUrl(pathname);
  const normalizedLocale = normalizeLocale(locale);

  targetUrl.hostname = hostname;
  targetUrl.pathname =
    relativeUrl.pathname === "/"
      ? `/${normalizedLocale}`
      : `/${normalizedLocale}${relativeUrl.pathname}`;
  targetUrl.search = relativeUrl.search;
  targetUrl.hash = relativeUrl.hash;

  return targetUrl.toString();
};

export const getTenantHostname = ({ slug, baseUrl } = {}) => {
  const normalizedSlug = normalizeTenantSlug(slug);

  if (!isValidTenantSlug(normalizedSlug)) {
    throw new TypeError("A valid tenant slug is required.");
  }

  const resolvedBaseUrl = getBaseUrl(baseUrl);
  const rootHostname = getRootHostname(resolvedBaseUrl);

  return `${normalizedSlug}.${rootHostname}`;
};

export const getTenantSlugFromHostname = (hostname, rootDomain) => {
  const normalizedHostname = String(hostname || "")
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");
  const normalizedRootDomain =
    normalizeRootHostname(
      rootDomain || process.env.NEXT_PUBLIC_ROOT_DOMAIN || "shario.io",
    ) || "shario.io";

  if (normalizedHostname === normalizedRootDomain) {
    return null;
  }

  const configuredSuffix = `.${normalizedRootDomain}`;
  const suffix = normalizedHostname.endsWith(configuredSuffix)
    ? configuredSuffix
    : normalizedHostname.endsWith(".localhost")
      ? ".localhost"
      : null;

  if (!suffix) {
    return null;
  }

  const slug = normalizedHostname.slice(0, -suffix.length);

  return !slug.includes(".") &&
    !RESERVED_SUBDOMAINS.has(slug) &&
    isValidTenantSlug(slug)
    ? slug
    : null;
};

/**
 * Accepts either a workspace slug or one of the tenant URLs users commonly
 * paste into the central sign-in form. Parsing the hostname first prevents a
 * nested local host such as `studio.shario.localhost` from being flattened into
 * an incorrect slug by character replacement.
 */
export const getTenantSlugFromWorkspaceInput = (value, rootDomain) => {
  const input = normalizeTenantSlug(value);

  if (isValidTenantSlug(input)) {
    return input;
  }

  let hostname = "";

  try {
    hostname = new URL(withProtocol(input)).hostname;
  } catch {
    return "";
  }

  const candidateRoots = [
    normalizeRootHostname(rootDomain),
    getConfiguredRootHostname(),
    "shario.io",
    "shario.localhost",
    "localhost",
  ].filter(Boolean);

  const normalizedHostname = normalizeRootHostname(hostname);
  const isPlatformHostname = candidateRoots.some(
    (candidateRoot) =>
      normalizedHostname === candidateRoot ||
      ["www", "app", "admin", "api"].some(
        (prefix) => normalizedHostname === `${prefix}.${candidateRoot}`,
      ),
  );

  if (isPlatformHostname) {
    return "";
  }

  for (const candidateRoot of new Set(candidateRoots)) {
    const tenantSlug = getTenantSlugFromHostname(hostname, candidateRoot);

    if (tenantSlug) {
      return tenantSlug;
    }
  }

  return isValidTenantSlug(hostname) ? normalizeTenantSlug(hostname) : "";
};

export const buildTenantUrl = ({
  slug,
  locale = DEFAULT_LOCALE,
  pathname = "/",
  baseUrl,
} = {}) => {
  const resolvedBaseUrl = getBaseUrl(baseUrl);
  const hostname = getTenantHostname({
    slug,
    baseUrl: resolvedBaseUrl,
  });

  return buildLocalizedUrl({
    baseUrl: resolvedBaseUrl,
    hostname,
    locale,
    pathname,
  });
};

export const buildRegisteredTenantOnboardingUrl = ({
  tenant,
  requestedSlug,
  locale = DEFAULT_LOCALE,
  baseUrl,
} = {}) => {
  const responseSlug = normalizeTenantSlug(tenant?.slug);
  const fallbackSlug = normalizeTenantSlug(requestedSlug);
  const slug = isValidTenantSlug(responseSlug)
    ? responseSlug
    : isValidTenantSlug(fallbackSlug)
      ? fallbackSlug
      : "";

  if (!slug) {
    throw new TypeError(
      "Tenant registration did not return a valid workspace slug.",
    );
  }

  return buildTenantUrl({
    slug,
    locale,
    pathname: "/app/onboarding",
    baseUrl,
  });
};

export const buildPlatformUrl = ({
  locale = DEFAULT_LOCALE,
  pathname = "/",
  baseUrl,
} = {}) => {
  const resolvedBaseUrl = getBaseUrl(baseUrl);
  const hostname = getRootHostname(resolvedBaseUrl);

  return buildLocalizedUrl({
    baseUrl: resolvedBaseUrl,
    hostname,
    locale,
    pathname,
  });
};

export const buildInternalAdminUrl = ({
  locale = DEFAULT_LOCALE,
  pathname = "/",
  baseUrl,
} = {}) => {
  const resolvedBaseUrl = getBaseUrl(baseUrl);
  const rootHostname = getRootHostname(resolvedBaseUrl);

  return buildLocalizedUrl({
    baseUrl: resolvedBaseUrl,
    hostname: `admin.${rootHostname}`,
    locale,
    pathname,
  });
};
