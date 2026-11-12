import {
  DEFAULT_LOCALE,
  LOCALE_REGISTRY,
  resolveRolloutEligibleLocaleCode,
} from "./locales";

/**
 * Returns the canonical Intl locale for a live application locale.
 * Planned and unknown values deliberately fall back to English.
 */
export function resolveIntlLocale(value, fallback = DEFAULT_LOCALE) {
  const locale = resolveRolloutEligibleLocaleCode(value, fallback);

  return (
    LOCALE_REGISTRY[locale]?.intlLocale ||
    LOCALE_REGISTRY[DEFAULT_LOCALE].intlLocale
  );
}
