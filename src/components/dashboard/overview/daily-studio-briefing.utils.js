import { resolveIntlLocale } from "@/i18n/formatting";

export const unwrapDailyBriefing = (value) =>
  value?.briefing ?? value?.data?.briefing ?? value?.data ?? value ?? null;

export const tenantDateKey = (date, timezone = "UTC") => {
  const candidate = date instanceof Date ? date : new Date(date);
  const validDate = Number.isNaN(candidate.getTime()) ? new Date() : candidate;
  let parts;
  try {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(validDate);
  } catch {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(validDate);
  }
  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
};

export const dailyBriefingRequest = ({ locale, locationId, cacheScope }) => ({
  ...(cacheScope ? { cacheScope } : {}),
  locale,
  ...(locationId ? { locationId } : {}),
});

export const safeDailyBriefingHref = (value) => {
  const href = typeof value === "string" ? value.trim() : "";
  return href === "/app" || href.startsWith("/app/") ? href : null;
};

export const dailyBriefingPriorityItems = (briefing) => {
  const attention = Array.isArray(briefing?.attention)
    ? briefing.attention
        .map((item, index) => {
          const label = item?.description ?? item?.title;
          if (typeof label !== "string" || !label.trim()) return null;
          return {
            id: String(item?.id || `attention-${index}`),
            label: label.trim(),
            href: safeDailyBriefingHref(item?.href),
          };
        })
        .filter(Boolean)
    : [];
  if (attention.length) return attention;
  return Array.isArray(briefing?.priorities)
    ? briefing.priorities
        .map((label, index) =>
          typeof label === "string" && label.trim()
            ? { id: `priority-${index}`, label: label.trim(), href: null }
            : null,
        )
        .filter(Boolean)
    : [];
};

export const dailyBriefingIdentity = ({
  locale,
  locationId,
  dateKey,
  snapshotHash,
  stale = false,
}) =>
  [
    dateKey || "unknown-day",
    locale || "unknown-locale",
    locationId || "all-locations",
    snapshotHash || "no-snapshot",
    stale ? "stale" : "current",
  ].join(":");

export const isDailyBriefingCurrent = (briefing, { locale, dateKey }) =>
  Boolean(
    briefing &&
    String(briefing.locale || "").toLowerCase() ===
      String(locale || "").toLowerCase() &&
    briefing.dateKey === dateKey,
  );

export const isDailyBriefingStale = (briefing, now = new Date()) => {
  if (!briefing) return true;
  if (briefing.freshness?.state) {
    return briefing.freshness.state === "stale";
  }
  const refreshAfter = new Date(
    briefing.freshness?.refreshAfter ?? briefing.refreshAfter ?? "",
  );
  return (
    !Number.isNaN(refreshAfter.getTime()) &&
    refreshAfter.getTime() <= now.getTime()
  );
};

export const dailyBriefingPriorities = (briefing) => {
  return dailyBriefingPriorityItems(briefing).map(({ label }) => label);
};

export const formatDailyBriefingTime = (
  value,
  { locale = "en", timezone = "UTC" } = {},
) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const language = resolveIntlLocale(locale);
  try {
    return new Intl.DateTimeFormat(language, {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone || "UTC",
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat(language, {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    }).format(date);
  }
};

export const shouldGenerateDailyBriefing = ({
  canGenerate,
  isToday,
  isLoading,
  isFetching,
  isError,
  briefing,
  locale,
  dateKey,
}) =>
  Boolean(
    canGenerate &&
    isToday &&
    !isLoading &&
    !isFetching &&
    !isError &&
    (!isDailyBriefingCurrent(briefing, { locale, dateKey }) ||
      isDailyBriefingStale(briefing)),
  );
