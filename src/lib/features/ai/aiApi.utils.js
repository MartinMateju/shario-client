import { normalizeRolloutEligibleLocaleCode } from "@/i18n/locales";

export const AI_ACTION_CONFIRM_DOMAIN_TAGS = Object.freeze([
  "AiUsage",
  "AiCapabilities",
  "Booking",
  "StaffTask",
  "InventoryItem",
  "ReorderRequest",
  "CommunicationConversation",
  "Events",
]);

export const aiActionMutationTags = (
  { conversationId, actionId },
  domainTags = [],
) => [
  ...(conversationId
    ? [{ type: "AiConversation", id: String(conversationId) }]
    : []),
  { type: "AiConversation", id: "LIST" },
  { type: "AiAction", id: String(actionId) },
  { type: "AiAction", id: "LIST" },
  ...domainTags,
];

export const aiAccessCacheScope = ({ tenant, access } = {}) => {
  const permissions = Array.isArray(access?.permissions)
    ? [...new Set(access.permissions.map(String))].sort().join(",")
    : "";
  const locationIds = Array.isArray(access?.locationAccess?.locationIds)
    ? [...new Set(access.locationAccess.locationIds.map(String))]
        .sort()
        .join(",")
    : "";
  const modules = Object.entries(tenant?.modules ?? {})
    .map(([key, value]) => `${key}=${value === true ? "1" : "0"}`)
    .sort()
    .join(",");
  return [
    tenant?._id ?? tenant?.id ?? access?.tenantId ?? "no-tenant",
    access?.userId ?? "no-user",
    access?.membershipId ?? "no-membership",
    access?.accessVersion ?? "no-version",
    access?.locationAccess?.mode ?? "no-location-mode",
    locationIds,
    permissions,
    modules,
  ].join("|");
};

export const aiBriefingCacheId = (params = {}) =>
  [
    params.cacheScope || "unscoped",
    params.locationId || "all-locations",
    params.locale || "default-locale",
  ].join(":");

export const aiAdvisorCacheId = (params = {}) =>
  [
    params.cacheScope || "unscoped",
    params.locationId || "all-locations",
    params.locale || "default-locale",
  ].join(":");

export const buildKnowledgeCoverageRequest = ({
  cacheScope: _cacheScope,
  locale,
  locationId,
} = {}) => {
  const normalizedLocale = normalizeRolloutEligibleLocaleCode(locale);

  return {
    url: "/ai/knowledge/coverage",
    params: {
      ...(normalizedLocale ? { locale: normalizedLocale } : {}),
      ...(typeof locationId === "string" && locationId.trim()
        ? { locationId: locationId.trim() }
        : {}),
    },
  };
};

export const knowledgeCoverageTags = () => [{ type: "Knowledge", id: "LIST" }];

export const normalizeKnowledgeCoverageResponse = (response) => {
  const source = response?.data ?? response;
  const invalid = () => {
    throw new Error("Invalid Knowledge Hub coverage response.");
  };
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return invalid();
  }
  const totalCount = Number(source.totalCount);
  const answeredCount = Number(source.answeredCount);
  const score = Number(source.score);
  if (
    !Number.isSafeInteger(totalCount) ||
    totalCount <= 0 ||
    !Number.isSafeInteger(answeredCount) ||
    answeredCount < 0 ||
    answeredCount > totalCount ||
    !Number.isFinite(score)
  ) {
    return invalid();
  }
  const rawWarnings = source.warnings;
  if (
    !Array.isArray(rawWarnings) ||
    rawWarnings.length !== totalCount - answeredCount
  ) {
    return invalid();
  }
  const warningIds = new Set();
  const warnings = rawWarnings.map((warning, index) => {
    if (
      !warning ||
      typeof warning !== "object" ||
      Array.isArray(warning) ||
      typeof warning.question !== "string" ||
      !warning.question.trim()
    ) {
      return invalid();
    }
    const id = String(warning.id ?? warning.code ?? `coverage-${index}`).trim();
    if (!id || warningIds.has(id)) return invalid();
    warningIds.add(id);
    return {
      id,
      code: String(warning.code ?? "missing_verified_answer"),
      question: warning.question.trim(),
      category: String(warning.category ?? "general")
        .trim()
        .toLowerCase(),
      severity: ["high", "medium", "low"].includes(warning.severity)
        ? warning.severity
        : "medium",
    };
  });
  const derivedScore = Math.round((answeredCount / totalCount) * 100);
  if (Math.round(score) !== derivedScore) return invalid();
  const generatedAt =
    typeof source.generatedAt === "string" ? source.generatedAt : "";
  if (!generatedAt || Number.isNaN(new Date(generatedAt).getTime())) {
    return invalid();
  }
  const truncated = source.truncated === true;
  const complete = source.complete === true && !truncated;

  return {
    generatedAt,
    score: derivedScore,
    answeredCount,
    totalCount,
    complete,
    truncated,
    warnings,
  };
};

const KNOWLEDGE_COVERAGE_CATEGORIES = new Set([
  "general",
  "getting_started",
  "studio_rules",
  "booking_policy",
  "courses",
  "pickup",
  "memberships",
  "payments",
  "faq",
]);

const KNOWLEDGE_COVERAGE_CATEGORY_MAP = Object.freeze({
  pricing: "payments",
  bookings: "booking_policy",
  studio_access: "studio_rules",
  accessibility: "general",
});

export const mapKnowledgeCoverageCategory = (value) => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  const mapped = KNOWLEDGE_COVERAGE_CATEGORY_MAP[normalized] ?? normalized;
  return KNOWLEDGE_COVERAGE_CATEGORIES.has(mapped) ? mapped : "general";
};

export const buildPublicConciergeMessageRequest = ({
  tenantSlug,
  locale,
  locationId,
  request = {},
} = {}) => {
  const sessionToken =
    typeof request.sessionToken === "string" ? request.sessionToken : "";
  const conversationId =
    typeof request.conversationId === "string" ? request.conversationId : "";

  return {
    url: `/public/tenants/${encodeURIComponent(
      String(tenantSlug ?? "").trim(),
    )}/ai/concierge`,
    method: "POST",
    body: {
      message: request.message,
      locale,
      ...(locationId ? { locationId } : {}),
      ...(sessionToken ? { sessionToken } : {}),
      ...(conversationId ? { conversationId } : {}),
    },
  };
};
