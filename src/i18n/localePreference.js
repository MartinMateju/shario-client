export const EXPLICIT_LOCALE_COOKIE_NAME = "SHARIO_LOCALE_PREFERENCE";
export const EXPLICIT_LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function persistExplicitLocalePreference(locale) {
  if (typeof document === "undefined") return;

  const attributes = [
    `${EXPLICIT_LOCALE_COOKIE_NAME}=${encodeURIComponent(locale)}`,
    "Path=/",
    `Max-Age=${EXPLICIT_LOCALE_COOKIE_MAX_AGE}`,
    "SameSite=Lax",
  ];

  if (globalThis.location?.protocol === "https:") {
    attributes.push("Secure");
  }

  document.cookie = attributes.join("; ");
}
