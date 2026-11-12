"use client";

import {
  ArrowRightIcon,
  BellAlertIcon,
  CalendarDaysIcon,
  CheckIcon,
  CreditCardIcon,
  ExclamationCircleIcon,
  FireIcon,
  GiftIcon,
  IdentificationIcon,
  QueueListIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useSelector } from "react-redux";

import { isCustomerPortalHrefEnabled } from "@/components/customer-shell/customerPortalVisibility";
import { useOptionalPublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import { selectCurrentTenant } from "@/lib/features/auth/authSlice";
import { Link } from "@/i18n/navigation";

import {
  formatCustomerNotificationRelativeTime,
  getCustomerNotificationActionHref,
  getCustomerNotificationId,
  getCustomerNotificationMessage,
  getCustomerNotificationTitle,
  isCustomerNotificationRead,
  normalizeCustomerNotificationCategory,
} from "./customerNotification.utils";

const CATEGORY_ICONS = Object.freeze({
  bookings: CalendarDaysIcon,
  payments: CreditCardIcon,
  waitlist: QueueListIcon,
  memberships: IdentificationIcon,
  credits_vouchers: GiftIcon,
  account: ExclamationCircleIcon,
});

const SEVERITY_STYLES = Object.freeze({
  critical: "bg-[#FFF0EC] text-[#A84834] ring-[#F2C9BF]",
  warning: "bg-[#FFF6DF] text-[#956411] ring-[#F0D8A6]",
  success: "bg-[#EAF5EF] text-[#2F7D64] ring-[#CFE8DA]",
  info: "bg-[color-mix(in_srgb,var(--tenant-accent-on-surface)_9%,transparent)] text-[var(--tenant-accent-on-surface)] ring-[color-mix(in_srgb,var(--tenant-accent-on-surface)_20%,transparent)]",
});

const cx = (...classes) => classes.filter(Boolean).join(" ");

export default function CustomerNotificationItem({
  notification,
  compact = false,
  currentLocationReference = "",
  markingRead = false,
  onMarkRead,
  onNavigate,
}) {
  const locale = useLocale();
  const t = useTranslations("CustomerNotifications");
  const currentTenant = useSelector(selectCurrentTenant);
  const portalTenant = useOptionalPublicTenant()?.tenant || currentTenant;
  const id = getCustomerNotificationId(notification);
  const read = isCustomerNotificationRead(notification);
  const category = normalizeCustomerNotificationCategory(
    notification?.category,
  );
  const severity = String(notification?.severity || "info").toLowerCase();
  const CategoryIcon = CATEGORY_ICONS[category] ?? BellAlertIcon;
  const title = getCustomerNotificationTitle(
    notification,
    locale,
    t("item.untitled"),
  );
  const message = getCustomerNotificationMessage(notification, locale);
  const actionHref = getCustomerNotificationActionHref(
    notification,
    currentLocationReference,
  );
  const href = isCustomerPortalHrefEnabled(portalTenant, actionHref)
    ? actionHref
    : null;
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
  const relativeTime = formatCustomerNotificationRelativeTime(
    occurrenceTimestamp,
    locale,
  );

  const content = (
    <>
      <span
        className={cx(
          "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] ring-1 ring-inset",
          SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.info,
        )}
      >
        <CategoryIcon
          className="h-[18px] w-[18px]"
          data-tenant-hover="preserve"
          aria-hidden="true"
        />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-start gap-2">
          <strong
            data-tenant-interactive-label
            className={cx(
              "min-w-0 flex-1 text-[12px] leading-5 tracking-[-0.01em] text-[var(--tenant-text-on-surface)]",
              read ? "font-medium" : "font-semibold",
            )}
          >
            {title}
          </strong>
          {!read ? (
            <span
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--tenant-accent-on-surface)]"
              aria-hidden="true"
            />
          ) : null}
        </span>

        {message ? (
          <span
            className={cx(
              "mt-0.5 block text-[11px] leading-[1.55] text-[var(--tenant-muted-on-surface)]",
              compact ? "line-clamp-2" : "line-clamp-3",
            )}
          >
            {message}
          </span>
        ) : null}

        <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] font-medium text-[var(--tenant-muted-on-surface)]">
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
          className="mt-1 h-4 w-4 shrink-0 text-[var(--tenant-muted-on-surface)] transition-transform group-hover/notification:translate-x-0.5 group-hover/notification:text-[var(--tenant-accent-on-surface)] motion-reduce:transform-none"
          aria-hidden="true"
        />
      ) : null}
    </>
  );

  return (
    <article
      data-customer-notification={id || undefined}
      data-notification-read={read ? "true" : "false"}
      className={cx(
        "relative rounded-[16px] border transition-colors",
        read
          ? "border-transparent bg-transparent hover:border-[color-mix(in_srgb,var(--tenant-text-on-surface)_10%,transparent)] hover:bg-[var(--tenant-surface)] focus-within:bg-[var(--tenant-surface)]"
          : "border-[color-mix(in_srgb,var(--tenant-accent-on-surface)_18%,transparent)] bg-[color-mix(in_srgb,var(--tenant-accent-on-surface)_5%,var(--tenant-surface))] hover:border-[color-mix(in_srgb,var(--tenant-accent-on-surface)_30%,transparent)] hover:bg-[var(--tenant-surface)] focus-within:bg-[var(--tenant-surface)]",
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
          className="group/notification flex min-w-0 items-start gap-3 rounded-[16px] px-3 py-3.5 pr-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--tenant-accent-on-surface)]/35"
        >
          {content}
        </Link>
      ) : (
        <div className="flex min-w-0 items-start gap-3 px-3 py-3.5 pr-11">
          {content}
        </div>
      )}

      {!read && id ? (
        <button
          type="button"
          onClick={() => onMarkRead?.(id)}
          disabled={markingRead}
          aria-label={t("item.markRead", { title })}
          className="absolute bottom-2 right-1.5 flex h-11 w-11 items-center justify-center rounded-[13px] text-[var(--tenant-muted-on-surface)] transition hover:bg-[var(--tenant-surface)] hover:text-[var(--tenant-accent-on-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-on-surface)]/35 disabled:cursor-wait disabled:opacity-50"
        >
          <CheckIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </article>
  );
}
