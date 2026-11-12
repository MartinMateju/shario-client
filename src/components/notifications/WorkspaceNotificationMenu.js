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

import { Link } from "@/i18n/navigation";
import UtilityTooltip from "@/components/tooltips/UtilityTooltip";
import {
  useGetWorkspaceNotificationsQuery,
  useGetWorkspaceNotificationSummaryQuery,
  useMarkAllWorkspaceNotificationsReadMutation,
  useMarkWorkspaceNotificationReadMutation,
} from "@/lib/features/notification/notificationsApiSlice";

import WorkspaceNotificationItem from "./WorkspaceNotificationItem";
import {
  getWorkspaceNotifications,
  getWorkspaceUnreadCount,
} from "./workspaceNotification.utils";

const SUMMARY_LIMIT = 8;
const POLLING_INTERVAL = 45_000;

function LoadingRows() {
  return (
    <div className="space-y-2 px-2 pb-2" aria-hidden="true">
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          className="flex animate-pulse items-start gap-3 rounded-[15px] border border-line/70 px-3 py-3"
        >
          <span className="h-9 w-9 shrink-0 rounded-[11px] bg-surface-muted" />
          <span className="min-w-0 flex-1 space-y-2 py-1">
            <span className="block h-3 w-2/3 rounded bg-surface-muted" />
            <span className="block h-2.5 w-full rounded bg-surface-muted" />
          </span>
        </div>
      ))}
    </div>
  );
}

function WorkspaceNotificationPanel({
  open,
  close,
  triggerRef,
  unreadCount,
  summaryAvailable,
  summaryUnavailable,
}) {
  const t = useTranslations("WorkspaceNotifications");
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

  const listQuery = useGetWorkspaceNotificationsQuery(
    { page: 1, limit: SUMMARY_LIMIT },
    {
      skip: !open,
      refetchOnFocus: true,
      refetchOnReconnect: true,
      refetchOnMountOrArgChange: true,
    },
  );
  const [markRead] = useMarkWorkspaceNotificationReadMutation();
  const [markAllRead, markAllState] =
    useMarkAllWorkspaceNotificationsReadMutation();
  const response = listQuery.currentData ?? listQuery.data;
  const notifications = getWorkspaceNotifications(response).slice(
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
      aria-label={t("panel.label")}
      data-workspace-notification-panel
      className="z-[105] mt-2 flex max-h-[min(680px,calc(100dvh-88px))] w-[min(390px,calc(100vw-20px))] origin-top-right flex-col overflow-hidden rounded-[20px] border border-line bg-surface-raised shadow-[0_24px_70px_rgba(17,17,15,0.15)] transition duration-150 ease-out focus:outline-none data-closed:-translate-y-1 data-closed:scale-[0.98] data-closed:opacity-0 motion-reduce:transform-none motion-reduce:transition-none"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3.5">
        <div className="min-w-0">
          <h2 className="text-[14px] font-semibold tracking-[-0.025em] text-ink">
            {t("panel.title")}
          </h2>
          <p className="mt-0.5 text-[10px] text-ink-muted">
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
            className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[10px] font-semibold text-cobalt-700 transition hover:bg-cobalt-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/35 disabled:cursor-wait disabled:opacity-50"
          >
            {markAllState.isLoading ? (
              <ArrowPathIcon
                className="h-3.5 w-3.5 animate-spin"
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
        {actionError ? (
          <p
            role="alert"
            className="mb-2 rounded-[12px] border border-coral-200 bg-coral-50 px-3 py-2 text-[10px] text-terracotta-700"
          >
            {actionError}
          </p>
        ) : null}

        {(listQuery.isLoading || listQuery.isUninitialized) && !response ? (
          <LoadingRows />
        ) : null}

        {listQuery.isError && !response ? (
          <div className="px-3 py-8 text-center">
            <p role="alert" className="text-[11px] text-ink-muted">
              {t("errors.load")}
            </p>
            <button
              type="button"
              onClick={() => listQuery.refetch()}
              className="mt-3 inline-flex min-h-9 items-center rounded-full border border-line px-4 text-[10px] font-semibold text-ink hover:border-cobalt-200 hover:text-cobalt-700"
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
            <p className="mt-3 text-[12px] font-semibold text-ink">
              {t("empty.title")}
            </p>
            <p className="mt-1 text-[10px] leading-4 text-ink-muted">
              {t("empty.description")}
            </p>
          </div>
        ) : null}

        {notifications.length ? (
          <div className="space-y-1" role="list">
            {notifications.map((notification) => (
              <div key={notification.id ?? notification._id} role="listitem">
                <WorkspaceNotificationItem
                  notification={notification}
                  compact
                  markingRead={
                    markingId === String(notification.id ?? notification._id)
                  }
                  onMarkRead={handleMarkRead}
                  onNavigate={close}
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-line bg-surface-muted/45 p-2">
        <Link
          href="/app/notifications"
          onClick={close}
          className="group flex min-h-11 items-center justify-center gap-2 rounded-[13px] text-[11px] font-semibold text-cobalt-700 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cobalt-500/35"
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

export default function WorkspaceNotificationMenu() {
  const t = useTranslations("WorkspaceNotifications");
  const triggerRef = useRef(null);
  const summaryQuery = useGetWorkspaceNotificationSummaryQuery(undefined, {
    pollingInterval: POLLING_INTERVAL,
    refetchOnFocus: true,
    refetchOnReconnect: true,
    skipPollingIfUnfocused: true,
  });
  const summary = summaryQuery.currentData ?? summaryQuery.data;
  const summaryAvailable = Boolean(summary);
  const unreadCount = getWorkspaceUnreadCount(summary);
  const triggerLabel = unreadCount
    ? t("triggerUnread", { count: unreadCount })
    : t("trigger");

  return (
    <Popover className="relative shrink-0">
      {({ open, close }) => (
        <>
          <PopoverButton
            ref={triggerRef}
            aria-label={triggerLabel}
            data-workspace-notification-trigger
            className="group/topbar-action relative inline-flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-[13px] border border-line bg-surface-raised/90 text-[#4F4F4B] shadow-xs transition active:scale-[0.97] active:border-cobalt-200 active:bg-cobalt-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/35 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-panel motion-reduce:transform-none md:rounded-full md:hover:-translate-y-0.5 md:hover:border-cobalt-200 md:hover:bg-cobalt-50 md:hover:text-cobalt-700"
          >
            <UtilityTooltip>{t("panel.title")}</UtilityTooltip>
            <BellIcon className="h-5 w-5" aria-hidden="true" />
            {unreadCount ? (
              <span
                data-workspace-notification-badge
                aria-hidden="true"
                className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-coral-500 px-1 text-[8px] font-bold tabular-nums text-white ring-2 ring-surface-panel"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </PopoverButton>

          <WorkspaceNotificationPanel
            open={open}
            close={close}
            triggerRef={triggerRef}
            unreadCount={unreadCount}
            summaryAvailable={summaryAvailable}
            summaryUnavailable={summaryQuery.isError && !summaryAvailable}
          />
        </>
      )}
    </Popover>
  );
}
