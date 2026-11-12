import { resolveIntlLocale } from "@/i18n/formatting";

import { getSafeWorkspaceHref } from "./ai.utils";

export const ADVISOR_RECOMMENDATION_ID = /^adv_[a-f\d]{24}$/i;

export const ADVISOR_CATEGORIES = new Set([
  "revenue",
  "capacity",
  "retention",
  "courses",
  "inventory",
  "operations",
]);

export const ADVISOR_PRIORITIES = new Set(["high", "medium", "low"]);
export const ADVISOR_LEVELS = new Set(["high", "medium", "low"]);
export const ADVISOR_EVIDENCE_SOURCES = new Set([
  "sales",
  "bookings",
  "reports",
  "courses",
  "course_sessions",
  "inventory",
  "customers",
  "memberships",
  "communications",
  "stafftasks",
]);
export const ADVISOR_SNAPSHOT_STATUSES = new Set([
  "ready",
  "learning",
  "no_signal",
  "unavailable",
]);

const finiteNumberOrNull = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const plainText = (value) =>
  typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";

export const isAdvisorRecommendationId = (value) =>
  ADVISOR_RECOMMENDATION_ID.test(plainText(value));

export const unwrapAdvisorSnapshot = (value) => {
  const source = value?.data ?? value ?? null;
  const snapshot = source?.snapshot ?? source?.advisor ?? source;
  return snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)
    ? snapshot
    : null;
};

export const normalizeAdvisorEvidence = (value, index = 0) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const source = plainText(value.source).toLowerCase();

  return {
    id: plainText(value.id) || `evidence-${index}`,
    source: ADVISOR_EVIDENCE_SOURCES.has(source) ? source : "",
    metric: plainText(value.metric),
    label: plainText(value.label) || plainText(value.metric),
    value: finiteNumberOrNull(value.value),
    previousValue: finiteNumberOrNull(value.previousValue),
    changePercent: finiteNumberOrNull(value.changePercent),
    unit: plainText(value.unit).toLowerCase(),
    currency: plainText(value.currency).toUpperCase(),
    period:
      value.period && typeof value.period === "object"
        ? {
            from: plainText(value.period.from),
            to: plainText(value.period.to),
          }
        : null,
  };
};

export const normalizeAdvisorRecommendation = (value, index = 0) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const id = plainText(value.id);
  const category = plainText(value.category).toLowerCase();
  const priority = plainText(value.priority).toLowerCase();
  const impact = plainText(value.impact).toLowerCase();
  const effort = plainText(value.effort).toLowerCase();
  const confidence = plainText(
    value.confidence?.level ?? value.confidence,
  ).toLowerCase();
  const href = getSafeWorkspaceHref(value.href, "");
  const evidence = (Array.isArray(value.evidence) ? value.evidence : [])
    .slice(0, 12)
    .map(normalizeAdvisorEvidence)
    .filter(Boolean);

  return {
    id: isAdvisorRecommendationId(id) ? id : "",
    key: plainText(value.key) || `recommendation-${index}`,
    category: ADVISOR_CATEGORIES.has(category) ? category : "operations",
    kind:
      plainText(value.kind).toLowerCase() === "risk" ? "risk" : "opportunity",
    priority: ADVISOR_PRIORITIES.has(priority) ? priority : "medium",
    impact: ADVISOR_LEVELS.has(impact) ? impact : "medium",
    effort: ADVISOR_LEVELS.has(effort) ? effort : "medium",
    confidence: ADVISOR_LEVELS.has(confidence) ? confidence : "medium",
    title: plainText(value.title),
    rationale: plainText(value.rationale ?? value.summary),
    nextStep: plainText(value.nextStep),
    href,
    assistantIntent: plainText(value.assistantIntent),
    evidence,
  };
};

export const normalizeAdvisorSnapshot = (value) => {
  const source = unwrapAdvisorSnapshot(value);
  if (!source) return null;

  const coverage =
    source.coverage && typeof source.coverage === "object"
      ? source.coverage
      : {};
  const freshness =
    source.freshness && typeof source.freshness === "object"
      ? source.freshness
      : {};
  const recommendations = (
    Array.isArray(source.recommendations) ? source.recommendations : []
  )
    .slice(0, 5)
    .map(normalizeAdvisorRecommendation)
    .filter((item) => item?.title);

  return {
    id: plainText(source.id),
    schemaVersion: plainText(source.schemaVersion),
    status: ADVISOR_SNAPSHOT_STATUSES.has(
      plainText(source.status).toLowerCase(),
    )
      ? plainText(source.status).toLowerCase()
      : "ready",
    headline: plainText(source.headline),
    summary: plainText(source.summary),
    recommendations,
    period:
      source.period && typeof source.period === "object" ? source.period : {},
    coverage: {
      available: Array.isArray(coverage.available)
        ? coverage.available.map(plainText).filter(Boolean)
        : [],
      unavailable: Array.isArray(coverage.unavailable)
        ? coverage.unavailable
            .map((item) => ({
              source: plainText(item?.source),
              reason: plainText(item?.reason),
            }))
            .filter(({ source }) => source)
        : [],
      limitations: Array.isArray(coverage.limitations)
        ? coverage.limitations.map(plainText).filter(Boolean)
        : [],
      complete: coverage.complete === true,
    },
    needsMoreData: source.needsMoreData === true,
    dataLimitations: Array.isArray(source.dataLimitations)
      ? source.dataLimitations.map(plainText).filter(Boolean)
      : [],
    generatedAt: plainText(source.generatedAt),
    freshness: {
      state: freshness.state === "stale" ? "stale" : "fresh",
      dataAsOf: plainText(freshness.dataAsOf),
      refreshAfter: plainText(freshness.refreshAfter),
      reason: plainText(freshness.reason),
    },
    provenance:
      source.provenance && typeof source.provenance === "object"
        ? source.provenance
        : {},
    usedFallback: source.usedFallback === true,
  };
};

export const getAdvisorEmptyState = (snapshot) => {
  if (!snapshot) return "ready";
  if (snapshot.recommendations.length) return "recommendations";
  if (snapshot.status === "learning" || snapshot.needsMoreData)
    return "learning";
  if (
    (snapshot.status === "no_signal" && snapshot.coverage.complete) ||
    snapshot.coverage.complete
  ) {
    return "noSignal";
  }
  return "unavailable";
};

export const getAdvisorDiscussHref = (recommendation) => {
  if (!isAdvisorRecommendationId(recommendation?.id)) return "";
  const params = new URLSearchParams({
    intent: "review-business-advice",
    recommendationId: recommendation.id,
  });
  return `/app/ai?${params.toString()}`;
};

export const sortAdvisorRecommendations = (recommendations) => {
  const priority = { high: 0, medium: 1, low: 2 };
  return [...(Array.isArray(recommendations) ? recommendations : [])].sort(
    (left, right) =>
      (priority[left.priority] ?? 1) - (priority[right.priority] ?? 1) ||
      String(left.title).localeCompare(String(right.title)),
  );
};

export const formatAdvisorDateTime = (
  value,
  { locale = "en", timezone = "UTC" } = {},
) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  try {
    return new Intl.DateTimeFormat(resolveIntlLocale(locale), {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone || "UTC",
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat(resolveIntlLocale(locale), {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(date);
  }
};

export const formatAdvisorEvidenceValue = (
  evidence,
  { locale = "en", fallback = "—" } = {},
) => {
  if (evidence?.value === null || evidence?.value === undefined)
    return fallback;
  const language = resolveIntlLocale(locale);
  const options = { maximumFractionDigits: 1 };

  if (
    ["currency", "minor_currency"].includes(evidence.unit) &&
    evidence.currency
  ) {
    const currencyValue =
      evidence.unit === "minor_currency"
        ? evidence.value / 100
        : evidence.value;
    try {
      return new Intl.NumberFormat(language, {
        style: "currency",
        currency: evidence.currency,
        maximumFractionDigits: 0,
      }).format(currencyValue);
    } catch {
      return `${new Intl.NumberFormat(language, options).format(currencyValue)} ${evidence.currency}`;
    }
  }

  const formatted = new Intl.NumberFormat(language, options).format(
    evidence.value,
  );
  if (["percent", "percentage"].includes(evidence.unit)) return `${formatted}%`;
  if (evidence.unit === "hours") {
    return new Intl.NumberFormat(language, {
      maximumFractionDigits: 1,
      style: "unit",
      unit: "hour",
      unitDisplay: "short",
    }).format(evidence.value);
  }
  return evidence.unit && !["count", "number"].includes(evidence.unit)
    ? `${formatted} ${evidence.unit}`
    : formatted;
};
