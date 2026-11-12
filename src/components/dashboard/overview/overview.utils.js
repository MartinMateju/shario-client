import { formatMinorCurrencyAmount } from "@/utils/money";
import { resolveIntlLocale } from "@/i18n/formatting";

export const FLOW_KEYS = Object.freeze(["booked", "arriving", "inStudio"]);

const FLOW_DEFAULTS = Object.freeze({
  booked: { unit: "bookings", href: "/app/bookings" },
  arriving: { unit: "bookings", href: "/app/calendar" },
  inStudio: { unit: "bookings", href: "/app/calendar" },
});

export const cx = (...classes) => classes.filter(Boolean).join(" ");

export const normalizeOverview = (value) => {
  const source =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const metadata =
    source.metadata && typeof source.metadata === "object"
      ? source.metadata
      : {};
  const coverage =
    source.coverage && typeof source.coverage === "object"
      ? source.coverage
      : {};
  const today =
    source.today && typeof source.today === "object" ? source.today : {};
  const milestones =
    source.milestones && typeof source.milestones === "object"
      ? source.milestones
      : {};
  const firstCustomerBooking =
    milestones.firstCustomerBooking &&
    typeof milestones.firstCustomerBooking === "object"
      ? milestones.firstCustomerBooking
      : {};
  const pulse =
    source.businessPulse && typeof source.businessPulse === "object"
      ? source.businessPulse
      : {};
  const signals =
    source.signals && typeof source.signals === "object" ? source.signals : {};
  const flowByKey = new Map(
    (Array.isArray(source.flow) ? source.flow : [])
      .filter((item) => item?.key)
      .map((item) => [item.key, item]),
  );

  return {
    metadata: {
      date: metadata.date ?? "",
      timezone: metadata.timezone ?? "UTC",
      generatedAt: metadata.generatedAt ?? null,
      locationId: metadata.locationId ?? null,
      locationIds: Array.isArray(metadata.locationIds)
        ? metadata.locationIds
        : [],
      currency: metadata.currency ?? "CZK",
    },
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
    today: {
      available: today.available === true,
      schedule: Array.isArray(today.schedule) ? today.schedule : null,
    },
    milestones: {
      firstCustomerBooking: {
        applicable: firstCustomerBooking.applicable === true,
        available: firstCustomerBooking.available === true,
        achieved:
          firstCustomerBooking.available === true
            ? firstCustomerBooking.achieved === true
            : null,
      },
    },
    flow: FLOW_KEYS.map((key) => {
      const item = flowByKey.get(key) ?? {};
      return {
        key,
        value:
          typeof item.value === "number" && Number.isFinite(item.value)
            ? item.value
            : null,
        unit: item.unit ?? FLOW_DEFAULTS[key].unit,
        available: item.available === true,
        href: item.href ?? FLOW_DEFAULTS[key].href,
      };
    }),
    attention: (Array.isArray(source.attention) ? source.attention : [])
      .filter((item) => item?.key)
      .map((item) => ({
        key: item.key,
        count:
          typeof item.count === "number" && Number.isFinite(item.count)
            ? item.count
            : null,
        available: item.available === true,
        severity: item.severity === "warning" ? "warning" : "info",
        href: item.href || "/app",
      })),
    businessPulse: {
      occupancy: normalizeMetric(pulse.occupancy),
      revenue: {
        available: pulse.revenue?.available === true,
        valueMinor:
          typeof pulse.revenue?.valueMinor === "number" &&
          Number.isFinite(pulse.revenue.valueMinor)
            ? pulse.revenue.valueMinor
            : null,
        currency: pulse.revenue?.currency ?? metadata.currency ?? "CZK",
      },
      bookings: normalizeMetric(pulse.bookings),
      newCustomers: normalizeMetric(pulse.newCustomers),
      series: {
        available: pulse.series?.available === true,
        key: pulse.series?.key ?? "utilization",
        points: Array.isArray(pulse.series?.points)
          ? pulse.series.points
              .filter((point) => point && typeof point === "object")
              .map((point) => ({
                label: String(point.label ?? ""),
                value:
                  typeof point.value === "number" &&
                  Number.isFinite(point.value)
                    ? point.value
                    : null,
              }))
          : null,
      },
    },
    signals: {
      messages: normalizeSignalCollection(signals.messages, "unreadCount"),
      tasks: normalizeSignalCollection(signals.tasks, "openCount"),
    },
    opportunity:
      source.opportunity && typeof source.opportunity === "object"
        ? {
            available: source.opportunity.available === true,
            key: source.opportunity.key ?? null,
            value:
              typeof source.opportunity.value === "number" &&
              Number.isFinite(source.opportunity.value)
                ? source.opportunity.value
                : null,
            href: source.opportunity.href || null,
            actionKey: source.opportunity.actionKey || null,
            source: source.opportunity.source || "deterministic",
            details:
              source.opportunity.details &&
              typeof source.opportunity.details === "object"
                ? source.opportunity.details
                : null,
          }
        : {
            available: false,
            key: null,
            value: null,
            href: null,
            actionKey: null,
            source: "deterministic",
            details: null,
          },
  };
};

function normalizeSignalCollection(collection, countKey) {
  const source = collection && typeof collection === "object" ? collection : {};
  const count = source[countKey];

  return {
    available: source.available === true,
    [countKey]:
      typeof count === "number" && Number.isFinite(count) ? count : null,
    items: Array.isArray(source.items)
      ? source.items.filter((item) => item && typeof item === "object")
      : [],
  };
}

function normalizeMetric(metric) {
  return {
    available: metric?.available === true,
    value:
      typeof metric?.value === "number" && Number.isFinite(metric.value)
        ? metric.value
        : null,
    unit: metric?.unit ?? null,
  };
}

export const getLocalDateKey = (date = new Date(), timezone = "") => {
  if (timezone) {
    try {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(date);
      const value = Object.fromEntries(
        parts.map((part) => [part.type, part.value]),
      );

      if (value.year && value.month && value.day) {
        return `${value.year}-${value.month}-${value.day}`;
      }
    } catch {
      // Fall back to the browser-local calendar day for invalid legacy zones.
    }
  }

  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

export const normalizeOverviewDateKey = (value) => {
  const dateKey = typeof value === "string" ? value : "";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;

  const date = new Date(`${dateKey}T12:00:00.000Z`);

  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === dateKey
    ? dateKey
    : null;
};

export const shiftOverviewDateKey = (dateKey, deltaDays) => {
  const normalizedDateKey = normalizeOverviewDateKey(dateKey);

  if (!normalizedDateKey || !Number.isInteger(deltaDays)) return null;

  const date = new Date(`${normalizedDateKey}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + deltaDays);

  if (Number.isNaN(date.getTime())) return null;

  return normalizeOverviewDateKey(date.toISOString().slice(0, 10));
};

export const formatOverviewDate = (dateKey, locale) => {
  const match = String(dateKey || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12)
    : new Date();

  return new Intl.DateTimeFormat(resolveIntlLocale(locale), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
};

export const formatOverviewDateShort = (dateKey, locale) => {
  const match = String(dateKey || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12)
    : new Date();

  return new Intl.DateTimeFormat(resolveIntlLocale(locale), {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).format(date);
};

export const formatOverviewTime = (value, locale, timezone) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const intlLocale = resolveIntlLocale(locale);
  const options = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    ...(timezone ? { timeZone: timezone } : {}),
  };

  try {
    return new Intl.DateTimeFormat(intlLocale, options).format(date);
  } catch {
    // Invalid legacy time zones should not make the dashboard fail to render.
    const localOptions = { ...options };
    delete localOptions.timeZone;
    return new Intl.DateTimeFormat(intlLocale, localOptions).format(date);
  }
};

export const formatSignalDate = (value, locale, timezone, options) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const intlLocale = resolveIntlLocale(locale);
  const formatOptions = {
    ...options,
    ...(timezone ? { timeZone: timezone } : {}),
  };
  let formatted;

  try {
    formatted = new Intl.DateTimeFormat(intlLocale, formatOptions).format(date);
  } catch {
    // Match getLocalDateKey's browser-local fallback for invalid legacy zones.
    const localOptions = { ...formatOptions };
    delete localOptions.timeZone;
    formatted = new Intl.DateTimeFormat(intlLocale, localOptions).format(date);
  }

  return formatted.replace(",", "");
};

export const formatPulseMoney = (metric, locale, fallback = "—") => {
  if (!metric?.available || metric.valueMinor === null) return fallback;

  return formatMinorCurrencyAmount(
    metric.valueMinor,
    metric.currency,
    locale,
    fallback,
  );
};

export const buildPulsePath = (points = [], width = 460, height = 68) => {
  const values = points
    .map((point) => point?.value)
    .filter((value) => typeof value === "number" && Number.isFinite(value));

  if (values.length < 2) return "";

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const step = width / Math.max(points.length - 1, 1);

  return points
    .map((point, index) => {
      const value =
        typeof point?.value === "number" && Number.isFinite(point.value)
          ? point.value
          : min;
      const x = index * step;
      const y = height - ((value - min) / range) * (height - 12) - 6;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
};

export const getScheduleTone = (productType = "", index = 0) => {
  const normalized = String(productType).toLowerCase();
  if (normalized.includes("course")) return "sand";
  if (normalized.includes("workshop")) return "coral";
  if (normalized.includes("private")) return "sage";

  return ["cobalt", "sand", "sage", "coral"][index % 4];
};
