import {
  PLATFORM_BILLING_CURRENCIES,
  isPlatformBillingCurrency,
  normalizeCurrency,
} from "@/config/currencies";
import {
  FOUNDING_OFFER_ID,
  SUBSCRIPTION_PLAN_ORDER,
  normalizeSubscriptionPlan,
} from "@/config/subscriptionPlans";

const BILLING_INTERVALS = new Set(["monthly", "yearly"]);
const STRIPE_CHECKOUT_MINIMUM_TRIAL_MS = 48 * 60 * 60 * 1_000;
const TRUSTED_STRIPE_HOSTS = new Set([
  "billing.stripe.com",
  "buy.stripe.com",
  "checkout.stripe.com",
  "invoice.stripe.com",
]);

const isRecord = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const toSafeCount = (value) => {
  if (value == null || value === "" || typeof value === "boolean") {
    return null;
  }

  const count = Number(value);

  return Number.isSafeInteger(count) && count >= 0 ? count : null;
};

const unique = (values) => [...new Set(values)];

export const normalizeBillingInterval = (value, fallback = "monthly") =>
  BILLING_INTERVALS.has(value) ? value : fallback;

export const sortSubscriptionPlans = (plans = []) =>
  [...(Array.isArray(plans) ? plans : [])].sort((left, right) => {
    const leftIndex = SUBSCRIPTION_PLAN_ORDER.indexOf(
      normalizeSubscriptionPlan(left?.id),
    );
    const rightIndex = SUBSCRIPTION_PLAN_ORDER.indexOf(
      normalizeSubscriptionPlan(right?.id),
    );

    return (
      (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex) -
      (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex)
    );
  });

export const getRuntimePriceForCurrency = (price, billingCurrency) => {
  if (!price) return null;

  const currency = normalizeCurrency(billingCurrency);
  const currencyOptions = price.currencyOptions || price.currencies;

  if (!currencyOptions) {
    return normalizeCurrency(price.currency) === currency
      ? {
          ...price,
          currency,
          configured: price.configured !== false && price.unitAmount != null,
        }
      : {
          ...price,
          configured: false,
          currency,
          unitAmount: null,
        };
  }

  const selectedPrice =
    currencyOptions[currency] || currencyOptions[currency.toLowerCase()];

  if (!selectedPrice) {
    return {
      ...price,
      configured: false,
      currency,
      unitAmount: null,
    };
  }

  return {
    ...price,
    ...selectedPrice,
    configured:
      selectedPrice.configured !== false && selectedPrice.unitAmount != null,
    currency: normalizeCurrency(selectedPrice.currency || currency),
  };
};

const getCommercialRecurringPrice = (plan, interval) => {
  const normalizedInterval = normalizeBillingInterval(interval);

  return (
    plan?.commercial?.recurring?.[normalizedInterval] ||
    plan?.commercial?.prices?.[normalizedInterval] ||
    plan?.priceSpecs?.[normalizedInterval] ||
    null
  );
};

export const getCommercialPriceForCurrency = (
  plan,
  interval,
  billingCurrency,
) => {
  const normalizedInterval = normalizeBillingInterval(interval);
  const currency = normalizeCurrency(billingCurrency);
  const spec = getCommercialRecurringPrice(plan, normalizedInterval);

  if (spec?.type === "custom") {
    return { currency, custom: true, from: false, unitAmount: null };
  }

  const amount =
    spec?.amounts?.[currency] ?? spec?.amounts?.[currency.toLowerCase()];
  const safeAmount = toSafeCount(amount);

  if (safeAmount !== null) {
    return {
      currency,
      custom: false,
      from: spec.type === "from",
      unitAmount: safeAmount,
    };
  }

  return null;
};

export const getPlanPricePresentation = (plan, interval, billingCurrency) => {
  const runtimePrice = getRuntimePriceForCurrency(
    plan?.prices?.[normalizeBillingInterval(interval)],
    billingCurrency,
  );
  const commercialPrice = getCommercialPriceForCurrency(
    plan,
    interval,
    billingCurrency,
  );

  return {
    checkoutConfigured: Boolean(runtimePrice?.configured),
    currency: normalizeCurrency(
      runtimePrice?.currency || commercialPrice?.currency || billingCurrency,
    ),
    custom: Boolean(commercialPrice?.custom),
    from: Boolean(commercialPrice?.from),
    unitAmount:
      runtimePrice?.configured && runtimePrice.unitAmount != null
        ? runtimePrice.unitAmount
        : (commercialPrice?.unitAmount ?? null),
  };
};

const normalizeCurrencyList = (values) =>
  unique(
    (Array.isArray(values) ? values : [])
      .map(normalizeCurrency)
      .filter(isPlatformBillingCurrency),
  );

export const getNewSaleBillingCurrencies = (catalog, plans = []) => {
  const explicitTopLevelCandidates = [
    catalog?.newSaleCurrencies,
    catalog?.offer?.newSaleCurrencies,
    catalog?.commercial?.newSaleCurrencies,
  ];

  for (const candidate of explicitTopLevelCandidates) {
    const currencies = normalizeCurrencyList(candidate);
    if (currencies.length) return currencies;
  }

  const selfServePlanCurrencyLists = (Array.isArray(plans) ? plans : [])
    .filter(
      (plan) =>
        plan?.commercial?.saleMode !== "sales_assisted" &&
        plan?.selfServe !== false,
    )
    .map((plan) => normalizeCurrencyList(plan?.commercial?.newSaleCurrencies))
    .filter((currencies) => currencies.length);
  const planCurrencies = selfServePlanCurrencyLists.reduce(
    (intersection, currencies) =>
      intersection.filter((currency) => currencies.includes(currency)),
    selfServePlanCurrencyLists[0] || [],
  );

  if (planCurrencies.length) return planCurrencies;

  const legacyCurrencies = normalizeCurrencyList([
    ...(Array.isArray(catalog?.offer?.billingCurrencies)
      ? catalog.offer.billingCurrencies
      : []),
    ...(Array.isArray(catalog?.billingCurrencies)
      ? catalog.billingCurrencies
      : []),
  ]);

  return legacyCurrencies.length
    ? legacyCurrencies
    : [...PLATFORM_BILLING_CURRENCIES];
};

export const resolveNewSaleBillingCurrency = ({
  selectedCurrency,
  storedBillingCurrency,
  tenantCurrency,
}) => {
  // A missing price must never silently change the customer's currency.
  for (const value of [
    selectedCurrency,
    storedBillingCurrency,
    tenantCurrency,
  ]) {
    const currency = normalizeCurrency(value);
    if (isPlatformBillingCurrency(currency)) return currency;
  }
  return "USD";
};

export const isTrialCheckoutSelectionBlocked = (
  subscription,
  now = Date.now(),
) => {
  if (
    subscription?.status !== "trialing" ||
    subscription?.hasStripeSubscription
  ) {
    return false;
  }

  if (!subscription?.trialEndsAt) return true;
  const trialEnd = new Date(subscription.trialEndsAt).getTime();
  const currentTime = Number(now);

  if (!Number.isFinite(trialEnd) || !Number.isFinite(currentTime)) return true;

  const remaining = trialEnd - currentTime;
  return remaining > 0 && remaining <= STRIPE_CHECKOUT_MINIMUM_TRIAL_MS;
};

export const getScaleLimit = (plan, key, legacyKey) => {
  const explicit = plan?.capabilities?.scale?.[key];

  if (isRecord(explicit)) {
    if (explicit.kind === "unlimited" || explicit.kind === "custom") {
      return { kind: explicit.kind };
    }

    if (explicit.kind === "fixed") {
      const value = toSafeCount(explicit.value);
      return value === null ? null : { kind: "fixed", value };
    }
  }

  const legacyValue = toSafeCount(plan?.limits?.[legacyKey]);

  return legacyValue === null ? null : { kind: "fixed", value: legacyValue };
};

const getExplicitAllowance = (value) => {
  if (isRecord(value)) {
    if (
      value.kind === "unlimited" ||
      value.kind === "custom" ||
      value.kind === "advanced"
    ) {
      return { kind: value.kind };
    }

    if (value.kind === "fixed") {
      const count = toSafeCount(value.value);
      return count === null ? null : { kind: "fixed", value: count };
    }
  }

  const count = toSafeCount(value);
  return count === null ? null : { kind: "fixed", value: count };
};

export const getPlanFeatureDescriptors = (plan) => {
  const descriptors = [];
  const locations = getScaleLimit(plan, "locations", "locations");
  const teamAccounts = getScaleLimit(plan, "teamAccounts", "staffMembers");
  const customers = getScaleLimit(plan, "customers", "customers");
  const bookings = getScaleLimit(plan, "bookings", "bookings");

  if (locations) descriptors.push({ key: "locations", ...locations });
  if (teamAccounts) descriptors.push({ key: "teamAccounts", ...teamAccounts });

  if (customers?.kind === "unlimited" && bookings?.kind === "unlimited") {
    descriptors.push({ key: "customersAndBookings", kind: "unlimited" });
  }

  const customAutomations = getExplicitAllowance(
    plan?.capabilities?.communications?.customAutomations ??
      (plan?.modules?.automations === false
        ? null
        : plan?.limits?.monthlyAutomations),
  );
  if (customAutomations) {
    descriptors.push({ key: "automations", ...customAutomations });
  }

  const aiAllowance = getExplicitAllowance(
    plan?.capabilities?.ai?.allowancePerMonth ??
      plan?.capabilities?.ai?.monthlyAllowance ??
      plan?.capabilities?.ai?.allowance ??
      (plan?.modules?.ai === false ? null : plan?.limits?.aiCredits),
  );
  if (aiAllowance) {
    descriptors.push({ key: "ai", ...aiAllowance });
  }

  return descriptors.slice(0, 6);
};

export const isPlanRecommended = (plan) =>
  typeof plan?.commercial?.recommended === "boolean"
    ? plan.commercial.recommended
    : normalizeSubscriptionPlan(plan?.id) === "professional";

export const isCurrentPlanSelection = ({
  plan,
  interval,
  currentPlan,
  currentInterval,
  currentVersion,
}) =>
  currentPlan === plan?.id &&
  currentInterval === interval &&
  Number(currentVersion ?? 1) === Number(plan?.version ?? 1);

export const getAnnualSavingsMonths = (plan) => {
  const months = toSafeCount(plan?.commercial?.annualSavingsMonths);

  if (months !== null) return months;

  return plan?.commercial?.offerId === FOUNDING_OFFER_ID ? 2 : null;
};

export const resolveTrustedBillingUrl = (value, currentOrigin) => {
  if (typeof value !== "string" || !value.trim()) return "";

  try {
    const baseUrl = new URL(currentOrigin || "https://shario.io");
    const target = new URL(value, baseUrl);
    const sameOrigin = target.origin === baseUrl.origin;
    const trustedStripe =
      target.protocol === "https:" && TRUSTED_STRIPE_HOSTS.has(target.hostname);

    if (!sameOrigin && !trustedStripe) return "";
    if (!sameOrigin && target.username) return "";
    if (!sameOrigin && target.password) return "";
    if (sameOrigin && !["http:", "https:"].includes(target.protocol)) return "";

    return target.href;
  } catch {
    return "";
  }
};

export const resolveSafeExternalUrl = (value, currentOrigin) => {
  if (typeof value !== "string" || !value.trim()) return "";

  try {
    const baseUrl = new URL(currentOrigin || "https://shario.io");
    const target = new URL(value, baseUrl);
    const sameOrigin = target.origin === baseUrl.origin;

    if (target.username || target.password) return "";
    if (!sameOrigin && target.protocol !== "https:") return "";
    if (sameOrigin && !["http:", "https:"].includes(target.protocol)) return "";

    return target.href;
  } catch {
    return "";
  }
};
