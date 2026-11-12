import { formatMinorCurrencyAmount } from "@/utils/money";
import { normalizeLocaleCode } from "@/i18n/locales";
export const CANCELLATION_REASONS = Object.freeze([
  "too_expensive",
  "not_using",
  "missing_features",
  "moving",
  "temporary",
  "other",
]);
export const BENEFIT_TYPES = Object.freeze([
  "allowance",
  "percentage",
  "limit",
  "boolean",
]);
export const ALLOWANCE_UNITS = Object.freeze([
  "credit",
  "visit",
  "session",
  "minute",
  "hour",
  "booking",
  "item",
  "money_minor",
  "custom",
]);
export const LIMIT_UNITS = Object.freeze([
  "active_bookings",
  "priority_days",
  "custom",
]);
export const PERCENTAGE_TARGETS = Object.freeze([
  "bookings",
  "products",
  "all",
]);
export const getEntityId = (value) =>
  String(value?.id ?? value?._id ?? value ?? "").trim();
export const getPlanVersion = (plan) =>
  plan?.draftVersion ??
  plan?.currentDraftVersion ??
  plan?.publishedVersion ??
  plan?.currentPublishedVersion ??
  plan?.version ??
  plan;
export const normalizePlans = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.plans)) return response.plans;
  if (Array.isArray(response?.items)) return response.items;
  return [];
};
export const normalizeMemberships = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.memberships)) return response.memberships;
  if (Array.isArray(response?.items)) return response.items;
  return [];
};
export const getPlanPrices = (plan) => {
  const version = getPlanVersion(plan);
  if (Array.isArray(version?.prices)) return version.prices;
  if (Array.isArray(plan?.prices)) return plan.prices;
  const amount = version?.amountMinor ?? plan?.amountMinor;
  const currency = version?.currency ?? plan?.currency;
  return amount != null && currency
    ? [
        {
          currency,
          amountMinor: amount,
        },
      ]
    : [];
};
export const getPlanLocations = (plan) => {
  const version = getPlanVersion(plan);
  const scope = version?.locationScope ?? plan?.locationScope;
  return ["selected", "shared_selected"].includes(scope?.type) &&
    Array.isArray(scope.locationIds)
    ? scope.locationIds.map(getEntityId).filter(Boolean)
    : [];
};
export const planAppliesToLocation = (plan, locationId) => {
  if (!locationId) return true;
  const version = getPlanVersion(plan);
  const scope = version?.locationScope ?? plan?.locationScope;
  return (
    !["selected", "shared_selected"].includes(scope?.type) ||
    getPlanLocations(plan).includes(locationId)
  );
};
export const getPlanBenefits = (plan) => {
  const version = getPlanVersion(plan);
  return Array.isArray(version?.benefits) ? version.benefits : [];
};
export const getMembershipBenefits = (membership) =>
  membership?.planSnapshot?.benefits ??
  membership?.planVersion?.benefits ??
  membership?.benefits ??
  [];

// Base fields remain the studio's primary-language content. Missing or blank
// translations fall back per field, including for older purchased snapshots.
export const getLocalizedMembershipText = (
  source,
  field,
  locale,
  sourceLanguage = source?.sourceLanguage,
) => {
  const language = normalizeLocaleCode(locale);
  if (
    sourceLanguage &&
    normalizeLocaleCode(sourceLanguage) === language &&
    typeof source?.[field] === "string"
  ) {
    return source[field];
  }
  const translated = source?.translations?.[language]?.[field];
  return typeof translated === "string" && translated.trim()
    ? translated.trim()
    : typeof source?.[field] === "string"
      ? source[field]
      : "";
};
export const getMembershipName = (membership, locale) =>
  getLocalizedMembershipText(
    membership?.planSnapshot ??
      membership?.planVersion ??
      membership?.plan ??
      membership,
    "name",
    locale,
  );
export const getMembershipPrice = (membership) => ({
  amountMinor:
    membership?.amountMinor ??
    membership?.price?.amountMinor ??
    membership?.planSnapshot?.prices?.find(
      (price) => price.currency === membership?.currency,
    )?.amountMinor ??
    0,
  currency: membership?.currency ?? membership?.price?.currency ?? "CZK",
});
export const formatPlanPrice = (price, locale) =>
  formatMinorCurrencyAmount(
    price?.amountMinor ?? price?.amount ?? 0,
    price?.currency,
    locale,
  );
export const formatDate = (value, locale, options = {}) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
  }).format(date);
};
export const formatBenefitValue = (benefit, t, locale = "en") => {
  if (benefit?.type === "allowance") {
    if (isPersonalHourBenefit(benefit)) {
      return [
        t("benefitValues.studioHours", {
          duration: formatMembershipMinutes(benefit.quantity, locale),
        }),
        Number(benefit.rolloverPercent) > 0
          ? t("benefitValues.rollover", {
              percentage: benefit.rolloverPercent,
            })
          : "",
      ]
        .filter(Boolean)
        .join(" ");
    }
    if (benefit.unit === "credit") {
      return t("benefitValues.monthlyCredits", {
        quantity: benefit.quantity ?? 0,
      });
    }
    if (benefit.unit === "money_minor") {
      return t("benefitValues.money", {
        amount: formatMinorCurrencyAmount(
          benefit.quantity ?? 0,
          benefit.currency,
          locale,
        ),
      });
    }
    return t(`units.${benefit.unit || "custom"}`, {
      count: benefit.quantity ?? 0,
    });
  }
  if (benefit?.type === "percentage") {
    if (benefit.productScope === "courses" && benefit.memberOnly === true) {
      return t("benefitValues.personalCourseDiscount", {
        percentage: (Number(benefit.percentageBps || 0) / 100).toLocaleString(
          locale,
        ),
      });
    }
    if (benefit.appliesTo === "products") {
      return t("benefitValues.productDiscount", {
        percentage: (Number(benefit.percentageBps || 0) / 100).toLocaleString(),
      });
    }
    return t("benefitValues.percentage", {
      percentage: (Number(benefit.percentageBps || 0) / 100).toLocaleString(),
      target: t(`targets.${benefit.appliesTo || "all"}`),
    });
  }
  if (benefit?.type === "limit") {
    return t(`units.${benefit.unit || "custom"}`, {
      count: benefit.limit ?? 0,
    });
  }
  return benefit?.enabled
    ? t("benefitValues.included")
    : t("benefitValues.notIncluded");
};
export const isPersonalHourBenefit = (benefit) =>
  benefit?.type === "allowance" &&
  benefit.unit === "minute" &&
  benefit.usageScope === "open_studio" &&
  benefit.memberOnly === true;
export const formatMembershipMinutes = (value, locale = "en") => {
  const minutes = Math.max(0, Math.round(Number(value) || 0));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return [
    hours
      ? new Intl.NumberFormat(locale, {
          style: "unit",
          unit: "hour",
          unitDisplay: "short",
        }).format(hours)
      : "",
    remainder || !hours
      ? new Intl.NumberFormat(locale, {
          style: "unit",
          unit: "minute",
          unitDisplay: "short",
        }).format(remainder)
      : "",
  ]
    .filter(Boolean)
    .join(" ");
};
export const formatBenefitBalance = (benefit, value, locale = "en") =>
  benefit?.unit === "money_minor"
    ? formatMinorCurrencyAmount(value ?? 0, benefit.currency, locale)
    : benefit?.unit === "minute"
      ? formatMembershipMinutes(value, locale)
      : String(value ?? 0);
export const isAdjustableBenefit = (benefit) =>
  benefit?.type === "allowance" && benefit?.adjustable !== false;
export const getBalanceForBenefit = (membership, benefitKey) =>
  (membership?.balances ?? []).find(
    (balance) => balance?.benefitKey === benefitKey,
  );
export const getCustomer = (membership) =>
  membership?.user ?? membership?.customer ?? membership?.userId ?? null;
export const getCustomerName = (membership) => {
  const customer = getCustomer(membership);
  if (!customer || typeof customer === "string") return "";
  return (
    customer.name ||
    [
      customer.firstName ?? customer.firstname,
      customer.lastName ?? customer.lastname,
    ]
      .filter(Boolean)
      .join(" ")
  );
};
export const createIdempotencyKey = (prefix = "membership") => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};
export const statusTone = (status) => {
  if (["active", "published", "paid", "complete"].includes(status)) {
    return "bg-[#EAF3E7] text-[#526B48]";
  }
  if (["pending", "draft", "cancel_scheduled", "open"].includes(status)) {
    return "bg-sand-100 text-sand-700";
  }
  if (["past_due", "failed"].includes(status)) {
    return "bg-danger-soft text-danger";
  }
  return "bg-[#F1EFEB] text-[#686762]";
};
