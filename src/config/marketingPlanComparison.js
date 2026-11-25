// Current new-subscription entitlements, not prices. Verified against
// shario-server src/modules/tenants/tenant.plan.ts PLAN_V3_CAPABILITIES
// (2026-11-25). Keep this summary aligned when Plan V3 changes;
// historical subscriptions can retain different entitlements. Prices continue
// to come from /public/subscription-catalog.
export const MARKETING_PLAN_VERSION = 3;

export const MARKETING_COMPARISON_PLANS = Object.freeze([
  "starter",
  "professional",
  "studioPlus",
]);

// Numeric entries are counts; booleans and tier strings use localized labels.
// Studio Plus automations are marketed as "advanced", not as unlimited.
export const MARKETING_PLAN_COMPARISON_ROWS = Object.freeze([
  { key: "locations", values: [1, 1, 2] },
  { key: "teamAccounts", values: [1, 3, 6] },
  { key: "openStudioMemberships", values: [false, true, true] },
  { key: "inventoryTasks", values: [false, true, true] },
  { key: "automations", values: [0, 3, "advanced"] },
  { key: "emails", values: [500, 2500, 5000] },
  // Studio AI is marketed from Professional up. Starter V3 still carries a
  // limited 200-credit allowance in tenant.plan.ts, but it is deliberately
  // not advertised on the public site.
  { key: "studioAssistant", values: [false, true, true] },
  { key: "aiCredits", values: [0, 2000, 10000] },
  { key: "briefingKnowledge", values: [false, true, true] },
  { key: "advancedAi", values: [false, false, true] },
  { key: "accessCodes", values: [false, false, true] },
  { key: "customDomain", values: [false, false, true] },
]);

// Pricing cards list `feature1..featureN` from MarketingHome.pricing.<plan>.
// Paid tiers build on the one below, which the card states above its list.
export const PRICING_CARD_FEATURE_COUNTS = Object.freeze({
  starter: 4,
  professional: 5,
  studioPlus: 4,
  enterprise: 4,
});

export const PRICING_CARD_PREVIOUS_PLAN = Object.freeze({
  professional: "starter",
  studioPlus: "professional",
  enterprise: "studioPlus",
});

export const getPricingCardFeatureIndexes = (messageKey) =>
  Array.from(
    { length: PRICING_CARD_FEATURE_COUNTS[messageKey] ?? 4 },
    (_, index) => index + 1,
  );
