"use client";

import {
  ArrowPathIcon,
  BellAlertIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { useOptionalCustomerPortalLocation } from "@/components/customer-shell/CustomerPortalLocationProvider";
import {
  CustomerPortalEmptyState,
  CustomerPortalLoadingState,
  CustomerPortalPage,
  CustomerPortalPageHeader,
  CustomerPortalSurface,
  customerPortalSecondaryActionClass,
} from "@/components/customer-shell/CustomerPortalPrimitives";
import { useRouter } from "@/i18n/navigation";
import {
  useGetCustomerNotificationsQuery,
  useGetCustomerNotificationSummaryQuery,
  useMarkAllCustomerNotificationsReadMutation,
  useMarkCustomerNotificationReadMutation,
} from "@/lib/features/notification/notificationsApiSlice";
import { getPortalLocationReferenceFromSearchParams } from "@/utils/customerPortalLocation";

import CustomerNotificationItem from "./CustomerNotificationItem";
import {
  CUSTOMER_NOTIFICATION_CATEGORIES,
  CUSTOMER_NOTIFICATION_STATUSES,
  buildCustomerNotificationListParams,
  getCustomerNotificationPagination,
  getCustomerNotifications,
  getCustomerUnreadCount,
} from "./customerNotification.utils";

const PAGE_SIZE = 20;
const POLLING_INTERVAL = 45_000;

const selectClass =
  "h-11 min-w-0 rounded-[13px] border border-[color-mix(in_srgb,var(--tenant-text-on-surface)_13%,transparent)] bg-[var(--tenant-surface)] px-3 text-[11px] font-medium text-[var(--tenant-text-on-surface)] outline-none transition focus:border-[var(--tenant-accent-on-surface)] focus:ring-4 focus:ring-[var(--tenant-accent-on-surface)]/10";

const normalizeChoice = (value, allowed, fallback = "all") =>
  allowed.includes(value) ? value : fallback;

export default function CustomerNotificationsPage() {
  const t = useTranslations("CustomerNotifications");
  const router = useRouter();
  const searchParams = useSearchParams();
  const locationContext = useOptionalCustomerPortalLocation();
  const [actionError, setActionError] = useState("");
  const [markingId, setMarkingId] = useState("");
  const status = normalizeChoice(
    searchParams.get("status") || "all",
    CUSTOMER_NOTIFICATION_STATUSES,
  );
  const category = normalizeChoice(searchParams.get("category") || "all", [
    "all",
    ...CUSTOMER_NOTIFICATION_CATEGORIES,
  ]);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const currentLocationReference =
    locationContext?.activeLocationReference ||
    getPortalLocationReferenceFromSearchParams(searchParams);
  const listParams = buildCustomerNotificationListParams({
    page,
    limit: PAGE_SIZE,
    status,
    category,
  });
  const listQuery = useGetCustomerNotificationsQuery(listParams, {
    pollingInterval: POLLING_INTERVAL,
    refetchOnFocus: true,
    refetchOnReconnect: true,
    skipPollingIfUnfocused: true,
  });
  const summaryQuery = useGetCustomerNotificationSummaryQuery(undefined, {
    pollingInterval: POLLING_INTERVAL,
    refetchOnFocus: true,
    refetchOnReconnect: true,
    skipPollingIfUnfocused: true,
  });
  const [markRead] = useMarkCustomerNotificationReadMutation();
  const [markAllRead, markAllState] =
    useMarkAllCustomerNotificationsReadMutation();
  const response = listQuery.currentData;
  const summary = summaryQuery.currentData ?? summaryQuery.data;
  const summaryAvailable = Boolean(summary);
  const notifications = getCustomerNotifications(response);
  const unreadCount = getCustomerUnreadCount(summary);
  const pagination = getCustomerNotificationPagination(response);

  const updateQuery = (key, value, { resetPage = true } = {}) => {
    const next = new URLSearchParams(searchParams.toString());

    if (!value || value === "all" || (key === "page" && Number(value) <= 1)) {
      next.delete(key);
    } else {
      next.set(key, String(value));
    }

    if (resetPage && key !== "page") next.delete("page");

    const query = next.toString();
    router.replace(`/portal/notifications${query ? `?${query}` : ""}`, {
      scroll: false,
    });
  };

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
      await markAllRead(category === "all" ? {} : { category }).unwrap();
    } catch {
      setActionError(t("errors.markAllRead"));
    }
  };

  return (
    <CustomerPortalPage
      contentClassName="max-w-6xl animate-fade-up"
      data-customer-notifications-page
    >
      <CustomerPortalPageHeader
        eyebrow={t("page.eyebrow")}
        title={t("page.title")}
        description={t("page.description")}
        actions={
          summaryAvailable && unreadCount ? (
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={markAllState.isLoading}
              className={customerPortalSecondaryActionClass}
            >
              {markAllState.isLoading ? (
                <ArrowPathIcon
                  className="h-4 w-4 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <CheckCircleIcon className="h-4 w-4" aria-hidden="true" />
              )}
              {t("actions.markAllRead")}
            </button>
          ) : null
        }
      />

      <div className="mt-5 min-h-5" aria-live="polite">
        <p className="text-[11px] text-[var(--tenant-muted-text)]">
          {!summaryAvailable
            ? summaryQuery.isError
              ? t("page.summaryUnavailable")
              : t("page.summaryLoading")
            : unreadCount
              ? t("page.unreadSummary", { count: unreadCount })
              : t("page.caughtUp")}
        </p>
      </div>

      {actionError ? (
        <p
          role="alert"
          className="mt-4 rounded-[16px] border border-[#F2C9BF] bg-[#FFF0EC] px-4 py-3 text-[11px] text-[#A84834]"
        >
          {actionError}
        </p>
      ) : null}

      {listQuery.isError && response ? (
        <p
          role="status"
          className="mt-4 rounded-[16px] border border-[color-mix(in_srgb,var(--tenant-text)_12%,transparent)] bg-[var(--tenant-surface)] px-4 py-3 text-[11px] text-[var(--tenant-muted-on-surface)]"
        >
          {t("errors.refresh")}
        </p>
      ) : null}

      <CustomerPortalSurface className="mt-5 p-4 sm:p-5">
        <div
          className="grid gap-3 sm:grid-cols-2"
          role="group"
          aria-label={t("filters.label")}
        >
          <label className="grid gap-1.5 text-[10px] font-semibold text-[var(--tenant-muted-on-surface)]">
            {t("filters.status")}
            <select
              className={selectClass}
              value={status}
              onChange={(event) => updateQuery("status", event.target.value)}
            >
              {CUSTOMER_NOTIFICATION_STATUSES.map((option) => (
                <option key={option} value={option}>
                  {t(`statuses.${option}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5 text-[10px] font-semibold text-[var(--tenant-muted-on-surface)]">
            {t("filters.category")}
            <select
              className={selectClass}
              value={category}
              onChange={(event) => updateQuery("category", event.target.value)}
            >
              <option value="all">{t("categories.all")}</option>
              {CUSTOMER_NOTIFICATION_CATEGORIES.map((option) => (
                <option key={option} value={option}>
                  {t(`categories.${option}`)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </CustomerPortalSurface>

      <CustomerPortalSurface
        className="mt-4 p-2 sm:p-3"
        aria-busy={listQuery.isFetching}
      >
        {(listQuery.isLoading || (listQuery.isFetching && !response)) &&
        !response ? (
          <CustomerPortalLoadingState label={t("page.loading")} />
        ) : null}

        {listQuery.isError && !response ? (
          <CustomerPortalEmptyState
            icon={BellAlertIcon}
            title={t("errors.loadTitle")}
            description={t("errors.load")}
            action={
              <button
                type="button"
                onClick={() => listQuery.refetch()}
                className={customerPortalSecondaryActionClass}
              >
                {t("actions.retry")}
              </button>
            }
          />
        ) : null}

        {!listQuery.isLoading &&
        !listQuery.isError &&
        response &&
        notifications.length === 0 ? (
          <CustomerPortalEmptyState
            icon={status === "unread" ? CheckCircleIcon : BellAlertIcon}
            title={
              status === "unread" ? t("empty.unreadTitle") : t("empty.title")
            }
            description={
              status === "unread"
                ? t("empty.unreadDescription")
                : t("empty.description")
            }
          />
        ) : null}

        {notifications.length ? (
          <div className="space-y-1" role="list">
            {notifications.map((notification) => {
              const id = String(notification.id ?? notification._id ?? "");

              return (
                <div key={id} role="listitem">
                  <CustomerNotificationItem
                    notification={notification}
                    currentLocationReference={currentLocationReference}
                    markingRead={markingId === id}
                    onMarkRead={handleMarkRead}
                  />
                </div>
              );
            })}
          </div>
        ) : null}

        {notifications.length && pagination.pages > 1 ? (
          <nav
            className="mt-3 flex flex-col gap-3 border-t border-[color-mix(in_srgb,var(--tenant-text-on-surface)_10%,transparent)] px-2 pb-1 pt-4 sm:flex-row sm:items-center sm:justify-between"
            aria-label={t("pagination.label")}
          >
            <p className="text-[10px] text-[var(--tenant-muted-on-surface)]">
              {t("pagination.summary", {
                total: pagination.total,
                page: pagination.page,
                pages: pagination.pages,
              })}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  updateQuery("page", Math.max(1, page - 1), {
                    resetPage: false,
                  })
                }
                disabled={pagination.page <= 1}
                aria-label={t("pagination.previous")}
                className="flex h-11 w-11 items-center justify-center rounded-[13px] border border-[color-mix(in_srgb,var(--tenant-text-on-surface)_13%,transparent)] text-[var(--tenant-text-on-surface)] transition hover:border-[color-mix(in_srgb,var(--tenant-accent-on-surface)_40%,transparent)] hover:text-[var(--tenant-accent-on-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-on-surface)]/30 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() =>
                  updateQuery("page", Math.min(pagination.pages, page + 1), {
                    resetPage: false,
                  })
                }
                disabled={pagination.page >= pagination.pages}
                aria-label={t("pagination.next")}
                className="flex h-11 w-11 items-center justify-center rounded-[13px] border border-[color-mix(in_srgb,var(--tenant-text-on-surface)_13%,transparent)] text-[var(--tenant-text-on-surface)] transition hover:border-[color-mix(in_srgb,var(--tenant-accent-on-surface)_40%,transparent)] hover:text-[var(--tenant-accent-on-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-on-surface)]/30 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </nav>
        ) : null}
      </CustomerPortalSurface>
    </CustomerPortalPage>
  );
}
