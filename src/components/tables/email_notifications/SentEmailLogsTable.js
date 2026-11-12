"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  NoSymbolIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { normalizeEmailLogResponse } from "@/components/communications/email/emailLogResponse";
import {
  WorkspaceEmptyState,
  WorkspaceMobileCard,
  WorkspaceStatusPill,
  WorkspaceTable,
  WorkspaceTableBody,
  WorkspaceTableCell,
  WorkspaceTableFrame,
  WorkspaceTableHeadCell,
  WorkspaceTableHeader,
  WorkspaceTableRow,
  WorkspaceTableScroller,
  WorkspaceToolbar,
} from "@/components/dashboard/WorkspaceDataSurface";
import {
  workspaceInputClass,
  workspaceLabelClass,
} from "@/components/dashboard/WorkspaceFormSurface";
import { useGetCommunicationEmailLogsQuery } from "@/lib/features/communicationEmailLogs/communicationEmailLogsApiSlice";
const STATUS_CONFIG = {
  pending: {
    tone: "warning",
    icon: ClockIcon,
  },
  scheduled: {
    tone: "info",
    icon: ClockIcon,
  },
  queued: {
    tone: "info",
    icon: ClockIcon,
  },
  processing: {
    tone: "info",
    icon: ClockIcon,
  },
  sending: {
    tone: "info",
    icon: PaperAirplaneIcon,
  },
  accepted: {
    tone: "info",
    icon: PaperAirplaneIcon,
  },
  sent: {
    tone: "success",
    icon: CheckCircleIcon,
  },
  delivered: {
    tone: "success",
    icon: CheckCircleIcon,
  },
  failed: {
    tone: "danger",
    icon: ExclamationTriangleIcon,
  },
  bounced: {
    tone: "danger",
    icon: ExclamationTriangleIcon,
  },
  complained: {
    tone: "danger",
    icon: ExclamationTriangleIcon,
  },
  rejected: {
    tone: "danger",
    icon: ExclamationTriangleIcon,
  },
  ambiguous: {
    tone: "warning",
    icon: ExclamationTriangleIcon,
  },
  unknown: {
    tone: "neutral",
    icon: ExclamationTriangleIcon,
  },
  canceled: {
    tone: "neutral",
    icon: NoSymbolIcon,
  },
  suppressed: {
    tone: "neutral",
    icon: NoSymbolIcon,
  },
};
const STATUS_FILTERS = [
  "all",
  "pending",
  "scheduled",
  "queued",
  "processing",
  "sending",
  "accepted",
  "sent",
  "delivered",
  "failed",
  "bounced",
  "complained",
  "rejected",
  "ambiguous",
  "canceled",
  "suppressed",
];
const cx = (...classes) => classes.filter(Boolean).join(" ");
const PAGE_SIZE = 20;
export default function SentEmailLogsTable() {
  return <EmailHistory />;
}
function EmailHistory() {
  const t = useTranslations("EmailAutomations.history");
  const locale = useLocale();
  const tableRef = useRef(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const {
    currentData: data,
    data: previousData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetCommunicationEmailLogsQuery(
    {
      status: statusFilter,
      search: search.trim(),
      page,
      limit: PAGE_SIZE,
    },
    {
      pollingInterval: 15_000,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    },
  );
  const { logs, totalCount } = useMemo(
    () => normalizeEmailLogResponse(data),
    [data],
  );
  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const loading = isLoading || (isFetching && !data);
  const navigationCount = data
    ? totalCount
    : normalizeEmailLogResponse(previousData).totalCount;
  useEffect(() => {
    if (data && !isFetching && !isError && page > pageCount) {
      setPage(pageCount);
    }
  }, [data, isFetching, isError, page, pageCount]);
  const changePage = (nextPage, scrollToTop = false) => {
    setPage(nextPage);
    if (scrollToTop) {
      tableRef.current?.scrollIntoView({
        block: "start",
      });
    }
  };
  const paginationProps = {
    page,
    pageCount: Math.max(1, Math.ceil(navigationCount / PAGE_SIZE)),
    disabled: isFetching,
    t,
  };
  return (
    <section ref={tableRef} className="scroll-mt-24" aria-busy={isFetching}>
      <WorkspaceTableFrame className="overflow-hidden">
        <WorkspaceToolbar contained className="bg-sand-50/80">
          <div>
            <h2
              id="sent-email-history-heading"
              className="text-[14px] font-semibold tracking-[-0.02em] text-ink"
            >
              {t("description")}
            </h2>
            <p className="mt-1 text-[12px] text-ink-muted" aria-live="polite">
              {loading
                ? t("loading")
                : isError
                  ? null
                  : t("pagination.showing", {
                      from: logs.length ? (page - 1) * PAGE_SIZE + 1 : 0,
                      to: logs.length
                        ? Math.min(
                            (page - 1) * PAGE_SIZE + logs.length,
                            totalCount,
                          )
                        : 0,
                      total: totalCount,
                    })}
              <span className="mt-1 block sm:ml-3 sm:mt-0 sm:inline">
                {t("pagination.newestFirst")}
              </span>
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_240px]">
            <label className={workspaceLabelClass}>
              {t("searchLabel")}
              <span className="relative block">
                <MagnifyingGlassIcon
                  className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-ink-muted"
                  aria-hidden="true"
                />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder={t("searchPlaceholder")}
                  className={cx(workspaceInputClass, "pl-11")}
                />
              </span>
            </label>
            <label className={workspaceLabelClass}>
              {t("statusLabel")}
              <span className="relative block">
                <FunnelIcon
                  className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-ink-muted"
                  aria-hidden="true"
                />
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value);
                    setPage(1);
                  }}
                  className={cx(workspaceInputClass, "pl-11")}
                >
                  {STATUS_FILTERS.map((status) => (
                    <option key={status} value={status}>
                      {t(`statuses.${status}`)}
                    </option>
                  ))}
                </select>
              </span>
            </label>
          </div>
        </WorkspaceToolbar>

        <HistoryPagination {...paginationProps} onPageChange={changePage} />

        {loading ? <StateMessage>{t("loading")}</StateMessage> : null}
        {isError ? (
          <StateMessage tone="error">
            {t("error")}{" "}
            <button
              type="button"
              onClick={refetch}
              className="font-semibold underline underline-offset-4"
            >
              {t("retry")}
            </button>
          </StateMessage>
        ) : null}
        {!loading && !isError && logs.length === 0 ? (
          <WorkspaceEmptyState
            contained
            icon={PaperAirplaneIcon}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
          />
        ) : null}

        {!loading && !isError && logs.length > 0 ? (
          <>
            <div className="grid gap-3 bg-canvas p-3 md:hidden">
              {logs.map((log) => (
                <EmailLogCard
                  key={log._id ?? log.id}
                  log={log}
                  t={t}
                  locale={locale}
                />
              ))}
            </div>
            <WorkspaceTableScroller
              ariaLabel={t("description")}
              className="hidden md:block"
            >
              <WorkspaceTable
                aria-label={t("description")}
                data-ui-unstyled="true"
                className="min-w-[900px] table-fixed [&_thead_th]:px-3 [&_thead_th]:py-2.5 [&_tbody_tr>*]:px-3 [&_tbody_tr>*]:py-2 [&_tbody_tr>*]:leading-5"
              >
                <colgroup>
                  <col className="w-[23%]" />
                  <col className="w-[25%]" />
                  <col className="w-[16%]" />
                  <col className="w-[14%]" />
                  <col className="w-[11%]" />
                  <col className="w-[11%]" />
                </colgroup>
                <WorkspaceTableHeader>
                  <tr>
                    <WorkspaceTableHeadCell>
                      {t("columns.recipient")}
                    </WorkspaceTableHeadCell>
                    <WorkspaceTableHeadCell>
                      {t("columns.subject")}
                    </WorkspaceTableHeadCell>
                    <WorkspaceTableHeadCell>
                      {t("columns.type")}
                    </WorkspaceTableHeadCell>
                    <WorkspaceTableHeadCell>
                      {t("columns.status")}
                    </WorkspaceTableHeadCell>
                    <WorkspaceTableHeadCell>
                      {t("columns.sentAt")}
                    </WorkspaceTableHeadCell>
                    <WorkspaceTableHeadCell>
                      {t("columns.scheduledFor")}
                    </WorkspaceTableHeadCell>
                  </tr>
                </WorkspaceTableHeader>
                <WorkspaceTableBody>
                  {logs.map((log) => (
                    <EmailLogRow
                      key={log._id ?? log.id}
                      log={log}
                      t={t}
                      locale={locale}
                    />
                  ))}
                </WorkspaceTableBody>
              </WorkspaceTable>
            </WorkspaceTableScroller>
          </>
        ) : null}
        <HistoryPagination
          {...paginationProps}
          onPageChange={(nextPage) => changePage(nextPage, true)}
          className="border-t border-line"
        />
      </WorkspaceTableFrame>
    </section>
  );
}
function HistoryPagination({
  page,
  pageCount,
  disabled,
  onPageChange,
  t,
  className,
}) {
  const buttonClass =
    "min-h-11 rounded-xl border border-line bg-white px-3 text-[12px] font-semibold text-ink-soft transition hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500 disabled:cursor-not-allowed disabled:opacity-45";
  return (
    <nav
      aria-label={t("pagination.label")}
      className={cx(
        "flex items-center justify-between gap-3 px-3 py-2 sm:px-5",
        className,
      )}
    >
      <p className="text-[12px] tabular-nums text-ink-muted">
        {page} / {pageCount}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className={buttonClass}
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          {t("pagination.previous")}
        </button>
        <button
          type="button"
          className={buttonClass}
          disabled={disabled || page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          {t("pagination.next")}
        </button>
      </div>
    </nav>
  );
}
function StatusBadge({ status, t }) {
  const requested = String(status || "unknown").toLowerCase();
  const normalized = STATUS_CONFIG[requested] ? requested : "unknown";
  const config = STATUS_CONFIG[normalized];
  const Icon = config.icon;
  return (
    <WorkspaceStatusPill tone={config.tone} className="max-w-full gap-1.5">
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 [overflow-wrap:anywhere]">
        {t(`statuses.${normalized}`)}
      </span>
    </WorkspaceStatusPill>
  );
}
const emailTypeLabel = (type, t) =>
  type && t.has(`types.${type}`) ? t(`types.${type}`) : type || "—";
function EmailLogRow({ log, t, locale }) {
  return (
    <WorkspaceTableRow>
      <WorkspaceTableCell
        as="th"
        scope="row"
        className="text-left font-semibold text-ink"
      >
        <p className="break-words [overflow-wrap:anywhere]">
          {log.recipientEmail || "—"}
        </p>
        <p className="text-[11px] font-normal text-ink-muted">
          {log.recipientName || log.user?.customId || "—"}
        </p>
      </WorkspaceTableCell>
      <WorkspaceTableCell>
        <p
          className="line-clamp-2 break-words font-semibold text-ink"
          title={log.subject || undefined}
        >
          {log.subject || "—"}
        </p>
        <p
          className="line-clamp-1 text-[11px] text-ink-muted"
          title={log.automation?.name || undefined}
        >
          {log.automation?.name || t("systemEmail")}
        </p>
      </WorkspaceTableCell>
      <WorkspaceTableCell>
        {emailTypeLabel(log.emailType, t)}
      </WorkspaceTableCell>
      <WorkspaceTableCell>
        <StatusBadge status={log.status} t={t} />
      </WorkspaceTableCell>
      <WorkspaceTableCell>
        <EmailLogDate value={log.sentAt} locale={locale} />
      </WorkspaceTableCell>
      <WorkspaceTableCell>
        <EmailLogDate value={log.scheduledFor} locale={locale} />
      </WorkspaceTableCell>
    </WorkspaceTableRow>
  );
}
function EmailLogDate({ value, locale }) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "—";
  return (
    <time
      dateTime={date.toISOString()}
      className="whitespace-nowrap text-[12px] tabular-nums"
    >
      <span className="block">
        {new Intl.DateTimeFormat(locale, {
          dateStyle: "short",
        }).format(date)}
      </span>
      <span className="block text-ink-muted">
        {new Intl.DateTimeFormat(locale, {
          timeStyle: "short",
        }).format(date)}
      </span>
    </time>
  );
}
function EmailLogCard({ log, t, locale }) {
  return (
    <WorkspaceMobileCard
      title={log.recipientEmail || "—"}
      subtitle={log.subject || "—"}
      status={<StatusBadge status={log.status} t={t} />}
    >
      <dl className="grid gap-2">
        <InfoLine
          label={t("columns.type")}
          value={emailTypeLabel(log.emailType, t)}
        />
        <InfoLine
          label={t("columns.sentAt")}
          value={formatDateTime(log.sentAt, locale)}
        />
        <InfoLine
          label={t("columns.scheduledFor")}
          value={formatDateTime(log.scheduledFor, locale)}
        />
      </dl>
    </WorkspaceMobileCard>
  );
}
function InfoLine({ label, value }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-3">
      <dt className="font-medium text-ink">{label}</dt>
      <dd className="break-words text-right">{value || "—"}</dd>
    </div>
  );
}
function StateMessage({ children, tone = "neutral" }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cx(
        "px-5 py-14 text-center text-[13px]",
        tone === "error" ? "text-danger" : "text-ink-muted",
      )}
    >
      {children}
    </div>
  );
}
function formatDateTime(value, locale) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
