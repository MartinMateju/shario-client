import { resolveRolloutEligibleLocaleCode } from "@/i18n/locales";

const ALLOWED_TENANT_NEXT_PATH =
  /^\/(?:book|courses|memberships|help|portal)(?:\/|$)/;
const WAITLIST_OFFER_NEXT_PATH = /^\/waitlists\/offer\/?$/;

export const CUSTOMER_SOCIAL_PROVIDERS = Object.freeze(["google", "apple"]);

export const shouldQueryCustomerSocialProviders = ({ tenantSlug, degraded }) =>
  Boolean(String(tenantSlug || "").trim()) && degraded !== true;

export const getSafeTenantNextPath = (value, fallback = "") => {
  const raw = String(value ?? "").trim();

  if (
    !raw ||
    !raw.startsWith("/") ||
    raw.startsWith("//") ||
    raw.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(raw)
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(raw, "https://tenant.invalid");
    const allowedPath =
      ALLOWED_TENANT_NEXT_PATH.test(parsed.pathname) ||
      (WAITLIST_OFFER_NEXT_PATH.test(parsed.pathname) &&
        !parsed.search &&
        ["", "#resume"].includes(parsed.hash));

    if (parsed.origin !== "https://tenant.invalid" || !allowedPath) {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
};

export const buildTenantAuthHref = (pathname, nextPath) => {
  const safeNext = getSafeTenantNextPath(nextPath);
  return safeNext
    ? `${pathname}?next=${encodeURIComponent(safeNext)}`
    : pathname;
};

const getSafeHttpOrigin = (value) => {
  try {
    const parsed = new URL(String(value || ""));

    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash
    ) {
      return "";
    }

    return parsed.origin;
  } catch {
    return "";
  }
};

export const buildCustomerSocialStartUrl = ({
  apiBaseUrl,
  provider,
  tenantSlug,
  locale,
  nextPath,
  returnOrigin,
}) => {
  const normalizedProvider = String(provider || "")
    .trim()
    .toLowerCase();
  const normalizedTenantSlug = String(tenantSlug || "")
    .trim()
    .toLowerCase();
  const safeOrigin = getSafeHttpOrigin(returnOrigin);

  if (
    !CUSTOMER_SOCIAL_PROVIDERS.includes(normalizedProvider) ||
    !normalizedTenantSlug ||
    !safeOrigin
  ) {
    return "";
  }

  let startUrl;

  try {
    startUrl = new URL(
      `/auth/customer/social/${normalizedProvider}/start`,
      String(apiBaseUrl || safeOrigin),
    );
  } catch {
    return "";
  }

  startUrl.searchParams.set("tenantSlug", normalizedTenantSlug);
  startUrl.searchParams.set("locale", resolveRolloutEligibleLocaleCode(locale));
  startUrl.searchParams.set("returnOrigin", safeOrigin);

  const safeNext = getSafeTenantNextPath(nextPath);
  if (safeNext) startUrl.searchParams.set("next", safeNext);

  return startUrl.href;
};
