import { formatDuration } from "@/utils/locationBookingUtils";
const freezeOptions = (options) =>
  Object.freeze(options.map((option) => Object.freeze(option)));

/**
 * Countries currently supported by the workspace location editor.
 *
 * `code` is the persisted ISO 3166-1 alpha-2 value and `dialCode` is used to
 * compose an E.164 contact number. Names are English fallbacks; consumers can
 * use `getCountryDisplayName` for locale-aware labels.
 */
export const COUNTRY_OPTIONS = freezeOptions([
  {
    code: "CZ",
    dialCode: "+420",
    name: "Czechia",
  },
  {
    code: "SK",
    dialCode: "+421",
    name: "Slovakia",
  },
  {
    code: "AT",
    dialCode: "+43",
    name: "Austria",
  },
  {
    code: "DE",
    dialCode: "+49",
    name: "Germany",
  },
  {
    code: "PL",
    dialCode: "+48",
    name: "Poland",
  },
  {
    code: "DK",
    dialCode: "+45",
    name: "Denmark",
  },
  {
    code: "SE",
    dialCode: "+46",
    name: "Sweden",
  },
  {
    code: "NO",
    dialCode: "+47",
    name: "Norway",
  },
  {
    code: "FI",
    dialCode: "+358",
    name: "Finland",
  },
  {
    code: "IS",
    dialCode: "+354",
    name: "Iceland",
  },
  {
    code: "FR",
    dialCode: "+33",
    name: "France",
  },
  {
    code: "ES",
    dialCode: "+34",
    name: "Spain",
  },
  {
    code: "IT",
    dialCode: "+39",
    name: "Italy",
    keepNationalLeadingZero: true,
  },
  {
    code: "PT",
    dialCode: "+351",
    name: "Portugal",
  },
  {
    code: "NL",
    dialCode: "+31",
    name: "Netherlands",
  },
  {
    code: "BE",
    dialCode: "+32",
    name: "Belgium",
  },
  {
    code: "LU",
    dialCode: "+352",
    name: "Luxembourg",
  },
  {
    code: "IE",
    dialCode: "+353",
    name: "Ireland",
  },
  {
    code: "GR",
    dialCode: "+30",
    name: "Greece",
  },
  {
    code: "CY",
    dialCode: "+357",
    name: "Cyprus",
  },
  {
    code: "MT",
    dialCode: "+356",
    name: "Malta",
  },
  {
    code: "HU",
    dialCode: "+36",
    name: "Hungary",
  },
  {
    code: "RO",
    dialCode: "+40",
    name: "Romania",
  },
  {
    code: "BG",
    dialCode: "+359",
    name: "Bulgaria",
  },
  {
    code: "SI",
    dialCode: "+386",
    name: "Slovenia",
  },
  {
    code: "HR",
    dialCode: "+385",
    name: "Croatia",
  },
  {
    code: "EE",
    dialCode: "+372",
    name: "Estonia",
  },
  {
    code: "LV",
    dialCode: "+371",
    name: "Latvia",
  },
  {
    code: "LT",
    dialCode: "+370",
    name: "Lithuania",
  },
  {
    code: "LI",
    dialCode: "+423",
    name: "Liechtenstein",
  },
  {
    code: "CH",
    dialCode: "+41",
    name: "Switzerland",
  },
  {
    code: "TR",
    dialCode: "+90",
    name: "Türkiye",
  },
  {
    code: "GB",
    dialCode: "+44",
    name: "United Kingdom",
  },
  {
    code: "US",
    dialCode: "+1",
    name: "United States",
  },
  {
    code: "CA",
    dialCode: "+1",
    name: "Canada",
  },
  {
    code: "AU",
    dialCode: "+61",
    name: "Australia",
  },
  {
    code: "NZ",
    dialCode: "+64",
    name: "New Zealand",
  },
]);
const normalizeAlias = (value) =>
  String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
const COUNTRY_ALIASES = Object.freeze({
  czechia: "CZ",
  czechrepublic: "CZ",
  ceskarepublika: "CZ",
  cesko: "CZ",
  slovakia: "SK",
  slovensko: "SK",
  austria: "AT",
  osterreich: "AT",
  rakousko: "AT",
  germany: "DE",
  deutschland: "DE",
  nemecko: "DE",
  poland: "PL",
  polska: "PL",
  polsko: "PL",
  denmark: "DK",
  danmark: "DK",
  dansko: "DK",
  sweden: "SE",
  sverige: "SE",
  svedsko: "SE",
  norway: "NO",
  norge: "NO",
  norsko: "NO",
  finland: "FI",
  suomi: "FI",
  finsko: "FI",
  iceland: "IS",
  island: "IS",
  france: "FR",
  francie: "FR",
  spain: "ES",
  espana: "ES",
  spanelsko: "ES",
  italy: "IT",
  italia: "IT",
  italie: "IT",
  portugal: "PT",
  portugalsko: "PT",
  netherlands: "NL",
  nederland: "NL",
  nizozemsko: "NL",
  belgium: "BE",
  belgie: "BE",
  luxembourg: "LU",
  lucembursko: "LU",
  ireland: "IE",
  irsko: "IE",
  greece: "GR",
  recko: "GR",
  el: "GR",
  cyprus: "CY",
  kypr: "CY",
  malta: "MT",
  hungary: "HU",
  magyarorszag: "HU",
  madarsko: "HU",
  romania: "RO",
  rumunsko: "RO",
  bulgaria: "BG",
  bulharsko: "BG",
  slovenia: "SI",
  slovinsko: "SI",
  croatia: "HR",
  chorvatsko: "HR",
  estonia: "EE",
  estonsko: "EE",
  latvia: "LV",
  lotyssko: "LV",
  lithuania: "LT",
  litva: "LT",
  liechtenstein: "LI",
  lichtenstejnsko: "LI",
  switzerland: "CH",
  schweiz: "CH",
  svycarsko: "CH",
  turkey: "TR",
  turkiye: "TR",
  turecko: "TR",
  unitedkingdom: "GB",
  greatbritain: "GB",
  britain: "GB",
  uk: "GB",
  spojenekralovstvi: "GB",
  unitedstates: "US",
  unitedstatesofamerica: "US",
  usa: "US",
  canada: "CA",
  kanada: "CA",
  australia: "AU",
  australie: "AU",
  newzealand: "NZ",
  novyzeland: "NZ",
});
const COUNTRY_BY_CODE = new Map(
  COUNTRY_OPTIONS.map((option) => [option.code, option]),
);
const COUNTRY_CODE_BY_ALIAS = new Map(
  COUNTRY_OPTIONS.flatMap((option) => [
    [normalizeAlias(option.code), option.code],
    [normalizeAlias(option.name), option.code],
  ]),
);
for (const [alias, code] of Object.entries(COUNTRY_ALIASES)) {
  COUNTRY_CODE_BY_ALIAS.set(normalizeAlias(alias), code);
}
export function normalizeCountryCode(value, fallback = null) {
  const code = COUNTRY_CODE_BY_ALIAS.get(normalizeAlias(value));
  if (code) return code;
  const normalizedFallback = COUNTRY_CODE_BY_ALIAS.get(
    normalizeAlias(fallback),
  );
  return normalizedFallback || null;
}
export function getCountryOption(value, fallback = "CZ") {
  const code = normalizeCountryCode(value, fallback);
  return (code && COUNTRY_BY_CODE.get(code)) || null;
}
export function getCountryDisplayName(value, locale = "en") {
  const option = getCountryOption(value, null);
  if (!option) return String(value || "");
  try {
    return (
      new Intl.DisplayNames([locale], {
        type: "region",
      }).of(option.code) || option.name
    );
  } catch {
    return option.name;
  }
}
const stripPhoneFormatting = (value) =>
  String(value || "")
    .trim()
    .replace(/^00/, "+")
    .replace(/(?!^\+)[^0-9]/g, "")
    .replace(/^\++/, "+");
const getCountryForInternationalDigits = (digits, preferredCountry) => {
  const matches = COUNTRY_OPTIONS.filter((option) =>
    digits.startsWith(option.dialCode.slice(1)),
  ).sort((left, right) => right.dialCode.length - left.dialCode.length);
  const longestDialCode = matches[0]?.dialCode;
  const preferredOption = getCountryOption(preferredCountry, null);
  if (
    preferredOption &&
    preferredOption.dialCode === longestDialCode &&
    digits.startsWith(preferredOption.dialCode.slice(1))
  ) {
    return preferredOption;
  }
  return matches[0] || null;
};
const normalizeNationalDigits = (value, option) => {
  let digits = String(value || "").replace(/\D/g, "");
  if (!option?.keepNationalLeadingZero) {
    digits = digits.replace(/^0/, "");
  }
  return digits;
};

/**
 * Converts a pasted international number or a national number plus selected
 * country into compact E.164-like storage (`+420605989401`).
 *
 * This intentionally performs conservative structural normalization rather
 * than carrier-specific validation. Exact national numbering plans belong on
 * the server or in a dedicated phone-number library.
 */
export function normalizeInternationalPhone(value, country = "CZ") {
  const compact = stripPhoneFormatting(value);
  if (!compact) return "";
  if (compact.startsWith("+")) {
    const digits = compact.slice(1).replace(/\D/g, "");
    return digits ? `+${digits}` : "";
  }
  const option = getCountryOption(country, "CZ");
  if (!option) return "";
  const digits = compact.replace(/\D/g, "");
  const dialDigits = option.dialCode.slice(1);
  const alreadyIncludesDialCode =
    digits.startsWith(dialDigits) && digits.length >= dialDigits.length + 6;
  if (alreadyIncludesDialCode) return `+${digits}`;
  const nationalDigits = normalizeNationalDigits(digits, option);
  return nationalDigits ? `${option.dialCode}${nationalDigits}` : "";
}
export function parseInternationalPhone(value, fallbackCountry = "CZ") {
  const normalized = normalizeInternationalPhone(value, fallbackCountry);
  const fallbackOption = getCountryOption(fallbackCountry, "CZ");
  if (!normalized) {
    return {
      countryCode: fallbackOption?.code || "CZ",
      dialCode: fallbackOption?.dialCode || "+420",
      nationalNumber: "",
      e164: "",
    };
  }
  const digits = normalized.slice(1);
  const internationalOption = getCountryForInternationalDigits(
    digits,
    fallbackCountry,
  );
  if (
    !internationalOption &&
    String(value || "")
      .trim()
      .startsWith("+")
  ) {
    return {
      countryCode: fallbackOption?.code || "CZ",
      dialCode: "",
      nationalNumber: normalized,
      e164: normalized,
    };
  }
  const option = internationalOption || fallbackOption;
  const dialDigits = option?.dialCode.slice(1) || "";
  return {
    countryCode: option?.code || "CZ",
    dialCode: option?.dialCode || "+420",
    nationalNumber: digits.slice(dialDigits.length),
    e164: normalized,
  };
}
export function isValidInternationalPhone(value, country = "CZ") {
  const parsed = parseInternationalPhone(value, country);
  const allDigits = parsed.e164.slice(1);
  return Boolean(
    /^\+[1-9]\d{7,14}$/.test(parsed.e164) &&
    parsed.nationalNumber.length >= 6 &&
    allDigits.length <= 15,
  );
}
export const SLOT_STEP_OPTIONS = Object.freeze([15, 30, 60]);
export const DURATION_OPTIONS = Object.freeze([
  30, 45, 60, 90, 120, 150, 180, 240, 300, 360, 480, 720,
]);
export const BOOKING_DURATION_OPTIONS = DURATION_OPTIONS;
export function formatDurationMinutes(value, locale = "en") {
  return formatDuration(value, locale);
}

export const ACTIVITY_SELECTION_MODE = Object.freeze({
  REQUIRED: "REQUIRED",
  OPTIONAL: "OPTIONAL",
  HIDDEN: "HIDDEN",
});
export const ACTIVITY_SELECTION_MODES = Object.freeze(
  Object.values(ACTIVITY_SELECTION_MODE),
);
export const ACTIVITY_OPTIONS = freezeOptions([
  {
    key: "WORKSTATION",
    labelKey: "workstation",
  },
  {
    key: "SHARED_TABLE",
    labelKey: "sharedTable",
  },
]);

// GENERAL is retained in hydration and payload helpers for legacy locations,
// but is intentionally not offered as a customer-selectable activity.
export const ACTIVITY_CAPACITY_KEYS = Object.freeze([
  ...ACTIVITY_OPTIONS.map(({ key }) => key),
  "GENERAL",
]);
export function normalizeActivitySelectionMode(value, fallback) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  if (ACTIVITY_SELECTION_MODES.includes(normalized)) return normalized;
  return fallback || ACTIVITY_SELECTION_MODE.REQUIRED;
}
export const WEEKDAYS = Object.freeze([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);
export const LOCATION_OPEN_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
export const LOCATION_CLOSE_TIME_PATTERN =
  /^(?:([01]\d|2[0-3]):[0-5]\d|24:00)$/;
export const LOCATION_PRICING_MODES = Object.freeze(["time"]);
export const normalizeLocationPricingMode = (value) =>
  LOCATION_PRICING_MODES.includes(value) ? value : null;
export const createDefaultOpeningHours = () =>
  Object.fromEntries(
    WEEKDAYS.map((day) => [
      day,
      {
        isOpen: true,
        openTime: "06:00",
        closeTime: "24:00",
      },
    ]),
  );
export const validateLocationOpeningHours = (openingHours = {}) =>
  Object.fromEntries(
    WEEKDAYS.flatMap((day) => {
      const hours = openingHours[day];
      if (!hours) return [];
      const valid =
        LOCATION_OPEN_TIME_PATTERN.test(hours.openTime || "") &&
        LOCATION_CLOSE_TIME_PATTERN.test(hours.closeTime || "");
      return valid ? [] : [[day, "invalid"]];
    }),
  );
const normalizeOpeningHours = (openingHours = {}) => {
  const defaults = createDefaultOpeningHours();
  return Object.fromEntries(
    WEEKDAYS.map((day) => [
      day,
      {
        isOpen: openingHours[day]?.isOpen !== false,
        openTime: openingHours[day]?.openTime || defaults[day].openTime,
        closeTime: openingHours[day]?.closeTime || defaults[day].closeTime,
      },
    ]),
  );
};
const normalizeActivityCapacities = (value) => {
  const entries = Array.isArray(value)
    ? value.map((item) => [item?.activity, item?.capacity])
    : Object.entries(value || {});
  const byActivity = new Map(entries);
  return Object.fromEntries(
    ACTIVITY_CAPACITY_KEYS.map((key) => [
      key,
      Math.max(0, Number(byActivity.get(key)) || 0),
    ]),
  );
};
export function createLocationFormDefaults({
  country = "CZ",
  timezone = "Europe/Prague",
} = {}) {
  const countryCode = normalizeCountryCode(country, "CZ");
  return {
    name: "",
    pricingMode: "time",
    address: {
      line1: "",
      line2: "",
      city: "",
      postalCode: "",
      country: countryCode,
    },
    contact: {
      email: "",
      phoneCountry: countryCode,
      phone: "",
    },
    booking: {
      enabled: false,
      timezone,
      slotStepMinutes: 30,
      minBookingMinutes: 60,
      maxBookingMinutes: 360,
      allowPublicSoloOverlap: false,
      maxPublicSoloOverlaps: 1,
      globalCapacity: 1,
      privateSessionBlocksAll: true,
      groupBookingBlocksAll: true,
      activitySelectionMode: ACTIVITY_SELECTION_MODE.REQUIRED,
      activityCapacities: normalizeActivityCapacities(),
    },
    openingHours: createDefaultOpeningHours(),
  };
}
export function buildLocationForm(location, options = {}) {
  if (!location) return createLocationFormDefaults(options);
  const rawAddressCountry = String(location.address?.country || "").trim();
  const addressCountry =
    normalizeCountryCode(rawAddressCountry, null) ||
    rawAddressCountry ||
    normalizeCountryCode(options.country, "CZ");
  const parsedPhone = parseInternationalPhone(
    location.contact?.phone,
    addressCountry,
  );
  const defaults = createLocationFormDefaults({
    country: addressCountry,
    timezone: location.booking?.timezone || options.timezone,
  });
  return {
    ...defaults,
    name: location.name || "",
    pricingMode: "time",
    address: {
      line1: location.address?.line1 || "",
      line2: location.address?.line2 || "",
      city: location.address?.city || "",
      postalCode: location.address?.postalCode || "",
      country: addressCountry,
    },
    contact: {
      email: location.contact?.email || "",
      phoneCountry: parsedPhone.countryCode,
      phone: parsedPhone.nationalNumber,
    },
    booking: {
      ...defaults.booking,
      enabled: location.booking?.enabled !== false,
      timezone: location.booking?.timezone || defaults.booking.timezone,
      slotStepMinutes: Number(
        location.booking?.slotStepMinutes || defaults.booking.slotStepMinutes,
      ),
      minBookingMinutes: Number(
        location.booking?.minBookingMinutes ||
          defaults.booking.minBookingMinutes,
      ),
      maxBookingMinutes: Number(
        location.booking?.maxBookingMinutes ||
          defaults.booking.maxBookingMinutes,
      ),
      allowPublicSoloOverlap: location.booking?.allowPublicSoloOverlap === true,
      maxPublicSoloOverlaps: Math.max(
        Number(location.booking?.maxPublicSoloOverlaps || 1),
        1,
      ),
      globalCapacity: Math.max(
        Number(location.booking?.globalCapacity || 1),
        1,
      ),
      privateSessionBlocksAll:
        location.booking?.privateSessionBlocksAll !== false,
      groupBookingBlocksAll: location.booking?.groupBookingBlocksAll !== false,
      // Existing records without the field preserve the server's legacy
      // behaviour; only newly-created forms default to REQUIRED.
      activitySelectionMode: normalizeActivitySelectionMode(
        location.booking?.activitySelectionMode,
        ACTIVITY_SELECTION_MODE.OPTIONAL,
      ),
      activityCapacities: normalizeActivityCapacities(
        location.booking?.activityCapacities,
      ),
    },
    openingHours: normalizeOpeningHours(location.openingHours),
  };
}
export function buildLocationPayload(
  form,
  { existingBooking = {}, requireBookingEnabled = false } = {},
) {
  const rawCountry = String(form.address?.country || "").trim();
  const country = normalizeCountryCode(rawCountry, null) || rawCountry || "CZ";
  const phoneCountry =
    normalizeCountryCode(form.contact?.phoneCountry, null) ||
    normalizeCountryCode(country, null) ||
    "CZ";
  const capacities = normalizeActivityCapacities(
    form.booking?.activityCapacities,
  );
  const minBookingMinutes = Math.max(
    Number(form.booking?.minBookingMinutes || 15),
    15,
  );
  return {
    name: String(form.name || "").trim(),
    // An explicit null clears a previous override; omission would preserve it.
    pricingMode: "time",
    address: {
      line1: String(form.address?.line1 || "").trim(),
      line2: String(form.address?.line2 || "").trim(),
      city: String(form.address?.city || "").trim(),
      postalCode: String(form.address?.postalCode || "").trim(),
      country,
    },
    contact: {
      email: String(form.contact?.email || "").trim(),
      phone: normalizeInternationalPhone(form.contact?.phone, phoneCountry),
    },
    booking: {
      ...existingBooking,
      enabled: requireBookingEnabled || Boolean(form.booking?.enabled),
      timezone: String(form.booking?.timezone || "Europe/Prague").trim(),
      slotStepMinutes: Math.max(
        Number(form.booking?.slotStepMinutes || 15),
        15,
      ),
      minBookingMinutes,
      maxBookingMinutes: Math.max(
        Number(form.booking?.maxBookingMinutes || minBookingMinutes),
        minBookingMinutes,
      ),
      allowPublicSoloOverlap: Boolean(form.booking?.allowPublicSoloOverlap),
      maxPublicSoloOverlaps: Math.max(
        Number(form.booking?.maxPublicSoloOverlaps || 1),
        1,
      ),
      globalCapacity: Math.max(Number(form.booking?.globalCapacity || 1), 1),
      privateSessionBlocksAll: Boolean(form.booking?.privateSessionBlocksAll),
      groupBookingBlocksAll: Boolean(form.booking?.groupBookingBlocksAll),
      activitySelectionMode: normalizeActivitySelectionMode(
        form.booking?.activitySelectionMode,
      ),
      activityCapacities: ACTIVITY_CAPACITY_KEYS.map((activity) => ({
        activity,
        capacity: capacities[activity],
      })).filter(({ capacity }) => capacity > 0),
    },
    openingHours: normalizeOpeningHours(form.openingHours),
  };
}
