import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";

import { EXPLICIT_LOCALE_COOKIE_NAME } from "./i18n/localePreference";
import { resolveBrowserLocale } from "./i18n/browserLocale";
import { normalizeCountryCode } from "./config/regions";
import { VISITOR_COUNTRY_COOKIE_NAME } from "./utils/visitorPreferences";
import { routing } from "./i18n/routing";
import {
  getConfiguredRootHostname,
  normalizeRootHostname,
} from "./utils/tenantRouting";

const getDefaultRootDomain = () =>
  process.env.NODE_ENV === "production" ? "shario.io" : "shario.localhost";
const TENANT_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const INTERNAL_REWRITE_HEADER = "x-shario-internal-rewrite";
const PUBLIC_PATHNAME_HEADER = "x-shario-public-pathname";
const PUBLIC_SEARCH_HEADER = "x-shario-public-search";
const VERCEL_COUNTRY_HEADER = "x-vercel-ip-country";

const RESERVED_SUBDOMAINS = new Set([
  "admin",
  "api",
  "app",
  "cdn",
  "docs",
  "status",
  "www",
]);

const handleI18nRouting = createMiddleware(routing);

const normalizeHostname = (value) => {
  const rawValue = String(value || "")
    .trim()
    .toLowerCase();

  if (!rawValue) {
    return "";
  }

  try {
    const url = new URL(
      /^[a-z][a-z\d+.-]*:\/\//i.test(rawValue)
        ? rawValue
        : `http://${rawValue}`,
    );

    return url.hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return rawValue.replace(/\.$/, "");
  }
};

const getConfiguredRootDomain = () =>
  (
    normalizeRootHostname(process.env.TENANT_ROOT_DOMAIN) ||
    getConfiguredRootHostname() ||
    getDefaultRootDomain()
  ).replace(/^www\./, "");

const getConfiguredPlatformHostnames = (rootDomain) => {
  const configuredHostnames = String(process.env.PLATFORM_HOSTNAMES || "")
    .split(",")
    .map(normalizeHostname)
    .filter(Boolean);

  return new Set([
    rootDomain,
    `www.${rootDomain}`,
    "localhost",
    "127.0.0.1",
    "::1",
    ...configuredHostnames,
  ]);
};

const getConfiguredCustomDomains = () => {
  const rawMapping = process.env.CUSTOM_DOMAIN_TENANTS;

  if (!rawMapping) {
    return new Map();
  }

  try {
    const mapping = JSON.parse(rawMapping);

    return new Map(
      Object.entries(mapping)
        .map(([hostname, tenantSlug]) => [
          normalizeHostname(hostname),
          String(tenantSlug || "")
            .trim()
            .toLowerCase(),
        ])
        .filter(
          ([hostname, tenantSlug]) =>
            hostname &&
            TENANT_SLUG_REGEX.test(tenantSlug) &&
            !RESERVED_SUBDOMAINS.has(tenantSlug),
        ),
    );
  } catch {
    return new Map();
  }
};

const getConfiguredLegacyTenantSlugs = () =>
  new Set(
    String(process.env.LEGACY_TENANT_SLUGS || "")
      .split(",")
      .map((slug) => slug.trim().toLowerCase())
      .filter(
        (slug) =>
          TENANT_SLUG_REGEX.test(slug) && !RESERVED_SUBDOMAINS.has(slug),
      ),
  );

const getRequestHostname = (request) => {
  const hostHeader = request.headers.get("host");
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const rawHostname = forwardedHost || hostHeader || request.nextUrl.host;

  try {
    return normalizeHostname(new URL(`http://${rawHostname}`).hostname);
  } catch {
    return normalizeHostname(request.nextUrl.hostname);
  }
};

const isDevelopmentIpHostname = (hostname) => {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":");
};

const getRouteableLocale = (value) => {
  const locale = String(value || "").trim();

  return routing.locales.includes(locale) ? locale : null;
};

const hasLocalePrefix = (pathname) => {
  const firstSegment = String(pathname || "/").split("/")[1];

  return routing.locales.includes(firstSegment);
};

const getPlatformLocaleRedirect = (request) => {
  if (
    !["GET", "HEAD"].includes(request.method) ||
    hasLocalePrefix(request.nextUrl.pathname)
  ) {
    return null;
  }

  const rootDomain = getConfiguredRootDomain();
  const hostname = getRequestHostname(request);
  const platformHostnames = getConfiguredPlatformHostnames(rootDomain);

  if (!platformHostnames.has(hostname) && !isDevelopmentIpHostname(hostname)) {
    return null;
  }

  const explicitLocale = getRouteableLocale(
    request.cookies.get(EXPLICIT_LOCALE_COOKIE_NAME)?.value,
  );
  const browserLocale = resolveBrowserLocale(
    request.headers.get("accept-language"),
    routing.locales,
  );
  const locale = explicitLocale || browserLocale;

  if (!locale) return null;

  const redirectUrl = new URL(request.url);
  redirectUrl.pathname =
    request.nextUrl.pathname === "/"
      ? `/${locale}`
      : `/${locale}${request.nextUrl.pathname}`;

  const response = NextResponse.redirect(redirectUrl, 307);
  response.headers.set("cache-control", "private, no-store");
  response.headers.set("vary", "Cookie, Accept-Language");

  return response;
};

const getTenantSlug = (hostname, rootDomain) => {
  if (hostname === rootDomain) {
    return null;
  }

  const configuredSuffix = `.${rootDomain}`;
  const suffix = hostname.endsWith(configuredSuffix)
    ? configuredSuffix
    : hostname.endsWith(".localhost")
      ? ".localhost"
      : null;

  if (!suffix) {
    return null;
  }

  const slug = hostname.slice(0, -suffix.length);

  if (
    !slug ||
    slug.includes(".") ||
    RESERVED_SUBDOMAINS.has(slug) ||
    !TENANT_SLUG_REGEX.test(slug)
  ) {
    return null;
  }

  return slug;
};

const getCanonicalDevelopmentHostname = ({ hostname, rootDomain }) => {
  if (
    process.env.NODE_ENV === "production" ||
    rootDomain === "localhost" ||
    !rootDomain.endsWith(".localhost")
  ) {
    return null;
  }

  if (hostname === rootDomain || hostname.endsWith(`.${rootDomain}`)) {
    return null;
  }

  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  ) {
    return rootDomain;
  }

  if (hostname === "admin.localhost") {
    return `admin.${rootDomain}`;
  }

  const flatLocalTenant = getTenantSlug(hostname, "localhost");

  return flatLocalTenant ? `${flatLocalTenant}.${rootDomain}` : null;
};

const isInternalPathname = (pathname) => {
  const localePattern = routing.locales.join("|");
  const internalPathPattern = new RegExp(
    `^/(?:${localePattern})/(?:tenants|internal-admin)(?:/|$)`,
  );

  return internalPathPattern.test(pathname);
};

const rewriteAfterI18n = ({
  request,
  response,
  internalBase,
  deferLocaleSelection = false,
}) => {
  if (!response.ok) {
    return response;
  }

  const rewrittenUrl = new URL(
    response.headers.get("x-middleware-rewrite") || request.url,
  );
  const [, locale, ...pathSegments] = rewrittenUrl.pathname.split("/");

  if (!routing.locales.includes(locale)) {
    return response;
  }

  const remainingPath = pathSegments.filter(Boolean).join("/");

  const [firstSegment, ...rawLegacyRest] = pathSegments.filter(Boolean);
  let legacyRest = rawLegacyRest;
  let legacySurface = null;

  if (firstSegment === "admin") {
    legacySurface = "app";
  } else if (firstSegment === "rezervace") {
    legacySurface = "portal";
    legacyRest = rawLegacyRest.map((segment, index) => {
      if (index === 0 && segment === "kredity") return "credits";
      if (index === 0 && segment === "ucet") return "account";
      return segment;
    });
  } else if (firstSegment === "onboarding") {
    legacySurface = "app/onboarding";
  } else if (
    firstSegment === "credits" &&
    rawLegacyRest[0] === "purchase-success"
  ) {
    legacySurface = "portal/credits/purchase-success";
    legacyRest = rawLegacyRest.slice(1);
  } else if (firstSegment === "heslo-reset") {
    legacySurface = "password/reset";
  } else if (firstSegment === "heslo") {
    legacySurface = "password";
  }

  if (legacySurface) {
    const redirectUrl = new URL(request.url);
    const suffix = legacyRest.length ? `/${legacyRest.join("/")}` : "";

    redirectUrl.pathname = `${deferLocaleSelection ? "" : `/${locale}`}/${legacySurface}${suffix}`;

    return NextResponse.redirect(redirectUrl, 308);
  }

  rewrittenUrl.pathname = `/${locale}/${internalBase}${
    remainingPath ? `/${remainingPath}` : ""
  }`;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(INTERNAL_REWRITE_HEADER, "1");
  requestHeaders.set(PUBLIC_PATHNAME_HEADER, request.nextUrl.pathname);
  requestHeaders.set(PUBLIC_SEARCH_HEADER, request.nextUrl.search);

  return NextResponse.rewrite(rewrittenUrl, {
    request: {
      headers: requestHeaders,
    },
    headers: response.headers,
  });
};

const notFoundResponse = () =>
  new NextResponse("Not Found", {
    status: 404,
    headers: {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
    },
  });

const getLegacyPathTenantRedirect = ({
  request,
  response,
  hostname,
  legacyTenantSlugs,
  rootDomain,
}) => {
  const localizedUrl = new URL(
    response.headers.get("x-middleware-rewrite") || request.url,
  );
  const [, locale, tenantSlug, authRoute, ...rest] =
    localizedUrl.pathname.split("/");

  if (
    !routing.locales.includes(locale) ||
    !legacyTenantSlugs.has(tenantSlug) ||
    !["login", "registrace", "register"].includes(authRoute) ||
    rest.filter(Boolean).length
  ) {
    return null;
  }

  const redirectUrl = new URL(request.url);
  const localPlatform =
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";

  redirectUrl.hostname = `${tenantSlug}.${
    localPlatform ? "localhost" : rootDomain
  }`;
  redirectUrl.pathname = `/${locale}/${
    authRoute === "login" ? "login" : "register"
  }`;

  return NextResponse.redirect(redirectUrl, 308);
};

const getLegacyPublicSitePreviewRedirect = (request) => {
  if (!["GET", "HEAD"].includes(request.method)) return null;

  const match = request.nextUrl.pathname.match(
    /^\/([^/]+)\/tenants\/([a-z0-9]+(?:-[a-z0-9]+)*)\/public-site-preview$/,
  );
  if (!match || !routing.locales.includes(match[1])) return null;

  const [, locale, requestedTenantSlug] = match;
  const rootDomain = getConfiguredRootDomain();
  const hostname = getRequestHostname(request);
  if (
    getConfiguredPlatformHostnames(rootDomain).has(hostname) ||
    isDevelopmentIpHostname(hostname) ||
    hostname === `admin.${rootDomain}` ||
    hostname === "admin.localhost"
  ) {
    return null;
  }

  const tenantSlug =
    getTenantSlug(hostname, rootDomain) ||
    getConfiguredCustomDomains().get(hostname);
  if (!tenantSlug || tenantSlug !== requestedTenantSlug) return null;

  const redirectUrl = new URL(request.url);
  redirectUrl.pathname = `/${locale}/public-site-preview`;
  const response = NextResponse.redirect(redirectUrl, 307);
  response.headers.set("cache-control", "private, no-store");
  return response;
};

function routeRequest(request) {
  // Explicit URLs and saved language choices take precedence. A first-time
  // platform visitor's language comes from the browser, independently of country.
  const platformLocaleRedirect = getPlatformLocaleRedirect(request);

  if (platformLocaleRedirect) {
    return platformLocaleRedirect;
  }

  const rootDomain = getConfiguredRootDomain();
  const hostname = getRequestHostname(request);
  const customDomains = getConfiguredCustomDomains();
  const tenantSlug = getTenantSlug(hostname, rootDomain);
  const customDomainTenantSlug = customDomains.get(hostname);
  const firstSegment = request.nextUrl.pathname.split("/")[1];

  if (
    ["GET", "HEAD"].includes(request.method) &&
    !hasLocalePrefix(request.nextUrl.pathname) &&
    (tenantSlug || customDomainTenantSlug) &&
    ![
      "app",
      "admin",
      "onboarding",
      "public-site-preview",
      "tenants",
      "internal-admin",
    ].includes(firstSegment)
  ) {
    // Resolve the studio configuration in its server layout before selecting a
    // public language. next-intl's browser/NEXT_LOCALE detection must not choose
    // English ahead of a studio's Czech primary language.
    const localizedUrl = new URL(request.url);
    localizedUrl.pathname = `/${routing.defaultLocale}${request.nextUrl.pathname === "/" ? "" : request.nextUrl.pathname}`;
    return rewriteAfterI18n({
      request,
      response: NextResponse.rewrite(localizedUrl),
      internalBase: `tenants/${tenantSlug || customDomainTenantSlug}`,
      deferLocaleSelection: true,
    });
  }

  const i18nResponse = handleI18nRouting(request);

  // Preserve next-intl locale redirects, such as `/` -> `/en`.
  if (!i18nResponse.ok) {
    return i18nResponse;
  }

  // These segments are implementation details and must never be public URLs.
  // Next.js runs the proxy again for our internal hostname rewrite, so allow
  // only the request that was explicitly marked by rewriteAfterI18n.
  if (isInternalPathname(request.nextUrl.pathname)) {
    if (request.headers.get(INTERNAL_REWRITE_HEADER) === "1") {
      return i18nResponse;
    }

    // Cached editors used this exact internal preview URL. Recover through
    // the public route only on the matching tenant's host; never serve the
    // internal route or permit cross-tenant and workspace paths.
    return getLegacyPublicSitePreviewRedirect(request) || notFoundResponse();
  }

  const platformHostnames = getConfiguredPlatformHostnames(rootDomain);
  const legacyTenantSlugs = getConfiguredLegacyTenantSlugs();

  const canonicalDevelopmentHostname = getCanonicalDevelopmentHostname({
    hostname,
    rootDomain,
  });

  if (
    canonicalDevelopmentHostname &&
    canonicalDevelopmentHostname !== hostname
  ) {
    const redirectUrl = new URL(request.url);
    redirectUrl.hostname = canonicalDevelopmentHostname;

    return NextResponse.redirect(redirectUrl, 307);
  }

  if (hostname === `admin.${rootDomain}` || hostname === "admin.localhost") {
    return rewriteAfterI18n({
      request,
      response: i18nResponse,
      internalBase: "internal-admin",
    });
  }

  if (tenantSlug || customDomainTenantSlug) {
    return rewriteAfterI18n({
      request,
      response: i18nResponse,
      internalBase: `tenants/${tenantSlug || customDomainTenantSlug}`,
    });
  }

  if (platformHostnames.has(hostname) || isDevelopmentIpHostname(hostname)) {
    const legacyPathRedirect = getLegacyPathTenantRedirect({
      request,
      response: i18nResponse,
      hostname,
      legacyTenantSlugs,
      rootDomain,
    });

    if (legacyPathRedirect) {
      return legacyPathRedirect;
    }

    return i18nResponse;
  }

  // Unknown hosts must not fall through to the shario.io marketing site. Paid
  // custom domains are configured as a JSON hostname-to-slug map in
  // CUSTOM_DOMAIN_TENANTS (or can later be backed by a cached edge resolver).
  return notFoundResponse();
}

export default function proxy(request) {
  const response = routeRequest(request);
  const country = normalizeCountryCode(
    request.headers.get(VERCEL_COUNTRY_HEADER),
  );
  const hostname = getRequestHostname(request);
  const platformHostnames = getConfiguredPlatformHostnames(
    getConfiguredRootDomain(),
  );
  if (
    country &&
    (platformHostnames.has(hostname) || isDevelopmentIpHostname(hostname))
  ) {
    // This is a suggestion only, never a billing or authorization decision.
    // The hosting edge supplies the header; do not accept a client query parameter.
    const secure = request.nextUrl.protocol === "https:" ? "; Secure" : "";
    response.headers.append(
      "set-cookie",
      `${VISITOR_COUNTRY_COOKIE_NAME}=${country}; Path=/; Max-Age=86400; SameSite=Lax${secure}`,
    );
    response.headers.set("cache-control", "private, no-store");
    const vary = response.headers.get("vary");
    response.headers.set(
      "vary",
      [vary, VERCEL_COUNTRY_HEADER].filter(Boolean).join(", "),
    );
  }
  return response;
}

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
