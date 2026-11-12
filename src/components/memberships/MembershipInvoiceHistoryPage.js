"use client";

import { useState } from "react";
import {
  ArrowDownTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";

import {
  CustomerPortalEmptyState,
  CustomerPortalLoadingState,
  CustomerPortalPage,
  CustomerPortalPageHeader,
  CustomerPortalSurface,
  customerPortalPrimaryActionClass,
} from "@/components/customer-shell/CustomerPortalPrimitives";
import { Link } from "@/i18n/navigation";
import {
  useDownloadMyMembershipInvoiceMutation,
  useGetMyMembershipInvoicesQuery,
} from "@/lib/features/memberships/membershipsApiSlice";
import { formatMinorCurrencyAmount } from "@/utils/money";
import { formatDate, getEntityId, statusTone } from "./membership.utils";

const cx = (...classes) => classes.filter(Boolean).join(" ");

const normalizeInvoices = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.invoices)) return response.invoices;
  if (Array.isArray(response?.items)) return response.items;
  return [];
};

export default function MembershipInvoiceHistoryPage() {
  const t = useTranslations("Memberships.invoices");
  const commonT = useTranslations("Memberships.common");
  const locale = useLocale();
  const [page, setPage] = useState(1);
  const [downloadError, setDownloadError] = useState("");
  const query = useGetMyMembershipInvoicesQuery({ page, limit: 20 });
  const invoices = normalizeInvoices(query.data);
  const totalPages = Number(query.data?.pages ?? query.data?.totalPages ?? 1);
  const [downloadInvoice, downloadState] =
    useDownloadMyMembershipInvoiceMutation();

  const handleDownload = async (invoice) => {
    setDownloadError("");
    try {
      const result = await downloadInvoice({
        id: getEntityId(invoice),
        url: invoice.documentUrl || invoice.url,
      }).unwrap();
      const target = result?.downloadUrl || result?.url;
      if (!target) throw new Error("Missing invoice document URL");
      const anchor = document.createElement("a");
      anchor.href = target;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      if (result?.filename) anchor.download = result.filename;
      anchor.click();
      if (result?.downloadUrl) {
        window.setTimeout(
          () => URL.revokeObjectURL(result.downloadUrl),
          30_000,
        );
      }
    } catch {
      setDownloadError(t("downloadError"));
    }
  };

  return (
    <CustomerPortalPage contentClassName="max-w-5xl">
      <Link
        href="/portal/membership"
        className="text-[10px] font-semibold text-[var(--tenant-accent-link)]"
      >
        ← {t("back")}
      </Link>
      <CustomerPortalPageHeader
        className="mt-5"
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />
      {downloadError ? (
        <p
          className="mt-5 rounded-[14px] border border-danger/20 bg-danger-soft p-3 text-[9px] text-danger"
          role="alert"
        >
          {downloadError}
        </p>
      ) : null}
      {query.isLoading ? (
        <div className="mt-7">
          <CustomerPortalLoadingState label={t("loading")} />
        </div>
      ) : query.isError ? (
        <div className="mt-7 flex min-h-72 flex-col items-center justify-center rounded-[22px] border border-danger/20 bg-danger-soft text-center">
          <p className="text-[10px] font-semibold text-danger">
            {t("loadError")}
          </p>
          <button
            type="button"
            onClick={query.refetch}
            className={cx(customerPortalPrimaryActionClass, "mt-4")}
          >
            {commonT("retry")}
          </button>
        </div>
      ) : invoices.length ? (
        <CustomerPortalSurface className="mt-7">
          <div className="divide-y divide-[var(--tenant-border)]">
            {invoices.map((invoice) => (
              <article
                key={getEntityId(invoice)}
                className="grid gap-4 px-4 py-5 sm:grid-cols-[minmax(0,1fr)_140px_140px_130px_42px] sm:items-center sm:px-5"
              >
                <div>
                  <p className="text-[12px] font-semibold text-[var(--tenant-text-on-surface)]">
                    {invoice.number || t("numberFallback")}
                  </p>
                  <p className="mt-1 text-[9px] text-[var(--tenant-muted-on-surface)]">
                    {formatDate(invoice.issuedAt, locale)}
                  </p>
                </div>
                <p className="text-[9px] text-[var(--tenant-muted-on-surface)]">
                  {formatDate(invoice.periodStart, locale)} –{" "}
                  {formatDate(invoice.periodEnd, locale)}
                </p>
                <span
                  className={cx(
                    "w-fit rounded-full px-2.5 py-1 text-[9px] font-semibold",
                    statusTone(invoice.status),
                  )}
                >
                  {t(`statuses.${invoice.status || "open"}`)}
                </span>
                <p className="text-[11px] font-semibold sm:text-right">
                  {formatMinorCurrencyAmount(
                    invoice.totalAmountMinor,
                    invoice.currency,
                    locale,
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => handleDownload(invoice)}
                  disabled={downloadState.isLoading}
                  aria-label={t("download", { number: invoice.number || "" })}
                  className="flex h-10 w-10 items-center justify-center rounded-[11px] border border-[var(--tenant-border)] text-[var(--tenant-text-on-surface)] disabled:opacity-40"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                </button>
              </article>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-[var(--tenant-border)] bg-[var(--tenant-surface)] px-4 py-3">
            <p className="text-[9px] text-[var(--tenant-muted-on-surface)]">
              {t("pagination", { page, pages: Math.max(totalPages, 1) })}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                aria-label={commonT("previous")}
                className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] text-[var(--tenant-text-on-surface)] disabled:opacity-30"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((value) => Math.min(totalPages, value + 1))
                }
                aria-label={commonT("next")}
                className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] text-[var(--tenant-text-on-surface)] disabled:opacity-30"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </CustomerPortalSurface>
      ) : (
        <CustomerPortalSurface className="mt-7 p-3">
          <CustomerPortalEmptyState
            icon={DocumentTextIcon}
            title={t("empty.title")}
            description={t("empty.description")}
          />
        </CustomerPortalSurface>
      )}
    </CustomerPortalPage>
  );
}
