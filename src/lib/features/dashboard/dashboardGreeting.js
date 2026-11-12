import { vocative } from "czech-vocative";

const UTC_TIME_ZONE = "UTC";

const TIME_OF_DAY_ICONS = Object.freeze({
  morning: "sun",
  afternoon: "sun",
  evening: "moon",
  lateNight: "moon",
});

const changeCase = (value, locale, method) =>
  locale ? value[method](locale) : value[method]();

export const formatGreetingName = (value, locale = "") => {
  const name = typeof value === "string" ? value.trim() : "";

  if (!name) return "";

  const normalizedLocale = String(locale).trim().toLowerCase();
  const lowerName = changeCase(name, normalizedLocale, "toLocaleLowerCase");
  const upperName = changeCase(name, normalizedLocale, "toLocaleUpperCase");
  const normalizeFullCasing = name === lowerName || name === upperName;
  const firstLetter = changeCase(
    name.slice(0, 1),
    normalizedLocale,
    "toLocaleUpperCase",
  );
  const remainder = normalizeFullCasing ? lowerName.slice(1) : name.slice(1);
  const displayName = `${firstLetter}${remainder}`;

  if (!normalizedLocale.startsWith("cs")) return displayName;

  try {
    return vocative(displayName) || displayName;
  } catch {
    return displayName;
  }
};

const normalizeTimeZone = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

export const isValidTimeZone = (value) => {
  const timeZone = normalizeTimeZone(value);

  if (!timeZone) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("en", { timeZone }).format();
    return true;
  } catch {
    return false;
  }
};

export const resolveDashboardTimeZone = ({
  workspaceTimeZone,
  browserTimeZone,
  tenantTimeZone,
} = {}) => {
  return (
    [workspaceTimeZone, browserTimeZone, tenantTimeZone]
      .map(normalizeTimeZone)
      .find(isValidTimeZone) || UTC_TIME_ZONE
  );
};

export const getBrowserTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
};

export const getHourInTimeZone = (date, timeZone) => {
  const instant = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(instant.getTime())) {
    return null;
  }

  const resolvedTimeZone = resolveDashboardTimeZone({
    workspaceTimeZone: timeZone,
  });
  const hourPart = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hourCycle: "h23",
    timeZone: resolvedTimeZone,
  })
    .formatToParts(instant)
    .find((part) => part.type === "hour")?.value;
  const hour = Number(hourPart);

  return Number.isInteger(hour) ? hour : null;
};

export const getGreetingPeriod = (date, timeZone) => {
  const hour = getHourInTimeZone(date, timeZone);

  if (hour !== null && hour >= 5 && hour < 12) {
    return "morning";
  }

  if (hour !== null && hour >= 12 && hour < 18) {
    return "afternoon";
  }

  if (hour !== null && hour >= 18 && hour < 22) {
    return "evening";
  }

  return "lateNight";
};

export const getGreetingTranslationKey = (period) => {
  if (period === "morning") return "greetingMorning";
  if (period === "afternoon") return "greetingAfternoon";
  if (period === "evening") return "greetingEvening";

  return "greeting";
};

export const getTimeOfDayIcon = (period) => TIME_OF_DAY_ICONS[period] || null;
