import {
  formatMajorCurrencyAmount,
  roundMajorCurrencyAmount,
  toNonNegativeMajorCurrencyAmount,
} from "@/utils/money";
import { normalizeCurrency } from "@/config/currencies";
import {
  getOpenStudioPrivateSurcharge,
  isCustomerChoiceOpenStudio,
} from "@/lib/features/products/products.contract.mjs";
const safeInt = (value, fallback) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  const integer = Math.floor(number);
  return integer > 0 ? integer : fallback;
};
const getDurationBlocks30mFromDates = (start, end) => {
  const startDate = start instanceof Date ? start : new Date(start);
  const endDate = end instanceof Date ? end : new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }
  const minutes = (endDate.getTime() - startDate.getTime()) / 60_000;
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  return Math.ceil(minutes / 30);
};
const getBlocks30m = (item) => {
  const quantity = Number(item?.quantity);
  if (Number.isFinite(quantity) && quantity > 0) return Math.ceil(quantity);
  return getDurationBlocks30mFromDates(item?.start, item?.end) || 1;
};
const getProductType = (item) =>
  String(item?.product?.type || "")
    .trim()
    .toLowerCase();
const getProductKind = (item) =>
  String(item?.product?.kind || item?.kind || "")
    .trim()
    .toLowerCase();
export const isStandaloneServiceCartItem = (item) =>
  getProductType(item) === "service";
export const isTimedStudioCartItem = (item) => {
  const type = getProductType(item);
  const kind = getProductKind(item);
  return (
    type.includes("workshop") ||
    type === "guest-increase" ||
    kind === "open-studio" ||
    kind === "openstudio"
  );
};
const getBillableUnits = (item) => {
  const type = getProductType(item);
  const kind = getProductKind(item);
  if (type.includes("course") || kind === "class") {
    return safeInt(item?.quantity, 1);
  }
  const blocks = getBlocks30m(item);
  if (type === "guest-increase") {
    return blocks * safeInt(item?.numberOfGuests, 1);
  }
  return blocks * safeInt(item?.numberOfGuests, 1);
};
const getCartItemBaseUnitPriceMajor = (item) =>
  toNonNegativeMajorCurrencyAmount(
    item?.product?.price,
    item?.currency || item?.product?.currency,
  );
const getCartItemBookingExtraChargeMajor = (item) => {
  if (isCustomerChoiceOpenStudio(item?.product)) return 0;
  const explicitExtra = Number(item?.bookingExtraCharge);
  if (Number.isFinite(explicitExtra) && explicitExtra > 0) {
    return toNonNegativeMajorCurrencyAmount(
      explicitExtra,
      item?.currency || item?.product?.currency,
    );
  }
  const bookingType = String(item?.bookingType || item?.bookingMode || "")
    .trim()
    .toLowerCase();
  const guests = safeInt(item?.numberOfGuests, 1);
  const extraCharge = toNonNegativeMajorCurrencyAmount(
    item?.product?.extraCharge,
    item?.currency || item?.product?.currency,
  );
  return isTimedStudioCartItem(item) &&
    bookingType === "private" &&
    guests === 1
    ? extraCharge
    : 0;
};
const getCartItemEffectiveUnitPriceMajor = (item) =>
  roundMajorCurrencyAmount(
    getCartItemBaseUnitPriceMajor(item) +
      getCartItemBookingExtraChargeMajor(item),
    item?.currency || item?.product?.currency,
  );
export const getCartItemTotalMajor = (item) => {
  const unitPrice = getCartItemEffectiveUnitPriceMajor(item);
  const surcharge = getCartItemPrivateSurchargeMajor(item);
  return toNonNegativeMajorCurrencyAmount(
    getBillableUnits(item) * unitPrice + surcharge,
    item?.currency || item?.product?.currency,
  );
};
export const getCartItemPrivateSurchargeMajor = (item) =>
  getOpenStudioPrivateSurcharge(
    item?.product,
    item?.bookingMode ?? item?.bookingType,
  );
export const getCartItemHourlyPriceMajor = (item) =>
  isTimedStudioCartItem(item)
    ? getCartItemEffectiveUnitPriceMajor(item) * 2
    : getCartItemEffectiveUnitPriceMajor(item);
export const formatCartCurrencyAmount = (
  amount,
  currency,
  locale = "en-GB",
) => {
  const normalizedCurrency = normalizeCurrency(currency);
  const value = Number(amount);
  if (!Number.isFinite(value) || !normalizedCurrency) return "—";
  if (normalizedCurrency === "CZK") {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: normalizedCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }
  return formatMajorCurrencyAmount(value, normalizedCurrency, locale);
};
const canonicalOpenStudioNames = {
  EN: new Map([
    ["rezervace studia", "Studio booking"],
    ["otevřený ateliér", "Open Studio"],
  ]),
  CZ: new Map([
    ["studio booking", "Rezervace studia"],
    ["open studio", "Otevřený ateliér"],
  ]),
};
const localizeCanonicalProductName = (value, item, language) => {
  const trimmedValue = typeof value === "string" ? value.trim() : "";
  if (!trimmedValue || !isTimedStudioCartItem(item)) return trimmedValue;
  return (
    canonicalOpenStudioNames[language]?.get(trimmedValue.toLowerCase()) ||
    trimmedValue
  );
};
export const getCartProductName = (item, language = "EN") => {
  const normalizedLanguage = language === "CZ" ? "CZ" : "EN";
  const name = item?.product?.name;
  const keys = normalizedLanguage === "CZ" ? ["CZ", "cs", "cz"] : ["EN", "en"];
  for (const key of keys) {
    const value = name?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  const candidates = [item?.title, name, item?.product?.title];
  for (const candidate of candidates) {
    const localizedName = localizeCanonicalProductName(
      candidate,
      item,
      normalizedLanguage,
    );
    if (localizedName) return localizedName;
  }
  return normalizedLanguage === "CZ" ? "Rezervace studia" : "Studio booking";
};
export const getCartCopy = (language = "EN") =>
  language === "CZ"
    ? {
        close: "Zavřít košík",
        eyebrow: "Vaše objednávka",
        title: "Zkontrolujte rezervaci",
        subtitle: "Ověřte detaily návštěvy a vyberte způsob bezpečné platby.",
        item: "položka",
        items: "položky",
        itemsMany: "položek",
        orderSummary: "Shrnutí objednávky",
        total: "Celkem",
        date: "Datum",
        time: "Čas",
        studio: "Studio",
        guests: "Osoby",
        quantity: "Počet kusů",
        hourlyRate: "Cena za hodinu",
        bookingType: "Typ rezervace",
        privateBooking: "Výhradní studio",
        remove: "Odebrat",
        emptyTitle: "Váš košík je zatím prázdný",
        emptyDescription:
          "Vyberte si termín v kalendáři studia a objeví se zde.",
        returnToStudio: "Zpět do studia",
        secureCheckout: "Bezpečná platba",
        secureDescription:
          "Platba bude dokončena přes zabezpečenou platební stránku.",
        continueToPayment: "Pokračovat k platbě",
        payWithCredits: "Zaplatit kredity",
        confirmWithMembership: "Rezervovat s členstvím",
        membershipSecureDescription:
          "Zahrnuté hodiny odečteme po potvrzení rezervace.",
        checkingBenefits: "Ověřujeme cenu a výhody členství…",
        quoteFailed:
          "Cenu a výhody členství se nepodařilo ověřit. Zkuste to znovu.",
        retryQuote: "Zkusit znovu",
        subtotal: "Před slevou",
        membershipDiscount: "Členská sleva",
        membershipCoversOrder:
          "Tuto objednávku pokrývá vaše členství. Nic nedoplácíte.",
        mixedCurrencies:
          "Jedna objednávka nemůže obsahovat položky v různých měnách.",
        processing: "Připravujeme bezpečnou platbu…",
        processingDescription: "Prosím, toto okno nezavírejte.",
      }
    : {
        close: "Close cart",
        eyebrow: "Your order",
        title: "Review your booking",
        subtitle:
          "Check your visit details and choose how you would like to pay.",
        item: "item",
        items: "items",
        orderSummary: "Order summary",
        total: "Total",
        date: "Date",
        time: "Time",
        studio: "Studio",
        guests: "Guests",
        quantity: "Quantity",
        hourlyRate: "Hourly rate",
        bookingType: "Booking type",
        privateBooking: "Exclusive studio",
        remove: "Remove",
        emptyTitle: "Your cart is waiting",
        emptyDescription:
          "Choose a time from the studio calendar and it will appear here.",
        returnToStudio: "Return to studio",
        secureCheckout: "Secure checkout",
        secureDescription: "Payment is completed on a protected payment page.",
        continueToPayment: "Continue to payment",
        payWithCredits: "Pay with credits",
        confirmWithMembership: "Book with membership",
        membershipSecureDescription:
          "Your included hours are deducted when the reservation is confirmed.",
        checkingBenefits: "Checking price and membership benefits…",
        quoteFailed:
          "We could not verify the price and membership benefits. Please try again.",
        retryQuote: "Try again",
        subtotal: "Before discount",
        membershipDiscount: "Membership discount",
        membershipCoversOrder:
          "Your membership covers this order. Nothing more to pay.",
        mixedCurrencies:
          "A checkout cannot contain items in different currencies.",
        processing: "Preparing secure checkout…",
        processingDescription: "Please keep this window open.",
      };
export const getCartItemCountLabel = (count, language = "EN") => {
  const copy = getCartCopy(language);
  if (language === "CZ") {
    const noun =
      count === 1
        ? copy.item
        : count >= 2 && count <= 4
          ? copy.items
          : copy.itemsMany;
    return `${count} ${noun}`;
  }
  return `${count} ${count === 1 ? copy.item : copy.items}`;
};
