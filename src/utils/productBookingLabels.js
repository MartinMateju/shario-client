import {
  PRODUCT_KIND,
  normalizeOpenStudioBookingMode,
  normalizeProductKind,
} from "@/lib/features/products/products.contract.mjs";

const normalizeCode = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const BOOKING_KIND_ALIASES = Object.freeze({
  class: PRODUCT_KIND.CLASS,
  course: PRODUCT_KIND.CLASS,
  "public-course": PRODUCT_KIND.CLASS,
  "private-course": PRODUCT_KIND.CLASS,
  "open-studio": PRODUCT_KIND.OPEN_STUDIO,
  workshop: PRODUCT_KIND.OPEN_STUDIO,
  "public-workshop": PRODUCT_KIND.OPEN_STUDIO,
  "private-workshop": PRODUCT_KIND.OPEN_STUDIO,
  "private-studio": PRODUCT_KIND.PRIVATE_STUDIO,
  "private-session": PRODUCT_KIND.PRIVATE_STUDIO,
  blocker: PRODUCT_KIND.PRIVATE_STUDIO,
  block: PRODUCT_KIND.PRIVATE_STUDIO,
  membership: PRODUCT_KIND.MEMBERSHIP,
  voucher: PRODUCT_KIND.VOUCHER,
  coupon: PRODUCT_KIND.VOUCHER,
  "gift-card": PRODUCT_KIND.VOUCHER,
  "credit-voucher": PRODUCT_KIND.VOUCHER,
});

const readRecordCode = (record, key) => normalizeCode(record?.[key]);

export const normalizeBookingProductKind = (record) => {
  if (!record) return "";

  if (typeof record === "string") {
    return (
      normalizeProductKind(record) ||
      BOOKING_KIND_ALIASES[normalizeCode(record)] ||
      ""
    );
  }

  const canonicalProductKind =
    normalizeProductKind(record?.product) ||
    normalizeProductKind(record?.productKind) ||
    normalizeProductKind(record?.kind) ||
    normalizeProductKind(record);

  if (canonicalProductKind) return canonicalProductKind;

  const candidates = [
    readRecordCode(record, "productKind"),
    readRecordCode(record, "kind"),
    readRecordCode(record, "tag"),
    readRecordCode(record, "type"),
  ];

  for (const candidate of candidates) {
    if (BOOKING_KIND_ALIASES[candidate]) {
      return BOOKING_KIND_ALIASES[candidate];
    }
  }

  return "";
};

export const normalizeBookingMode = (record) => {
  const explicitCandidates = [
    record?.bookingMode,
    record?.bookingType,
    record?.bookingPrivacy,
    record?.privacyType,
    record?.visibility,
  ];

  for (const candidate of explicitCandidates) {
    const value = normalizeCode(candidate);
    if (value === "shared" || value === "public") return "public";
    if (value === "exclusive" || value === "private") return "private";
  }

  if (record?.isPrivate === true) return "private";
  if (record?.isPrivate === false) return "public";

  const legacyType = normalizeCode(record?.type);
  if (legacyType.startsWith("private-")) return "private";
  if (legacyType.startsWith("public-")) return "public";

  return normalizeOpenStudioBookingMode(undefined);
};

const LABELS = Object.freeze({
  EN: {
    [PRODUCT_KIND.OPEN_STUDIO]: "Open Studio",
    sharedOpenStudio: "Shared Open Studio",
    exclusiveOpenStudio: "Exclusive Open Studio",
    [PRODUCT_KIND.CLASS]: "Class",
    [PRODUCT_KIND.MEMBERSHIP]: "Membership",
    [PRODUCT_KIND.VOUCHER]: "Voucher",
    [PRODUCT_KIND.PRIVATE_STUDIO]: "Private Studio",
    unknown: "Unknown",
  },
  CZ: {
    [PRODUCT_KIND.OPEN_STUDIO]: "Open Studio",
    sharedOpenStudio: "Sdílené Open Studio",
    exclusiveOpenStudio: "Výhradní Open Studio",
    [PRODUCT_KIND.CLASS]: "Lekce",
    [PRODUCT_KIND.MEMBERSHIP]: "Členství",
    [PRODUCT_KIND.VOUCHER]: "Poukaz",
    [PRODUCT_KIND.PRIVATE_STUDIO]: "Soukromé studio",
    unknown: "Neznámý typ",
  },
});

const getLabels = (language) => LABELS[language === "CZ" ? "CZ" : "EN"];

export const getBookingProductLabel = (
  record,
  language = "EN",
  localizedLabels,
) => {
  const labels = localizedLabels || getLabels(language);
  const kind = normalizeBookingProductKind(record);

  if (kind === PRODUCT_KIND.OPEN_STUDIO) {
    return normalizeBookingMode(record) === "private"
      ? labels.exclusiveOpenStudio
      : labels.sharedOpenStudio;
  }

  return (
    labels[kind] || String(record?.tag || record?.type || "") || labels.unknown
  );
};

export const getOrderProductTypeLabel = (value, language = "EN") => {
  const code = normalizeCode(value);
  const labels = getLabels(language);

  if (code === "public-course") {
    return language === "CZ" ? "Lekce · veřejná" : "Class · public";
  }
  if (code === "private-course") {
    return language === "CZ" ? "Lekce · soukromá" : "Class · private";
  }
  if (code === "prolong") {
    return language === "CZ" ? "Prodloužení rezervace" : "Booking extension";
  }
  if (code === "guest-increase") {
    return language === "CZ" ? "Navýšení počtu hostů" : "Additional guests";
  }
  if (code === "booking-addon") {
    return language === "CZ" ? "Doplněk rezervace" : "Booking add-on";
  }

  const kind = normalizeBookingProductKind({ type: code });
  if (kind === PRODUCT_KIND.OPEN_STUDIO) {
    return code.startsWith("private-")
      ? labels.exclusiveOpenStudio
      : labels.sharedOpenStudio;
  }

  return labels[kind] || value;
};

export const isClassProduct = (product) =>
  normalizeBookingProductKind(product) === PRODUCT_KIND.CLASS;

export const getPublicClassProducts = (products) =>
  (Array.isArray(products) ? products : []).filter(
    (product) =>
      product?.isActive !== false &&
      isClassProduct(product) &&
      normalizeCode(product?.type) !== "private-course" &&
      normalizeCode(product?.visibility) !== "private",
  );

export const isPrivateStudioBooking = (booking) =>
  normalizeBookingProductKind(booking) === PRODUCT_KIND.PRIVATE_STUDIO;

export const isOpenStudioBooking = (booking) =>
  normalizeBookingProductKind(booking) === PRODUCT_KIND.OPEN_STUDIO;
