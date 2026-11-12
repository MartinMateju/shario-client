"use client";

import {
  ArrowPathIcon,
  BellAlertIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { Link, useRouter } from "@/i18n/navigation";
import {
  getLocationId,
  normalizeLocationsResponse,
} from "@/lib/features/locations/location.utils";
import { useGetLocationsQuery } from "@/lib/features/locations/locationApiSlice";
import {
  useGetWorkspaceNotificationsQuery,
  useGetWorkspaceNotificationSummaryQuery,
  useMarkAllWorkspaceNotificationsReadMutation,
  useMarkWorkspaceNotificationReadMutation,
} from "@/lib/features/notification/notificationsApiSlice";

import WorkspaceNotificationItem from "./WorkspaceNotificationItem";
import {
  WORKSPACE_NOTIFICATION_CATEGORIES,
  WORKSPACE_NOTIFICATION_STATUSES,
  buildWorkspaceNotificationListParams,
  getWorkspaceNotificationPagination,
  getWorkspaceNotifications,
  getWorkspaceUnreadCount,
} from "./workspaceNotification.utils";

const PAGE_SIZE = 20;
const POLLING_INTERVAL = 60_000;

const selectClass =
  "h-11 min-w-0 rounded-[12px] border border-line bg-white px-3 text-[11px] font-medium text-ink outline-none transition focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10";

const normalizeChoice = (value, allowed, fallback = "all") =>
  allowed.includes(value) ? value : fallback;

function ListSkeleton() {
  return (
    <div className="space-y-2" aria-hidden="true">
      {[0, 1, 2, 3].map((row) => (
        <div
          key={row}
          className="flex animate-pulse gap-3 rounded-[16px] border border-line bg-white px-4 py-4"
        >
          <span className="h-9 w-9 rounded-[11px] bg-surface-muted" />
          <span className="min-w-0 flex-1 space-y-2 py-1">
            <span className="block h-3 w-1/3 rounded bg-surface-muted" />
            <span className="block h-2.5 w-4/5 rounded bg-surface-muted" />
            <span className="block h-2 w-1/4 rounded bg-surface-muted" />
          </span>
        </div>
      ))}
    </div>
  );
}

export default function WorkspaceNotificationsPage() {
  const t = useTranslations("WorkspaceNotifications");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [actionError, setActionError] = useState("");
  const [markingId, setMarkingId] = useState("");
  const status = normalizeChoice(
    searchParams.get("status") || "all",
    WORKSPACE_NOTIFICATION_STATUSES,
  );
  const category = normalizeChoice(searchParams.get("category") || "all", [
    "all",
    ...WORKSPACE_NOTIFICATION_CATEGORIES,
  ]);
  const locationId = searchParams.get("locationId") || "all";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const listParams = buildWorkspaceNotificationListParams({
    page,
    limit: PAGE_SIZE,
    status,
    category,
    locationId,
  });
  const listQuery = useGetWorkspaceNotificationsQuery(listParams, {
    pollingInterval: POLLING_INTERVAL,
    refetchOnFocus: true,
    refetchOnReconnect: true,
    skipPollingIfUnfocused: true,
  });
  const summaryQuery = useGetWorkspaceNotificationSummaryQuery(undefined, {
    pollingInterval: 45_000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
    skipPollingIfUnfocused: true,
  });
  const locationsQuery = useGetLocationsQuery({ isActive: true, limit: 100 });
  const [markRead] = useMarkWorkspaceNotificationReadMutation();
  const [markAllRead, markAllState] =
    useMarkAllWorkspaceNotificationsReadMutation();
  const response = listQuery.currentData;
  const summary = summaryQuery.currentData ?? summaryQuery.data;
  const summaryAvailable = Boolean(summary);
  const notifications = getWorkspaceNotifications(response);
  const unreadCount = getWorkspaceUnreadCount(summary);
  const pagination = getWorkspaceNotificationPagination(response);
  const locations = normalizeLocationsResponse(locationsQuery.data);

  const updateQuery = (key, value, { resetPage = true } = {}) => {
    const next = new URLSearchParams(searchParams.toString());

    if (!value || value === "all" || (key === "page" && Number(value) <= 1)) {
      next.delete(key);
    } else {
      next.set(key, String(value));
    }

    if (resetPage && key !== "page") next.delete("page");

    const query = next.toString();
    router.replace(`/app/notifications${query ? `?${query}` : ""}`, {
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
      await markAllRead({}).unwrap();
    } catch {
      setActionError(t("errors.markAllRead"));
    }
  };

  return (
    <section className="space-y-4" aria-labelledby="notifications-page-title">
      <h2 id="notifications-page-title" className="sr-only">
        {t("page.title")}
      </h2>

      <div className="overflow-hidden rounded-[20px] border border-line bg-white shadow-[0_12px_34px_rgba(31,31,31,0.045)]">
        <div className="flex flex-col gap-4 border-b border-line bg-surface-muted/55 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cobalt-50 text-cobalt-700 ring-1 ring-inset ring-cobalt-100">
              <BellAlertIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold tracking-[-0.02em] text-ink">
                {t("page.heading")}
              </p>
              <p className="mt-0.5 text-[10px] leading-4 text-ink-muted">
                {!summaryAvailable
                  ? summaryQuery.isError
                    ? t("page.summaryUnavailable")
                    : t("page.summaryLoading")
                  : unreadCount
                    ? t("page.unreadSummary", { count: unreadCount })
                    : t("page.caughtUp")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/app/preferences"
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-[10px] font-semibold text-ink transition hover:border-cobalt-200 hover:text-cobalt-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/35"
            >
              <Cog6ToothIcon className="h-4 w-4" aria-hidden="true" />
              {t("actions.preferences")}
            </Link>
            {summaryAvailable && unreadCount ? (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={markAllState.isLoading}
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-cobalt-500 px-4 text-[10px] font-semibold text-white shadow-cobalt transition hover:bg-cobalt-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/35 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-50"
              >
                {markAllState.isLoading ? (
                  <ArrowPathIcon
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <CheckCircleIcon className="h-4 w-4" aria-hidden="true" />
                )}
                {t("actions.markAllRead")}
              </button>
            ) : null}
          </div>
        </div>

        <div
          className="grid gap-3 px-4 py-4 sm:grid-cols-3 sm:px-5"
          aria-label={t("filters.label")}
        >
          <label className="min-w-0">
            <span className="mb-1.5 block text-[10px] font-semibold text-ink-muted">
              {t("filters.status")}
            </span>
            <select
              value={status}
              onChange={(event) => updateQuery("status", event.target.value)}
              className={selectClass}
            >
              {WORKSPACE_NOTIFICATION_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {t(`statuses.${value}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="min-w-0">
            <span className="mb-1.5 block text-[10px] font-semibold text-ink-muted">
              {t("filters.category")}
            </span>
            <select
              value={category}
              onChange={(event) => updateQuery("category", event.target.value)}
              className={selectClass}
            >
              <option value="all">{t("categories.all")}</option>
              {WORKSPACE_NOTIFICATION_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {t(`categories.${value}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="min-w-0">
            <span className="mb-1.5 block text-[10px] font-semibold text-ink-muted">
              {t("filters.location")}
            </span>
            <select
              value={locationId}
              onChange={(event) =>
                updateQuery("locationId", event.target.value)
              }
              disabled={locationsQuery.isLoading}
              className={selectClass}
            >
              <option value="all">{t("locations.all")}</option>
              {locations.map((location) => {
                const id = getLocationId(location);

                return (
                  <option key={id} value={id}>
                    {location.name}
                  </option>
                );
              })}
            </select>
          </label>
        </div>
      </div>

      {actionError ? (
        <p
          role="alert"
          className="rounded-[14px] border border-coral-200 bg-coral-50 px-4 py-3 text-[11px] text-terracotta-700"
        >
          {actionError}
        </p>
      ) : null}

      <div className="rounded-[20px] border border-line bg-white p-3 shadow-[0_12px_34px_rgba(31,31,31,0.045)] sm:p-4">
        {listQuery.isLoading && !response ? <ListSkeleton /> : null}

        {listQuery.isError && !response ? (
          <div className="px-5 py-14 text-center">
            <p role="alert" className="text-[12px] font-medium text-ink">
              {t("errors.load")}
            </p>
            <button
              type="button"
              onClick={() => listQuery.refetch()}
              className="mt-4 inline-flex min-h-10 items-center rounded-full border border-line px-5 text-[10px] font-semibold text-ink hover:border-cobalt-200 hover:text-cobalt-700"
            >
              {t("actions.retry")}
            </button>
          </div>
        ) : null}

        {!listQuery.isLoading &&
        !listQuery.isError &&
        notifications.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF5EF] text-[#2F7D64]">
              <CheckCircleIcon className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="mt-4 text-[14px] font-semibold text-ink">
              {status === "unread" ? t("empty.unreadTitle") : t("empty.title")}
            </p>
            <p className="mx-auto mt-1 max-w-md text-[11px] leading-5 text-ink-muted">
              {status === "unread"
                ? t("empty.unreadDescription")
                : t("empty.description")}
            </p>
          </div>
        ) : null}

        {notifications.length ? (
          <div
            className="space-y-2"
            role="list"
            aria-busy={listQuery.isFetching}
          >
            {notifications.map((notification) => (
              <div key={notification.id ?? notification._id} role="listitem">
                <WorkspaceNotificationItem
                  notification={notification}
                  markingRead={
                    markingId === String(notification.id ?? notification._id)
                  }
                  onMarkRead={handleMarkRead}
                />
              </div>
            ))}
          </div>
        ) : null}

        {pagination.pages > 1 ? (
          <nav
            className="mt-4 flex items-center justify-between gap-3 border-t border-line px-1 pt-4"
            aria-label={t("pagination.label")}
          >
            <button
              type="button"
              onClick={() =>
                updateQuery("page", pagination.page - 1, { resetPage: false })
              }
              disabled={pagination.page <= 1}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line px-4 text-[10px] font-semibold text-ink transition hover:border-cobalt-200 hover:text-cobalt-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
              {t("pagination.previous")}
            </button>
            <p className="text-center text-[10px] text-ink-muted">
              {t("pagination.summary", {
                page: pagination.page,
                pages: pagination.pages,
                total: pagination.total,
              })}
            </p>
            <button
              type="button"
              onClick={() =>
                updateQuery("page", pagination.page + 1, { resetPage: false })
              }
              disabled={pagination.page >= pagination.pages}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line px-4 text-[10px] font-semibold text-ink transition hover:border-cobalt-200 hover:text-cobalt-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("pagination.next")}
              <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </nav>
        ) : null}
      </div>
    </section>
  );
}
