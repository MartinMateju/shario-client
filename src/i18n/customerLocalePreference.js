import { normalizeLocaleCode } from "./locales";

const COOKIE_PREFIX = "SHARIO_CUSTOMER_LANGUAGE";
const DEFAULT_MAX_AGE = 60 * 60 * 24 * 365;

export function getCustomerLocaleCookieName(kind, tenantSlug) {
  if (!["current", "default"].includes(kind)) return null;
  if (
    typeof tenantSlug !== "string" ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tenantSlug)
  ) {
    return null;
  }
  return `${COOKIE_PREFIX}_${kind.toUpperCase()}_${tenantSlug}`;
}

function readPreference(kind, tenantSlug) {
  if (typeof document === "undefined") return null;
  const name = getCustomerLocaleCookieName(kind, tenantSlug);
  if (!name) return null;
  const value = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.slice(name.length + 1);
  try {
    return normalizeLocaleCode(decodeURIComponent(value || "")) || null;
  } catch {
    return null;
  }
}

function writePreference(kind, locale, tenantSlug) {
  if (typeof document === "undefined") return;
  const name = getCustomerLocaleCookieName(kind, tenantSlug);
  const normalized = normalizeLocaleCode(locale);
  if (!name || (locale !== null && !normalized)) return;
  const attributes = [`${name}=${normalized || ""}`, "Path=/", "SameSite=Lax"];
  if (locale === null) attributes.push("Max-Age=0");
  else if (kind === "default") attributes.push(`Max-Age=${DEFAULT_MAX_AGE}`);
  if (globalThis.location?.protocol === "https:") attributes.push("Secure");
  document.cookie = attributes.join("; ");
}

// Current language is a tenant-scoped browser-session choice; it never changes
// the account preference or the independent platform/workspace language.
export const persistCustomerCurrentLocale = (locale, tenantSlug) =>
  writePreference("current", locale, tenantSlug);
export const getCustomerCurrentLocale = (tenantSlug) =>
  readPreference("current", tenantSlug);
export const clearCustomerCurrentLocale = (tenantSlug) =>
  writePreference("current", null, tenantSlug);

// Mirror the account default for server routing on a subsequent visit. The API
// remains authoritative and an authenticated session refreshes this cookie.
export const persistCustomerDefaultLocale = (locale, tenantSlug) =>
  writePreference("default", locale, tenantSlug);
export const getCustomerDefaultLocale = (tenantSlug) =>
  readPreference("default", tenantSlug);
