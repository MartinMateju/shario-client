import {
  CORE_LOCALE_CODES,
  DEFAULT_LOCALE,
  normalizeLocaleCode,
} from "@/i18n/locales";

const normalizeRouteableLocaleCodes = (localeCodes) => [
  ...new Set(localeCodes.map(normalizeLocaleCode).filter(Boolean)),
];

const resolveRouteableLocale = (value, localeCodes, fallback) => {
  const localeCode = normalizeLocaleCode(value);

  return localeCode && localeCodes.includes(localeCode) ? localeCode : fallback;
};

export const resolveWorkspaceRouteLocale = (
  settings,
  availableLocaleCodes = CORE_LOCALE_CODES,
) => {
  const localeCodes = normalizeRouteableLocaleCodes(availableLocaleCodes);
  const fallbackLocale = localeCodes.includes(DEFAULT_LOCALE)
    ? DEFAULT_LOCALE
    : localeCodes[0] || DEFAULT_LOCALE;
  const legacyDefaultLanguage = resolveRouteableLocale(
    settings?.defaultLanguage,
    localeCodes,
    fallbackLocale,
  );

  return resolveRouteableLocale(
    settings?.adminLanguage,
    localeCodes,
    legacyDefaultLanguage,
  );
};

export const normalizeWorkspaceLocaleForm = (
  settings,
  availableLocaleCodes = CORE_LOCALE_CODES,
) => {
  const localeCodes = normalizeRouteableLocaleCodes(availableLocaleCodes);
  const fallbackLocale = localeCodes.includes(DEFAULT_LOCALE)
    ? DEFAULT_LOCALE
    : localeCodes[0];
  const legacyDefaultLanguage = resolveRouteableLocale(
    settings?.defaultLanguage,
    localeCodes,
    fallbackLocale,
  );
  const adminLanguage = resolveRouteableLocale(
    settings?.adminLanguage,
    localeCodes,
    legacyDefaultLanguage,
  );
  const publicDefaultLanguage = resolveRouteableLocale(
    settings?.publicDefaultLanguage,
    localeCodes,
    legacyDefaultLanguage,
  );
  const supportedPublicLanguages = [
    ...new Set(
      (Array.isArray(settings?.supportedPublicLanguages)
        ? settings.supportedPublicLanguages
        : []
      )
        .map(normalizeLocaleCode)
        .filter(
          (localeCode) =>
            localeCode &&
            localeCodes.includes(localeCode) &&
            localeCode !== publicDefaultLanguage,
        ),
    ),
  ];

  return {
    adminLanguage,
    publicDefaultLanguage,
    secondaryPublicLanguage: supportedPublicLanguages[0] || "",
  };
};

export const buildWorkspaceLocalePayload = (
  form,
  availableLocaleCodes = CORE_LOCALE_CODES,
) => {
  const localeCodes = normalizeRouteableLocaleCodes(availableLocaleCodes);
  const fallbackLocale = localeCodes.includes(DEFAULT_LOCALE)
    ? DEFAULT_LOCALE
    : localeCodes[0];
  const adminLanguage = resolveRouteableLocale(
    form?.adminLanguage,
    localeCodes,
    fallbackLocale,
  );
  const publicDefaultLanguage = resolveRouteableLocale(
    form?.publicDefaultLanguage,
    localeCodes,
    fallbackLocale,
  );
  const secondaryPublicLanguage = resolveRouteableLocale(
    form?.secondaryPublicLanguage,
    localeCodes,
    "",
  );

  return {
    adminLanguage,
    publicDefaultLanguage,
    supportedPublicLanguages: [
      publicDefaultLanguage,
      ...(secondaryPublicLanguage &&
      secondaryPublicLanguage !== publicDefaultLanguage
        ? [secondaryPublicLanguage]
        : []),
    ],
  };
};
