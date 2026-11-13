import { normalizeLocaleCode } from "@/i18n/locales";

/** Plain strings are tenant-authored content; locale maps are system copy. */
export const getNotificationLocaleText = (value, locale, fallback = "") => {
  if (typeof value === "string") return value.trim() || fallback;
  if (!value || typeof value !== "object" || Array.isArray(value))
    return fallback;

  const requested = normalizeLocaleCode(locale);
  if (!requested) return fallback;
  const preferred = Object.entries(value).find(
    ([key, text]) =>
      normalizeLocaleCode(key) === requested &&
      typeof text === "string" &&
      text.trim(),
  );
  return preferred ? preferred[1].trim() : fallback;
};

/**
 * Historical notifications store EN/CS prose without structured interpolation
 * data. A translated event summary keeps their meaning in every product locale;
 * the existing action link opens the record with amounts, dates and other details.
 */
export const getNotificationEventText = (
  notification,
  field,
  t,
  fallback = "",
) => {
  const event = String(notification?.eventType ?? "").trim();
  if (!/^[a-z]+(?:[._][a-z]+)*$/.test(event) || typeof t?.has !== "function") {
    return fallback;
  }
  const key = `events.${event.replaceAll(".", "_")}.${field}`;
  return t.has(key) ? t(key) : fallback;
};
