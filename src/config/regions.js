import { DEFAULT_PLATFORM_BILLING_CURRENCY } from "./currencies";

// ISO 3166-1 country/territory codes, plus Kosovo for regional suggestions.
export const COUNTRY_CODES = Object.freeze(
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW".split(
    " ",
  ),
);
const COUNTRY_SET = new Set(COUNTRY_CODES);
const EURO_COUNTRIES = new Set(
  // Bulgaria joined the euro area on 1 January 2026. Euro territories and
  // countries using the euro also receive EUR; EU membership alone is not used.
  "AD AT AX BE BG BL CY DE EE ES FI FR GF GP GR HR IE IT LT LU LV MC ME MF MQ MT NL PM PT RE SI SK SM TF VA XK YT".split(
    " ",
  ),
);
const CURRENCY_BY_COUNTRY = Object.freeze({
  AU: "AUD",
  CX: "AUD",
  CC: "AUD",
  HM: "AUD",
  KI: "AUD",
  NR: "AUD",
  NF: "AUD",
  TV: "AUD",
  CA: "CAD",
  CH: "CHF",
  LI: "CHF",
  CZ: "CZK",
  DK: "DKK",
  FO: "DKK",
  GL: "DKK",
  GB: "GBP",
  GG: "GBP",
  IM: "GBP",
  JE: "GBP",
  NO: "NOK",
  SJ: "NOK",
  BV: "NOK",
  PL: "PLN",
  SE: "SEK",
});

export const normalizeCountryCode = (value) => {
  const code = String(value ?? "")
    .trim()
    .toUpperCase();
  return COUNTRY_SET.has(code) ? code : "";
};

const regionDisplayNames = new Map();
export const getCountryName = (code, locale = "en") => {
  try {
    if (!regionDisplayNames.has(locale)) {
      regionDisplayNames.set(
        locale,
        new Intl.DisplayNames(locale, { type: "region" }),
      );
    }
    return regionDisplayNames.get(locale).of(code) || code;
  } catch {
    return code;
  }
};

const historicalCountryNames = { CZ: "Czech Republic" };
const getStoredCountryName = (code) =>
  historicalCountryNames[code] || getCountryName(code);

export const getCountryCode = (value) => {
  const code = normalizeCountryCode(value);
  if (code) return code;
  const name = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!name) return "";
  return (
    COUNTRY_CODES.find((candidate) =>
      [getStoredCountryName(candidate), getCountryName(candidate)].some(
        (candidateName) => candidateName.toLowerCase() === name,
      ),
    ) || ""
  );
};

export const getCurrencyForCountry = (country) => {
  const code = getCountryCode(country);
  return EURO_COUNTRIES.has(code)
    ? "EUR"
    : CURRENCY_BY_COUNTRY[code] || DEFAULT_PLATFORM_BILLING_CURRENCY;
};

// Only use a region actually present in the locale. Inferring one from `en`
// or `pl` would confuse a language preference with the user's country.
export const getCountryFromLocales = (locales = []) => {
  for (const locale of Array.isArray(locales) ? locales : [locales]) {
    try {
      const country = normalizeCountryCode(
        new Intl.Locale(String(locale).replaceAll("_", "-")).region,
      );
      if (country) return country;
    } catch {
      /* Ignore malformed browser locale values. */
    }
  }
  return "";
};

export const getCountryOptions = (locale, currentCountry = "") => {
  const currentCode = getCountryCode(currentCountry);
  const options = COUNTRY_CODES.map((code) => ({
    value: code === currentCode ? currentCountry : getStoredCountryName(code),
    label:
      code === "CZ" && locale === "cs"
        ? "Česká republika"
        : getCountryName(code, locale),
  })).sort((left, right) => left.label.localeCompare(right.label, locale));
  if (currentCountry && !currentCode)
    options.unshift({ value: currentCountry, label: currentCountry });
  return options;
};

export const getTimeZoneOptions = (currentTimeZone = "UTC") => {
  let zones = [];
  try {
    zones = Intl.supportedValuesOf("timeZone");
  } catch {
    /* Older browser. */
  }
  return [
    ...new Set(
      [
        currentTimeZone,
        "UTC",
        "Europe/Prague",
        "Europe/Copenhagen",
        "Europe/Berlin",
        "Europe/Warsaw",
        ...zones,
      ].filter(Boolean),
    ),
  ].sort();
};
