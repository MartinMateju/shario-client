import {
  CORE_LOCALE_CODES,
  DEFAULT_LOCALE,
  getLocaleDefinition,
  isIndexableLocale,
} from "./locales";

const normalizeMetadataPath = (pathname = "/") => {
  const pathWithoutSearch = String(pathname || "/")
    .trim()
    .split(/[?#]/)[0];
  const withLeadingSlash = pathWithoutSearch.startsWith("/")
    ? pathWithoutSearch
    : `/${pathWithoutSearch}`;

  return withLeadingSlash.replace(/\/+$/, "") || "/";
};

const localizeMetadataPath = (locale, pathname) =>
  pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;

/**
 * Builds the locale-specific SEO values independently of Next.js so rollout
 * behavior can be unit tested without loading the app layout or web fonts.
 */
export function buildLocaleMetadataContext(
  locale,
  enabledLocaleCodes = CORE_LOCALE_CODES,
  pathname = "/",
) {
  const localeDefinition =
    getLocaleDefinition(locale) || getLocaleDefinition(DEFAULT_LOCALE);
  const indexableLocaleCodes = enabledLocaleCodes.filter(isIndexableLocale);
  const normalizedPathname = normalizeMetadataPath(pathname);

  return {
    canonicalPath: localizeMetadataPath(
      localeDefinition.code,
      normalizedPathname,
    ),
    direction: localeDefinition.direction,
    intlLocale: localeDefinition.intlLocale,
    openGraphLocale: localeDefinition.openGraphLocale,
    openGraphAlternateLocales: indexableLocaleCodes
      .filter((code) => code !== localeDefinition.code)
      .map((code) => getLocaleDefinition(code).openGraphLocale),
    isIndexable: indexableLocaleCodes.includes(localeDefinition.code),
    languageAlternates: Object.fromEntries(
      indexableLocaleCodes.map((code) => [
        code,
        localizeMetadataPath(code, normalizedPathname),
      ]),
    ),
  };
}
