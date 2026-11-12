import {
  getPortalLocationReference,
  getPortalLocationReferenceFromPath,
  normalizePortalLocationReference,
  retainCustomerPortalLocation,
} from "@/utils/customerPortalLocation";

export const CUSTOMER_NOTIFICATION_CATEGORIES = Object.freeze([
  "bookings",
  "payments",
  "waitlist",
  "memberships",
  "credits_vouchers",
  "account",
]);

export const CUSTOMER_NOTIFICATION_STATUSES = Object.freeze([
  "all",
  "unread",
  "read",
]);

const CUSTOMER_PORTAL_ORIGIN = "https://portal.shario.io";
const LOCALE_ALIASES = Object.freeze({
  cs: ["cs", "cz", "CS", "CZ"],
  en: ["en", "EN"],
});

const firstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null);

export const getCustomerNotificationId = (notification) =>
  String(notification?.id ?? notification?._id ?? "").trim();

export const isCustomerNotificationRead = (notification) =>
  notification?.isRead === true || Boolean(notification?.readAt);

export const normalizeCustomerNotificationCategory = (value) => {
  const category = String(value ?? "")
    .trim()
    .toLowerCase();

  return CUSTOMER_NOTIFICATION_CATEGORIES.includes(category)
    ? category
    : "account";
};

export const getLocalizedCustomerNotificationText = (
  value,
  locale,
  fallback = "",
) => {
  if (typeof value === "string") return value.trim() || fallback;

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }

  const normalizedLocale = String(locale || "en")
    .trim()
    .toLowerCase()
    .split("-")[0];
  const aliases = LOCALE_ALIASES[normalizedLocale] || [normalizedLocale];
  const preferred = aliases
    .map((key) => value[key])
    .find((candidate) => typeof candidate === "string" && candidate.trim());
  const secondary = [...LOCALE_ALIASES.en, ...LOCALE_ALIASES.cs]
    .map((key) => value[key])
    .find((candidate) => typeof candidate === "string" && candidate.trim());

  return String(preferred || secondary || fallback).trim();
};

export const getCustomerNotificationTitle = (
  notification,
  locale,
  fallback = "",
) =>
  getLocalizedCustomerNotificationText(
    firstDefined(notification?.title, {
      en: notification?.titleEn,
      cs: notification?.titleCs ?? notification?.titleCz,
    }),
    locale,
    fallback,
  );

export const getCustomerNotificationMessage = (
  notification,
  locale,
  fallback = "",
) =>
  getLocalizedCustomerNotificationText(
    firstDefined(notification?.message, {
      en: notification?.messageEn,
      cs: notification?.messageCs ?? notification?.messageCz,
    }),
    locale,
    fallback,
  );

export const getSafeCustomerNotificationHref = (value) => {
  if (typeof value !== "string") return null;

  const href = value.trim();

  if (
    !/^\/portal(?:[/?#]|$)/.test(href) ||
    href.startsWith("//") ||
    href.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(href)
  ) {
    return null;
  }

  try {
    const parsed = new URL(href, CUSTOMER_PORTAL_ORIGIN);

    if (
      parsed.origin !== CUSTOMER_PORTAL_ORIGIN ||
      parsed.username ||
      parsed.password ||
      !(parsed.pathname === "/portal" || parsed.pathname.startsWith("/portal/"))
    ) {
      return null;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
};

export const getCustomerNotificationLocationReference = (notification) =>
  getPortalLocationReference(notification?.location) ||
  normalizePortalLocationReference(notification?.locationId);

/**
 * Notification actions never leave the authenticated customer portal.
 *
 * Location priority is intentionally strict:
 *   1. an explicit location/locationId already present in actionUrl;
 *   2. the location carried by the notification;
 *   3. the location currently selected in the portal header.
 *
 * This prevents a notification originating in another studio from being
 * silently rewritten to the studio the customer happens to be viewing.
 */
export const getCustomerNotificationActionHref = (
  notification,
  currentLocationReference = "",
) => {
  const safeHref = getSafeCustomerNotificationHref(
    notification?.actionUrl ?? notification?.action?.href ?? notification?.href,
  );

  if (!safeHref) return null;

  const actionLocationReference = getPortalLocationReferenceFromPath(safeHref);
  const notificationLocationReference =
    getCustomerNotificationLocationReference(notification);
  const fallbackLocationReference = normalizePortalLocationReference(
    currentLocationReference,
  );
  const locationReference =
    actionLocationReference ||
    notificationLocationReference ||
    fallbackLocationReference;

  return locationReference
    ? retainCustomerPortalLocation(safeHref, locationReference)
    : safeHref;
};

export const getCustomerNotifications = (response) => {
  const notifications =
    response?.notifications ??
    response?.items ??
    response?.data?.notifications ??
    response?.data?.items ??
    [];

  return Array.isArray(notifications) ? notifications : [];
};

export const getCustomerUnreadCount = (response) => {
  const count = Number(
    response?.unreadCount ??
      response?.summary?.unreadCount ??
      response?.data?.unreadCount ??
      response?.data?.summary?.unreadCount ??
      0,
  );

  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
};

export const getCustomerNotificationPagination = (response) => {
  const source = response?.pagination ?? response?.data?.pagination ?? response;
  const page = Math.max(1, Number(source?.page) || 1);
  const limit = Math.max(1, Number(source?.limit) || 20);
  const total = Math.max(0, Number(source?.total ?? source?.totalCount) || 0);
  const pages = Math.max(
    1,
    Number(source?.pages ?? source?.totalPages) ||
      Math.ceil(total / limit) ||
      1,
  );

  return { page, limit, total, pages };
};

export const buildCustomerNotificationListParams = ({
  page = 1,
  limit = 20,
  status = "all",
  category = "all",
} = {}) => ({
  page: Math.max(1, Number(page) || 1),
  limit: Math.max(1, Number(limit) || 20),
  ...(status === "read" || status === "unread" ? { status } : {}),
  ...(CUSTOMER_NOTIFICATION_CATEGORIES.includes(category) ? { category } : {}),
});

export const formatCustomerNotificationRelativeTime = (
  value,
  locale,
  { now = Date.now(), fallback = "" } = {},
) => {
  const timestamp = new Date(value).getTime();

  if (!Number.isFinite(timestamp)) return fallback;

  const seconds = Math.round((timestamp - now) / 1000);
  const absoluteSeconds = Math.abs(seconds);
  let unit = "second";
  let divisor = 1;

  if (absoluteSeconds >= 86400) {
    unit = "day";
    divisor = 86400;
  } else if (absoluteSeconds >= 3600) {
    unit = "hour";
    divisor = 3600;
  } else if (absoluteSeconds >= 60) {
    unit = "minute";
    divisor = 60;
  }

  try {
    return new Intl.RelativeTimeFormat(locale || "en", {
      numeric: "auto",
      style: "short",
    }).format(Math.round(seconds / divisor), unit);
  } catch {
    return fallback;
  }
};
