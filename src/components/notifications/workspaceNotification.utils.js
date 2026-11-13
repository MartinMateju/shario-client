import {
  getNotificationLocaleText,
  getNotificationEventText,
} from "./notificationCopy";

export const WORKSPACE_NOTIFICATION_CATEGORIES = Object.freeze([
  "bookings",
  "payments",
  "waitlist",
  "tasks",
  "inventory",
  "migration",
  "communications",
  "account",
]);

export const WORKSPACE_NOTIFICATION_STATUSES = Object.freeze([
  "all",
  "unread",
  "read",
]);

const NOTIFICATION_ORIGIN = "https://workspace.shario.io";
const firstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null);

export const getWorkspaceNotificationId = (notification) =>
  String(notification?.id ?? notification?._id ?? "").trim();

export const isWorkspaceNotificationRead = (notification) =>
  notification?.isRead === true || Boolean(notification?.readAt);

export const normalizeWorkspaceNotificationCategory = (value) => {
  const category = String(value ?? "")
    .trim()
    .toLowerCase();

  return WORKSPACE_NOTIFICATION_CATEGORIES.includes(category)
    ? category
    : "account";
};

export const getLocalizedNotificationText = getNotificationLocaleText;

export const getNotificationTitle = (notification, locale, fallback = "", t) =>
  getLocalizedNotificationText(
    firstDefined(notification?.title, {
      en: notification?.titleEn,
      cs: notification?.titleCs ?? notification?.titleCz,
    }),
    locale,
    getNotificationEventText(notification, "title", t, fallback),
  );

export const getNotificationMessage = (
  notification,
  locale,
  fallback = "",
  t,
) =>
  getLocalizedNotificationText(
    firstDefined(notification?.message, {
      en: notification?.messageEn,
      cs: notification?.messageCs ?? notification?.messageCz,
    }),
    locale,
    getNotificationEventText(notification, "message", t, fallback),
  );

export const getSafeWorkspaceNotificationHref = (value) => {
  if (typeof value !== "string") return null;

  const href = value.trim();

  if (
    !/^\/app(?:[/?#]|$)/.test(href) ||
    href.startsWith("//") ||
    href.includes("\\") ||
    /[\u0000-\u001F\u007F]/.test(href)
  ) {
    return null;
  }

  try {
    const parsed = new URL(href, NOTIFICATION_ORIGIN);

    if (parsed.origin !== NOTIFICATION_ORIGIN) return null;

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
};

export const getNotificationActionHref = (notification) =>
  getSafeWorkspaceNotificationHref(
    notification?.action?.href ?? notification?.actionUrl ?? notification?.href,
  );

export const getWorkspaceNotifications = (response) => {
  const notifications =
    response?.notifications ??
    response?.items ??
    response?.data?.notifications ??
    response?.data?.items ??
    [];

  return Array.isArray(notifications) ? notifications : [];
};

export const getWorkspaceUnreadCount = (response) => {
  const count = Number(
    response?.unreadCount ??
      response?.summary?.unreadCount ??
      response?.data?.unreadCount ??
      response?.data?.summary?.unreadCount ??
      0,
  );

  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
};

export const getWorkspaceNotificationPagination = (response) => {
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

export const buildWorkspaceNotificationListParams = ({
  page = 1,
  limit = 20,
  status = "all",
  category = "all",
  locationId = "all",
} = {}) => ({
  page: Math.max(1, Number(page) || 1),
  limit: Math.max(1, Number(limit) || 20),
  ...(status === "read" || status === "unread" ? { status } : {}),
  ...(WORKSPACE_NOTIFICATION_CATEGORIES.includes(category) ? { category } : {}),
  ...(locationId && locationId !== "all" ? { locationId } : {}),
});

export const buildMarkAllNotificationsBody = ({
  category = "all",
  locationId = "all",
} = {}) => ({
  ...(WORKSPACE_NOTIFICATION_CATEGORIES.includes(category) ? { category } : {}),
  ...(locationId && locationId !== "all" ? { locationId } : {}),
});

export const formatNotificationRelativeTime = (
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
