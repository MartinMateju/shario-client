"use client";

import {
  ArchiveBoxIcon,
  ArrowRightIcon,
  ArrowUpTrayIcon,
  BellAlertIcon,
  CalendarDaysIcon,
  CheckIcon,
  ClipboardDocumentCheckIcon,
  CreditCardIcon,
  EnvelopeIcon,
  ExclamationCircleIcon,
  FireIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

import {
  formatNotificationRelativeTime,
  getNotificationActionHref,
  getNotificationMessage,
  getNotificationTitle,
  getWorkspaceNotificationId,
  isWorkspaceNotificationRead,
  normalizeWorkspaceNotificationCategory,
} from "./workspaceNotification.utils";

const CATEGORY_ICONS = Object.freeze({
  bookings: CalendarDaysIcon,
  payments: CreditCardIcon,
  waitlist: UserPlusIcon,
  tasks: ClipboardDocumentCheckIcon,
  inventory: ArchiveBoxIcon,
  migration: ArrowUpTrayIcon,
  communications: EnvelopeIcon,
  account: ExclamationCircleIcon,
});

const SEVERITY_STYLES = Object.freeze({
  critical: "bg-coral-100 text-terracotta-700 ring-coral-200",
  warning: "bg-[#FFF6DF] text-[#956411] ring-[#F0D8A6]",
  success: "bg-[#EAF5EF] text-[#2F7D64] ring-[#CFE8DA]",
  info: "bg-cobalt-50 text-cobalt-700 ring-cobalt-100",
});

const cx = (...classes) => classes.filter(Boolean).join(" ");

export default function WorkspaceNotificationItem({
  notification,
  compact = false,
  markingRead = false,
  onMarkRead,
  onNavigate,
}) {
  const locale = useLocale();
  const t = useTranslations("WorkspaceNotifications");
  const id = getWorkspaceNotificationId(notification);
  const read = isWorkspaceNotificationRead(notification);
  const category = normalizeWorkspaceNotificationCategory(
    notification?.category,
  );
  const severity = String(notification?.severity || "info").toLowerCase();
  const CategoryIcon = CATEGORY_ICONS[category] ?? BellAlertIcon;
  const title = getNotificationTitle(notification, locale, t("item.untitled"));
  const message = getNotificationMessage(notification, locale);
  const href = getNotificationActionHref(notification);
  const locationName =
    notification?.location?.name ?? notification?.locationName ?? "";
  const occurrenceCount = Math.max(
    1,
    Number(notification?.occurrenceCount ?? notification?.count) || 1,
  );
  const occurrenceTimestamp =
    notification?.occurredAt ?? notification?.createdAt;
  const occurrenceDate = new Date(occurrenceTimestamp);
  const machineTime = Number.isFinite(occurrenceDate.getTime())
    ? occurrenceDate.toISOString()
    : undefined;
  const relativeTime = formatNotificationRelativeTime(
    occurrenceTimestamp,
    locale,
  );
  const content = (
    <>
      <span
        className={cx(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] ring-1 ring-inset",
          SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.info,
        )}
      >
        <CategoryIcon className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-start gap-2">
          <strong
            className={cx(
              "min-w-0 flex-1 text-[12px] leading-5 tracking-[-0.01em] text-ink",
              read ? "font-medium" : "font-semibold",
            )}
          >
            {title}
          </strong>
          {!read ? (
            <span
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cobalt-500"
              aria-hidden="true"
            />
          ) : null}
        </span>

        {message ? (
          <span
            className={cx(
              "mt-0.5 block text-[11px] leading-[1.55] text-ink-muted",
              compact ? "line-clamp-2" : "line-clamp-3",
            )}
          >
            {message}
          </span>
        ) : null}

        <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] font-medium text-[#5F5F5B]">
          {relativeTime ? (
            <time dateTime={machineTime}>{relativeTime}</time>
          ) : null}
          {locationName ? (
            <>
              {relativeTime ? <span aria-hidden="true">·</span> : null}
              <span className="max-w-[180px] truncate">{locationName}</span>
            </>
          ) : null}
          {occurrenceCount > 1 ? (
            <>
              {relativeTime || locationName ? (
                <span aria-hidden="true">·</span>
              ) : null}
              <span>{t("item.groupedCount", { count: occurrenceCount })}</span>
            </>
          ) : null}
        </span>
      </span>

      {href ? (
        <ArrowRightIcon
          className="mt-1 h-4 w-4 shrink-0 text-ink-subtle transition-transform group-hover/notification:translate-x-0.5 group-hover/notification:text-cobalt-600 motion-reduce:transform-none"
          aria-hidden="true"
        />
      ) : null}
    </>
  );

  return (
    <article
      data-workspace-notification={id || undefined}
      data-notification-read={read ? "true" : "false"}
      className={cx(
        "relative rounded-[15px] border transition-colors",
        read
          ? "border-transparent bg-transparent hover:border-line hover:bg-surface-muted/70"
          : "border-cobalt-100 bg-cobalt-50/45 hover:border-cobalt-200 hover:bg-cobalt-50/70",
      )}
    >
      {href ? (
        <Link
          href={href}
          onClick={() => {
            if (!read && id) onMarkRead?.(id);
            onNavigate?.();
          }}
          aria-label={t("item.open", { title })}
          className="group/notification flex min-w-0 items-start gap-3 rounded-[15px] px-3 py-3 pr-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cobalt-500/35"
        >
          {content}
        </Link>
      ) : (
        <div className="flex min-w-0 items-start gap-3 px-3 py-3 pr-10">
          {content}
        </div>
      )}

      {!read && id ? (
        <button
          type="button"
          onClick={() => onMarkRead?.(id)}
          disabled={markingRead}
          aria-label={t("item.markRead", { title })}
          className="absolute bottom-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-[10px] text-ink-subtle transition hover:bg-white hover:text-cobalt-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/35 disabled:cursor-wait disabled:opacity-50"
        >
          <CheckIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </article>
  );
}
