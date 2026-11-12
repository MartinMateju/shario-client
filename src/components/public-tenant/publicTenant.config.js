import { formatTenantNameFromSlug } from "@/utils/tenantBrandUtils";
import { SKAB_BRAND_COLORS } from "@/config/brandPalette";
import { normalizeCustomerPortalVisibility } from "@/components/customer-shell/customerPortalVisibility";
import { normalizePortalAppearance } from "./publicTenantPortalAppearance";
import {
  DEFAULT_LOCALE,
  ROLLOUT_ELIGIBLE_LOCALE_CODES,
  normalizeLocaleCode,
} from "@/i18n/locales";

import {
  PUBLIC_TENANT_STYLE_PRESET_IDS,
  normalizePublicTenantFontPresetId,
  normalizePublicTenantStylePresetId,
  resolvePublicTenantFontPreset,
  resolvePublicTenantStylePreset,
} from "./publicTenantStylePresets";

export const PUBLIC_TENANT_NAV_KEYS = Object.freeze([
  "book",
  "courses",
  "memberships",
  "vouchers",
  "help",
]);

export const PUBLIC_TENANT_NAV_DEFINITIONS = Object.freeze({
  book: Object.freeze({
    capability: "bookStudio",
    href: "/book",
  }),
  courses: Object.freeze({
    capability: "courses",
    href: "/courses",
  }),
  memberships: Object.freeze({
    capability: "memberships",
    href: "/memberships",
  }),
  vouchers: Object.freeze({
    capability: "vouchers",
    href: "/vouchers",
  }),
  help: Object.freeze({
    capability: "help",
    href: "/help",
  }),
});

export const PUBLIC_TENANT_HOME_SECTION_KEYS = Object.freeze([
  "waysToVisit",
  "featured",
  "about",
  "gallery",
  "testimonials",
  "locations",
  "team",
  "faq",
]);

export const DEFAULT_PUBLIC_TENANT_HOME_SECTION_ORDER = Object.freeze([
  ...PUBLIC_TENANT_HOME_SECTION_KEYS,
]);

export const DEFAULT_PUBLIC_TENANT_HIDDEN_HOME_SECTIONS = Object.freeze(
  PUBLIC_TENANT_HOME_SECTION_KEYS.filter((key) => key !== "waysToVisit"),
);

const DEFAULT_ACCENT_COLOR = SKAB_BRAND_COLORS.primary;
const DEFAULT_SECONDARY_COLOR = SKAB_BRAND_COLORS.accent;
const DEFAULT_BACKGROUND_COLOR = SKAB_BRAND_COLORS.offset;
const DEFAULT_TEXT_COLOR = "#1F1F1F";
const DEFAULT_ACTION_DARK_COLOR = "#11110F";
const DEFAULT_ACTION_LIGHT_COLOR = "#FFFFFF";
export const PUBLIC_TENANT_LOGO_SIZE = Object.freeze({
  MIN: 24,
  DEFAULT: 48,
  MAX: 72,
});
const DEFAULT_ERROR_COLOR = "#B42318";
const DEFAULT_SUCCESS_COLOR = "#16794A";
const CTA_KEYS = new Set([
  "auto",
  "book",
  "courses",
  "memberships",
  "vouchers",
]);
const SAFE_COLOR = /^#[\da-f]{6}$/i;
export const PUBLIC_TENANT_LOCALE_CODES = Object.freeze([
  ...ROLLOUT_ELIGIBLE_LOCALE_CODES,
]);
const PUBLIC_TENANT_LOCALE_SET = new Set(PUBLIC_TENANT_LOCALE_CODES);

const asObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

const asString = (value) => String(value ?? "").trim();

export const normalizePublicTenantLogoSize = (value) => {
  if (value === null || value === undefined || value === "") {
    return PUBLIC_TENANT_LOGO_SIZE.DEFAULT;
  }

  const candidate = Number(value);

  if (!Number.isFinite(candidate)) {
    return PUBLIC_TENANT_LOGO_SIZE.DEFAULT;
  }

  return Math.min(
    PUBLIC_TENANT_LOGO_SIZE.MAX,
    Math.max(PUBLIC_TENANT_LOGO_SIZE.MIN, Math.round(candidate)),
  );
};

const normalizePublicTenantLocale = (value) => {
  const localeCode = normalizeLocaleCode(value);

  return localeCode && PUBLIC_TENANT_LOCALE_SET.has(localeCode)
    ? localeCode
    : null;
};

/**
 * Public tenant surfaces intentionally expose at most a primary and one
 * secondary language. The primary language is always first so every header,
 * portal and metadata consumer receives one deterministic contract.
 */
export const normalizePublicTenantLocaleSettings = (value) => {
  const settings = asObject(value);
  const legacyDefaultLanguage =
    normalizePublicTenantLocale(settings.defaultLanguage) || DEFAULT_LOCALE;
  const publicDefaultLanguage =
    normalizePublicTenantLocale(settings.publicDefaultLanguage) ||
    legacyDefaultLanguage;
  const configuredLanguages = Array.isArray(settings.supportedPublicLanguages)
    ? settings.supportedPublicLanguages
        .map(normalizePublicTenantLocale)
        .filter(Boolean)
    : [];
  const supportedPublicLanguages = [
    publicDefaultLanguage,
    ...configuredLanguages.filter(
      (localeCode) => localeCode !== publicDefaultLanguage,
    ),
  ];

  return {
    defaultLanguage: legacyDefaultLanguage,
    publicDefaultLanguage,
    supportedPublicLanguages: [...new Set(supportedPublicLanguages)].slice(
      0,
      2,
    ),
  };
};

/**
 * Returns the tenant's public language pair in its configured order, limited
 * to locales that are routeable in the current deployment. Keeping the
 * primary language first is important for selectors, canonical redirects and
 * metadata consumers; filtering through the global routing order would lose
 * that contract.
 */
export const getPublicTenantLocaleCodes = (
  value,
  routeableLocaleCodes = PUBLIC_TENANT_LOCALE_CODES,
) => {
  const routeableLocales = new Set(
    (Array.isArray(routeableLocaleCodes) ? routeableLocaleCodes : [])
      .map(normalizePublicTenantLocale)
      .filter(Boolean),
  );
  const settings = normalizePublicTenantLocaleSettings(value);

  return settings.supportedPublicLanguages.filter((localeCode) =>
    routeableLocales.has(localeCode),
  );
};

export const resolvePublicTenantRouteLocale = (
  value,
  requestedLocale,
  routeableLocaleCodes = PUBLIC_TENANT_LOCALE_CODES,
) => {
  const configuredLocales = getPublicTenantLocaleCodes(
    value,
    routeableLocaleCodes,
  );
  const requested = normalizePublicTenantLocale(requestedLocale);

  return requested && configuredLocales.includes(requested)
    ? requested
    : configuredLocales[0] || DEFAULT_LOCALE;
};

const uniqueKnownKeys = (value, allowed) => {
  const keys = Array.isArray(value) ? value : [];
  const canonicalKeys = new Map(
    allowed.map((key) => [String(key).toLowerCase(), key]),
  );

  return [
    ...new Set(
      keys
        .map((item) => asString(item).toLowerCase())
        .map((item) => canonicalKeys.get(item))
        .filter(Boolean),
    ),
  ];
};

const completePublicNavigation = (orderedKeys) => {
  const completed = [...orderedKeys];
  const legacyKeys = ["book", "courses", "memberships", "help"];
  const isCompleteLegacyOrder =
    !completed.includes("vouchers") &&
    completed.length === legacyKeys.length &&
    legacyKeys.every((key, index) => completed[index] === key);

  if (isCompleteLegacyOrder) {
    completed.splice(completed.indexOf("help"), 0, "vouchers");
  }

  PUBLIC_TENANT_NAV_KEYS.forEach((key) => {
    if (!completed.includes(key)) completed.push(key);
  });

  return completed;
};

const inferBoolean = (...values) => {
  const explicit = values.find((value) => typeof value === "boolean");
  return explicit;
};

const isSafeRelativePublicUrl = (value) =>
  value.startsWith("/") &&
  !value.startsWith("//") &&
  !value.includes("\\") &&
  !/[\u0000-\u001f\u007f]/.test(value);

/**
 * Replaces only the public locale segment while preserving the requested
 * tenant page. The input comes from a proxy-owned request header; defensive
 * validation still keeps malformed or forged values from becoming redirect
 * targets.
 */
export const buildPublicTenantLocaleRedirectPath = (
  pathname,
  locale,
  search = "",
) => {
  const targetLocale = normalizePublicTenantLocale(locale) || DEFAULT_LOCALE;
  const rawPathname = asString(pathname);
  const rawSearch = String(search ?? "");
  const safeSearch =
    !rawSearch ||
    (rawSearch.startsWith("?") &&
      !rawSearch.includes("#") &&
      !rawSearch.includes("\\") &&
      !/[\u0000-\u001f\u007f]/.test(rawSearch))
      ? rawSearch
      : "";

  if (!rawPathname || !isSafeRelativePublicUrl(rawPathname)) {
    return `/${targetLocale}${safeSearch}`;
  }

  const segments = rawPathname.split("/");
  const currentLocale = normalizePublicTenantLocale(segments[1]);

  if (currentLocale) {
    segments[1] = targetLocale;
    return `${segments.join("/") || `/${targetLocale}`}${safeSearch}`;
  }

  return `/${targetLocale}${safeSearch}`;
};

export const getLocalizedPublicTenantText = (
  value,
  locale = "en",
  fallback = "",
) => {
  if (typeof value === "string") return value.trim() || fallback;

  const record = asObject(value);
  const localizedValues = new Map();

  for (const [key, rawText] of Object.entries(record)) {
    const localeCode = normalizePublicTenantLocale(key);
    const text = asString(rawText);

    if (localeCode && text && !localizedValues.has(localeCode)) {
      localizedValues.set(localeCode, text);
    }
  }

  const requestedLocale = normalizePublicTenantLocale(locale);
  const preferredLocales = [
    requestedLocale,
    DEFAULT_LOCALE,
    "cs",
    ...PUBLIC_TENANT_LOCALE_CODES,
  ].filter(Boolean);

  for (const localeCode of new Set(preferredLocales)) {
    const text = localizedValues.get(localeCode);
    if (text) return text;
  }

  return fallback;
};

export const normalizePublicTenantUrl = (
  value,
  { allowRelative = true } = {},
) => {
  const raw = asString(value);
  if (!raw) return "";

  if (allowRelative && isSafeRelativePublicUrl(raw)) {
    return raw;
  }

  try {
    const url = new URL(raw);

    if (url.protocol !== "https:" || url.username || url.password || url.port) {
      return "";
    }

    return url.href;
  } catch {
    return "";
  }
};

export const getPublicTenantLogoHref = (branding) =>
  branding?.logoRedirectEnabled === true
    ? normalizePublicTenantUrl(branding.logoRedirectUrl)
    : "";

export const normalizePublicTenantColor = (
  value,
  fallback = DEFAULT_ACCENT_COLOR,
) => {
  const color = asString(value);
  return SAFE_COLOR.test(color) ? color.toUpperCase() : fallback;
};

const normalizeOptionalPublicTenantColor = (value) => {
  const color = asString(value);
  return color ? normalizePublicTenantColor(color, "") : "";
};

const normalizeLocalizedText = (value) => {
  if (typeof value === "string") {
    const text = value.trim();
    return { cs: text, en: text };
  }

  const record = asObject(value);
  const normalized = {
    cs: asString(record.cs ?? record.CZ),
    en: asString(record.en ?? record.EN),
  };

  for (const [key, rawText] of Object.entries(record)) {
    const localeCode = normalizePublicTenantLocale(key);
    const text = asString(rawText);

    if (
      localeCode &&
      localeCode !== "cs" &&
      localeCode !== "en" &&
      text &&
      !normalized[localeCode]
    ) {
      normalized[localeCode] = text;
    }
  }

  return normalized;
};

const normalizeCapabilities = (rawTenant) => {
  const explicit = asObject(rawTenant.publicCapabilities);

  return {
    bookStudio:
      inferBoolean(
        explicit.bookStudio,
        explicit.bookingCatalog,
        explicit.bookings,
      ) ?? false,
    courses: inferBoolean(explicit.courses) ?? false,
    memberships: inferBoolean(explicit.memberships) ?? false,
    vouchers:
      inferBoolean(
        explicit.vouchers,
        explicit.giftVouchers,
        explicit.publicVouchers,
      ) ?? false,
    help:
      inferBoolean(
        explicit.help,
        explicit.publicKnowledge,
        explicit.knowledge,
      ) ?? false,
    guestCourseCheckout: inferBoolean(explicit.guestCourseCheckout) ?? false,
    registration: inferBoolean(explicit.registration) ?? false,
  };
};

const normalizeLegal = (value) => {
  const legal = asObject(value);

  return {
    studioRules: normalizePublicTenantUrl(
      legal.studioRules ?? legal.rules ?? legal.studioRulesUrl,
    ),
    terms: normalizePublicTenantUrl(
      legal.terms ?? legal.termsUrl ?? legal.termsAndConditions,
    ),
    privacy: normalizePublicTenantUrl(
      legal.privacy ?? legal.privacyUrl ?? legal.privacyPolicy,
    ),
    cancellation: normalizePublicTenantUrl(
      legal.cancellation ?? legal.cancellationUrl ?? legal.cancellationPolicy,
    ),
  };
};

const normalizePublicPages = (value) => {
  const pages = asObject(value);
  const home = asObject(pages.home);
  const requestedSectionOrder = uniqueKnownKeys(
    home.sectionOrder,
    PUBLIC_TENANT_HOME_SECTION_KEYS,
  );
  const sectionOrder = [
    ...requestedSectionOrder,
    ...PUBLIC_TENANT_HOME_SECTION_KEYS.filter(
      (key) => !requestedSectionOrder.includes(key),
    ),
  ];
  const hiddenSections = Array.isArray(home.hiddenSections)
    ? uniqueKnownKeys(home.hiddenSections, PUBLIC_TENANT_HOME_SECTION_KEYS)
    : [...DEFAULT_PUBLIC_TENANT_HIDDEN_HOME_SECTIONS];
  const sectionContent = asObject(home.sectionContent);

  return {
    home: {
      eyebrow: normalizeLocalizedText(home.eyebrow),
      headline: normalizeLocalizedText(home.headline),
      headlineColor: normalizeOptionalPublicTenantColor(home.headlineColor),
      description: normalizeLocalizedText(home.description),
      labelColor: normalizeOptionalPublicTenantColor(home.labelColor),
      sectionOrder,
      hiddenSections,
      sectionContent: Object.fromEntries(
        PUBLIC_TENANT_HOME_SECTION_KEYS.map((key) => {
          const content = asObject(sectionContent[key]);

          return [
            key,
            {
              title: normalizeLocalizedText(content.title),
              description: normalizeLocalizedText(content.description),
            },
          ];
        }),
      ),
    },
    ...Object.fromEntries(
      ["book", "courses", "memberships", "vouchers", "help"].map((key) => {
        const page = asObject(pages[key]);

        return [
          key,
          {
            visible: page.visible !== false,
            title: normalizeLocalizedText(page.title),
            description: normalizeLocalizedText(page.description),
          },
        ];
      }),
    ),
  };
};

export const createPublicTenantFallback = (tenantSlug = "") => {
  const slug = asString(tenantSlug).toLowerCase();
  const name = formatTenantNameFromSlug(slug);

  return normalizePublicTenant({
    slug,
    name,
    publicCapabilities: {
      bookStudio: false,
      courses: false,
      memberships: false,
      vouchers: false,
      help: false,
      guestCourseCheckout: false,
      registration: false,
    },
  });
};

export const normalizePublicTenant = (value, tenantSlug = "") => {
  const envelope = asObject(value);
  const rawTenant = asObject(
    envelope.tenant ?? envelope.data?.tenant ?? envelope,
  );
  const slug = asString(rawTenant.slug || tenantSlug).toLowerCase();
  const fallbackName = formatTenantNameFromSlug(slug);
  const name = asString(rawTenant.name) || fallbackName;
  const settings = asObject(rawTenant.settings);
  const publicSite = asObject(rawTenant.publicSite);
  const branding = asObject(publicSite.branding);
  const login = asObject(publicSite.login);
  const register = asObject(publicSite.register);
  const customerPortal = asObject(publicSite.customerPortal);
  const customerPortalDashboard = asObject(customerPortal.dashboard);
  const customerPortalAppearance = asObject(customerPortal.appearance);
  const header = asObject(publicSite.header);
  const footer = asObject(publicSite.footer);
  const pages = asObject(publicSite.pages);
  const social = asObject(footer.social);
  const capabilities = normalizeCapabilities(rawTenant);
  const navOrder = uniqueKnownKeys(header.navOrder, PUBLIC_TENANT_NAV_KEYS);
  const hiddenItems = uniqueKnownKeys(
    header.hiddenItems,
    PUBLIC_TENANT_NAV_KEYS,
  );
  const configuredPrimaryCta = asString(header.primaryCta).toLowerCase();
  const displayName = asString(branding.displayName) || name;
  const localeSettings = normalizePublicTenantLocaleSettings(settings);
  const accentColor = normalizePublicTenantColor(branding.accentColor);
  const labelColor = normalizePublicTenantColor(
    branding.labelColor,
    accentColor,
  );

  return {
    id: asString(rawTenant.id ?? rawTenant._id),
    name,
    slug,
    settings: {
      ...localeSettings,
      currency: asString(settings.currency).toUpperCase(),
      timezone: asString(settings.timezone),
    },
    publicCapabilities: capabilities,
    customerCapabilities: {
      ...(typeof rawTenant.customerCapabilities?.myWork === "boolean"
        ? { myWork: rawTenant.customerCapabilities.myWork }
        : {}),
    },
    publicSite: {
      branding: {
        displayName,
        stylePreset: normalizePublicTenantStylePresetId(branding.stylePreset),
        fontPreset: normalizePublicTenantFontPresetId(branding.fontPreset),
        logoUrl: normalizePublicTenantUrl(branding.logoUrl),
        logoSize: normalizePublicTenantLogoSize(branding.logoSize),
        logoRedirectEnabled: branding.logoRedirectEnabled === true,
        logoRedirectUrl: normalizePublicTenantUrl(branding.logoRedirectUrl),
        faviconUrl: normalizePublicTenantUrl(branding.faviconUrl),
        accentColor,
        secondaryColor: normalizePublicTenantColor(
          branding.secondaryColor,
          DEFAULT_SECONDARY_COLOR,
        ),
        backgroundColor: normalizePublicTenantColor(
          branding.backgroundColor,
          DEFAULT_BACKGROUND_COLOR,
        ),
        textColor: normalizePublicTenantColor(
          branding.textColor,
          DEFAULT_TEXT_COLOR,
        ),
        buttonTextColor: normalizeOptionalPublicTenantColor(
          branding.buttonTextColor,
        ),
        labelColor,
        coverImageUrl: normalizePublicTenantUrl(branding.coverImageUrl),
        description: normalizeLocalizedText(branding.description),
      },
      pages: normalizePublicPages(pages),
      login: {
        eyebrow: normalizeLocalizedText(login.eyebrow),
        headline: normalizeLocalizedText(login.headline),
        supportingText: normalizeLocalizedText(login.supportingText),
        helpText: normalizeLocalizedText(login.helpText),
        labelColor: normalizeOptionalPublicTenantColor(login.labelColor),
        backgroundImageUrl: normalizePublicTenantUrl(login.backgroundImageUrl),
      },
      register: {
        eyebrow: normalizeLocalizedText(register.eyebrow),
        headline: normalizeLocalizedText(register.headline),
        supportingText: normalizeLocalizedText(register.supportingText),
        helpText: normalizeLocalizedText(register.helpText),
        labelColor: normalizeOptionalPublicTenantColor(register.labelColor),
        backgroundImageUrl: normalizePublicTenantUrl(
          register.backgroundImageUrl,
        ),
      },
      customerPortal: {
        ...normalizeCustomerPortalVisibility(customerPortal),
        courses: {
          guestCheckoutEnabled:
            customerPortal.courses?.guestCheckoutEnabled === true,
          locations: (Array.isArray(customerPortal.courses?.locations)
            ? customerPortal.courses.locations
            : []
          ).map((item) => ({
            locationId: String(item?.locationId || ""),
            headline: normalizeLocalizedText(item?.headline),
            description: normalizeLocalizedText(item?.description),
            heroImageUrl: normalizePublicTenantUrl(item?.heroImageUrl),
          })),
        },
        dashboard: {
          eyebrow: normalizeLocalizedText(customerPortalDashboard.eyebrow),
          headline: normalizeLocalizedText(customerPortalDashboard.headline),
          description: normalizeLocalizedText(
            customerPortalDashboard.description,
          ),
          labelColor: normalizeOptionalPublicTenantColor(
            customerPortalDashboard.labelColor,
          ),
        },
        appearance: normalizePortalAppearance(customerPortalAppearance),
      },
      header: {
        navOrder: completePublicNavigation(navOrder),
        hiddenItems,
        primaryCta: CTA_KEYS.has(configuredPrimaryCta)
          ? configuredPrimaryCta
          : "auto",
        announcement: {
          text: normalizeLocalizedText(asObject(header.announcement).text),
          url: normalizePublicTenantUrl(asObject(header.announcement).url),
        },
      },
      footer: {
        description: normalizeLocalizedText(footer.description),
        openingHours: normalizeLocalizedText(footer.openingHours),
        copyright: normalizeLocalizedText(footer.copyright),
        email: asString(footer.email),
        phone: asString(footer.phone),
        address: asString(footer.address),
        social: {
          instagram: normalizePublicTenantUrl(social.instagram, {
            allowRelative: false,
          }),
          facebook: normalizePublicTenantUrl(social.facebook, {
            allowRelative: false,
          }),
          youtube: normalizePublicTenantUrl(social.youtube, {
            allowRelative: false,
          }),
          website: normalizePublicTenantUrl(social.website, {
            allowRelative: false,
          }),
        },
        legal: normalizeLegal(footer.legal),
      },
    },
  };
};

export const isPublicTenantPageVisible = (tenant, pageKey) =>
  tenant?.publicSite?.pages?.[pageKey]?.visible !== false &&
  (pageKey !== "courses" ||
    tenant?.publicSite?.customerPortal?.pages?.courses?.enabled !== false);

export const getPublicTenantNavigation = (tenant) => {
  const normalized = normalizePublicTenant(tenant, tenant?.slug);
  const capabilities = normalized.publicCapabilities;
  const hidden = new Set(normalized.publicSite.header.hiddenItems);

  return normalized.publicSite.header.navOrder
    .filter((key) => !hidden.has(key))
    .filter((key) => isPublicTenantPageVisible(normalized, key))
    .filter(
      (key) => capabilities[PUBLIC_TENANT_NAV_DEFINITIONS[key].capability],
    )
    .map((key) => ({
      key,
      href: PUBLIC_TENANT_NAV_DEFINITIONS[key].href,
    }));
};

export const getPublicTenantPrimaryAction = (tenant) => {
  const normalized = normalizePublicTenant(tenant, tenant?.slug);
  const capabilities = normalized.publicCapabilities;
  const preferred = normalized.publicSite.header.primaryCta;
  const candidates =
    preferred === "auto"
      ? ["book", "courses", "memberships", "vouchers"]
      : [preferred, "book", "courses", "memberships", "vouchers"];
  const key = [...new Set(candidates)].find(
    (candidate) =>
      PUBLIC_TENANT_NAV_DEFINITIONS[candidate] &&
      isPublicTenantPageVisible(normalized, candidate) &&
      capabilities[PUBLIC_TENANT_NAV_DEFINITIONS[candidate].capability],
  );

  if (key) {
    return {
      key,
      href: PUBLIC_TENANT_NAV_DEFINITIONS[key].href,
    };
  }

  return capabilities.registration
    ? {
        key: "register",
        href: "/register",
      }
    : null;
};

const colorToRgb = (color) =>
  [1, 3, 5].map((index) => Number.parseInt(color.slice(index, index + 2), 16));

const channelToLinear = (channel) => {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

const getRgbLuminance = (rgb) =>
  0.2126 * channelToLinear(rgb[0]) +
  0.7152 * channelToLinear(rgb[1]) +
  0.0722 * channelToLinear(rgb[2]);

const getContrastRatio = (foreground, background) => {
  const foregroundLuminance = getRgbLuminance(foreground);
  const backgroundLuminance = getRgbLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
};

const rgbToColor = (rgb) =>
  `#${rgb
    .map((channel) => Math.round(channel).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;

const ensureReadableColor = (
  foregroundColor,
  backgroundColor,
  minimumContrast = 4.5,
) => {
  const foreground = colorToRgb(foregroundColor);
  const background = colorToRgb(backgroundColor);

  if (getContrastRatio(foreground, background) >= minimumContrast) {
    return foregroundColor;
  }

  const black = [0, 0, 0];
  const white = [255, 255, 255];
  const target =
    getContrastRatio(black, background) >= getContrastRatio(white, background)
      ? black
      : white;

  for (let step = 1; step <= 100; step += 1) {
    const amount = step / 100;
    const candidate = foreground.map(
      (channel, index) => channel + (target[index] - channel) * amount,
    );
    const roundedCandidate = candidate.map((channel) => Math.round(channel));

    if (getContrastRatio(roundedCandidate, background) >= minimumContrast) {
      return rgbToColor(roundedCandidate);
    }
  }

  return rgbToColor(target);
};

export const resolvePublicTenantActionForeground = (
  backgroundColor,
  preferredColor = "",
  minimumContrast = 4.5,
) => {
  const background = normalizePublicTenantColor(
    backgroundColor,
    DEFAULT_ACCENT_COLOR,
  );
  const backgroundRgb = colorToRgb(background);
  const preferred = normalizeOptionalPublicTenantColor(preferredColor);

  if (
    preferred &&
    getContrastRatio(colorToRgb(preferred), backgroundRgb) >= minimumContrast
  ) {
    return preferred;
  }

  const darkRatio = getContrastRatio(
    colorToRgb(DEFAULT_ACTION_DARK_COLOR),
    backgroundRgb,
  );
  const lightRatio = getContrastRatio(
    colorToRgb(DEFAULT_ACTION_LIGHT_COLOR),
    backgroundRgb,
  );

  const fallback =
    lightRatio > darkRatio
      ? DEFAULT_ACTION_LIGHT_COLOR
      : DEFAULT_ACTION_DARK_COLOR;
  return ensureReadableColor(fallback, background, minimumContrast);
};

export const resolvePublicTenantLabelColor = (
  value,
  backgroundColor,
  fallback = DEFAULT_ACCENT_COLOR,
) =>
  ensureReadableColor(
    normalizePublicTenantColor(value, fallback),
    normalizePublicTenantColor(backgroundColor, DEFAULT_BACKGROUND_COLOR),
  );

const mixPublicTenantColors = (baseColor, targetColor, amount) => {
  const base = colorToRgb(baseColor);
  const target = colorToRgb(targetColor);

  return rgbToColor(
    base.map((channel, index) => channel + (target[index] - channel) * amount),
  );
};

export const getPublicTenantTheme = (tenant, { surface = "public" } = {}) => {
  const normalized = normalizePublicTenant(tenant, tenant?.slug);
  const {
    accentColor,
    secondaryColor,
    backgroundColor: brandBackgroundColor,
    textColor: brandTextColor,
    buttonTextColor,
    labelColor,
    logoSize,
    stylePreset: stylePresetId,
    fontPreset: fontPresetId,
  } = normalized.publicSite.branding;
  const resolvedStylePreset = resolvePublicTenantStylePreset(stylePresetId);
  const resolvedFontPreset = resolvePublicTenantFontPreset(fontPresetId);
  const portalAppearance = normalized.publicSite.customerPortal.appearance;
  const portalSurface = surface === "portal";
  const backgroundColor = portalSurface
    ? normalizePublicTenantColor(
        portalAppearance.backgroundColor,
        brandBackgroundColor,
      )
    : brandBackgroundColor;
  const textColor = portalSurface
    ? normalizePublicTenantColor(portalAppearance.textColor, brandTextColor)
    : brandTextColor;
  const preferredHeadingColor = normalizePublicTenantColor(
    portalSurface ? portalAppearance.headingColor : "",
    accentColor,
  );
  const headingColor = ensureReadableColor(
    portalSurface ? preferredHeadingColor : accentColor,
    backgroundColor,
    4.8,
  );
  const headerTextTransform =
    resolvedStylePreset.id === PUBLIC_TENANT_STYLE_PRESET_IDS.MODERN_MINIMAL
      ? "lowercase"
      : "none";

  const accentForeground = resolvePublicTenantActionForeground(
    accentColor,
    buttonTextColor,
  );
  const accentLinkColor = ensureReadableColor(accentColor, backgroundColor);
  const inheritedSurfaceColor = mixPublicTenantColors(
    backgroundColor,
    "#FFFFFF",
    0.12,
  );
  const portalSurfaceColor = portalSurface
    ? normalizePublicTenantColor(
        portalAppearance.surfaceColor,
        inheritedSurfaceColor,
      )
    : inheritedSurfaceColor;
  const secondarySurfaceColor = mixPublicTenantColors(
    backgroundColor,
    secondaryColor,
    0.08,
  );
  const secondaryForeground = resolvePublicTenantActionForeground(
    secondaryColor,
    buttonTextColor,
  );
  const secondaryLinkColor = ensureReadableColor(
    secondaryColor,
    backgroundColor,
    4.8,
  );
  const secondaryOnLightColor = ensureReadableColor(
    secondaryColor,
    "#FFFFFF",
    4.8,
  );
  const secondaryOnSoftLightColor = ensureReadableColor(
    secondaryColor,
    "#F7F5F2",
    4.8,
  );
  const secondaryOnSurfaceColor = ensureReadableColor(
    secondaryColor,
    portalSurfaceColor,
    4.8,
  );
  const authFormSurfaceColor =
    resolvedStylePreset.id === PUBLIC_TENANT_STYLE_PRESET_IDS.WARM_ORGANIC
      ? mixPublicTenantColors(backgroundColor, secondaryColor, 0.04)
      : portalSurfaceColor;
  const authFormSecondaryColor = ensureReadableColor(
    secondaryColor,
    authFormSurfaceColor,
    4.8,
  );
  const accentOnSurfaceColor = ensureReadableColor(
    accentColor,
    portalSurfaceColor,
    4.8,
  );
  const accentOnLightColor = ensureReadableColor(accentColor, "#FFFFFF", 4.8);
  const textForeground = ensureReadableColor(textColor, backgroundColor);
  const labelForeground = resolvePublicTenantLabelColor(
    labelColor,
    backgroundColor,
    accentColor,
  );
  const textOnSurfaceColor = ensureReadableColor(
    textForeground,
    portalSurfaceColor,
  );
  const headingOnSurfaceColor = ensureReadableColor(
    portalSurface ? preferredHeadingColor : accentColor,
    portalSurfaceColor,
    4.8,
  );
  const textOnSecondarySurfaceColor = ensureReadableColor(
    textForeground,
    secondarySurfaceColor,
  );
  const mutedTextColor = ensureReadableColor(
    mixPublicTenantColors(textForeground, backgroundColor, 0.35),
    backgroundColor,
  );
  const mutedOnSurfaceColor = ensureReadableColor(
    mixPublicTenantColors(textForeground, portalSurfaceColor, 0.35),
    portalSurfaceColor,
  );
  const mutedOnSecondarySurfaceColor = ensureReadableColor(
    mixPublicTenantColors(
      textOnSecondarySurfaceColor,
      secondarySurfaceColor,
      0.35,
    ),
    secondarySurfaceColor,
  );
  const labelOnSecondarySurfaceColor = resolvePublicTenantLabelColor(
    labelColor,
    secondarySurfaceColor,
    accentColor,
  );
  const borderColor = mixPublicTenantColors(
    portalSurfaceColor,
    textOnSurfaceColor,
    0.12,
  );
  const portalButtonColor = normalizePublicTenantColor(
    portalAppearance.primaryButtonColor,
    accentColor,
  );
  const portalButtonForeground = resolvePublicTenantActionForeground(
    portalButtonColor,
    buttonTextColor,
  );
  const portalHeaderBackgroundColor = normalizePublicTenantColor(
    portalAppearance.headerBackgroundColor,
    backgroundColor,
  );
  const portalHeaderSurfaceColor = mixPublicTenantColors(
    portalHeaderBackgroundColor,
    "#FFFFFF",
    0.1,
  );
  const portalHeaderTextColor = ensureReadableColor(
    normalizePublicTenantColor(
      portalSurface ? portalAppearance.headerTextColor : "",
      textColor,
    ),
    portalHeaderBackgroundColor,
  );
  const portalHeaderTextOnSurfaceColor = ensureReadableColor(
    portalHeaderTextColor,
    portalHeaderSurfaceColor,
  );
  const portalHeaderMutedColor = ensureReadableColor(
    mixPublicTenantColors(
      portalHeaderTextColor,
      portalHeaderBackgroundColor,
      0.35,
    ),
    portalHeaderBackgroundColor,
  );
  const portalHeaderBorderColor = mixPublicTenantColors(
    portalHeaderBackgroundColor,
    portalHeaderTextColor,
    0.14,
  );
  const portalHeaderAccentColor = ensureReadableColor(
    normalizePublicTenantColor(
      portalSurface ? portalAppearance.headerTextColor : "",
      portalButtonColor,
    ),
    portalHeaderSurfaceColor,
    4.8,
  );
  const portalHeaderLinkColor = ensureReadableColor(
    normalizePublicTenantColor(
      portalSurface ? portalAppearance.headerTextColor : "",
      preferredHeadingColor,
    ),
    portalHeaderBackgroundColor,
    4.8,
  );
  const portalHeaderSecondaryColor = ensureReadableColor(
    secondaryColor,
    portalHeaderBackgroundColor,
    4.8,
  );
  const portalHeaderSecondaryOnSurfaceColor = ensureReadableColor(
    secondaryColor,
    portalHeaderSurfaceColor,
    4.8,
  );
  const portalHeaderHeadingColor = ensureReadableColor(
    preferredHeadingColor,
    portalHeaderBackgroundColor,
    4.8,
  );
  const portalCalendarBackgroundColor = normalizePublicTenantColor(
    portalAppearance.calendarBackgroundColor,
    portalSurfaceColor,
  );
  const portalCalendarTextColor = ensureReadableColor(
    normalizePublicTenantColor(
      portalSurface ? portalAppearance.calendarTextColor : "",
      textColor,
    ),
    portalCalendarBackgroundColor,
  );
  const portalCalendarSurfaceColor = mixPublicTenantColors(
    portalCalendarBackgroundColor,
    portalCalendarTextColor,
    0.045,
  );
  const portalCalendarTextOnSurfaceColor = ensureReadableColor(
    portalCalendarTextColor,
    portalCalendarSurfaceColor,
    4.8,
  );
  const portalCalendarMutedColor = ensureReadableColor(
    mixPublicTenantColors(
      portalCalendarTextOnSurfaceColor,
      portalCalendarSurfaceColor,
      0.35,
    ),
    portalCalendarSurfaceColor,
  );
  const portalCalendarLabelColor = resolvePublicTenantLabelColor(
    labelColor,
    portalCalendarBackgroundColor,
    portalButtonColor,
  );
  const portalCalendarBorderColor = mixPublicTenantColors(
    portalCalendarSurfaceColor,
    portalCalendarTextOnSurfaceColor,
    0.14,
  );
  const portalCalendarAccentColor = ensureReadableColor(
    portalButtonColor,
    portalCalendarSurfaceColor,
    4.8,
  );
  const portalCalendarAvailableSurfaceColor = mixPublicTenantColors(
    portalCalendarBackgroundColor,
    portalCalendarTextColor,
    0.025,
  );
  const portalCalendarAvailableTextColor = ensureReadableColor(
    portalCalendarTextColor,
    portalCalendarAvailableSurfaceColor,
  );
  const portalCalendarAvailableAccentColor = ensureReadableColor(
    portalButtonColor,
    portalCalendarAvailableSurfaceColor,
    4.8,
  );
  const portalCalendarSecondaryColor = ensureReadableColor(
    secondaryColor,
    portalCalendarBackgroundColor,
    4.8,
  );
  const portalCalendarSecondaryOnSurfaceColor = ensureReadableColor(
    secondaryColor,
    portalCalendarSurfaceColor,
    4.8,
  );
  const portalCalendarHeadingColor = ensureReadableColor(
    preferredHeadingColor,
    portalCalendarBackgroundColor,
    4.8,
  );
  const portalCalendarHeadingOnSurfaceColor = ensureReadableColor(
    preferredHeadingColor,
    portalCalendarSurfaceColor,
    4.8,
  );
  const portalProfileBackgroundColor = normalizePublicTenantColor(
    portalAppearance.profileMenuBackgroundColor,
    portalSurfaceColor,
  );
  const portalProfileTextColor = ensureReadableColor(
    textForeground,
    portalProfileBackgroundColor,
  );
  const portalProfileSurfaceColor = mixPublicTenantColors(
    portalProfileBackgroundColor,
    portalProfileTextColor,
    0.05,
  );
  const portalProfileTextOnSurfaceColor = ensureReadableColor(
    portalProfileTextColor,
    portalProfileSurfaceColor,
  );
  const portalProfileMutedColor = ensureReadableColor(
    mixPublicTenantColors(
      portalProfileTextOnSurfaceColor,
      portalProfileSurfaceColor,
      0.35,
    ),
    portalProfileSurfaceColor,
  );
  const portalProfileLabelColor = resolvePublicTenantLabelColor(
    labelColor,
    portalProfileSurfaceColor,
    portalButtonColor,
  );
  const portalProfileBorderColor = mixPublicTenantColors(
    portalProfileSurfaceColor,
    portalProfileTextOnSurfaceColor,
    0.14,
  );
  const portalProfileAccentColor = ensureReadableColor(
    portalButtonColor,
    portalProfileSurfaceColor,
    4.8,
  );
  const portalProfileSecondaryColor = ensureReadableColor(
    secondaryColor,
    portalProfileBackgroundColor,
    4.8,
  );
  const portalProfileSecondaryOnSurfaceColor = ensureReadableColor(
    secondaryColor,
    portalProfileSurfaceColor,
    4.8,
  );
  const authFormTextColor = ensureReadableColor(
    textForeground,
    authFormSurfaceColor,
  );
  const authFormMutedColor = ensureReadableColor(
    mixPublicTenantColors(authFormTextColor, authFormSurfaceColor, 0.35),
    authFormSurfaceColor,
  );
  const authFormLabelColor = resolvePublicTenantLabelColor(
    labelColor,
    authFormSurfaceColor,
    accentColor,
  );
  const authFormLinkColor = ensureReadableColor(
    accentColor,
    authFormSurfaceColor,
    4.8,
  );
  const authFieldSurfaceColor = mixPublicTenantColors(
    authFormSurfaceColor,
    authFormTextColor,
    0.08,
  );
  const authFieldSecondaryColor = ensureReadableColor(
    secondaryColor,
    authFieldSurfaceColor,
    4.8,
  );
  const authFieldTextColor = ensureReadableColor(
    authFormTextColor,
    authFieldSurfaceColor,
  );
  const authFieldMutedColor = ensureReadableColor(
    mixPublicTenantColors(authFieldTextColor, authFieldSurfaceColor, 0.35),
    authFieldSurfaceColor,
  );
  const authFormErrorColor = ensureReadableColor(
    DEFAULT_ERROR_COLOR,
    authFormSurfaceColor,
  );
  const authFormSuccessColor = ensureReadableColor(
    DEFAULT_SUCCESS_COLOR,
    authFormSurfaceColor,
  );
  const authFieldErrorColor = ensureReadableColor(
    DEFAULT_ERROR_COLOR,
    authFieldSurfaceColor,
  );
  const authFieldSuccessColor = ensureReadableColor(
    DEFAULT_SUCCESS_COLOR,
    authFieldSurfaceColor,
  );
  const authFieldLabelColor = resolvePublicTenantLabelColor(
    labelColor,
    authFieldSurfaceColor,
    accentColor,
  );

  return {
    stylePresetId,
    resolvedStylePresetId: resolvedStylePreset.id,
    fontPresetId,
    resolvedFontPresetId: resolvedFontPreset.id,
    accentColor,
    secondaryColor,
    secondaryForeground,
    secondaryLinkColor,
    secondaryOnLightColor,
    secondaryOnSoftLightColor,
    secondaryOnSurfaceColor,
    authFormSecondaryColor,
    backgroundColor,
    surfaceColor: portalSurfaceColor,
    textColor,
    headingColor,
    headingOnSurfaceColor,
    labelColor,
    logoSize,
    labelForeground,
    textForeground,
    accentForeground,
    accentLinkColor,
    accentOnLightColor,
    accentOnSurfaceColor,
    authFieldErrorColor,
    authFieldLabelColor,
    authFieldSecondaryColor,
    authFieldMutedColor,
    authFieldSuccessColor,
    authFieldSurfaceColor,
    authFieldTextColor,
    authFormErrorColor,
    authFormLinkColor,
    authFormSuccessColor,
    authFormSurfaceColor,
    mutedOnSurfaceColor,
    mutedTextColor,
    textOnSurfaceColor,
    borderColor,
    portalButtonColor,
    portalButtonForeground,
    portalHeaderBackgroundColor,
    portalHeaderSurfaceColor,
    portalHeaderTextColor,
    portalHeaderLinkColor,
    portalHeaderTextOnSurfaceColor,
    portalHeaderHeadingColor,
    portalHeaderSecondaryColor,
    portalHeaderSecondaryOnSurfaceColor,
    portalCalendarBackgroundColor,
    portalCalendarSurfaceColor,
    portalCalendarAvailableSurfaceColor,
    portalCalendarAvailableTextColor,
    portalCalendarAvailableAccentColor,
    portalCalendarTextColor,
    portalCalendarTextOnSurfaceColor,
    portalCalendarHeadingColor,
    portalCalendarSecondaryColor,
    portalCalendarSecondaryOnSurfaceColor,
    portalProfileBackgroundColor,
    portalProfileSurfaceColor,
    portalProfileTextColor,
    portalProfileTextOnSurfaceColor,
    portalProfileSecondaryColor,
    portalProfileSecondaryOnSurfaceColor,
    style: {
      ...resolvedStylePreset.cssVariables,
      ...resolvedFontPreset.cssVariables,
      "--tenant-accent": accentColor,
      "--tenant-accent-foreground": accentForeground,
      "--tenant-accent-link": accentLinkColor,
      "--tenant-heading-color": portalSurface ? headingColor : accentLinkColor,
      "--tenant-page-heading-color": portalSurface
        ? headingColor
        : accentLinkColor,
      "--tenant-heading-on-surface": headingOnSurfaceColor,
      "--tenant-header-text-transform": headerTextTransform,
      "--tenant-accent-on-light": accentOnLightColor,
      "--tenant-accent-on-surface": accentOnSurfaceColor,
      "--tenant-secondary": secondaryColor,
      "--tenant-secondary-foreground": secondaryForeground,
      "--tenant-secondary-link": secondaryLinkColor,
      "--tenant-secondary-on-light": secondaryOnLightColor,
      "--tenant-secondary-on-soft-light": secondaryOnSoftLightColor,
      "--tenant-secondary-on-surface": secondaryOnSurfaceColor,
      "--tenant-interactive-hover": secondaryLinkColor,
      "--tenant-interactive-hover-on-surface": secondaryOnSurfaceColor,
      "--tenant-interactive-hover-foreground": secondaryForeground,
      "--tenant-secondary-surface": secondarySurfaceColor,
      "--tenant-text-on-secondary-surface": textOnSecondarySurfaceColor,
      "--tenant-muted-on-secondary-surface": mutedOnSecondarySurfaceColor,
      "--tenant-label-on-secondary-surface": labelOnSecondarySurfaceColor,
      "--tenant-surface": portalSurfaceColor,
      "--tenant-background": backgroundColor,
      "--tenant-muted-on-surface": mutedOnSurfaceColor,
      "--tenant-muted-text": mutedTextColor,
      "--tenant-text-muted": mutedTextColor,
      "--tenant-border": borderColor,
      "--tenant-text": textForeground,
      "--tenant-text-on-surface": textOnSurfaceColor,
      "--tenant-label-color": labelForeground,
      "--tenant-auth-form-surface": authFormSurfaceColor,
      "--tenant-auth-form-text": authFormTextColor,
      "--tenant-auth-form-muted": authFormMutedColor,
      "--tenant-auth-form-label": authFormLabelColor,
      "--tenant-auth-form-link": authFormLinkColor,
      "--tenant-auth-form-secondary": authFormSecondaryColor,
      "--tenant-auth-form-error": authFormErrorColor,
      "--tenant-auth-form-success": authFormSuccessColor,
      "--tenant-auth-field-surface": authFieldSurfaceColor,
      "--tenant-auth-field-text": authFieldTextColor,
      "--tenant-auth-field-muted": authFieldMutedColor,
      "--tenant-auth-field-label": authFieldLabelColor,
      "--tenant-auth-field-secondary": authFieldSecondaryColor,
      "--tenant-auth-field-error": authFieldErrorColor,
      "--tenant-auth-field-success": authFieldSuccessColor,
      "--tenant-portal-button": portalButtonColor,
      "--tenant-portal-button-foreground": portalButtonForeground,
      "--tenant-portal-header-background": portalHeaderBackgroundColor,
      "--tenant-portal-header-surface": portalHeaderSurfaceColor,
      "--tenant-portal-header-text": portalHeaderTextColor,
      "--tenant-portal-header-text-on-surface": portalHeaderTextOnSurfaceColor,
      "--tenant-portal-header-muted": portalHeaderMutedColor,
      "--tenant-portal-header-border": portalHeaderBorderColor,
      "--tenant-portal-header-accent": portalHeaderAccentColor,
      "--tenant-portal-header-heading": portalHeaderHeadingColor,
      "--tenant-portal-header-secondary": portalHeaderSecondaryColor,
      "--tenant-portal-header-secondary-on-surface":
        portalHeaderSecondaryOnSurfaceColor,
      "--tenant-calendar-available-surface":
        portalCalendarAvailableSurfaceColor,
      "--tenant-calendar-available-text": portalCalendarAvailableTextColor,
      "--tenant-calendar-available-accent": portalCalendarAvailableAccentColor,
      "--tenant-portal-calendar-background": portalCalendarBackgroundColor,
      "--tenant-portal-calendar-surface": portalCalendarSurfaceColor,
      "--tenant-portal-calendar-available-surface":
        portalCalendarAvailableSurfaceColor,
      "--tenant-portal-calendar-available-text":
        portalCalendarAvailableTextColor,
      "--tenant-portal-calendar-available-accent":
        portalCalendarAvailableAccentColor,
      "--tenant-portal-calendar-text": portalCalendarTextColor,
      "--tenant-portal-calendar-text-on-surface":
        portalCalendarTextOnSurfaceColor,
      "--tenant-portal-calendar-muted": portalCalendarMutedColor,
      "--tenant-portal-calendar-label": portalCalendarLabelColor,
      "--tenant-portal-calendar-border": portalCalendarBorderColor,
      "--tenant-portal-calendar-accent": portalCalendarAccentColor,
      "--tenant-portal-calendar-heading": portalCalendarHeadingColor,
      "--tenant-portal-calendar-heading-on-surface":
        portalCalendarHeadingOnSurfaceColor,
      "--tenant-portal-calendar-secondary": portalCalendarSecondaryColor,
      "--tenant-portal-calendar-secondary-on-surface":
        portalCalendarSecondaryOnSurfaceColor,
      "--tenant-portal-profile-background": portalProfileBackgroundColor,
      "--tenant-portal-profile-surface": portalProfileSurfaceColor,
      "--tenant-portal-profile-text": portalProfileTextColor,
      "--tenant-portal-profile-text-on-surface":
        portalProfileTextOnSurfaceColor,
      "--tenant-portal-profile-muted": portalProfileMutedColor,
      "--tenant-portal-profile-label": portalProfileLabelColor,
      "--tenant-portal-profile-border": portalProfileBorderColor,
      "--tenant-portal-profile-accent": portalProfileAccentColor,
      "--tenant-portal-profile-secondary": portalProfileSecondaryColor,
      "--tenant-portal-profile-secondary-on-surface":
        portalProfileSecondaryOnSurfaceColor,
    },
  };
};
