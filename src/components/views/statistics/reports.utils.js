import { formatMinorCurrencyAmount } from "@/utils/money";

export const REPORT_TABS = Object.freeze([
  "overview",
  "sales",
  "bookings",
  "customers",
  "operations",
]);

export const REPORT_GRANULARITIES = Object.freeze([
  "auto",
  "day",
  "week",
  "month",
]);

export const REPORT_DATE_PRESETS = Object.freeze([
  "last7Days",
  "last30Days",
  "thisMonth",
  "lastMonth",
  "thisYear",
  "custom",
]);

const pad = (value) => String(value).padStart(2, "0");

export const toDateInputValue = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const getCalendarParts = (date, timeZone) => {
  if (timeZone) {
    try {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(date);
      const valueByType = Object.fromEntries(
        parts.map(({ type, value }) => [type, value]),
      );

      return {
        year: Number(valueByType.year),
        month: Number(valueByType.month),
        day: Number(valueByType.day),
      };
    } catch {
      // Invalid or unsupported IANA zones fall back to the browser calendar.
    }
  }

  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
};

const toUtcDateInputValue = (date) =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate(),
  )}`;

export const getReportDateRange = (preset, now = new Date(), timeZone) => {
  const calendar = getCalendarParts(now, timeZone);
  const today = new Date(
    Date.UTC(calendar.year, calendar.month - 1, calendar.day),
  );
  let from = new Date(today);
  let to = new Date(today);

  switch (preset) {
    case "last7Days":
      from.setUTCDate(from.getUTCDate() - 6);
      break;
    case "last30Days":
      from.setUTCDate(from.getUTCDate() - 29);
      break;
    case "lastMonth":
      from = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1),
      );
      to = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0));
      break;
    case "thisYear":
      from = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
      break;
    case "thisMonth":
    default:
      from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
      break;
  }

  return {
    from: toUtcDateInputValue(from),
    to: toUtcDateInputValue(to),
  };
};

export const isFiniteReportNumber = (value) =>
  typeof value === "number" && Number.isFinite(value);

export const normalizeReportOverview = (value) => {
  const source =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const metadata = source.metadata ?? source.meta ?? {};
  const coverage =
    source.coverage && typeof source.coverage === "object"
      ? source.coverage
      : {};

  return {
    metadata,
    coverage: {
      available: Array.isArray(coverage.available) ? coverage.available : [],
      unavailable: Array.isArray(coverage.unavailable)
        ? coverage.unavailable
        : [],
      limitations: Array.isArray(coverage.limitations)
        ? coverage.limitations
        : [],
      complete: coverage.complete === true,
    },
    summary:
      source.summary && typeof source.summary === "object"
        ? source.summary
        : {},
    timeSeries: Array.isArray(source.timeSeries)
      ? source.timeSeries
      : Array.isArray(source.series)
        ? source.series
        : [],
    sales:
      source.sales && typeof source.sales === "object" ? source.sales : null,
    bookings:
      source.bookings && typeof source.bookings === "object"
        ? source.bookings
        : null,
    customers:
      source.customers && typeof source.customers === "object"
        ? source.customers
        : null,
    operations:
      source.operations && typeof source.operations === "object"
        ? source.operations
        : {},
    insights: normalizeReportInsights(source.insights),
  };
};

const normalizeInsightItem = (item, tone = "info") => {
  if (typeof item === "string") {
    return { title: item, detail: "", tone };
  }

  if (!item || typeof item !== "object") return null;

  return {
    ...item,
    title: item.title ?? item.headline ?? item.label ?? "",
    detail:
      item.detail ??
      item.description ??
      item.summary ??
      item.message ??
      item.value ??
      "",
    tone: item.tone ?? item.severity ?? item.type ?? tone,
  };
};

export function normalizeReportInsights(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeInsightItem(item)).filter(Boolean);
  }

  if (!value || typeof value !== "object") return [];

  return [
    ...(Array.isArray(value.highlights)
      ? value.highlights.map((item) => normalizeInsightItem(item, "positive"))
      : []),
    ...(Array.isArray(value.attention)
      ? value.attention.map((item) => normalizeInsightItem(item, "warning"))
      : []),
    ...(Array.isArray(value.recommendations)
      ? value.recommendations.map((item) =>
          normalizeInsightItem(item, "recommendation"),
        )
      : []),
  ].filter(Boolean);
}

export const formatReportNumber = (value, locale = "en", fallback = "—") => {
  if (!isFiniteReportNumber(value)) return fallback;

  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
  }).format(value);
};

export const formatReportPercent = (value, locale = "en", fallback = "—") => {
  if (!isFiniteReportNumber(value)) return fallback;

  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
  }).format(value)}%`;
};

export const formatReportMoney = (
  value,
  currency,
  locale = "en",
  fallback = "—",
) => formatMinorCurrencyAmount(value, currency, locale, fallback);

export const formatReportDate = (
  value,
  locale = "en",
  options = { day: "numeric", month: "short", year: "numeric" },
) => {
  if (!value) return "—";

  const calendarDate = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = calendarDate
    ? new Date(
        Number(calendarDate[1]),
        Number(calendarDate[2]) - 1,
        Number(calendarDate[3]),
        12,
      )
    : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(locale, options).format(date);
};

export const formatReportDateTime = (value, locale = "en", timeZone) =>
  formatReportDate(value, locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...(timeZone ? { timeZone } : {}),
  });

export const formatDelta = (value, locale = "en") => {
  if (!isFiniteReportNumber(value)) return null;
  if (value === 0) return "0%";

  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
  }).format(Math.abs(value));

  return `${value > 0 ? "+" : "−"}${formatted}%`;
};

export const getMetricValue = (metric) =>
  metric && typeof metric === "object" ? metric.value : null;

export const getMetricPrevious = (metric) =>
  metric && typeof metric === "object" ? metric.previous : null;

export const getMetricDelta = (metric) =>
  metric && typeof metric === "object" ? metric.changePercent : null;

export const getEntityId = (value) =>
  String(value?._id ?? value?.id ?? value ?? "").trim();

export const getOperationSections = (operations = {}) =>
  [
    ["inventory", operations.inventory],
    ["staffTasks", operations.staffTasks ?? operations.staff],
  ].filter(([, section]) => section && typeof section === "object");

export const getReportErrorMessage = (error, fallback) =>
  (typeof error?.data === "string" ? error.data : null) ||
  error?.data?.message ||
  error?.data?.error ||
  error?.error ||
  error?.message ||
  fallback;

export const downloadCsvFile = ({
  csv,
  filename = "shario-report.csv",
  contentType = "text/csv;charset=utf-8",
}) => {
  if (typeof window === "undefined" || typeof csv !== "string") return false;

  const blob = new Blob([csv], { type: contentType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.hidden = true;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);

  return true;
};

export const isCsvDownloadPayload = (payload) => {
  const csv = payload?.csv;
  const contentType = String(payload?.contentType || "").toLowerCase();
  const trimmed =
    typeof csv === "string" ? csv.replace(/^\uFEFF/, "").trim() : "";

  if (!trimmed) return false;
  if (
    contentType.includes("application/json") ||
    contentType.includes("text/html")
  ) {
    return false;
  }

  return (
    contentType.includes("text/csv") ||
    contentType.includes("application/csv") ||
    /^[^,\r\n]+(?:,[^,\r\n]*)+(?:\r?\n|$)/.test(trimmed)
  );
};
