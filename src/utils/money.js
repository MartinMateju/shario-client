import { normalizeCurrency } from "@/config/currencies";
import { resolveIntlLocale } from "@/i18n/formatting";

// Stripe charge amounts use two minor-unit digits unless the currency is in
// Stripe's zero-decimal list. These are the zero-decimal currencies currently
// supported by shario.io.
const ZERO_DECIMAL_STRIPE_CURRENCIES = new Set(["CLP", "JPY"]);

const toFiniteNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

export const getStripeMinorUnitDigits = (currency) =>
  ZERO_DECIMAL_STRIPE_CURRENCIES.has(normalizeCurrency(currency)) ? 0 : 2;

export const minorUnitsToMajor = (amount, currency) => {
  const number = toFiniteNumber(amount);
  if (number === null) return null;

  return number / 10 ** getStripeMinorUnitDigits(currency);
};

export const roundMajorCurrencyAmount = (amount, currency, fallback = 0) => {
  const number = toFiniteNumber(amount);
  if (number === null) return fallback;

  const factor = 10 ** getStripeMinorUnitDigits(currency);
  const epsilon =
    Math.sign(number) * Number.EPSILON * Math.max(1, Math.abs(number));

  return Math.round((number + epsilon) * factor) / factor;
};

export const toNonNegativeMajorCurrencyAmount = (
  amount,
  currency,
  fallback = 0,
) => Math.max(0, roundMajorCurrencyAmount(amount, currency, fallback));

export const isValidMajorCurrencyPrecision = (amount, currency) => {
  const number = toFiniteNumber(amount);
  if (number === null) return false;

  const rounded = roundMajorCurrencyAmount(number, currency);
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(number)) * 4;

  return Math.abs(number - rounded) <= tolerance;
};

export const formatMinorCurrencyAmount = (
  amount,
  currency,
  locale = "en",
  fallback = "—",
) => {
  const normalizedCurrency = normalizeCurrency(currency);
  const value = minorUnitsToMajor(amount, normalizedCurrency);

  if (value === null || !normalizedCurrency) return fallback;

  const fractionDigits = getStripeMinorUnitDigits(normalizedCurrency);

  try {
    return new Intl.NumberFormat(resolveIntlLocale(locale), {
      style: "currency",
      currency: normalizedCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: fractionDigits,
    }).format(value);
  } catch {
    return `${value} ${normalizedCurrency}`;
  }
};

export const formatMajorCurrencyAmount = (
  amount,
  currency,
  locale = "en",
  fallback = "—",
) => {
  const normalizedCurrency = normalizeCurrency(currency);
  const value = toFiniteNumber(amount);

  if (value === null || !normalizedCurrency) return fallback;

  try {
    return new Intl.NumberFormat(resolveIntlLocale(locale), {
      style: "currency",
      currency: normalizedCurrency,
    }).format(value);
  } catch {
    return `${value} ${normalizedCurrency}`;
  }
};

export const getMajorCurrencyInputStep = (currency) => {
  const normalizedCurrency = normalizeCurrency(currency);

  if (ZERO_DECIMAL_STRIPE_CURRENCIES.has(normalizedCurrency)) return "1";

  return "0.01";
};
