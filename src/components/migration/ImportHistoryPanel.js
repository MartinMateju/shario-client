"use client";

import { resolveIntlLocale } from "@/i18n/formatting";

import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowUturnLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  WorkspaceTable,
  WorkspaceTableScroller,
} from "@/components/dashboard/WorkspaceDataSurface";

import {
  useGetDataImportHistoryQuery,
  useGetDataImportSessionQuery,
  useLazyDownloadDataImportReportQuery,
  useLazyDownloadDataImportRollbackReportQuery,
  useLazyGetDataImportRollbackPreviewQuery,
  useRollbackDataImportMutation,
} from "@/lib/features/data-import/dataImportApiSlice";

import {
  canRequestRollback,
  createRollbackIdempotencyKey,
  downloadCsvReport,
  getSessionCreatedAt,
  getSessionEntity,
  getSessionFileName,
  getSessionId,
  getSessionRollback,
  isFutureDate,
  isRollbackActive,
  normalizeImportHistoryPage,
  normalizeImportSessionDetail,
  normalizeRollbackPreview,
} from "./importHistory.utils";

const PAGE_SIZE = 10;
const IMPORT_STATUSES = [
  "uploaded",
  "validating",
  "validated",
  "queued",
  "processing",
  "completed",
  "failed",
];
const ROLLBACK_STATUSES = [
  "unavailable",
  "available",
  "queued",
  "processing",
  "completed",
  "partial",
  "blocked",
  "failed",
];
const STATUS_TONES = {
  uploaded: "border-cobalt-100 bg-cobalt-50 text-cobalt-700",
  validating: "border-sand-200 bg-sand-50 text-sand-800",
  validated: "border-[#CFE0CB] bg-[#F5FAF3] text-[#47613E]",
  queued: "border-sand-200 bg-sand-50 text-sand-800",
  processing: "border-cobalt-100 bg-cobalt-50 text-cobalt-700",
  completed: "border-[#CFE0CB] bg-[#F5FAF3] text-[#47613E]",
  available: "border-cobalt-100 bg-cobalt-50 text-cobalt-700",
  unavailable: "border-line bg-[#F7F5F1] text-ink-muted",
  partial: "border-coral-200 bg-coral-50 text-terracotta-900",
  blocked: "border-coral-200 bg-coral-50 text-terracotta-900",
  failed: "border-danger/20 bg-danger-soft text-danger",
};

const emptyFilters = (entity) => ({
  entity: entity || "",
  status: "",
  rollbackStatus: "",
  search: "",
  createdFrom: "",
  createdTo: "",
});

const formatDate = (value, locale) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(resolveIntlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const isStaleRollbackError = (error) => {
  const code = String(error?.data?.code ?? error?.code ?? "").toUpperCase();

  return (
    Number(error?.status) === 409 ||
    code.includes("STALE") ||
    code.includes("REVISION") ||
    code.includes("PREVIEW")
  );
};

function StatusBadge({ kind, status, t }) {
  const safeStatus = String(status || "unavailable").toLowerCase();
  const key = `${kind}.${safeStatus}`;
  const label =
    typeof t.has !== "function" || t.has(key) ? t(key) : t(`${kind}.unknown`);

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] ${STATUS_TONES[safeStatus] || STATUS_TONES.unavailable}`}
    >
      {isRollbackActive(safeStatus) ||
      (kind === "importStatus" && safeStatus === "processing") ? (
        <ArrowPathIcon
          className="mr-1.5 h-3 w-3 animate-spin"
          aria-hidden="true"
        />
      ) : null}
      {label}
    </span>
  );
}

function ModalShell({
  dialogId,
  title,
  description,
  onClose,
  closeRef,
  closeLabel,
  inactive = false,
  children,
  level = 50,
}) {
  const dialogRef = useRef(null);
  const initialFocusSetRef = useRef(false);
  useEffect(() => {
    if (!inactive && !initialFocusSetRef.current) {
      closeRef.current?.focus();
      initialFocusSetRef.current = true;
    }
  }, [closeRef, inactive]);
  const keepFocusInside = (event) => {
    if (inactive || event.key !== "Tab") return;
    const focusable = dialogRef.current?.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (!dialogRef.current?.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      data-dialog-backdrop
      data-dialog-viewport
      className="fixed inset-0 flex items-end justify-center bg-[#171717]/35 p-0 backdrop-blur-[3px] sm:items-center sm:p-6"
      style={{ zIndex: level }}
      aria-hidden={inactive ? "true" : undefined}
      inert={inactive ? true : undefined}
      onKeyDown={keepFocusInside}
    >
      <div
        ref={dialogRef}
        role={inactive ? undefined : "dialog"}
        aria-modal={inactive ? undefined : "true"}
        aria-labelledby={inactive ? undefined : `${dialogId}-title`}
        aria-describedby={
          !inactive && description ? `${dialogId}-description` : undefined
        }
        data-dialog-layout="modal"
        className="max-h-[calc(100dvh-0.75rem)] w-full overflow-y-auto rounded-t-[24px] border border-line bg-surface-raised text-ink shadow-floating sm:max-h-[calc(100dvh-3rem)] sm:max-w-2xl sm:rounded-[24px]"
      >
        <header
          data-dialog-header
          className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-white/95 px-4 py-4 backdrop-blur sm:px-7 sm:py-5"
        >
          <div>
            <h3
              id={`${dialogId}-title`}
              className="text-[18px] font-semibold tracking-[-0.035em] text-ink"
            >
              {title}
            </h3>
            {description ? (
              <p
                id={`${dialogId}-description`}
                className="mt-1 text-[10px] leading-5 text-ink-muted"
              >
                {description}
              </p>
            ) : null}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-white text-ink-muted shadow-xs transition hover:border-line-strong hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/30 focus-visible:ring-offset-2"
          >
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">{closeLabel}</span>
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

export default function ImportHistoryPanel({
  entities,
  selectedEntity,
  canRollbackEntity,
  onOpenSession,
}) {
  const t = useTranslations("MigrationCenter.historyV2");
  const locale = useLocale();
  const [filters, setFilters] = useState(() => emptyFilters(selectedEntity));
  const [draftFilters, setDraftFilters] = useState(() =>
    emptyFilters(selectedEntity),
  );
  const [page, setPage] = useState(1);
  const [selectedListSession, setSelectedListSession] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState(false);
  const [rollbackError, setRollbackError] = useState(null);
  const [reportError, setReportError] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [submitLocked, setSubmitLocked] = useState(false);
  const detailTriggerRef = useRef(null);
  const detailCloseRef = useRef(null);
  const rollbackCloseRef = useRef(null);
  const rollbackTriggerRef = useRef(null);
  const idempotencyKeyRef = useRef(null);
  const submitLockRef = useRef(false);

  const historyQuery = useGetDataImportHistoryQuery(
    {
      entity: filters.entity || null,
      limit: PAGE_SIZE,
      page,
      status: filters.status,
      rollbackStatus: filters.rollbackStatus,
      search: filters.search,
      createdFrom: filters.createdFrom,
      createdTo: filters.createdTo,
    },
    { skip: !filters.entity, refetchOnMountOrArgChange: true },
  );
  const history = useMemo(
    () => normalizeImportHistoryPage(historyQuery.data, page),
    [historyQuery.data, page],
  );
  const detailQuery = useGetDataImportSessionQuery(selectedId, {
    skip: !selectedId,
    pollingInterval: selectedId ? 2000 : 0,
    refetchOnMountOrArgChange: true,
  });
  const detailSession = detailQuery.data
    ? normalizeImportSessionDetail(detailQuery.data)
    : selectedListSession || {};
  const rollback = getSessionRollback(detailSession);
  const rollbackStatus = rollback.status || "unavailable";
  const rollbackUnavailableReason = String(
    rollback.unavailableReason ??
      detailSession.rollbackUnavailableReason ??
      "unknown",
  )
    .trim()
    .toLowerCase();
  const hasRollbackAccess = Boolean(
    canRollbackEntity?.(getSessionEntity(detailSession)),
  );
  const [getRollbackPreview, rollbackPreviewState] =
    useLazyGetDataImportRollbackPreviewQuery();
  const [requestRollback, rollbackMutation] = useRollbackDataImportMutation();
  const [getImportReport, importReportState] =
    useLazyDownloadDataImportReportQuery();
  const [getRollbackReport, rollbackReportState] =
    useLazyDownloadDataImportRollbackReportQuery();
  const refetchHistory = historyQuery.refetch;
  const refetchDetail = detailQuery.refetch;

  useEffect(() => {
    if (selectedId) detailCloseRef.current?.focus();
  }, [selectedId]);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key !== "Escape") return;
      if (rollbackDialogOpen) {
        setRollbackDialogOpen(false);
        rollbackTriggerRef.current?.focus();
      } else if (selectedId) {
        setSelectedId(null);
        detailTriggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [rollbackDialogOpen, selectedId]);

  const applyFilters = (event) => {
    event.preventDefault();
    if (
      draftFilters.createdFrom &&
      draftFilters.createdTo &&
      draftFilters.createdFrom > draftFilters.createdTo
    ) {
      return;
    }
    setFilters(draftFilters);
    setPage(1);
  };

  const resetFilters = () => {
    const next = emptyFilters(selectedEntity);
    setDraftFilters(next);
    setFilters(next);
    setPage(1);
  };

  const openDetail = (item, trigger) => {
    detailTriggerRef.current = trigger;
    setSelectedListSession(item);
    setSelectedId(getSessionId(item));
    setReportError(false);
  };

  const closeDetail = () => {
    setSelectedId(null);
    setSelectedListSession(null);
    window.requestAnimationFrame(() => detailTriggerRef.current?.focus());
  };

  const loadRollbackPreview = async () => {
    setPreview(null);
    setPreviewError(false);
    setRollbackError(null);
    setConfirmed(false);
    setSubmitLocked(false);
    submitLockRef.current = false;
    idempotencyKeyRef.current = null;
    try {
      const response = await getRollbackPreview(
        { id: selectedId },
        false,
      ).unwrap();
      const nextPreview = normalizeRollbackPreview(response);
      setPreview(nextPreview);
      if (nextPreview.revision) {
        idempotencyKeyRef.current = createRollbackIdempotencyKey(
          selectedId,
          nextPreview.revision,
        );
      }
    } catch {
      setPreviewError(true);
    }
  };

  const openRollbackPreview = (trigger) => {
    rollbackTriggerRef.current = trigger;
    setRollbackDialogOpen(true);
    void loadRollbackPreview();
  };

  const submitRollback = async () => {
    if (
      submitLockRef.current ||
      !confirmed ||
      !preview?.available ||
      !preview?.revision ||
      !preview?.previewToken ||
      preview.eligibleRows < 1
    ) {
      return;
    }
    submitLockRef.current = true;
    setSubmitLocked(true);
    setRollbackError(null);
    try {
      await requestRollback({
        id: selectedId,
        revision: preview.revision,
        previewToken: preview.previewToken,
        idempotencyKey: idempotencyKeyRef.current,
      }).unwrap();
      setRollbackDialogOpen(false);
      await Promise.allSettled([refetchDetail(), refetchHistory()]);
      rollbackTriggerRef.current?.focus();
    } catch (error) {
      submitLockRef.current = false;
      setSubmitLocked(false);
      if (isStaleRollbackError(error)) {
        setPreview(null);
        setConfirmed(false);
        idempotencyKeyRef.current = null;
        setRollbackError("stale");
      } else {
        setRollbackError("submit");
      }
    }
  };

  const downloadReport = async (kind) => {
    setReportError(false);
    try {
      const csv = await (kind === "rollback"
        ? getRollbackReport({ id: selectedId }, false).unwrap()
        : getImportReport({ id: selectedId }, false).unwrap());
      downloadCsvReport({
        csv,
        fileName: `${kind === "rollback" ? "rollback" : "import"}-${selectedId}.csv`,
      });
    } catch {
      setReportError(true);
    }
  };

  const importReportAvailable =
    ["completed", "failed"].includes(detailSession.status) &&
    detailSession.reportAvailable === true &&
    Boolean(detailSession.reportAvailableUntil) &&
    isFutureDate(detailSession.reportAvailableUntil);
  const rollbackAvailableUntil =
    rollback.availableUntil ?? detailSession.rollbackAvailableUntil;
  const rollbackReportAvailableUntil =
    rollback.reportAvailableUntil ?? detailSession.rollbackReportAvailableUntil;
  const rollbackReportAvailable =
    rollback.reportAvailable === true &&
    Boolean(rollbackReportAvailableUntil) &&
    isFutureDate(rollbackReportAvailableUntil);
  const rollbackExpired =
    Boolean(rollbackAvailableUntil) && !isFutureDate(rollbackAvailableUntil);
  const rollbackActionAvailable =
    hasRollbackAccess && canRequestRollback(detailSession) && !rollbackExpired;
  const summary = detailSession.summary || {};

  const renderHistoryItem = (item, mobile = false) => {
    const id = getSessionId(item);
    const fileName = getSessionFileName(item) || t("unknownFile");
    const itemRollback = getSessionRollback(item);
    const button = (
      <button
        type="button"
        onClick={(event) => openDetail(item, event.currentTarget)}
        className="inline-flex min-h-9 items-center rounded-full border border-line bg-white px-3.5 text-[10px] font-semibold text-ink transition hover:border-cobalt-200 hover:text-cobalt-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/25"
        aria-label={t("viewDetailsFor", { file: fileName })}
      >
        {t("viewDetails")}
      </button>
    );

    if (mobile) {
      return (
        <li key={id} className="rounded-[18px] border border-line bg-white p-4">
          <p
            className="truncate text-[11px] font-semibold text-ink"
            title={fileName}
          >
            {fileName}
          </p>
          <p className="mt-1 text-[9px] text-ink-muted">
            {formatDate(getSessionCreatedAt(item), locale)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge kind="importStatus" status={item.status} t={t} />
            <StatusBadge
              kind="rollbackStatus"
              status={itemRollback.status}
              t={t}
            />
          </div>
          <div className="mt-3">{button}</div>
        </li>
      );
    }

    return (
      <tr key={id} className="bg-white">
        <th
          scope="row"
          className="max-w-[240px] px-5 py-4 text-[11px] font-semibold text-ink sm:px-6"
        >
          <span className="block truncate" title={fileName}>
            {fileName}
          </span>
          <span className="mt-1 block text-[9px] font-normal text-ink-muted">
            {t(`entities.${getSessionEntity(item) || "unknown"}`)}
          </span>
        </th>
        <td className="whitespace-nowrap px-5 py-4 text-[10px] text-ink-muted">
          {formatDate(getSessionCreatedAt(item), locale)}
        </td>
        <td className="whitespace-nowrap px-5 py-4">
          <StatusBadge kind="importStatus" status={item.status} t={t} />
        </td>
        <td className="whitespace-nowrap px-5 py-4">
          <StatusBadge
            kind="rollbackStatus"
            status={itemRollback.status}
            t={t}
          />
        </td>
        <td className="px-5 py-4 text-right">{button}</td>
      </tr>
    );
  };

  return (
    <section
      aria-labelledby="migration-history-title"
      className="overflow-hidden rounded-[23px] border border-line bg-white shadow-[0_14px_42px_rgba(17,17,15,0.04)]"
    >
      <div className="border-b border-line px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cobalt-600">
              {t("eyebrow")}
            </p>
            <h3
              id="migration-history-title"
              className="mt-1.5 text-[18px] font-semibold tracking-[-0.035em] text-ink"
            >
              {t("title")}
            </h3>
            <p className="mt-1 text-[10px] leading-5 text-ink-muted">
              {t("description")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => historyQuery.refetch()}
            disabled={historyQuery.isFetching}
            className="inline-flex min-h-9 items-center gap-2 rounded-full border border-line px-3.5 text-[10px] font-semibold text-ink-muted hover:border-cobalt-200 hover:text-cobalt-700 disabled:opacity-60"
          >
            <ArrowPathIcon
              className={`h-3.5 w-3.5 ${historyQuery.isFetching ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            {t("refresh")}
          </button>
        </div>

        <form
          onSubmit={applyFilters}
          className="mt-5 grid gap-3 rounded-[18px] border border-line bg-surface-muted p-4 sm:grid-cols-2 xl:grid-cols-6"
        >
          <label className="sm:col-span-2 xl:col-span-2">
            <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
              {t("filters.search")}
            </span>
            <span className="relative mt-1.5 block">
              <MagnifyingGlassIcon
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle"
                aria-hidden="true"
              />
              <input
                value={draftFilters.search}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    search: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-[12px] border border-line bg-white pl-9 pr-3 text-[10px] text-ink outline-none focus:border-cobalt-300 focus:ring-2 focus:ring-cobalt-100"
                placeholder={t("filters.searchPlaceholder")}
              />
            </span>
          </label>
          <label>
            <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
              {t("filters.entity")}
            </span>
            <select
              value={draftFilters.entity}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  entity: event.target.value,
                }))
              }
              className="mt-1.5 h-10 w-full rounded-[12px] border border-line bg-white px-3 text-[10px] text-ink"
            >
              {entities.map((entity) => (
                <option key={entity} value={entity}>
                  {t(`entities.${entity}`)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
              {t("filters.importStatus")}
            </span>
            <select
              value={draftFilters.status}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  status: event.target.value,
                }))
              }
              className="mt-1.5 h-10 w-full rounded-[12px] border border-line bg-white px-3 text-[10px] text-ink"
            >
              <option value="">{t("filters.allStatuses")}</option>
              {IMPORT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(`importStatus.${status}`)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
              {t("filters.rollbackStatus")}
            </span>
            <select
              value={draftFilters.rollbackStatus}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  rollbackStatus: event.target.value,
                }))
              }
              className="mt-1.5 h-10 w-full rounded-[12px] border border-line bg-white px-3 text-[10px] text-ink"
            >
              <option value="">{t("filters.allStatuses")}</option>
              {ROLLBACK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(`rollbackStatus.${status}`)}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2 sm:col-span-2 xl:col-span-2">
            <label>
              <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
                {t("filters.from")}
              </span>
              <input
                type="date"
                value={draftFilters.createdFrom}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    createdFrom: event.target.value,
                  }))
                }
                className="mt-1.5 h-10 w-full rounded-[12px] border border-line bg-white px-3 text-[10px] text-ink"
              />
            </label>
            <label>
              <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
                {t("filters.to")}
              </span>
              <input
                type="date"
                value={draftFilters.createdTo}
                min={draftFilters.createdFrom || undefined}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    createdTo: event.target.value,
                  }))
                }
                className="mt-1.5 h-10 w-full rounded-[12px] border border-line bg-white px-3 text-[10px] text-ink"
              />
            </label>
          </div>
          <div className="flex items-end gap-2 sm:col-span-2 xl:col-span-4">
            <button
              type="submit"
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-cobalt-700 px-4 text-[10px] font-semibold text-white hover:bg-cobalt-800"
            >
              <FunnelIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {t("filters.apply")}
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="min-h-10 rounded-full border border-line bg-white px-4 text-[10px] font-semibold text-ink-muted hover:border-cobalt-200 hover:text-cobalt-700"
            >
              {t("filters.clear")}
            </button>
          </div>
        </form>
      </div>

      {historyQuery.isLoading ? (
        <div
          className="flex min-h-[180px] items-center justify-center"
          role="status"
        >
          <ArrowPathIcon
            className="h-5 w-5 animate-spin text-cobalt-500"
            aria-hidden="true"
          />
          <span className="ml-2 text-[11px] text-ink-muted">
            {t("loading")}
          </span>
        </div>
      ) : historyQuery.isError ? (
        <div
          role="alert"
          className="m-5 rounded-[14px] border border-danger/20 bg-danger-soft px-4 py-3 text-[11px] text-danger"
        >
          {t("error")}
        </div>
      ) : history.sessions.length ? (
        <>
          <ul className="space-y-3 p-4 md:hidden">
            {history.sessions.map((item) => renderHistoryItem(item, true))}
          </ul>
          <WorkspaceTableScroller
            ariaLabel={t("tableCaption")}
            className="hidden md:block"
          >
            <WorkspaceTable className="min-w-full text-left">
              <caption className="sr-only">{t("tableCaption")}</caption>
              <thead className="bg-surface-muted text-[9px] font-semibold uppercase tracking-[0.1em] text-ink-subtle">
                <tr>
                  <th scope="col" className="px-5 py-3 sm:px-6">
                    {t("file")}
                  </th>
                  <th scope="col" className="px-5 py-3">
                    {t("date")}
                  </th>
                  <th scope="col" className="px-5 py-3">
                    {t("import")}
                  </th>
                  <th scope="col" className="px-5 py-3">
                    {t("filters.rollbackStatus")}
                  </th>
                  <th scope="col" className="px-5 py-3 text-right">
                    {t("action")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {history.sessions.map((item) => renderHistoryItem(item))}
              </tbody>
            </WorkspaceTable>
          </WorkspaceTableScroller>
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4 sm:px-6">
            <p className="text-[10px] text-ink-muted">
              {t("pagination.summary", {
                total: history.pagination.total,
                page: history.pagination.page,
                pages: history.pagination.totalPages,
              })}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1 || historyQuery.isFetching}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-line disabled:opacity-40"
              >
                <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">{t("pagination.previous")}</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setPage((current) =>
                    Math.min(history.pagination.totalPages, current + 1),
                  )
                }
                disabled={
                  page >= history.pagination.totalPages ||
                  historyQuery.isFetching
                }
                className="flex h-9 w-9 items-center justify-center rounded-full border border-line disabled:opacity-40"
              >
                <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">{t("pagination.next")}</span>
              </button>
            </div>
          </footer>
        </>
      ) : (
        <div className="px-5 py-12 text-center">
          <h4 className="text-[13px] font-semibold text-ink">
            {t("emptyTitle")}
          </h4>
          <p className="mx-auto mt-1 max-w-md text-[10px] leading-5 text-ink-muted">
            {t("emptyDescription")}
          </p>
        </div>
      )}

      {selectedId ? (
        <ModalShell
          dialogId="import-history-detail"
          title={t("detail.title")}
          description={t("detail.description")}
          onClose={closeDetail}
          closeRef={detailCloseRef}
          closeLabel={t("close")}
          inactive={rollbackDialogOpen}
        >
          <div className="space-y-5 p-5 sm:p-6">
            {detailQuery.isLoading ? (
              <div
                role="status"
                className="flex min-h-32 items-center justify-center text-[11px] text-ink-muted"
              >
                <ArrowPathIcon
                  className="mr-2 h-5 w-5 animate-spin"
                  aria-hidden="true"
                />
                {t("detail.loading")}
              </div>
            ) : detailQuery.isError ? (
              <div
                role="alert"
                className="rounded-[14px] border border-danger/20 bg-danger-soft p-4 text-[11px] text-danger"
              >
                {t("detail.error")}
              </div>
            ) : (
              <>
                <div className="rounded-[18px] border border-line bg-surface-muted p-4">
                  <p className="truncate text-[13px] font-semibold text-ink">
                    {getSessionFileName(detailSession) || t("unknownFile")}
                  </p>
                  <p className="mt-1 text-[10px] text-ink-muted">
                    {formatDate(getSessionCreatedAt(detailSession), locale)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusBadge
                      kind="importStatus"
                      status={detailSession.status}
                      t={t}
                    />
                    <StatusBadge
                      kind="rollbackStatus"
                      status={rollbackStatus}
                      t={t}
                    />
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {["total", "created", "updated", "failed"].map((key) => (
                    <div
                      key={key}
                      className="rounded-[15px] border border-line p-3"
                    >
                      <dt className="text-[8px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
                        {t(`detail.summary.${key}`)}
                      </dt>
                      <dd className="mt-1 text-[17px] font-semibold text-ink">
                        {Number(summary[key] || 0)}
                      </dd>
                    </div>
                  ))}
                </dl>
                {isRollbackActive(rollbackStatus) ? (
                  <div
                    aria-live="polite"
                    className="flex items-center rounded-[15px] border border-cobalt-100 bg-cobalt-50 p-4 text-[10px] text-cobalt-900"
                  >
                    <ArrowPathIcon
                      className="mr-2 h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                    {t(`detail.progress.${rollbackStatus}`)}
                  </div>
                ) : null}
                {rollbackStatus === "partial" ? (
                  <div
                    role="status"
                    className="rounded-[15px] border border-coral-200 bg-coral-50 p-4 text-[10px] leading-5 text-terracotta-900"
                  >
                    <strong>{t("detail.partialTitle")}</strong>
                    <p>{t("detail.partialDescription")}</p>
                  </div>
                ) : null}
                {rollbackStatus === "blocked" ? (
                  <div
                    role="status"
                    className="rounded-[15px] border border-coral-200 bg-coral-50 p-4 text-[10px] leading-5 text-terracotta-900"
                  >
                    <strong>{t("detail.blockedTitle")}</strong>
                    <p>{t("detail.blockedDescription")}</p>
                  </div>
                ) : null}
                {rollbackStatus === "unavailable" && hasRollbackAccess ? (
                  <div className="rounded-[15px] border border-line bg-[#F7F5F1] p-4 text-[10px] leading-5 text-ink-muted">
                    {typeof t.has !== "function" ||
                    t.has(
                      `detail.unavailableReasons.${rollbackUnavailableReason}`,
                    )
                      ? t(
                          `detail.unavailableReasons.${rollbackUnavailableReason}`,
                        )
                      : t("detail.unavailableReasons.unknown")}
                  </div>
                ) : null}
                {rollbackExpired ? (
                  <div className="rounded-[15px] border border-line bg-[#F7F5F1] p-4 text-[10px] text-ink-muted">
                    {t("detail.rollbackExpired")}
                  </div>
                ) : null}
                {!rollbackExpired && rollbackAvailableUntil ? (
                  <p className="text-[9px] text-ink-muted">
                    {t("detail.rollbackAvailableUntil", {
                      date: formatDate(rollbackAvailableUntil, locale),
                    })}
                  </p>
                ) : null}
                {rollback.counters ? (
                  <dl className="grid grid-cols-2 gap-2 rounded-[18px] border border-line p-4 sm:grid-cols-3 lg:grid-cols-6">
                    {[
                      "rolledBack",
                      "restored",
                      "archived",
                      "compensated",
                      "blocked",
                      "failed",
                    ].map((key) => (
                      <div key={key}>
                        <dt className="text-[8px] uppercase tracking-[0.06em] text-ink-subtle">
                          {t(`detail.rollbackCounters.${key}`)}
                        </dt>
                        <dd className="mt-1 text-[13px] font-semibold text-ink">
                          {Number(rollback.counters[key] || 0)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                <section
                  aria-labelledby="reports-title"
                  className="rounded-[18px] border border-line p-4"
                >
                  <h4
                    id="reports-title"
                    className="text-[11px] font-semibold text-ink"
                  >
                    {t("reports.title")}
                  </h4>
                  {detailSession.reportAvailableUntil &&
                  importReportAvailable ? (
                    <p className="mt-1 text-[9px] text-ink-muted">
                      {t("reports.importAvailableUntil", {
                        date: formatDate(
                          detailSession.reportAvailableUntil,
                          locale,
                        ),
                      })}
                    </p>
                  ) : null}
                  {rollbackReportAvailableUntil && rollbackReportAvailable ? (
                    <p className="mt-1 text-[9px] text-ink-muted">
                      {t("reports.rollbackAvailableUntil", {
                        date: formatDate(rollbackReportAvailableUntil, locale),
                      })}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {importReportAvailable ? (
                      <button
                        type="button"
                        onClick={() => downloadReport("import")}
                        disabled={importReportState.isFetching}
                        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-4 text-[10px] font-semibold text-ink hover:border-cobalt-200 hover:text-cobalt-700 disabled:opacity-60"
                      >
                        <ArrowDownTrayIcon
                          className="h-4 w-4"
                          aria-hidden="true"
                        />
                        {t("reports.import")}
                      </button>
                    ) : (
                      <span className="text-[10px] text-ink-muted">
                        {t("reports.importUnavailable")}
                      </span>
                    )}
                    {rollbackReportAvailable ? (
                      <button
                        type="button"
                        onClick={() => downloadReport("rollback")}
                        disabled={rollbackReportState.isFetching}
                        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-4 text-[10px] font-semibold text-ink hover:border-cobalt-200 hover:text-cobalt-700 disabled:opacity-60"
                      >
                        <ArrowDownTrayIcon
                          className="h-4 w-4"
                          aria-hidden="true"
                        />
                        {t("reports.rollback")}
                      </button>
                    ) : ["completed", "partial", "blocked", "failed"].includes(
                        rollbackStatus,
                      ) ? (
                      <span className="text-[10px] text-ink-muted">
                        {t("reports.rollbackUnavailable")}
                      </span>
                    ) : null}
                  </div>
                  {reportError ? (
                    <p role="alert" className="mt-3 text-[10px] text-danger">
                      {t("reports.error")}
                    </p>
                  ) : null}
                </section>
                <div className="flex flex-wrap justify-end gap-2">
                  {onOpenSession ? (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenSession(detailSession);
                        closeDetail();
                      }}
                      className="min-h-10 rounded-full border border-line px-4 text-[10px] font-semibold text-ink hover:border-cobalt-200 hover:text-cobalt-700"
                    >
                      {t("detail.openImport")}
                    </button>
                  ) : null}
                  {rollbackActionAvailable ? (
                    <button
                      ref={rollbackTriggerRef}
                      type="button"
                      onClick={(event) =>
                        openRollbackPreview(event.currentTarget)
                      }
                      className="inline-flex min-h-10 items-center gap-2 rounded-full bg-danger px-4 text-[10px] font-semibold text-white hover:bg-danger/90"
                    >
                      <ArrowUturnLeftIcon
                        className="h-4 w-4"
                        aria-hidden="true"
                      />
                      {["partial", "blocked", "failed"].includes(rollbackStatus)
                        ? t("rollback.retry")
                        : t("rollback.open")}
                    </button>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </ModalShell>
      ) : null}

      {rollbackDialogOpen ? (
        <ModalShell
          dialogId="import-history-rollback"
          title={t("rollback.title")}
          description={t("rollback.description")}
          onClose={() => {
            setRollbackDialogOpen(false);
            rollbackTriggerRef.current?.focus();
          }}
          closeRef={rollbackCloseRef}
          closeLabel={t("close")}
          level={60}
        >
          <div className="space-y-4 p-5 sm:p-6">
            {rollbackPreviewState.isFetching ? (
              <div
                role="status"
                className="flex min-h-28 items-center justify-center text-[11px] text-ink-muted"
              >
                <ArrowPathIcon
                  className="mr-2 h-5 w-5 animate-spin"
                  aria-hidden="true"
                />
                {t("rollback.checking")}
              </div>
            ) : previewError ? (
              <div
                role="alert"
                className="rounded-[15px] border border-danger/20 bg-danger-soft p-4 text-[10px] text-danger"
              >
                {t("rollback.previewError")}
              </div>
            ) : rollbackError === "stale" ? (
              <div
                role="alert"
                className="rounded-[15px] border border-coral-200 bg-coral-50 p-4 text-[10px] leading-5 text-terracotta-900"
              >
                <strong>{t("rollback.staleTitle")}</strong>
                <p>{t("rollback.staleDescription")}</p>
                <button
                  type="button"
                  onClick={loadRollbackPreview}
                  className="mt-3 min-h-9 rounded-full border border-coral-300 bg-white px-3.5 text-[10px] font-semibold text-terracotta-900"
                >
                  {t("rollback.checkAgain")}
                </button>
              </div>
            ) : preview ? (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    ["eligible", preview.eligibleRows],
                    ["blocked", preview.blockedRows],
                    ["compensated", preview.compensatedRows],
                    ["total", preview.totalRows],
                  ].map(([key, value]) => (
                    <div
                      key={key}
                      className="rounded-[15px] border border-line p-3 text-center"
                    >
                      <p className="text-[8px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
                        {t(`rollback.counts.${key}`)}
                      </p>
                      <p className="mt-1 text-[20px] font-semibold text-ink">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
                {preview.blockedRows > 0 ? (
                  <div className="rounded-[15px] border border-coral-200 bg-coral-50 p-4 text-[10px] leading-5 text-terracotta-900">
                    <strong>{t("rollback.blockedTitle")}</strong>
                    <p>
                      {t("rollback.blockedDescription", {
                        count: preview.blockedRows,
                      })}
                    </p>
                    {preview.reasonGroups.length ? (
                      <ul className="mt-2 list-disc space-y-1 pl-4">
                        {preview.reasonGroups.map((reason) => (
                          <li key={reason.code}>
                            {typeof t.has !== "function" ||
                            t.has(`rollback.reasons.${reason.code}`)
                              ? t(`rollback.reasons.${reason.code}`, {
                                  count: reason.count,
                                })
                              : t("rollback.reasons.unknown", {
                                  count: reason.count,
                                })}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
                <div className="rounded-[15px] border border-danger/20 bg-danger-soft p-4 text-[10px] leading-5 text-danger">
                  <ExclamationTriangleIcon
                    className="mb-2 h-5 w-5"
                    aria-hidden="true"
                  />
                  <p>{t("rollback.consequence")}</p>
                </div>
                <label className="flex cursor-pointer items-start gap-3 rounded-[15px] border border-line p-4">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(event) => setConfirmed(event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-line text-cobalt-700"
                  />
                  <span className="text-[10px] leading-5 text-ink">
                    {t("rollback.confirm")}
                  </span>
                </label>
                {rollbackError === "submit" ? (
                  <p role="alert" className="text-[10px] text-danger">
                    {t("rollback.submitError")}
                  </p>
                ) : null}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRollbackDialogOpen(false);
                      rollbackTriggerRef.current?.focus();
                    }}
                    className="min-h-10 rounded-full border border-line px-4 text-[10px] font-semibold text-ink"
                  >
                    {t("rollback.cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={submitRollback}
                    disabled={
                      !confirmed ||
                      !preview.available ||
                      !preview.revision ||
                      !preview.previewToken ||
                      preview.eligibleRows < 1 ||
                      rollbackMutation.isLoading ||
                      submitLocked
                    }
                    className="min-h-10 rounded-full bg-danger px-4 text-[10px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {rollbackMutation.isLoading
                      ? t("rollback.submitting")
                      : preview.blockedRows > 0
                        ? t("rollback.submitSafe", {
                            count: preview.eligibleRows,
                          })
                        : t("rollback.submitAll", {
                            count: preview.eligibleRows,
                          })}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </ModalShell>
      ) : null}
    </section>
  );
}
