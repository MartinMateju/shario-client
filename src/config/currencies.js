export const STUDIO_COMMERCE_CURRENCIES = Object.freeze([
  "CZK",
  "EUR",
  "USD",
  "GBP",
  "PLN",
  "CHF",
  "DKK",
  "NOK",
  "SEK",
  "AUD",
  "CAD",
  "NZD",
  "JPY",
  "HUF",
  "RON",
  "CNY",
  "INR",
  "ZAR",
  "BRL",
  "MXN",
  "ARS",
  "CLP",
]);

export const PLATFORM_BILLING_CURRENCIES = Object.freeze([
  "EUR",
  "USD",
  "CZK",
  "GBP",
  "CHF",
  "PLN",
  "DKK",
  "SEK",
  "NOK",
  "CAD",
  "AUD",
]);

export const DEFAULT_STUDIO_COMMERCE_CURRENCY = "CZK";
export const DEFAULT_PLATFORM_BILLING_CURRENCY = "USD";

const CURRENCY_NAMES = Object.freeze({
  CZK: "Czech koruna",
  EUR: "Euro",
  USD: "US dollar",
  GBP: "British pound",
  PLN: "Polish zloty",
  CHF: "Swiss franc",
  DKK: "Danish krone",
  NOK: "Norwegian krone",
  SEK: "Swedish krona",
  AUD: "Australian dollar",
  CAD: "Canadian dollar",
  NZD: "New Zealand dollar",
  JPY: "Japanese yen",
  HUF: "Hungarian forint",
  RON: "Romanian leu",
  CNY: "Chinese yuan",
  INR: "Indian rupee",
  ZAR: "South African rand",
  BRL: "Brazilian real",
  MXN: "Mexican peso",
  ARS: "Argentine peso",
  CLP: "Chilean peso",
});

export const normalizeCurrency = (currency) =>
  String(currency ?? "")
    .trim()
    .toUpperCase();

export const isStudioCommerceCurrency = (currency) =>
  STUDIO_COMMERCE_CURRENCIES.includes(normalizeCurrency(currency));

export const isPlatformBillingCurrency = (currency) =>
  PLATFORM_BILLING_CURRENCIES.includes(normalizeCurrency(currency));

export const resolveStudioCommerceCurrency = (
  currency,
  fallback = DEFAULT_STUDIO_COMMERCE_CURRENCY,
) => {
  const normalized = normalizeCurrency(currency);

  return isStudioCommerceCurrency(normalized) ? normalized : fallback;
};

export const resolvePlatformBillingCurrency = (
  currency,
  fallback = DEFAULT_PLATFORM_BILLING_CURRENCY,
) => {
  const normalized = normalizeCurrency(currency);

  return isPlatformBillingCurrency(normalized) ? normalized : fallback;
};

export const getCurrencyName = (currency, locale = "en") => {
  const normalized = normalizeCurrency(currency);

  try {
    return (
      new Intl.DisplayNames(locale, { type: "currency" }).of(normalized) ||
      CURRENCY_NAMES[normalized] ||
      normalized
    );
  } catch {
    return CURRENCY_NAMES[normalized] || normalized;
  }
};

export const getCurrencyOptions = (currencies, locale = "en") =>
  currencies.map((currency) => ({
    value: currency,
    label: `${currency} — ${getCurrencyName(currency, locale)}`,
  }));

export const STUDIO_COMMERCE_CURRENCY_OPTIONS = Object.freeze(
  STUDIO_COMMERCE_CURRENCIES.map((currency) => ({
    value: currency,
    label: `${currency} — ${CURRENCY_NAMES[currency]}`,
  })),
);
