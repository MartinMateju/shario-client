import {
  formatMajorCurrencyAmount,
  formatMinorCurrencyAmount,
} from "@/utils/money";

export const getIssuedVoucherStatus = (coupon, now = Date.now()) => {
  if (coupon?.refundReviewRequired || coupon?.status === "review_required")
    return "review";
  if (coupon?.revokedAt || coupon?.status === "revoked") return "revoked";
  if (coupon?.status === "partially_redeemed") return "partially_redeemed";
  if (coupon?.status === "reserved") return "reserved";
  if (coupon?.redeemedAt || coupon?.status === "redeemed") return "redeemed";
  if (
    coupon?.expiresAt &&
    Number.isFinite(Date.parse(coupon.expiresAt)) &&
    Date.parse(coupon.expiresAt) <= now
  ) {
    return "expired";
  }
  if (coupon?.status === "expired") return "expired";
  if (coupon?.status === "inactive") return "inactive";
  return coupon?.isActive === false ? "inactive" : "active";
};

export const getIssuedVoucherName = (coupon, locale = "en") => {
  const name = coupon?.productNameSnapshot || coupon?.product?.name;
  if (name && typeof name === "object") {
    return locale.startsWith("cs")
      ? name.CZ || name.cs || name.EN || name.en || "—"
      : name.EN || name.en || name.CZ || name.cs || "—";
  }
  return typeof name === "string" && name ? name : "—";
};

export const formatIssuedVoucherDate = (
  value,
  locale = "en",
  timeZone = "UTC",
) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const options = { day: "2-digit", month: "2-digit", year: "numeric" };
  try {
    return date.toLocaleDateString(locale, { ...options, timeZone });
  } catch {
    return date.toLocaleDateString(locale, { ...options, timeZone: "UTC" });
  }
};

// A catalog price can change after purchase. Only issued-value snapshots are
// safe to display, including the older creditsAmount/currency snapshot pair.
export const formatIssuedVoucherAmount = (coupon, locale = "en") => {
  if (
    Number.isSafeInteger(coupon?.originalValueMinor) &&
    coupon.originalValueMinor >= 0 &&
    coupon?.currency
  ) {
    return formatMinorCurrencyAmount(
      coupon.originalValueMinor,
      coupon.currency,
      locale,
    );
  }
  if (
    Number.isSafeInteger(coupon?.valueMinorSnapshot) &&
    coupon.valueMinorSnapshot >= 0 &&
    coupon?.currencySnapshot
  ) {
    return formatMinorCurrencyAmount(
      coupon.valueMinorSnapshot,
      coupon.currencySnapshot,
      locale,
    );
  }
  if (
    typeof coupon?.creditsAmount === "number" &&
    Number.isFinite(coupon.creditsAmount) &&
    coupon.creditsAmount >= 0 &&
    coupon?.currency
  ) {
    return formatMajorCurrencyAmount(
      coupon.creditsAmount,
      coupon.currency,
      locale,
    );
  }
  return "—";
};

export const formatIssuedVoucherRemaining = (coupon, locale = "en") =>
  Number.isSafeInteger(coupon?.remainingValueMinor) &&
  coupon.remainingValueMinor >= 0 &&
  coupon?.currency
    ? formatMinorCurrencyAmount(
        coupon.remainingValueMinor,
        coupon.currency,
        locale,
      )
    : "—";

export const formatVoucherCreditsReceived = (coupon, locale = "en") =>
  Number.isSafeInteger(coupon?.walletRedeemedValueMinor) &&
  coupon.walletRedeemedValueMinor >= 0 &&
  (coupon?.currency || coupon?.currencySnapshot)
    ? formatMinorCurrencyAmount(
        coupon.walletRedeemedValueMinor,
        coupon.currency || coupon.currencySnapshot,
        locale,
      )
    : formatIssuedVoucherAmount(coupon, locale);
