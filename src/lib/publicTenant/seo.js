import { isPublicTenantPageVisible } from "@/components/public-tenant/publicTenant.config";
import {
  isIndexableLocale,
  normalizeRolloutEligibleLocaleCode,
} from "@/i18n/locales";

const TENANT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED_SUBDOMAINS = new Set([
  "admin",
  "api",
  "app",
  "cdn",
  "docs",
  "status",
  "www",
]);

const PUBLIC_CAPABILITY_PATHS = Object.freeze([
  Object.freeze({
    capability: "bookStudio",
    pageKey: "book",
    pathname: "/book",
  }),
  Object.freeze({
    capability: "courses",
    pageKey: "courses",
    pathname: "/courses",
  }),
  Object.freeze({
    capability: "memberships",
    pageKey: "memberships",
    pathname: "/memberships",
  }),
  Object.freeze({
    capability: "vouchers",
    pageKey: "vouchers",
    pathname: "/vouchers",
  }),
  Object.freeze({ capability: "help", pageKey: "help", pathname: "/help" }),
]);

const PRIVATE_PATHS = Object.freeze([
  "/app",
  "/portal",
  "/login",
  "/register",
  "/password",
  "/checkout",
  "/memberships/checkout",
]);

const asString = (value) => String(value ?? "").trim();

const firstForwardedValue = (value) => asString(value).split(",")[0].trim();

const normalizeHostname = (value) => {
  const raw = firstForwardedValue(value).toLowerCase();

  if (!raw) return "";

  try {
    return new URL(
      /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `http://${raw}`,
    ).hostname
      .toLowerCase()
      .replace(/\.$/, "");
  } catch {
    return "";
  }
};

const normalizeConfiguredRootDomain = (value) =>
  normalizeHostname(value || "shario.io").replace(/^www\./, "");

const parseHostnameAndPort = (value) => {
  const raw = firstForwardedValue(value);

  if (!raw || raw.includes("@") || /[/?#\\\u0000-\u001f\u007f]/.test(raw)) {
    return { hostname: "", port: "" };
  }

  try {
    const url = new URL(`http://${raw}`);

    return {
      hostname: url.hostname.toLowerCase().replace(/\.$/, ""),
      port: url.port,
    };
  } catch {
    return { hostname: "", port: "" };
  }
};

const parseCustomDomainTenants = (value) => {
  if (!value) return new Map();

  try {
    const mapping = JSON.parse(value);

    if (!mapping || typeof mapping !== "object" || Array.isArray(mapping)) {
      return new Map();
    }

    return new Map(
      Object.entries(mapping)
        .map(([hostname, tenantSlug]) => [
          normalizeHostname(hostname),
          asString(tenantSlug).toLowerCase(),
        ])
        .filter(
          ([hostname, tenantSlug]) =>
            hostname &&
            TENANT_SLUG_PATTERN.test(tenantSlug) &&
            !RESERVED_SUBDOMAINS.has(tenantSlug),
        ),
    );
  } catch {
    return new Map();
  }
};

const getTenantSlugFromHostname = (hostname, rootDomain) => {
  const suffix = `.${rootDomain}`;

  if (!hostname.endsWith(suffix)) return "";

  const tenantSlug = hostname.slice(0, -suffix.length);

  return tenantSlug &&
    !tenantSlug.includes(".") &&
    TENANT_SLUG_PATTERN.test(tenantSlug) &&
    !RESERVED_SUBDOMAINS.has(tenantSlug)
    ? tenantSlug
    : "";
};

const resolveProtocol = ({ forwardedProto, requestUrl, nodeEnv }) => {
  if (nodeEnv === "production") return "https:";

  const forwarded = firstForwardedValue(forwardedProto).toLowerCase();

  if (forwarded === "http" || forwarded === "https") {
    return `${forwarded}:`;
  }

  try {
    const protocol = new URL(requestUrl).protocol;
    return protocol === "https:" ? "https:" : "http:";
  } catch {
    return "http:";
  }
};

const getConfiguredPlatformHostnames = ({
  rootDomain,
  platformHostnames,
  nodeEnv,
}) => {
  const configured = asString(platformHostnames)
    .split(",")
    .map(normalizeHostname)
    .filter(Boolean);
  const local =
    nodeEnv === "production" ? [] : ["localhost", "127.0.0.1", "::1"];

  return new Set([rootDomain, `www.${rootDomain}`, ...configured, ...local]);
};

/**
 * Resolve only configured platform, direct tenant-subdomain, and configured
 * custom-domain hosts. Unknown Host/X-Forwarded-Host values are never
 * reflected into sitemap or robots output.
 */
export const resolvePublicSeoSite = ({
  requestUrl,
  host,
  forwardedHost,
  forwardedProto,
  nodeEnv = process.env.NODE_ENV,
  rootDomain = process.env.TENANT_ROOT_DOMAIN ||
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ||
    "shario.io",
  platformHostnames = process.env.PLATFORM_HOSTNAMES,
  customDomainTenants = process.env.CUSTOM_DOMAIN_TENANTS,
} = {}) => {
  let requestHost = "";

  try {
    requestHost = new URL(requestUrl).host;
  } catch {
    // The validated Host header remains the primary source.
  }

  const { hostname, port } = parseHostnameAndPort(
    forwardedHost || host || requestHost,
  );
  const normalizedRootDomain = normalizeConfiguredRootDomain(rootDomain);

  if (
    !hostname ||
    !normalizedRootDomain ||
    (nodeEnv === "production" && port)
  ) {
    return { kind: "unknown", origin: "", tenantSlug: "" };
  }

  const protocol = resolveProtocol({
    forwardedProto,
    requestUrl,
    nodeEnv,
  });
  const origin = `${protocol}//${hostname}${
    nodeEnv === "production" || !port ? "" : `:${port}`
  }`;
  const customDomains = parseCustomDomainTenants(customDomainTenants);
  const customDomainTenant = customDomains.get(hostname);

  if (customDomainTenant) {
    return {
      kind: "tenant",
      origin,
      tenantSlug: customDomainTenant,
    };
  }

  const tenantSlug = getTenantSlugFromHostname(hostname, normalizedRootDomain);

  if (tenantSlug) {
    return {
      kind: "tenant",
      origin,
      tenantSlug,
    };
  }

  const platformHosts = getConfiguredPlatformHostnames({
    rootDomain: normalizedRootDomain,
    platformHostnames,
    nodeEnv,
  });

  if (platformHosts.has(hostname)) {
    return {
      kind: "platform",
      origin,
      tenantSlug: "",
    };
  }

  return { kind: "unknown", origin: "", tenantSlug: "" };
};

export const getTenantPublicSeoPaths = (tenant) => {
  const capabilities =
    tenant?.publicCapabilities &&
    typeof tenant.publicCapabilities === "object" &&
    !Array.isArray(tenant.publicCapabilities)
      ? tenant.publicCapabilities
      : {};

  return [
    "/",
    ...PUBLIC_CAPABILITY_PATHS.filter(
      ({ capability, pageKey }) =>
        capabilities[capability] === true &&
        isPublicTenantPageVisible(tenant, pageKey),
    ).map(({ pathname }) => pathname),
  ];
};

const escapeXml = (value) =>
  asString(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const localizePath = (locale, pathname) =>
  pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;

export const normalizePublicSeoLocaleCodes = (
  locales,
  { indexableOnly = false } = {},
) => [
  ...new Set(
    (Array.isArray(locales) ? locales : [])
      .map(normalizeRolloutEligibleLocaleCode)
      .filter(Boolean)
      .filter((locale) => !indexableOnly || isIndexableLocale(locale)),
  ),
];

export const buildPublicSitemapXml = ({
  origin,
  locales = ["en", "cs"],
  paths = ["/"],
}) => {
  const safeLocales = normalizePublicSeoLocaleCodes(locales, {
    indexableOnly: true,
  });
  const safePaths = [
    ...new Set(
      paths.filter(
        (pathname) =>
          pathname === "/" ||
          (pathname.startsWith("/") &&
            !pathname.startsWith("//") &&
            !pathname.includes("\\") &&
            !PRIVATE_PATHS.some(
              (privatePath) =>
                pathname === privatePath ||
                pathname.startsWith(`${privatePath}/`),
            )),
      ),
    ),
  ];
  const urls = safeLocales.flatMap((locale) =>
    safePaths.map(
      (pathname) =>
        `  <url><loc>${escapeXml(
          `${origin}${localizePath(locale, pathname)}`,
        )}</loc></url>`,
    ),
  );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
};

export const buildPublicRobotsText = ({
  origin,
  locales = ["en", "cs"],
  indexable,
}) => {
  if (!indexable || !origin) {
    return ["User-agent: *", "Disallow: /", ""].join("\n");
  }

  const disallow = normalizePublicSeoLocaleCodes(locales).flatMap((locale) =>
    PRIVATE_PATHS.map((pathname) => `Disallow: /${locale}${pathname}`),
  );

  return [
    "User-agent: *",
    "Allow: /",
    ...disallow,
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n");
};
