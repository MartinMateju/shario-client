import {
  isPlatformBillingCurrency,
  normalizeCurrency,
  resolvePlatformBillingCurrency,
} from "@/config/currencies";
import {
  getCountryFromLocales,
  getCurrencyForCountry,
  normalizeCountryCode,
} from "@/config/regions";

export const VISITOR_COUNTRY_COOKIE_NAME = "SHARIO_VISITOR_COUNTRY";
export const CURRENCY_PREFERENCE_COOKIE_NAME = "SHARIO_CURRENCY_PREFERENCE";
export const CURRENCY_PREFERENCE_EVENT = "shario:currency-preference";
let transientCurrencyPreference = "";

export const readPreferenceCookie = (name, cookies) => {
  try {
    const source =
      cookies ?? (typeof document === "undefined" ? "" : document.cookie);
    const entry = source
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`));
    if (!entry) return "";
    return decodeURIComponent(entry.slice(name.length + 1));
  } catch {
    return "";
  }
};

export const resolveVisitorCurrency = ({
  tenantCurrency,
  selectedCurrency,
  country,
  locales = [],
} = {}) => {
  if (normalizeCurrency(tenantCurrency))
    return resolvePlatformBillingCurrency(tenantCurrency);
  if (isPlatformBillingCurrency(selectedCurrency))
    return normalizeCurrency(selectedCurrency);
  return getCurrencyForCountry(
    normalizeCountryCode(country) || getCountryFromLocales(locales),
  );
};

export const getVisitorPreferences = ({ locale } = {}) => {
  const locales =
    typeof navigator === "undefined"
      ? []
      : navigator.languages?.length
        ? navigator.languages
        : [navigator.language];
  const country =
    normalizeCountryCode(readPreferenceCookie(VISITOR_COUNTRY_COOKIE_NAME)) ||
    getCountryFromLocales(locales);
  let timezone = "UTC";
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    /* Use UTC. */
  }
  return {
    ...(locale ? { locale } : {}),
    currency: resolveVisitorCurrency({
      selectedCurrency:
        transientCurrencyPreference ||
        readPreferenceCookie(CURRENCY_PREFERENCE_COOKIE_NAME),
      country,
      locales,
    }),
    ...(country ? { country } : {}),
    timezone,
  };
};

export const persistCurrencyPreference = (value) => {
  if (typeof document === "undefined" || !isPlatformBillingCurrency(value))
    return;
  const currency = normalizeCurrency(value);
  const secure = globalThis.location?.protocol === "https:" ? "; Secure" : "";
  // Private browsing/storage policies can reject cookie access or silently
  // discard writes. Keep the explicit choice usable for this page session.
  transientCurrencyPreference = currency;
  try {
    document.cookie = `${CURRENCY_PREFERENCE_COOKIE_NAME}=${currency}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
    if (readPreferenceCookie(CURRENCY_PREFERENCE_COOKIE_NAME) === currency)
      transientCurrencyPreference = "";
  } catch {
    /* The in-memory preference remains available. */
  }
  window.dispatchEvent(new Event(CURRENCY_PREFERENCE_EVENT));
};
