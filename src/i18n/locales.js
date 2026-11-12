export const DEFAULT_LOCALE = "en";
export const DEFAULT_TIME_ZONE = "Europe/Prague";

export const LOCALE_STATUS = Object.freeze({
  READY: "ready",
  PREVIEW: "preview",
  PLANNED: "planned",
});

const defineLocale = (definition) => Object.freeze(definition);

/**
 * Canonical source of truth for shario.io locales.
 *
 * `ready` locales are safe to index, `preview` locales can be enabled for a
 * controlled rollout, and `planned` locales document the roadmap without
 * making the application claim support for them.
 */
export const LOCALE_REGISTRY = Object.freeze({
  en: defineLocale({
    code: "en",
    nativeName: "English",
    shortLabel: "EN",
    intlLocale: "en-US",
    openGraphLocale: "en_US",
    direction: "ltr",
    rolloutWave: 0,
    status: LOCALE_STATUS.READY,
  }),
  cs: defineLocale({
    code: "cs",
    nativeName: "Čeština",
    shortLabel: "CS",
    intlLocale: "cs-CZ",
    openGraphLocale: "cs_CZ",
    direction: "ltr",
    rolloutWave: 0,
    status: LOCALE_STATUS.READY,
  }),
  de: defineLocale({
    code: "de",
    nativeName: "Deutsch",
    shortLabel: "DE",
    intlLocale: "de-DE",
    openGraphLocale: "de_DE",
    direction: "ltr",
    rolloutWave: 1,
    status: LOCALE_STATUS.PREVIEW,
  }),
  pl: defineLocale({
    code: "pl",
    nativeName: "Polski",
    shortLabel: "PL",
    intlLocale: "pl-PL",
    openGraphLocale: "pl_PL",
    direction: "ltr",
    rolloutWave: 1,
    status: LOCALE_STATUS.PREVIEW,
  }),
  sk: defineLocale({
    code: "sk",
    nativeName: "Slovenčina",
    shortLabel: "SK",
    intlLocale: "sk-SK",
    openGraphLocale: "sk_SK",
    direction: "ltr",
    rolloutWave: 1,
    status: LOCALE_STATUS.PREVIEW,
  }),
  da: defineLocale({
    code: "da",
    nativeName: "Dansk",
    shortLabel: "DA",
    intlLocale: "da-DK",
    openGraphLocale: "da_DK",
    direction: "ltr",
    rolloutWave: 1,
    status: LOCALE_STATUS.PREVIEW,
  }),
  fr: defineLocale({
    code: "fr",
    nativeName: "Français",
    shortLabel: "FR",
    intlLocale: "fr-FR",
    openGraphLocale: "fr_FR",
    direction: "ltr",
    rolloutWave: 2,
    status: LOCALE_STATUS.PREVIEW,
  }),
  es: defineLocale({
    code: "es",
    nativeName: "Español",
    shortLabel: "ES",
    intlLocale: "es-ES",
    openGraphLocale: "es_ES",
    direction: "ltr",
    rolloutWave: 2,
    status: LOCALE_STATUS.PREVIEW,
  }),
  it: defineLocale({
    code: "it",
    nativeName: "Italiano",
    shortLabel: "IT",
    intlLocale: "it-IT",
    openGraphLocale: "it_IT",
    direction: "ltr",
    rolloutWave: 2,
    status: LOCALE_STATUS.PREVIEW,
  }),
  "pt-PT": defineLocale({
    code: "pt-PT",
    nativeName: "Português (Portugal)",
    shortLabel: "PT",
    intlLocale: "pt-PT",
    openGraphLocale: "pt_PT",
    direction: "ltr",
    rolloutWave: 2,
    status: LOCALE_STATUS.PREVIEW,
  }),
  sv: defineLocale({
    code: "sv",
    nativeName: "Svenska",
    shortLabel: "SV",
    intlLocale: "sv-SE",
    openGraphLocale: "sv_SE",
    direction: "ltr",
    rolloutWave: 2,
    status: LOCALE_STATUS.PREVIEW,
  }),
  nb: defineLocale({
    code: "nb",
    nativeName: "Norsk bokmål",
    shortLabel: "NB",
    intlLocale: "nb-NO",
    openGraphLocale: "nb_NO",
    direction: "ltr",
    rolloutWave: 2,
    status: LOCALE_STATUS.PREVIEW,
  }),
  fi: defineLocale({
    code: "fi",
    nativeName: "Suomi",
    shortLabel: "FI",
    intlLocale: "fi-FI",
    openGraphLocale: "fi_FI",
    direction: "ltr",
    rolloutWave: 2,
    status: LOCALE_STATUS.PREVIEW,
  }),
  hu: defineLocale({
    code: "hu",
    nativeName: "Magyar",
    shortLabel: "HU",
    intlLocale: "hu-HU",
    openGraphLocale: "hu_HU",
    direction: "ltr",
    rolloutWave: 2,
    status: LOCALE_STATUS.PREVIEW,
  }),
  el: defineLocale({
    code: "el",
    nativeName: "Ελληνικά",
    shortLabel: "EL",
    intlLocale: "el-GR",
    openGraphLocale: "el_GR",
    direction: "ltr",
    rolloutWave: 2,
    status: LOCALE_STATUS.PREVIEW,
  }),
  tr: defineLocale({
    code: "tr",
    nativeName: "Türkçe",
    shortLabel: "TR",
    intlLocale: "tr-TR",
    openGraphLocale: "tr_TR",
    direction: "ltr",
    rolloutWave: 2,
    status: LOCALE_STATUS.PREVIEW,
  }),
  nl: defineLocale({
    code: "nl",
    nativeName: "Nederlands",
    shortLabel: "NL",
    intlLocale: "nl-NL",
    openGraphLocale: "nl_NL",
    direction: "ltr",
    rolloutWave: 2,
    status: LOCALE_STATUS.READY,
  }),
  ro: defineLocale({
    code: "ro",
    nativeName: "Română",
    shortLabel: "RO",
    intlLocale: "ro-RO",
    openGraphLocale: "ro_RO",
    direction: "ltr",
    rolloutWave: 2,
    status: LOCALE_STATUS.PREVIEW,
  }),
});

export const ALL_LOCALE_CODES = Object.freeze(Object.keys(LOCALE_REGISTRY));
export const CORE_LOCALE_CODES = Object.freeze(["en", "cs"]);
export const WAVE_ONE_LOCALE_CODES = Object.freeze(["de", "pl", "sk", "da"]);
export const WAVE_TWO_A_LOCALE_CODES = Object.freeze([
  "fr",
  "es",
  "it",
  "pt-PT",
]);
export const WAVE_TWO_B_LOCALE_CODES = Object.freeze(["sv", "nb", "fi"]);
export const WAVE_TWO_C_LOCALE_CODES = Object.freeze(["hu", "el", "tr"]);
export const WAVE_TWO_D_LOCALE_CODES = Object.freeze(["nl"]);
export const WAVE_TWO_E_LOCALE_CODES = Object.freeze(["ro"]);
export const WAVE_TWO_LOCALE_CODES = Object.freeze([
  "fr",
  "es",
  "it",
  "pt-PT",
  "sv",
  "nb",
  "fi",
  "hu",
  "el",
  "tr",
  "nl",
  "ro",
]);

export const PREVIEW_LOCALE_CODES = Object.freeze(
  ALL_LOCALE_CODES.filter(
    (code) => LOCALE_REGISTRY[code].status === LOCALE_STATUS.PREVIEW,
  ),
);
export const PLANNED_LOCALE_CODES = Object.freeze(
  ALL_LOCALE_CODES.filter(
    (code) => LOCALE_REGISTRY[code].status === LOCALE_STATUS.PLANNED,
  ),
);

export const ROLLOUT_ELIGIBLE_LOCALE_CODES = Object.freeze([
  ...ALL_LOCALE_CODES.filter(
    (code) => LOCALE_REGISTRY[code].status !== LOCALE_STATUS.PLANNED,
  ),
]);
const CORE_LOCALE_SET = new Set(CORE_LOCALE_CODES);
const ROLLOUT_ELIGIBLE_LOCALE_SET = new Set(ROLLOUT_ELIGIBLE_LOCALE_CODES);
const CANONICAL_CODE_BY_LOWERCASE = new Map(
  ALL_LOCALE_CODES.map((code) => [code.toLowerCase(), code]),
);
const LOCALE_ALIASES = new Map([
  ["en-us", "en"],
  ["en-gb", "en"],
  ["cz", "cs"],
  ["cs-cz", "cs"],
  ["de-de", "de"],
  ["pl-pl", "pl"],
  ["sk-sk", "sk"],
  ["da-dk", "da"],
  ["fr-fr", "fr"],
  ["es-es", "es"],
  ["it-it", "it"],
  ["pt", "pt-PT"],
  ["sv-se", "sv"],
  ["nb-no", "nb"],
  ["no-no", "nb"],
  ["fi-fi", "fi"],
  ["hu-hu", "hu"],
  ["el-gr", "el"],
  ["tr-tr", "tr"],
  ["nl-nl", "nl"],
  ["ro-ro", "ro"],
]);
const PRIMARY_LOCALE_ALIASES = new Map([
  ["en", "en"],
  ["cs", "cs"],
  ["cz", "cs"],
  ["de", "de"],
  ["pl", "pl"],
  ["sk", "sk"],
  ["da", "da"],
  ["fr", "fr"],
  ["es", "es"],
  ["it", "it"],
  ["sv", "sv"],
  ["nb", "nb"],
  ["no", "nb"],
  ["fi", "fi"],
  ["hu", "hu"],
  ["el", "el"],
  ["gr", "el"],
  ["tr", "tr"],
  ["nl", "nl"],
  ["ro", "ro"],
]);

export function normalizeLocaleCode(value) {
  const normalized = String(value || "")
    .trim()
    .replaceAll("_", "-")
    .toLowerCase();

  if (!normalized) return null;
  // Never reinterpret Brazilian or another Portuguese variant as European
  // Portuguese. Bare `pt` and explicit `pt-PT` remain supported aliases.
  if (normalized.startsWith("pt-") && normalized !== "pt-pt") return null;

  return (
    LOCALE_ALIASES.get(normalized) ||
    CANONICAL_CODE_BY_LOWERCASE.get(normalized) ||
    PRIMARY_LOCALE_ALIASES.get(normalized.split("-")[0]) ||
    null
  );
}

/**
 * Canonicalizes API/persistence locale snapshots without enabling unknown
 * routes. Historical aliases such as `cz` remain readable, while any future
 * planned values stay outside the live contract until their rollout begins.
 */
export function normalizeRolloutEligibleLocaleCode(value) {
  const code = normalizeLocaleCode(value);

  return code && ROLLOUT_ELIGIBLE_LOCALE_SET.has(code) ? code : null;
}

export function resolveRolloutEligibleLocaleCode(
  value,
  fallback = DEFAULT_LOCALE,
) {
  return (
    normalizeRolloutEligibleLocaleCode(value) ||
    normalizeRolloutEligibleLocaleCode(fallback) ||
    DEFAULT_LOCALE
  );
}

export function getRolloutEligibleLocaleFromPathname(value) {
  const pathname = String(value ?? "").trim();

  if (
    !pathname.startsWith("/") ||
    pathname.startsWith("//") ||
    pathname.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(pathname)
  ) {
    return null;
  }

  const firstSegment = pathname.slice(1).split(/[/?#]/, 1)[0];

  return normalizeRolloutEligibleLocaleCode(firstSegment);
}

export function stripRolloutEligibleLocalePrefix(value) {
  const pathname = `/${String(value || "/").replace(/^\/+/, "")}`;

  if (!getRolloutEligibleLocaleFromPathname(pathname)) {
    return pathname;
  }

  const prefix = pathname.match(/^\/[^/?#]+/)?.[0] || "";
  return pathname.slice(prefix.length) || "/";
}

export function getLocaleDefinition(value) {
  const code = normalizeLocaleCode(value);

  return code ? LOCALE_REGISTRY[code] : null;
}

export function isKnownLocale(value) {
  return getLocaleDefinition(value) !== null;
}

/**
 * Parses the public rollout allow-list and returns only locales that currently
 * have catalog loaders and are eligible for routing. Any future planned
 * entries are deliberately ignored even if accidentally included in the
 * environment.
 */
export function parseEnabledLocaleList(value) {
  const tokens = Array.isArray(value)
    ? value
    : String(value || "").split(/[\s,;]+/);
  const enabled = new Set();

  for (const token of tokens) {
    const code = normalizeLocaleCode(token);

    if (code && ROLLOUT_ELIGIBLE_LOCALE_SET.has(code)) {
      enabled.add(code);
    }
  }

  return ROLLOUT_ELIGIBLE_LOCALE_CODES.filter((code) => enabled.has(code));
}

export function isPreviewLocaleGateEnabled(value) {
  return String(value || "").trim() === "true";
}

function getRolloutNodeEnvironment(rolloutOptions = {}) {
  return Object.prototype.hasOwnProperty.call(rolloutOptions, "nodeEnv")
    ? rolloutOptions.nodeEnv
    : process.env.NODE_ENV;
}

export function canRoutePreviewLocales(rolloutOptions = {}) {
  const nodeEnv = getRolloutNodeEnvironment(rolloutOptions);
  const previewGate = Object.prototype.hasOwnProperty.call(
    rolloutOptions,
    "previewGate",
  )
    ? rolloutOptions.previewGate
    : process.env.NEXT_PUBLIC_ENABLE_PREVIEW_LOCALES;

  return nodeEnv !== "production" || isPreviewLocaleGateEnabled(previewGate);
}

function shouldUseDevelopmentLocaleDefaults(value, rolloutOptions = {}) {
  return (
    getRolloutNodeEnvironment(rolloutOptions) === "development" &&
    String(value ?? "").trim() === ""
  );
}

/**
 * English and Czech are always enabled. A missing or blank allow-list enables
 * all preview locales during local development so preview routes work out of
 * the box. Tests and production keep the core-only default. An explicit
 * NEXT_PUBLIC_ENABLED_LOCALES value narrows the selection, while production
 * additionally requires NEXT_PUBLIC_ENABLE_PREVIEW_LOCALES=true.
 */
export function getEnabledLocaleCodes(value, rolloutOptions) {
  const requestedLocales = new Set(
    shouldUseDevelopmentLocaleDefaults(value, rolloutOptions)
      ? PREVIEW_LOCALE_CODES
      : parseEnabledLocaleList(value),
  );
  const previewLocalesAllowed = canRoutePreviewLocales(rolloutOptions);

  return ROLLOUT_ELIGIBLE_LOCALE_CODES.filter(
    (code) =>
      CORE_LOCALE_SET.has(code) ||
      (requestedLocales.has(code) &&
        (LOCALE_REGISTRY[code].status !== LOCALE_STATUS.PREVIEW ||
          previewLocalesAllowed)),
  );
}

export function getEnabledLocaleDefinitions(value, rolloutOptions) {
  return getEnabledLocaleCodes(value, rolloutOptions).map(
    (code) => LOCALE_REGISTRY[code],
  );
}

export function isIndexableLocale(value) {
  return getLocaleDefinition(value)?.status === LOCALE_STATUS.READY;
}

export function resolveLocale(value, enabledLocaleCodes = CORE_LOCALE_CODES) {
  const code = normalizeLocaleCode(value);

  return code && enabledLocaleCodes.includes(code) ? code : DEFAULT_LOCALE;
}

export function resolveTimeZone(value) {
  const candidate = String(value || "").trim() || DEFAULT_TIME_ZONE;

  try {
    new Intl.DateTimeFormat("en", { timeZone: candidate }).format();
    return candidate;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

/**
 * The remaining Redux/i18next-era surface only has CZ and EN catalogs. Czech
 * stays Czech; every other recognized locale safely uses legacy English.
 */
export function getLegacyLanguageForLocale(value) {
  return normalizeLocaleCode(value) === "cs" ? "CZ" : "EN";
}

export function normalizeLegacyLanguage(value, fallback = "CZ") {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  const locale = normalizeLocaleCode(normalized);

  if (normalized === "cz" || normalized === "cs") return "CZ";
  if (normalized === "en") return "EN";
  if (locale === "cs") return "CZ";
  if (locale) return "EN";

  return fallback;
}
