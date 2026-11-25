import { formatMinorCurrencyAmount } from "@/utils/money";
import { resolveIntlLocale } from "@/i18n/formatting";

export const hasMetricValue = (metric) =>
  typeof metric?.value === "number" && Number.isFinite(metric.value);

export const formatManagementValue = (
  metric,
  { money = false, currency = "CZK", locale = "en" } = {},
) => {
  if (!hasMetricValue(metric)) return "—";
  return money
    ? formatMinorCurrencyAmount(metric.value, currency, locale)
    : new Intl.NumberFormat(resolveIntlLocale(locale)).format(metric.value);
};

export const formatManagementDate = (value, locale) => {
  if (!value) return "—";
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(resolveIntlLocale(locale), {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
};

export const formatManagementPeriod = (period, locale) => {
  if (!period?.from || !period?.to) return "—";
  return `${formatManagementDate(period.from, locale)} – ${formatManagementDate(period.to, locale)}`;
};

export const managementHref = (href, fallback = "/app") =>
  typeof href === "string" &&
  /^\/app(?:[/?#]|$)/.test(href) &&
  !/[\\\u0000-\u001f]/.test(href)
    ? href
    : fallback;

export const getManagementIssues = (management, overview) => {
  const items = [...(management?.issues || [])].filter(
    (item) => typeof item?.count === "number" && item.count > 0,
  );
  const seen = new Set(items.map((item) => item.key));
  // Ordinary unpaid bookings are not urgent by themselves. Only retain
  // operational exceptions with a real trigger.
  for (const item of overview?.attention || []) {
    if (
      item.available === true &&
      item.count > 0 &&
      ["overdueTasks", "lowStock"].includes(item.key) &&
      !seen.has(item.key)
    ) {
      items.push(item);
      seen.add(item.key);
    }
  }
  return items;
};

export const getManagementHours = (attendance) => {
  if (attendance?.available !== true) return [];
  const byHour = new Map(
    (Array.isArray(attendance.hours) ? attendance.hours : [])
      .filter(
        (entry) =>
          Number.isInteger(entry?.hour) &&
          entry.hour >= 0 &&
          entry.hour <= 23 &&
          typeof entry.count === "number" &&
          Number.isFinite(entry.count) &&
          entry.count >= 0,
      )
      .map((entry) => [entry.hour, entry.count]),
  );
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: byHour.get(hour) ?? 0,
  }));
};

export const MANAGEMENT_ROLES = new Set(["owner", "admin", "manager"]);
