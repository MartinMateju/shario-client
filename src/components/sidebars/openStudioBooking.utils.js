import {
  OPEN_STUDIO_BOOKING_MODE,
  PRODUCT_KIND,
  getProductBookingMode,
  normalizeOpenStudioBookingMode,
  normalizeProductKind,
  resolveOpenStudioBookingMode,
} from "@/lib/features/products/products.contract.mjs";

const getProductId = (product) =>
  String(product?.id ?? product?._id ?? "").trim();

const getLanguageLocale = (language) => (language === "CZ" ? "cs-CZ" : "en-GB");

const BOOKING_AVAILABILITY_COPY = Object.freeze({
  EN: Object.freeze({
    loading: Object.freeze({
      title: "Checking availability…",
      description: "We are refreshing this time with the studio.",
    }),
    available: Object.freeze({
      title: "This time is available.",
      description: "Availability is checked again when you complete checkout.",
    }),
    incomplete: Object.freeze({
      title: "Complete the booking details",
      description:
        "Choose a studio, session type, date and time to check availability.",
    }),
    location: Object.freeze({
      title: "Online booking is unavailable",
      description: "This studio is not currently accepting online bookings.",
    }),
    overlap: Object.freeze({
      title: "This time overlaps another booking",
      description:
        "This time cannot accept overlapping bookings. Choose another time.",
    }),
    capacity: Object.freeze({
      title: "The studio is full at this time",
      description: "Try another time or reduce the number of guests.",
    }),
    activity: Object.freeze({
      title: "This activity is full at this time",
      description: "Try another time or select a different activity.",
    }),
    unavailable: Object.freeze({
      title: "This time is unavailable",
      description: "Choose another time and we will check availability again.",
    }),
  }),
  CZ: Object.freeze({
    loading: Object.freeze({
      title: "Ověřujeme dostupnost…",
      description: "Aktualizujeme tento termín podle údajů studia.",
    }),
    available: Object.freeze({
      title: "Tento termín je dostupný.",
      description: "Dostupnost znovu ověříme při dokončení objednávky.",
    }),
    incomplete: Object.freeze({
      title: "Doplňte údaje rezervace",
      description:
        "Vyberte studio, typ rezervace, datum a čas pro ověření dostupnosti.",
    }),
    location: Object.freeze({
      title: "Online rezervace není dostupná",
      description: "Toto studio nyní nepřijímá online rezervace.",
    }),
    overlap: Object.freeze({
      title: "Termín se překrývá s jinou rezervací",
      description:
        "V tomto termínu nelze přidat překrývající se rezervaci. Vyberte jiný čas.",
    }),
    capacity: Object.freeze({
      title: "Studio je v tomto termínu plné",
      description: "Vyberte jiný čas nebo snižte počet osob.",
    }),
    activity: Object.freeze({
      title: "Tato aktivita je v daném termínu plná",
      description: "Vyberte jiný čas nebo jinou aktivitu.",
    }),
    unavailable: Object.freeze({
      title: "Tento termín není dostupný",
      description: "Vyberte jiný čas a dostupnost znovu ověříme.",
    }),
  }),
});

const BOOKING_AVAILABILITY_REASON_KEYS = Object.freeze({
  INCOMPLETE: "incomplete",
  LOCATION_NOT_AVAILABLE: "location",
  LOCATION_OVERLAP_NOT_ALLOWED: "overlap",
  LOCATION_CAPACITY_EXCEEDED: "capacity",
  LOCATION_ACTIVITY_CAPACITY_EXCEEDED: "activity",
});

export const getBookingAvailabilityPresentation = ({
  available = false,
  isLoading = false,
  language = "EN",
  reason,
} = {}) => {
  const localizedCopy =
    BOOKING_AVAILABILITY_COPY[language === "CZ" ? "CZ" : "EN"];

  if (isLoading) return { ...localizedCopy.loading, tone: "loading" };
  if (available) return { ...localizedCopy.available, tone: "available" };

  const key = BOOKING_AVAILABILITY_REASON_KEYS[reason] || "unavailable";
  return {
    ...localizedCopy[key],
    tone: key === "incomplete" ? "neutral" : "unavailable",
  };
};

export const formatBookingGuestCount = (guests, language) => {
  if (language === "CZ") {
    const noun = guests >= 2 && guests <= 4 ? "osoby" : "osob";
    return `${guests} ${noun}`;
  }

  return `${guests} guests`;
};

export const formatBookingDateLabel = (
  value,
  language = "EN",
  { includeWeekday = true } = {},
) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return "";

  const [, year, month, day] = match;
  const date = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day), 12),
  );

  return new Intl.DateTimeFormat(getLanguageLocale(language), {
    ...(includeWeekday ? { weekday: "long" } : {}),
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
};

export const formatBookingDurationSummary = (
  durationMinutes,
  language = "EN",
) => {
  const minutes = Math.max(0, Number(durationMinutes) || 0);
  if (!minutes) return "";

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours && remainingMinutes) return `${hours} h ${remainingMinutes} min`;
  if (remainingMinutes) return `${remainingMinutes} min`;

  if (language === "CZ") {
    const noun =
      hours === 1 ? "hodina" : hours >= 2 && hours <= 4 ? "hodiny" : "hodin";
    return `${hours} ${noun}`;
  }

  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
};

export const formatBookingSummary = ({
  durationMinutes,
  startTime,
  endTime,
  guests = 1,
  language = "EN",
} = {}) => {
  if (!startTime || !endTime) return "—";

  const parts = [
    formatBookingDurationSummary(durationMinutes, language),
    `${startTime}–${endTime}`,
  ].filter(Boolean);

  if (Number(guests) > 1) {
    parts.push(formatBookingGuestCount(Number(guests), language));
  }

  return parts.join(" · ");
};

export const formatBookingPrice = (value, currency, locale) => {
  const normalizedCurrency = String(currency || "CZK").toUpperCase();
  const amount = Number(value);

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: normalizedCurrency,
    ...(normalizedCurrency === "CZK"
      ? { minimumFractionDigits: 0, maximumFractionDigits: 0 }
      : {}),
  }).format(Number.isFinite(amount) ? amount : 0);
};

export const getBookingPriceBreakdown = ({
  unitPrice,
  extraCharge = 0,
  privateBookingSurcharge = 0,
  durationMinutes = 60,
  guests = 1,
  isClassFlow = false,
} = {}) => {
  const normalizedUnitPrice = Math.max(0, Number(unitPrice) || 0);
  const normalizedExtraCharge = Math.max(0, Number(extraCharge) || 0);
  const guestCount = Math.max(1, Math.floor(Number(guests) || 1));
  const durationQuantity = isClassFlow
    ? 1
    : Math.max(1, Math.ceil((Number(durationMinutes) || 0) / 30));
  const baseTotal = normalizedUnitPrice * durationQuantity * guestCount;
  const surchargeTotal = isClassFlow
    ? 0
    : normalizedExtraCharge * durationQuantity * guestCount +
      Math.max(0, Number(privateBookingSurcharge) || 0);

  return {
    baseTotal,
    durationQuantity,
    guestCount,
    hasDetails: guestCount > 1 || surchargeTotal > 0,
    surchargeTotal,
    total: baseTotal + surchargeTotal,
  };
};

export const getLocalizedBookingProductName = (
  product,
  language = "EN",
  { fallback = "" } = {},
) => {
  const name = product?.name;
  if (typeof name === "string") return name.trim() || fallback;

  const keys = language === "CZ" ? ["CZ", "cs", "cz"] : ["EN", "en"];
  for (const key of keys) {
    const value = name?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return fallback;
};

/**
 * The legacy drawer is only an Open Studio booking surface. Historical
 * workshop records remain readable through the shared product contract while
 * Class, Voucher and internal Private Studio records stay out of the picker.
 */
export const getOpenStudioProducts = (products) =>
  (Array.isArray(products) ? products : []).filter(
    (product) =>
      product?.isActive !== false &&
      normalizeProductKind(product) === PRODUCT_KIND.OPEN_STUDIO,
  );

/**
 * Class sessions still enter this drawer through the legacy
 * `courseSessionId` prefill. Keep that path explicit so Class products can be
 * restored without ever leaking into the normal Open Studio picker.
 */
export const getClassProducts = (products) =>
  (Array.isArray(products) ? products : []).filter(
    (product) =>
      product?.isActive !== false &&
      normalizeProductKind(product) === PRODUCT_KIND.CLASS,
  );

export const findClassProduct = (products, { productId = "" } = {}) => {
  const availableProducts = getClassProducts(products);
  const requestedId = String(productId || "").trim();

  if (requestedId) {
    const exactMatch = availableProducts.find(
      (product) => getProductId(product) === requestedId,
    );
    if (exactMatch) return exactMatch;
  }

  return availableProducts[0];
};

export const getBookingDrawerSelection = (
  products,
  {
    courseSessionId = "",
    productId = "",
    bookingMode = OPEN_STUDIO_BOOKING_MODE.PUBLIC,
  } = {},
) => {
  if (String(courseSessionId || "").trim()) {
    const availableProducts = getClassProducts(products);

    return {
      flow: "class",
      availableProducts,
      product: findClassProduct(availableProducts, { productId }),
    };
  }

  const availableProducts = getOpenStudioProducts(products);

  return {
    flow: "open-studio",
    availableProducts,
    product: findOpenStudioProduct(availableProducts, {
      productId,
      bookingMode,
    }),
  };
};

export const getBookingDrawerCartFields = ({
  flow,
  courseSessionId = "",
  bookingMode = OPEN_STUDIO_BOOKING_MODE.PUBLIC,
  plannedActivity,
} = {}) => {
  const sessionId = String(courseSessionId || "").trim();

  if (flow === "class" && sessionId) {
    return {
      kind: PRODUCT_KIND.CLASS,
      bookingCourse: sessionId,
      bookingRef: sessionId,
    };
  }

  const normalizedMode = bookingMode === "private" ? "private" : "public";

  return {
    bookingMode: normalizedMode,
    bookingType: normalizedMode,
    plannedActivity,
  };
};

export const findOpenStudioProduct = (
  products,
  { productId = "", bookingMode = "public" } = {},
) => {
  const availableProducts = getOpenStudioProducts(products);
  const requestedId = String(productId || "").trim();

  if (requestedId) {
    const exactMatch = availableProducts.find(
      (product) => getProductId(product) === requestedId,
    );
    if (exactMatch) return exactMatch;
  }

  const requestedMode = normalizeOpenStudioBookingMode(bookingMode);
  return (
    availableProducts.find(
      (product) => getProductBookingMode(product) === requestedMode,
    ) || availableProducts[0]
  );
};

/**
 * `bookingMode` is canonical. `bookingType` is emitted as a temporary alias so
 * carts and APIs deployed before the taxonomy migration continue to work.
 */
export const getOpenStudioBookingFields = (product, selection) => {
  const bookingMode = resolveOpenStudioBookingMode(product, selection);

  return { bookingMode, bookingType: bookingMode };
};
