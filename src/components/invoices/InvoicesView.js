"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  EyeIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useSelector } from "react-redux";

import WorkspaceSectionHeader from "@/components/dashboard/WorkspaceSectionHeader";
import { WorkspaceTable } from "@/components/dashboard/WorkspaceDataSurface";
import { PERMISSIONS, hasPermission } from "@/config/permissions";
import {
  selectCurrentTenant,
  selectCurrentWorkspaceAccess,
  selectIsAuthenticated,
} from "@/lib/features/auth/authSlice";
import {
  useGetInvoicesQuery,
  useGetInvoiceSettingsQuery,
} from "@/lib/features/invoices/invoicesApiSlice";
import { useGetLocationsQuery } from "@/lib/features/locations/locationApiSlice";
import {
  getLocationId,
  normalizeLocationsResponse,
} from "@/lib/features/locations/location.utils";
import { selectActiveStudioId } from "@/lib/features/studio/studioContextSlice";

import InvoiceDetailsDialog from "./InvoiceDetailsDialog";
import InvoiceEditorDialog from "./InvoiceEditorDialog";
import {
  cx,
  downloadInvoicesCsv,
  formatInvoiceDate,
  formatInvoiceMoney,
  getInvoiceCustomerEmail,
  getInvoiceCustomerName,
  getInvoiceCreditStatus,
  getInvoiceId,
  getInvoiceNumber,
  getInvoicePaymentStatus,
  getInvoiceStatus,
  getInvoiceTimezone,
  getInvoiceType,
  normalizeInvoicePage,
} from "./invoice.utils";

const PAGE_SIZE = 25;

const STATUS_CLASSES = {
  draft: "bg-[#EEECE7] text-[#686762]",
  issued: "bg-cobalt-50 text-cobalt-700",
  void: "bg-danger-soft text-danger",
};

function InvoiceStatus({ invoice, t }) {
  const status = getInvoiceStatus(invoice);
  const paymentStatus = getInvoicePaymentStatus(invoice);
  const creditStatus = getInvoiceCreditStatus(invoice);

  return (
    <div className="flex min-w-0 max-w-full flex-wrap gap-1.5">
      <span
        className={cx(
          "rounded-full px-2.5 py-1 text-[10px] font-semibold",
          STATUS_CLASSES[status] || STATUS_CLASSES.draft,
        )}
      >
        {t(`statuses.${status}`)}
      </span>
      <span className="rounded-full bg-[#F7F5F1] px-2.5 py-1 text-[10px] font-semibold text-[#686762]">
        {t(`paymentStatuses.${paymentStatus}`)}
      </span>
      {!["none", "not_applicable"].includes(creditStatus) && (
        <span className="rounded-full bg-[#F0E9F8] px-2.5 py-1 text-[10px] font-semibold text-[#75508C]">
          {t(`creditStatuses.${creditStatus}`)}
        </span>
      )}
    </div>
  );
}

function InvoiceCard({ invoice, locale, timezone, onView, t }) {
  return (
    <article className="rounded-[19px] border border-line bg-white p-4 shadow-[0_8px_24px_rgba(17,17,15,0.04)] md:hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-terracotta-600">
            {t(`types.${getInvoiceType(invoice)}`)}
          </p>
          <p className="mt-1 truncate text-[12px] font-semibold text-[#252524]">
            {getInvoiceNumber(invoice, t("draftNumber"))}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onView(invoice)}
          className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-line text-[#555553]"
          aria-label={t("actions.view")}
        >
          <EyeIcon className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4">
        <p className="truncate text-[11px] font-semibold text-[#292925]">
          {getInvoiceCustomerName(invoice)}
        </p>
        <p className="mt-1 truncate text-[10px] text-[#969691]">
          {getInvoiceCustomerEmail(invoice) || "—"}
        </p>
      </div>
      <div className="mt-4 flex items-end justify-between gap-4 border-t border-line pt-4">
        <div className="min-w-0 flex-1">
          <InvoiceStatus invoice={invoice} t={t} />
          <p className="mt-2 text-[10px] text-[#858580]">
            {formatInvoiceDate(
              invoice?.issueDate ?? invoice?.createdAt,
              locale,
              getInvoiceTimezone(invoice, timezone),
            )}
          </p>
        </div>
        <p className="shrink-0 whitespace-nowrap text-[13px] font-semibold text-[#252524]">
          {formatInvoiceMoney(invoice, locale)}
        </p>
      </div>
    </article>
  );
}

export default function InvoicesView({ showPageHeader = true }) {
  const t = useTranslations("Invoices");
  const locale = useLocale();
  const tenant = useSelector(selectCurrentTenant);
  const access = useSelector(selectCurrentWorkspaceAccess);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const activeStudioId = useSelector(selectActiveStudioId);
  const activeStudioScope = activeStudioId || "";
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [documentStatus, setDocumentStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [locationFilter, setLocationFilter] = useState(() => ({
    studioId: activeStudioId || "",
    value: activeStudioId || "",
  }));
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [pagination, setPagination] = useState(() => ({
    scope: activeStudioScope,
    page: 1,
  }));
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const timezone = tenant?.settings?.timezone || "UTC";

  const canCreate = hasPermission(access, PERMISSIONS.INVOICES_CREATE);
  const canExport = hasPermission(access, PERMISSIONS.INVOICES_EXPORT);
  const locationsQuery = useGetLocationsQuery(
    { isActive: true, limit: 100 },
    { skip: !isAuthenticated },
  );
  const locations = useMemo(
    () => normalizeLocationsResponse(locationsQuery.data),
    [locationsQuery.data],
  );
  const settingsQuery = useGetInvoiceSettingsQuery(undefined, {
    skip: !canCreate,
  });
  const page = pagination.scope === activeStudioScope ? pagination.page : 1;
  const setPage = useCallback(
    (nextPage) => {
      setPagination((current) => {
        const currentPage =
          current.scope === activeStudioScope ? current.page : 1;
        return {
          scope: activeStudioScope,
          page:
            typeof nextPage === "function" ? nextPage(currentPage) : nextPage,
        };
      });
    },
    [activeStudioScope],
  );
  const locationId =
    locationFilter.studioId === activeStudioScope
      ? locationFilter.value
      : activeStudioScope;
  const settingsReady =
    settingsQuery.isSuccess && Boolean(settingsQuery.data?.settings);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [search, setPage]);

  const query = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(documentType ? { documentType } : {}),
      ...(documentStatus ? { documentStatus } : {}),
      ...(paymentStatus ? { paymentStatus } : {}),
      ...(locationId ? { locationId } : {}),
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
    }),
    [
      dateFrom,
      dateTo,
      debouncedSearch,
      documentStatus,
      documentType,
      locationId,
      page,
      paymentStatus,
    ],
  );
  const invoicesQuery = useGetInvoicesQuery(query);
  const pageData = normalizeInvoicePage(invoicesQuery.data);

  const openCreate = () => {
    if (!settingsReady) return;
    setEditingInvoice(null);
    setEditorOpen(true);
  };

  const openEdit = (invoice) => {
    if (!settingsReady) return;
    setSelectedInvoice(null);
    setEditingInvoice(invoice);
    setEditorOpen(true);
  };

  const clearFilters = () => {
    setSearch("");
    setDocumentType("");
    setDocumentStatus("");
    setPaymentStatus("");
    setLocationFilter({
      studioId: activeStudioScope,
      value: "",
    });
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  return (
    <section className="mx-auto max-w-[1380px] pb-8">
      <WorkspaceSectionHeader
        showTitle={showPageHeader}
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        actions={
          (canExport && pageData.invoices.length > 0) || canCreate ? (
            <>
              {canExport && pageData.invoices.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    downloadInvoicesCsv({
                      invoices: pageData.invoices,
                      locale,
                      timezone,
                      t,
                    })
                  }
                  className="inline-flex min-h-11 items-center gap-2 rounded-[13px] border border-line bg-white px-4 text-[11px] font-semibold text-[#555553]"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  {t("export")}
                </button>
              )}
              {canCreate && (
                <button
                  type="button"
                  onClick={openCreate}
                  disabled={!settingsReady}
                  className="inline-flex min-h-11 items-center gap-2 rounded-[13px] bg-[#111111] px-4 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <PlusIcon className="h-4 w-4" />
                  {t("newInvoice")}
                </button>
              )}
            </>
          ) : null
        }
      />

      {canCreate && settingsQuery.isError && (
        <div
          className="mt-5 flex flex-col gap-3 rounded-[14px] border border-danger/20 bg-danger-soft px-4 py-3 text-[11px] text-danger sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <p>{t("settingsUnavailable")}</p>
          <button
            type="button"
            onClick={settingsQuery.refetch}
            className="shrink-0 rounded-full bg-white px-3 py-2 text-[10px] font-semibold text-danger"
          >
            {t("retry")}
          </button>
        </div>
      )}

      <div className="mt-7 rounded-[20px] border border-line bg-white p-4 shadow-[0_12px_34px_rgba(17,17,15,0.035)]">
        <div className="grid gap-3 md:grid-cols-2 min-[1440px]:grid-cols-[minmax(220px,1fr)_repeat(6,minmax(120px,auto))]">
          <label className="min-w-0">
            <span className="sr-only">{t("filters.search")}</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("filters.searchPlaceholder")}
              className="h-11 w-full min-w-0 rounded-[12px] border border-line bg-[#FAF9F6] px-3.5 text-[10px] outline-none focus:border-cobalt-500"
            />
          </label>
          <select
            value={documentType}
            onChange={(event) => {
              setDocumentType(event.target.value);
              setPage(1);
            }}
            aria-label={t("filters.type")}
            className="h-11 w-full min-w-0 rounded-[12px] border border-line bg-white px-3 text-[10px]"
          >
            <option value="">{t("filters.allTypes")}</option>
            <option value="invoice">{t("types.invoice")}</option>
            <option value="credit_note">{t("types.credit_note")}</option>
          </select>
          <select
            value={documentStatus}
            onChange={(event) => {
              setDocumentStatus(event.target.value);
              setPage(1);
            }}
            aria-label={t("filters.status")}
            className="h-11 w-full min-w-0 rounded-[12px] border border-line bg-white px-3 text-[10px]"
          >
            <option value="">{t("filters.allStatuses")}</option>
            {["draft", "issued", "void"].map((status) => (
              <option key={status} value={status}>
                {t(`statuses.${status}`)}
              </option>
            ))}
          </select>
          <select
            value={paymentStatus}
            onChange={(event) => {
              setPaymentStatus(event.target.value);
              setPage(1);
            }}
            aria-label={t("filters.paymentStatus")}
            className="h-11 w-full min-w-0 rounded-[12px] border border-line bg-white px-3 text-[10px]"
          >
            <option value="">{t("filters.allPayments")}</option>
            {[
              "unpaid",
              "partially_paid",
              "paid",
              "partially_refunded",
              "refunded",
              "not_applicable",
            ].map((status) => (
              <option key={status} value={status}>
                {t(`paymentStatuses.${status}`)}
              </option>
            ))}
          </select>
          <select
            value={locationId}
            onChange={(event) => {
              setLocationFilter({
                studioId: activeStudioScope,
                value: event.target.value,
              });
              setPage(1);
            }}
            aria-label={t("filters.location")}
            className="h-11 w-full min-w-0 rounded-[12px] border border-line bg-white px-3 text-[10px]"
          >
            <option value="">{t("filters.allLocations")}</option>
            {locations.map((location) => (
              <option
                key={getLocationId(location)}
                value={getLocationId(location)}
              >
                {location.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => {
              setDateFrom(event.target.value);
              setPage(1);
            }}
            aria-label={t("filters.dateFrom")}
            className="h-11 w-full min-w-0 rounded-[12px] border border-line bg-white px-3 text-[10px]"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(event) => {
              setDateTo(event.target.value);
              setPage(1);
            }}
            aria-label={t("filters.dateTo")}
            className="h-11 w-full min-w-0 rounded-[12px] border border-line bg-white px-3 text-[10px]"
          />
        </div>
        <button
          type="button"
          onClick={clearFilters}
          className="mt-3 text-[10px] font-semibold text-cobalt-600"
        >
          {t("filters.clear")}
        </button>
      </div>

      {invoicesQuery.isLoading ? (
        <div className="mt-6 flex min-h-[300px] items-center justify-center rounded-[20px] border border-line bg-white text-[11px] text-[#777773]">
          <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />
          {t("loading")}
        </div>
      ) : invoicesQuery.isError ? (
        <div className="mt-6 flex min-h-[280px] flex-col items-center justify-center rounded-[20px] border border-danger/20 bg-danger-soft px-6 text-center">
          <p className="text-[12px] font-semibold text-danger">
            {t("loadError")}
          </p>
          <button
            type="button"
            onClick={invoicesQuery.refetch}
            className="mt-4 rounded-full bg-[#111111] px-4 py-2 text-[10px] font-semibold text-white"
          >
            {t("retry")}
          </button>
        </div>
      ) : pageData.invoices.length === 0 ? (
        <div className="mt-6 flex min-h-[300px] flex-col items-center justify-center rounded-[20px] border border-dashed border-line bg-white/70 px-6 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-sand-100 text-sand-700">
            <DocumentTextIcon className="h-6 w-6" />
          </span>
          <h2 className="mt-4 break-words text-[15px] font-semibold text-[#252524]">
            {t("empty.title")}
          </h2>
          <p className="mt-1.5 max-w-sm break-words text-[10px] leading-5 text-[#777773]">
            {t("empty.description")}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 space-y-3 md:hidden">
            {pageData.invoices.map((invoice) => (
              <InvoiceCard
                key={getInvoiceId(invoice)}
                invoice={invoice}
                locale={locale}
                timezone={timezone}
                onView={setSelectedInvoice}
                t={t}
              />
            ))}
          </div>

          <div className="mt-6 hidden overflow-x-auto rounded-[20px] border border-line bg-white md:block">
            <WorkspaceTable className="min-w-[920px] text-left">
              <thead className="border-b border-line bg-[#FAF9F6] text-[10px] uppercase tracking-[0.1em] text-[#858580]">
                <tr>
                  {[
                    "number",
                    "customer",
                    "issueDate",
                    "dueDate",
                    "status",
                    "total",
                  ].map((column) => (
                    <th key={column} className="px-4 py-3.5 font-semibold">
                      {t(`table.${column}`)}
                    </th>
                  ))}
                  <th className="px-4 py-3.5 text-right font-semibold">
                    {t("table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pageData.invoices.map((invoice) => (
                  <tr
                    key={getInvoiceId(invoice)}
                    className="hover:bg-surface-muted"
                  >
                    <td className="px-4 py-4">
                      <p className="text-[10px] font-semibold text-[#292925]">
                        {getInvoiceNumber(invoice, t("draftNumber"))}
                      </p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-[#969691]">
                        {t(`types.${getInvoiceType(invoice)}`)}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="max-w-[220px] truncate text-[10px] font-medium text-[#353533]">
                        {getInvoiceCustomerName(invoice)}
                      </p>
                      <p className="mt-1 max-w-[220px] truncate text-[10px] text-[#969691]">
                        {getInvoiceCustomerEmail(invoice) || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-[10px] text-[#555553]">
                      {formatInvoiceDate(
                        invoice?.issueDate ?? invoice?.createdAt,
                        locale,
                        getInvoiceTimezone(invoice, timezone),
                      )}
                    </td>
                    <td className="px-4 py-4 text-[10px] text-[#555553]">
                      {formatInvoiceDate(
                        invoice?.dueDate,
                        locale,
                        getInvoiceTimezone(invoice, timezone),
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <InvoiceStatus invoice={invoice} t={t} />
                    </td>
                    <td className="px-4 py-4 text-[11px] font-semibold text-[#292925]">
                      {formatInvoiceMoney(invoice, locale)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedInvoice(invoice)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-line text-[#555553] hover:border-line-strong"
                        aria-label={t("actions.view")}
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </WorkspaceTable>
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-[16px] border border-line bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] text-[#777773]">
              {t("pagination.summary", {
                from: (pageData.page - 1) * pageData.limit + 1,
                to: Math.min(pageData.page * pageData.limit, pageData.total),
                total: pageData.total,
              })}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
                disabled={pageData.page <= 1}
                className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-line disabled:opacity-30"
                aria-label={t("pagination.previous")}
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setPage((current) =>
                    Math.min(current + 1, pageData.totalPages),
                  )
                }
                disabled={pageData.page >= pageData.totalPages}
                className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-line disabled:opacity-30"
                aria-label={t("pagination.next")}
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {selectedInvoice && (
        <InvoiceDetailsDialog
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onEdit={openEdit}
        />
      )}

      {editorOpen && settingsReady && (
        <InvoiceEditorDialog
          key={getInvoiceId(editingInvoice) || "new"}
          invoice={editingInvoice}
          locations={locations}
          defaultLocationIds={locationId ? [locationId] : []}
          settings={settingsQuery.data?.settings}
          open
          onClose={() => {
            setEditorOpen(false);
            setEditingInvoice(null);
          }}
          onSaved={setSelectedInvoice}
        />
      )}
    </section>
  );
}
