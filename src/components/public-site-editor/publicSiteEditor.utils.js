import { getLocalizedApiErrorMessage } from "@/i18n/api-errors";

import {
  PUBLIC_TENANT_LOCALE_CODES,
  PUBLIC_TENANT_HOME_SECTION_KEYS,
  PUBLIC_TENANT_NAV_KEYS,
  getPublicTenantLocaleCodes,
  normalizePublicTenant,
  normalizePublicTenantLogoSize,
  normalizePublicTenantUrl,
} from "@/components/public-tenant/publicTenant.config";
import { normalizeLocaleCode } from "@/i18n/locales";
import { normalizeCustomerPortalVisibility } from "@/components/customer-shell/customerPortalVisibility";
import { PUBLIC_TENANT_PORTAL_APPEARANCE_KEYS } from "@/components/public-tenant/publicTenantPortalAppearance";
import {
  getPublicTenantStylePresetRecipe,
  normalizePublicTenantFontPresetId,
  normalizePublicTenantStylePresetId,
} from "@/components/public-tenant/publicTenantStylePresets";

export const PUBLIC_SITE_EDITOR_TABS = Object.freeze([
  "branding",
  "pages",
  "login",
  "register",
  "customerPortal",
  "header",
  "footer",
]);

export const PUBLIC_SITE_EDITOR_MEDIA = Object.freeze({
  logoUrl: "logo",
  faviconUrl: "favicon",
  coverImageUrl: "cover",
  backgroundImageUrl: "loginBackground",
  loginBackgroundImageUrl: "loginBackground",
  registerBackgroundImageUrl: "registerBackground",
});

export const PUBLIC_SITE_MEDIA_MAX_BYTES = 8 * 1024 * 1024;
export const PUBLIC_SITE_MEDIA_TYPES = Object.freeze([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const PUBLIC_SITE_EDITOR_PAGE_KEYS = Object.freeze([
  "home",
  "book",
  "courses",
  "memberships",
  "vouchers",
  "help",
  "login",
  "register",
  "portal",
  "portalCourses",
]);

const asObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

const pickLocalized = (value) => {
  if (typeof value === "string") {
    const text = value.trim();

    return { cs: text, en: text };
  }

  const record = asObject(value);
  const localized = {};

  for (const [rawLocale, rawText] of Object.entries(record)) {
    const locale = normalizeLocaleCode(rawLocale);

    if (!locale || !PUBLIC_TENANT_LOCALE_CODES.includes(locale)) continue;
    if (Object.prototype.hasOwnProperty.call(localized, locale)) continue;

    localized[locale] = String(rawText ?? "").trim();
  }

  if (Object.prototype.hasOwnProperty.call(record, "CZ")) {
    localized.cs ??= String(record.CZ ?? "").trim();
  }
  if (Object.prototype.hasOwnProperty.call(record, "EN")) {
    localized.en ??= String(record.EN ?? "").trim();
  }

  return localized;
};

const collectLocalizedLocaleCodes = (value, localeCodes = new Set()) => {
  if (!value || typeof value !== "object") return localeCodes;

  for (const [key, nestedValue] of Object.entries(value)) {
    const locale = normalizeLocaleCode(key);

    if (
      locale &&
      PUBLIC_TENANT_LOCALE_CODES.includes(locale) &&
      typeof nestedValue === "string"
    ) {
      localeCodes.add(locale);
      continue;
    }

    collectLocalizedLocaleCodes(nestedValue, localeCodes);
  }

  return localeCodes;
};

/**
 * Resolves the language tabs used by the public-site editor. New tenants use
 * their configured public primary/secondary pair. Legacy documents without
 * that explicit setting keep their existing localized keys (and ultimately
 * the historical Czech/English editor) so opening and saving an old draft
 * never discards authored copy.
 */
export const resolvePublicSiteEditorLocaleCodes = ({
  settings,
  publicSite,
  routeableLocaleCodes = PUBLIC_TENANT_LOCALE_CODES,
} = {}) => {
  const localeSettings = asObject(settings);
  const routeableLocales = [
    ...new Set(
      (Array.isArray(routeableLocaleCodes) ? routeableLocaleCodes : [])
        .map(normalizeLocaleCode)
        .filter((locale) => PUBLIC_TENANT_LOCALE_CODES.includes(locale)),
    ),
  ];
  const hasExplicitPublicLocaleSettings =
    Object.prototype.hasOwnProperty.call(
      localeSettings,
      "publicDefaultLanguage",
    ) ||
    Object.prototype.hasOwnProperty.call(
      localeSettings,
      "supportedPublicLanguages",
    );

  if (hasExplicitPublicLocaleSettings) {
    const configuredLocales = getPublicTenantLocaleCodes(
      localeSettings,
      routeableLocales,
    );

    if (configuredLocales.length) return configuredLocales;
  }

  const discoveredLocales = collectLocalizedLocaleCodes(publicSite);
  const legacyPrimary = normalizeLocaleCode(localeSettings.defaultLanguage);
  const orderedLocales = [legacyPrimary, ...PUBLIC_TENANT_LOCALE_CODES].filter(
    (locale, index, locales) =>
      locale &&
      routeableLocales.includes(locale) &&
      discoveredLocales.has(locale) &&
      locales.indexOf(locale) === index,
  );

  if (orderedLocales.length) return orderedLocales.slice(0, 2);

  const legacyFallback = ["cs", "en"].filter((locale) =>
    routeableLocales.includes(locale),
  );

  return legacyFallback.length ? legacyFallback : ["en"];
};

const pickPages = (value) => {
  const pages = asObject(value);
  const home = asObject(pages.home);
  const requestedSectionOrder = Array.isArray(home.sectionOrder)
    ? home.sectionOrder.filter((key) =>
        PUBLIC_TENANT_HOME_SECTION_KEYS.includes(key),
      )
    : [];
  const sectionOrder = [
    ...new Set([
      ...requestedSectionOrder,
      ...PUBLIC_TENANT_HOME_SECTION_KEYS.filter(
        (key) => !requestedSectionOrder.includes(key),
      ),
    ]),
  ];
  const hiddenSections = [
    ...new Set(
      (Array.isArray(home.hiddenSections) ? home.hiddenSections : []).filter(
        (key) => PUBLIC_TENANT_HOME_SECTION_KEYS.includes(key),
      ),
    ),
  ];
  const sectionContent = asObject(home.sectionContent);

  return {
    home: {
      eyebrow: pickLocalized(home.eyebrow),
      headline: pickLocalized(home.headline),
      headlineColor: String(home.headlineColor ?? "")
        .trim()
        .toUpperCase(),
      description: pickLocalized(home.description),
      labelColor: String(home.labelColor ?? "")
        .trim()
        .toUpperCase(),
      sectionOrder,
      hiddenSections,
      sectionContent: Object.fromEntries(
        PUBLIC_TENANT_HOME_SECTION_KEYS.map((key) => [
          key,
          {
            title: pickLocalized(sectionContent[key]?.title),
            description: pickLocalized(sectionContent[key]?.description),
          },
        ]),
      ),
    },
    ...Object.fromEntries(
      ["book", "courses", "memberships", "vouchers", "help"].map((key) => [
        key,
        {
          visible: pages[key]?.visible !== false,
          title: pickLocalized(pages[key]?.title),
          description: pickLocalized(pages[key]?.description),
        },
      ]),
    ),
  };
};

export const normalizePublicSiteEditorDraft = ({
  publicSite,
  tenantName = "",
  tenantSlug = "",
}) =>
  normalizePublicTenant(
    {
      name: tenantName,
      slug: tenantSlug,
      publicSite,
    },
    tenantSlug,
  ).publicSite;

export const buildPublicSiteDraftPatch = (value) => {
  const draft = asObject(value);
  const branding = asObject(draft.branding);
  const header = asObject(draft.header);
  const announcement = asObject(header.announcement);
  const footer = asObject(draft.footer);
  const social = asObject(footer.social);
  const legal = asObject(footer.legal);
  const login = asObject(draft.login);
  const register = asObject(draft.register);
  const customerPortalDashboard = asObject(
    asObject(draft.customerPortal).dashboard,
  );
  const customerPortalAppearance = asObject(
    asObject(draft.customerPortal).appearance,
  );
  const navOrder = Array.isArray(header.navOrder)
    ? header.navOrder.filter((key) => PUBLIC_TENANT_NAV_KEYS.includes(key))
    : [...PUBLIC_TENANT_NAV_KEYS];
  const completedNavOrder = [
    ...new Set([
      ...navOrder,
      ...PUBLIC_TENANT_NAV_KEYS.filter((key) => !navOrder.includes(key)),
    ]),
  ];

  return {
    branding: {
      displayName: String(branding.displayName ?? "").trim(),
      stylePreset: normalizePublicTenantStylePresetId(branding.stylePreset),
      fontPreset: normalizePublicTenantFontPresetId(branding.fontPreset),
      logoUrl: String(branding.logoUrl ?? "").trim(),
      logoSize: normalizePublicTenantLogoSize(branding.logoSize),
      logoRedirectEnabled: branding.logoRedirectEnabled === true,
      logoRedirectUrl:
        branding.logoRedirectEnabled === true
          ? String(branding.logoRedirectUrl ?? "").trim()
          : normalizePublicTenantUrl(branding.logoRedirectUrl),
      faviconUrl: String(branding.faviconUrl ?? "").trim(),
      accentColor: String(branding.accentColor ?? "")
        .trim()
        .toUpperCase(),
      secondaryColor: String(branding.secondaryColor ?? "")
        .trim()
        .toUpperCase(),
      backgroundColor: String(branding.backgroundColor ?? "")
        .trim()
        .toUpperCase(),
      textColor: String(branding.textColor ?? "")
        .trim()
        .toUpperCase(),
      buttonTextColor: String(branding.buttonTextColor ?? "")
        .trim()
        .toUpperCase(),
      labelColor: String(branding.labelColor ?? "")
        .trim()
        .toUpperCase(),
      coverImageUrl: String(branding.coverImageUrl ?? "").trim(),
      description: pickLocalized(branding.description),
    },
    pages: pickPages(draft.pages),
    header: {
      navOrder: completedNavOrder,
      hiddenItems: [
        ...new Set(
          (Array.isArray(header.hiddenItems) ? header.hiddenItems : []).filter(
            (key) => PUBLIC_TENANT_NAV_KEYS.includes(key),
          ),
        ),
      ],
      primaryCta: [
        "auto",
        "book",
        "courses",
        "memberships",
        "vouchers",
      ].includes(header.primaryCta)
        ? header.primaryCta
        : "auto",
      announcement: {
        text: pickLocalized(announcement.text),
        url: String(announcement.url ?? "").trim(),
      },
    },
    footer: {
      description: pickLocalized(footer.description),
      openingHours: pickLocalized(footer.openingHours),
      copyright: pickLocalized(footer.copyright),
      email: String(footer.email ?? "")
        .trim()
        .toLowerCase(),
      phone: String(footer.phone ?? "").trim(),
      address: String(footer.address ?? "").trim(),
      social: {
        instagram: String(social.instagram ?? "").trim(),
        facebook: String(social.facebook ?? "").trim(),
        youtube: String(social.youtube ?? "").trim(),
        website: String(social.website ?? "").trim(),
      },
      legal: {
        studioRules: String(legal.studioRules ?? "").trim(),
        terms: String(legal.terms ?? "").trim(),
        privacy: String(legal.privacy ?? "").trim(),
        cancellation: String(legal.cancellation ?? "").trim(),
      },
    },
    login: {
      eyebrow: pickLocalized(login.eyebrow),
      headline: pickLocalized(login.headline),
      supportingText: pickLocalized(login.supportingText),
      helpText: pickLocalized(login.helpText),
      labelColor: String(login.labelColor ?? "")
        .trim()
        .toUpperCase(),
      backgroundImageUrl: String(login.backgroundImageUrl ?? "").trim(),
    },
    register: {
      eyebrow: pickLocalized(register.eyebrow),
      headline: pickLocalized(register.headline),
      supportingText: pickLocalized(register.supportingText),
      helpText: pickLocalized(register.helpText),
      labelColor: String(register.labelColor ?? "")
        .trim()
        .toUpperCase(),
      backgroundImageUrl: String(register.backgroundImageUrl ?? "").trim(),
    },
    customerPortal: {
      ...normalizeCustomerPortalVisibility(draft.customerPortal),
      courses: {
        guestCheckoutEnabled:
          draft.customerPortal?.courses?.guestCheckoutEnabled === true,
        locations: (Array.isArray(draft.customerPortal?.courses?.locations)
          ? draft.customerPortal.courses.locations
          : []
        ).map((item) => ({
          locationId: String(item.locationId || ""),
          headline: pickLocalized(item.headline),
          description: pickLocalized(item.description),
          heroImageUrl: String(item.heroImageUrl || "").trim(),
        })),
      },
      dashboard: {
        eyebrow: pickLocalized(customerPortalDashboard.eyebrow),
        headline: pickLocalized(customerPortalDashboard.headline),
        description: pickLocalized(customerPortalDashboard.description),
        labelColor: String(customerPortalDashboard.labelColor ?? "")
          .trim()
          .toUpperCase(),
      },
      appearance: Object.fromEntries(
        PUBLIC_TENANT_PORTAL_APPEARANCE_KEYS.map((key) => [
          key,
          String(customerPortalAppearance[key] ?? "")
            .trim()
            .toUpperCase(),
        ]),
      ),
    },
  };
};

export const arePublicSiteDraftsEqual = (left, right) =>
  JSON.stringify(buildPublicSiteDraftPatch(left)) ===
  JSON.stringify(buildPublicSiteDraftPatch(right));

export const arePublicSiteEditorStatesEqual = (left, right) =>
  JSON.stringify(left) === JSON.stringify(right);

export const replacePublicSiteValue = (value, path, nextValue) => {
  const keys = String(path).split(".").filter(Boolean);
  const root =
    typeof structuredClone === "function"
      ? structuredClone(value)
      : JSON.parse(JSON.stringify(value));
  let cursor = root;

  keys.slice(0, -1).forEach((key) => {
    if (!cursor[key] || typeof cursor[key] !== "object") {
      cursor[key] = {};
    }

    cursor = cursor[key];
  });

  cursor[keys.at(-1)] = nextValue;
  return root;
};

export const applyPublicSiteMediaUpload = (
  value,
  { path, url, locationId },
) => {
  if (!locationId) return replacePublicSiteValue(value, path, url);

  const locations = value.customerPortal?.courses?.locations || [];
  const index = locations.findIndex((entry) => entry.locationId === locationId);
  const next = [...locations];
  const entry =
    index >= 0
      ? locations[index]
      : {
          locationId,
          headline: {},
          description: {},
        };
  next[index >= 0 ? index : next.length] = { ...entry, heroImageUrl: url };

  return replacePublicSiteValue(
    value,
    "customerPortal.courses.locations",
    next,
  );
};

export const applyPublicSiteStylePreset = (value, presetId) => {
  const recipe = getPublicTenantStylePresetRecipe(presetId);
  const next = replacePublicSiteValue(
    value,
    "branding.stylePreset",
    recipe.stylePreset,
  );

  return Object.entries(recipe).reduce(
    (draft, [key, recipeValue]) =>
      key === "stylePreset"
        ? draft
        : replacePublicSiteValue(draft, `branding.${key}`, recipeValue),
    next,
  );
};

export const movePublicSiteNavigationItem = (items, key, direction) => {
  const order = [...items];
  const currentIndex = order.indexOf(key);
  const targetIndex = currentIndex + direction;

  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= order.length) {
    return order;
  }

  [order[currentIndex], order[targetIndex]] = [
    order[targetIndex],
    order[currentIndex],
  ];

  return order;
};

export const getPublicSiteEditorError = (error, fallback) =>
  getLocalizedApiErrorMessage(error, fallback);

export const validatePublicSiteMediaFile = (file) => {
  if (!file || typeof file.size !== "number" || file.size <= 0) {
    return { valid: false, messageKey: "mediaEmpty" };
  }
  if (!PUBLIC_SITE_MEDIA_TYPES.includes(String(file.type).toLowerCase())) {
    return { valid: false, messageKey: "mediaInvalidType" };
  }
  if (file.size > PUBLIC_SITE_MEDIA_MAX_BYTES) {
    return { valid: false, messageKey: "mediaTooLarge" };
  }
  return { valid: true, messageKey: null };
};

export const formatPublicSiteMediaSize = (bytes) => {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size < 0) return "";
  if (size < 1024) return `${Math.round(size)} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
};

export const getPublicSiteMediaErrorKey = (error) => {
  switch (error?.data?.code) {
    case "PUBLIC_SITE_MEDIA_REQUIRED":
      return "mediaEmpty";
    case "PUBLIC_SITE_MEDIA_TOO_LARGE":
      return "mediaTooLarge";
    case "PUBLIC_SITE_MEDIA_INVALID_TYPE":
      return "mediaInvalidType";
    case "PUBLIC_SITE_MEDIA_INVALID_CONTENT":
    case "PUBLIC_SITE_MEDIA_INVALID_DIMENSIONS":
    case "PUBLIC_SITE_MEDIA_UPLOAD_INVALID":
      return "mediaInvalidImage";
    case "PUBLIC_SITE_MEDIA_STORAGE_UNAVAILABLE":
      return "mediaStorageUnavailable";
    case "PUBLIC_SITE_REVISION_CONFLICT":
      return "mediaConflict";
    default:
      return "mediaError";
  }
};

export const canPublishPublicSiteDraft = ({
  hasChanges,
  hasPublishedSnapshot,
}) => Boolean(hasChanges || !hasPublishedSnapshot);

const PUBLIC_SITE_REQUIRED_COLOR_PATHS = Object.freeze([
  "branding.accentColor",
  "branding.secondaryColor",
  "branding.backgroundColor",
  "branding.textColor",
  "branding.labelColor",
]);

const PUBLIC_SITE_OPTIONAL_COLOR_PATHS = Object.freeze([
  "branding.buttonTextColor",
  "pages.home.labelColor",
  "pages.home.headlineColor",
  "login.labelColor",
  "register.labelColor",
  "customerPortal.dashboard.labelColor",
  ...PUBLIC_TENANT_PORTAL_APPEARANCE_KEYS.map(
    (key) => `customerPortal.appearance.${key}`,
  ),
]);

const readNestedValue = (value, path) =>
  path.split(".").reduce((current, key) => current?.[key], value);

const isSixDigitHexColor = (value) =>
  /^#[0-9A-Fa-f]{6}$/.test(String(value ?? "").trim());

export const getInvalidPublicSiteColorPaths = (draft) => [
  ...PUBLIC_SITE_REQUIRED_COLOR_PATHS.filter(
    (path) => !isSixDigitHexColor(readNestedValue(draft, path)),
  ),
  ...PUBLIC_SITE_OPTIONAL_COLOR_PATHS.filter((path) => {
    const value = String(readNestedValue(draft, path) ?? "").trim();
    return Boolean(value) && !isSixDigitHexColor(value);
  }),
];

export const getInvalidPublicSiteLogoRedirectUrl = (draft) =>
  draft?.branding?.logoRedirectEnabled === true &&
  !normalizePublicTenantUrl(draft.branding.logoRedirectUrl);

export const isValidPublicSiteEditorDraft = (draft) =>
  getInvalidPublicSiteColorPaths(draft).length === 0 &&
  !getInvalidPublicSiteLogoRedirectUrl(draft);

export const getAvailablePublicSitePreviewPages = (capabilities = {}) =>
  PUBLIC_SITE_EDITOR_PAGE_KEYS.filter((key) => {
    if (["home", "login", "register", "portal"].includes(key)) return true;
    if (key === "book") return capabilities.bookStudio !== false;
    if (key === "portalCourses") return capabilities.courses !== false;
    return capabilities[key] !== false;
  });
