export const FOUNDING_OFFER_ID = "founding_2026_v1";

export const SUBSCRIPTION_PLAN_ORDER = Object.freeze([
  "starter",
  "professional",
  "studio_plus",
  "enterprise",
]);

export const normalizeSubscriptionPlan = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  return SUBSCRIPTION_PLAN_ORDER.includes(normalized) ? normalized : "";
};

export const getCurrentPlanPriceSpec = (plan, interval, currency, catalog) => {
  const normalizedPlan = normalizeSubscriptionPlan(plan);
  const normalizedInterval = interval === "yearly" ? "yearly" : "monthly";
  const normalizedCurrency = String(currency || "").toUpperCase();

  return (
    catalog?.plans?.find((entry) => entry?.id === normalizedPlan)?.[
      normalizedInterval
    ]?.[normalizedCurrency] ?? null
  );
};

export const getCurrentPlanPrice = (plan, interval, currency, catalog) => {
  const entry = getCurrentPlanPriceSpec(plan, interval, currency, catalog);
  return entry?.available === true &&
    Number.isSafeInteger(entry.amountMinor) &&
    entry.amountMinor >= 0
    ? entry.amountMinor
    : null;
};
