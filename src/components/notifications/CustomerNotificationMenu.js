"use client";

import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import {
  ArrowPathIcon,
  ArrowRightIcon,
  BellIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useSelector } from "react-redux";
import { selectCurrentTenant } from "@/lib/features/auth/authSlice";
import { isCustomerPortalPageEnabled } from "@/components/customer-shell/customerPortalVisibility";

import { useOptionalCustomerPortalLocation } from "@/components/customer-shell/CustomerPortalLocationProvider";
import { customerPortalProfileThemeStyle } from "@/components/customer-shell/CustomerPortalPrimitives";
import { useOptionalPublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import { getPublicTenantTheme } from "@/components/public-tenant/publicTenant.config";
import { Link } from "@/i18n/navigation";
import {
  useGetCustomerNotificationsQuery,
  useGetCustomerNotificationSummaryQuery,
  useMarkAllCustomerNotificationsReadMutation,
  useMarkCustomerNotificationReadMutation,
} from "@/lib/features/notification/notificationsApiSlice";
import {
  getPortalLocationReferenceFromPath,
  retainCustomerPortalLocation,
} from "@/utils/customerPortalLocation";

import CustomerNotificationItem from "./CustomerNotificationItem";
import {
  getCustomerNotifications,
  getCustomerUnreadCount,
} from "./customerNotification.utils";

const SUMMARY_LIMIT = 8;
const POLLING_INTERVAL = 45_000;

const cx = (...classes) => classes.filter(Boolean).join(" ");

function LoadingRows() {
  return (
    <div className="space-y-2 px-2 pb-2" aria-hidden="true">
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          className="flex animate-pulse items-start gap-3 rounded-[16px] border border-[color-mix(in_srgb,var(--tenant-text-on-surface)_9%,transparent)] px-3 py-3"
        >
          <span className="h-10 w-10 shrink-0 rounded-[13px] bg-[var(--tenant-background)]" />
          <span className="min-w-0 flex-1 space-y-2 py-1">
            <span className="block h-3 w-2/3 rounded bg-[var(--tenant-background)]" />
            <span className="block h-2.5 w-full rounded bg-[var(--tenant-background)]" />
          </span>
        </div>
      ))}
    </div>
  );
}

function CustomerNotificationPanel({
  currentLocationReference,
  open,
  close,
  panelStyle,
  stylePresetId,
  triggerRef,
  unreadCount,
  summaryAvailable,
  summaryUnavailable,
  viewAllHref,
}) {
  const t = useTranslations("CustomerNotifications");
  const [actionError, setActionError] = useState("");
  const [markingId, setMarkingId] = useState("");

  useEffect(() => {
    if (!open) return undefined;

    const handleEscape = (event) => {
      if (event.key !== "Escape") return;
      close(triggerRef.current);
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [close, open, triggerRef]);

  const listQuery = useGetCustomerNotificationsQuery(
    { page: 1, limit: SUMMARY_LIMIT },
    {
      skip: !open,
      pollingInterval: POLLING_INTERVAL,
      refetchOnFocus: true,
      refetchOnReconnect: true,
      refetchOnMountOrArgChange: true,
      skipPollingIfUnfocused: true,
    },
  );
  const [markRead] = useMarkCustomerNotificationReadMutation();
  const [markAllRead, markAllState] =
    useMarkAllCustomerNotificationsReadMutation();
  const response = listQuery.currentData ?? listQuery.data;
  const notifications = getCustomerNotifications(response).slice(
    0,
    SUMMARY_LIMIT,
  );

  const handleMarkRead = async (notificationId) => {
    if (!notificationId || markingId) return;

    setActionError("");
    setMarkingId(notificationId);

    try {
      await markRead(notificationId).unwrap();
    } catch {
      setActionError(t("errors.markRead"));
    } finally {
      setMarkingId("");
    }
  };

  const handleMarkAllRead = async () => {
    setActionError("");

    try {
      await markAllRead({}).unwrap();
    } catch {
      setActionError(t("errors.markAllRead"));
    }
  };

  return (
    <PopoverPanel
      transition
      portal
      anchor="bottom end"
      role="dialog"
      data-dialog-layout="popover"
      aria-label={t("panel.label")}
      data-customer-notification-panel
      data-tenant-style={stylePresetId || undefined}
      data-tenant-surface="panel"
      className="z-[105] flex max-h-[min(680px,calc(100dvh-88px))] w-[min(390px,calc(100vw-20px))] origin-top-right flex-col overflow-hidden border border-[color-mix(in_srgb,var(--tenant-text-on-surface)_10%,transparent)] bg-[var(--tenant-surface)] text-[var(--tenant-text-on-surface)] [--anchor-gap:8px] [--anchor-padding:10px] transition duration-150 ease-out focus:outline-none data-closed:-translate-y-1 data-closed:scale-[0.98] data-closed:opacity-0 motion-reduce:transform-none motion-reduce:transition-none"
      style={panelStyle}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[color-mix(in_srgb,var(--tenant-text-on-surface)_10%,transparent)] px-4 py-3.5">
        <div className="min-w-0">
          <h2 className="text-[14px] font-semibold tracking-[-0.025em] text-[var(--tenant-text-on-surface)]">
            {t("panel.title")}
          </h2>
          <p
            className="mt-0.5 text-[10px] text-[var(--tenant-muted-on-surface)]"
            aria-live="polite"
          >
            {!summaryAvailable
              ? summaryUnavailable
                ? t("panel.summaryUnavailable")
                : t("panel.summaryLoading")
              : unreadCount
                ? t("panel.unread", { count: unreadCount })
                : t("panel.caughtUp")}
          </p>
        </div>

        {summaryAvailable && unreadCount ? (
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={markAllState.isLoading}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-[10px] font-semibold text-[var(--tenant-accent-on-surface)] transition hover:bg-[var(--tenant-background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-on-surface)]/35 disabled:cursor-wait disabled:opacity-50"
          >
            {markAllState.isLoading ? (
              <ArrowPathIcon
                className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : (
              <CheckCircleIcon className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {t("actions.markAllRead")}
          </button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
        {listQuery.isError && response ? (
          <p
            role="status"
            className="mb-2 rounded-[12px] border border-[color-mix(in_srgb,var(--tenant-text-on-surface)_12%,transparent)] bg-[var(--tenant-background)] px-3 py-2 text-[10px] text-[var(--tenant-muted-on-surface)]"
          >
            {t("errors.refresh")}
          </p>
        ) : null}

        {actionError ? (
          <p
            role="alert"
            className="mb-2 rounded-[12px] border border-[#F2C9BF] bg-[#FFF0EC] px-3 py-2 text-[10px] text-[#A84834]"
          >
            {actionError}
          </p>
        ) : null}

        {(listQuery.isLoading || listQuery.isUninitialized) && !response ? (
          <LoadingRows />
        ) : null}

        {listQuery.isError && !response ? (
          <div className="px-3 py-8 text-center">
            <p
              role="alert"
              className="text-[11px] text-[var(--tenant-muted-on-surface)]"
            >
              {t("errors.load")}
            </p>
            <button
              type="button"
              onClick={() => listQuery.refetch()}
              className="mt-3 inline-flex min-h-11 items-center rounded-full border border-[color-mix(in_srgb,var(--tenant-text-on-surface)_12%,transparent)] px-4 text-[10px] font-semibold text-[var(--tenant-text-on-surface)] hover:border-[color-mix(in_srgb,var(--tenant-accent-on-surface)_35%,transparent)] hover:text-[var(--tenant-accent-on-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-on-surface)]/35"
            >
              {t("actions.retry")}
            </button>
          </div>
        ) : null}

        {!listQuery.isLoading &&
        !listQuery.isUninitialized &&
        !listQuery.isError &&
        notifications.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#EAF5EF] text-[#2F7D64]">
              <CheckCircleIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-3 text-[12px] font-semibold text-[var(--tenant-text-on-surface)]">
              {t("empty.title")}
            </p>
            <p className="mt-1 text-[10px] leading-4 text-[var(--tenant-muted-on-surface)]">
              {t("empty.description")}
            </p>
          </div>
        ) : null}

        {notifications.length ? (
          <div
            className="space-y-1"
            role="list"
            style={{
              "--tenant-interactive-hover":
                "var(--tenant-portal-profile-secondary-on-surface)",
            }}
          >
            {notifications.map((notification) => {
              const id = String(notification.id ?? notification._id ?? "");

              return (
                <div key={id} role="listitem">
                  <CustomerNotificationItem
                    notification={notification}
                    compact
                    currentLocationReference={currentLocationReference}
                    markingRead={markingId === id}
                    onMarkRead={handleMarkRead}
                    onNavigate={close}
                  />
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-[color-mix(in_srgb,var(--tenant-text-on-surface)_10%,transparent)] bg-[var(--tenant-background)] p-2">
        <Link
          href={viewAllHref}
          onClick={() => close()}
          className="group flex min-h-11 items-center justify-center gap-2 rounded-[13px] text-[11px] font-semibold text-[var(--tenant-accent-on-surface)] transition hover:bg-[var(--tenant-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--tenant-accent-on-surface)]/35"
        >
          {t("actions.viewAll")}
          <ArrowRightIcon
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none"
            aria-hidden="true"
          />
        </Link>
      </div>
    </PopoverPanel>
  );
}

export default function CustomerNotificationMenu({
  className = "",
  viewAllHref = "/portal/notifications",
}) {
  const t = useTranslations("CustomerNotifications");
  const triggerRef = useRef(null);
  const locationContext = useOptionalCustomerPortalLocation();
  const publicTenantContext = useOptionalPublicTenant();
  const currentTenant = useSelector(selectCurrentTenant);
  const notificationsEnabled = isCustomerPortalPageEnabled(
    publicTenantContext?.tenant || currentTenant,
    "notifications",
  );
  const currentLocationReference =
    locationContext?.activeLocationReference ||
    getPortalLocationReferenceFromPath(viewAllHref);
  const resolvedViewAllHref = currentLocationReference
    ? retainCustomerPortalLocation(
        "/portal/notifications",
        currentLocationReference,
      )
    : "/portal/notifications";
  const tenantTheme = getPublicTenantTheme(publicTenantContext?.tenant || {}, {
    surface: publicTenantContext?.surface,
  });
  const panelStyle = {
    ...tenantTheme.style,
    ...customerPortalProfileThemeStyle,
    borderRadius: "var(--tenant-radius-panel)",
    boxShadow: "var(--tenant-shadow-floating)",
  };
  const summaryQuery = useGetCustomerNotificationSummaryQuery(undefined, {
    skip: !notificationsEnabled,
    pollingInterval: POLLING_INTERVAL,
    refetchOnFocus: true,
    refetchOnReconnect: true,
    skipPollingIfUnfocused: true,
  });
  const summary = summaryQuery.currentData ?? summaryQuery.data;
  const summaryAvailable = Boolean(summary);
  const unreadCount = getCustomerUnreadCount(summary);
  const triggerLabel = unreadCount
    ? t("triggerUnread", { count: unreadCount })
    : t("trigger");

  if (!notificationsEnabled) return null;

  return (
    <Popover className={cx("relative shrink-0", className)}>
      {({ open, close }) => (
        <>
          <PopoverButton
            ref={triggerRef}
            aria-label={triggerLabel}
            data-customer-notification-trigger
            data-tenant-hover="preserve"
            className="group relative inline-flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-full border border-transparent text-[var(--tenant-text)] transition active:scale-[0.97] hover:border-[var(--tenant-secondary)] hover:bg-[var(--tenant-surface)] hover:text-[var(--tenant-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-secondary)]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--tenant-background)] motion-reduce:transform-none motion-reduce:transition-none"
          >
            <BellIcon
              className="h-[19px] w-[19px] stroke-[1.6]"
              aria-hidden="true"
            />
            {unreadCount ? (
              <span
                data-customer-notification-badge
                aria-hidden="true"
                className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--tenant-portal-button)] px-1 text-[8px] font-bold tabular-nums text-[var(--tenant-portal-button-foreground)] ring-2 ring-[var(--tenant-portal-header-background)]"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </PopoverButton>

          <CustomerNotificationPanel
            currentLocationReference={currentLocationReference}
            open={open}
            close={close}
            panelStyle={panelStyle}
            stylePresetId={tenantTheme.stylePresetId}
            triggerRef={triggerRef}
            unreadCount={unreadCount}
            summaryAvailable={summaryAvailable}
            summaryUnavailable={summaryQuery.isError && !summaryAvailable}
            viewAllHref={resolvedViewAllHref}
          />
        </>
      )}
    </Popover>
  );
}
